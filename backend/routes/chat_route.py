from fastapi import APIRouter, WebSocket, UploadFile, File
from service.LLM_service import generate_response
from service.TTS import send_speech_chunks
from service.STT import transcribe_stream
import base64   

router = APIRouter()

@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            chat_history = data['context']
            await handle_chat_message(websocket, chat_history)

            # send complete status once all speech is sent
            await websocket.send_json({
                "type": "complete",
                "status": "success"
            })

    except Exception as e:
        print(f"Chat error: {e}")

@router.websocket("/ws/stt")
async def stt_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        await transcribe_stream(websocket)
    except Exception as e:
        print(f"Error in STT websocket: {e}")
    # finally:
    #     await websocket.close()

async def handle_chat_message(websocket, message):
    current_sentence = ""
    async for text_chunk in generate_response(message):
        
        await websocket.send_json({
            "type": "chunk",
            "text": text_chunk,
            "status": "success"
        })
        current_sentence += text_chunk
        if any(current_sentence.rstrip().endswith(punct) for punct in ".!?"):
            await send_speech_chunks(current_sentence, websocket)
            current_sentence = ""
    if current_sentence.strip():
        await send_speech_chunks(current_sentence, websocket)