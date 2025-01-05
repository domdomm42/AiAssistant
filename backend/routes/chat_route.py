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
            ai_response = generate_response(chat_history)
            res = ""
            current_sentence = ""
            for chunk in ai_response:
                if data.get('type') == 'stop_response':
                    continue
                else:
                    if chunk.choices[0].delta.content:
                        res = chunk.choices[0].delta.content
                        current_sentence += res
                
                        await websocket.send_json({
                            "text": res,
                            "type": "chunk",
                            "status": "success"
                        })

                        # if any of the response contains a pause
                        if any(punct in res for punct in ['.', '!', '?', '\n', ',']):
                            if len(current_sentence.strip()) > 0:
                                await send_speech_chunks(current_sentence, websocket)
                                current_sentence = ""

            # if there is any text left after the loop, send it
            # if current_sentence.strip():
            #     await send_speech_chunks(current_sentence, websocket)


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