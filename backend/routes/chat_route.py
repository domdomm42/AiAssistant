from fastapi import APIRouter, WebSocket, UploadFile, File, WebSocketDisconnect
from service.LLM_service import generate_LLM_response
from service.TTS import send_speech_chunks
from service.STT import transcribe_stream
import base64   
import asyncio
router = APIRouter()


# Websocket for LLM and TTS
@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    current_task = None
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # handle cancellation
            if data.get('type') == 'cancel':
                if current_task:
                    current_task.cancel()
                    try:
                        await current_task
                    except asyncio.CancelledError:
                        await websocket.send_json({
                            "type": "complete",
                            "status": "cancelled"
                        })
                    current_task = None
                continue

            # cancel any existing task before starting new one
            if current_task:
                current_task.cancel()
                try:
                    await current_task
                except asyncio.CancelledError:
                    pass
                current_task = None

            # Start new chat task
            current_task = asyncio.create_task(
                handle_chat_message(websocket, data.get('context', []))
            )
            
    except WebSocketDisconnect:
        if current_task:
            current_task.cancel()
    except Exception as e:
        print(f"Error in chat websocket: {e}")
    finally:
        if current_task:
            current_task.cancel()

# websocket for STT
@router.websocket("/ws/stt")
async def stt_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        await transcribe_stream(websocket)
    except Exception as e:
        print(f"Error in STT websocket: {e}")
    finally:
        await websocket.close()


# takes in message and context, sends speech chunks to the websocket
async def handle_chat_message(websocket, message_and_context):
    current_sentence = ""
    try:
        async for text_chunk in generate_LLM_response(message_and_context):
            try:
                await websocket.send_json({
                    "type": "chunk",
                    "text": text_chunk,
                    "status": "success"
                })
                current_sentence += text_chunk

                if any(current_sentence.rstrip().endswith(punct) for punct in ",.!?"):
                    await send_speech_chunks(current_sentence, websocket)
                    current_sentence = ""
            except asyncio.CancelledError:
                # Stop processing when cancelled
                return

        # Only send remaining speech if not cancelled
        if current_sentence.strip():
            await send_speech_chunks(current_sentence, websocket)

    except asyncio.CancelledError:
        # Handle cancellation
        return
    except Exception as e:
        print(f"Error in handle_chat_message: {e}")
        raise