from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from service.STT import transcribe_stream  
import asyncio
from service.chat_service import handle_chat_message

router = APIRouter()

async def cancel_task(current_task, websocket=None, send_status=False):
    if current_task:
        current_task.cancel()
        try:
            await current_task
        except asyncio.CancelledError:
            if send_status and websocket:
                await websocket.send_json({
                    "type": "complete",
                    "status": "cancelled"
                })
        current_task = None
    return current_task

# Websocket for LLM and TTS
@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    current_task = None
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle cancellation
            # if data.get('type') == 'cancel':
            #     current_task = await cancel_task(current_task, websocket, send_status=True)
            #     continue

            # Cancel any existing task before starting new one
            current_task = await cancel_task(current_task)

            # Start new chat task
            current_task = asyncio.create_task(
                handle_chat_message(websocket, data.get('context', []))
            )
            
    except WebSocketDisconnect:
        current_task = await cancel_task(current_task)
    except Exception as e:
        print(f"Error in chat websocket: {e}")
    finally:
        current_task = await cancel_task(current_task)

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

