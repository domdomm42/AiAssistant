from .LLM_service import generate_LLM_response
from .TTS import send_speech_chunks
import asyncio

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
                return
            
        # Only send remaining speech if not cancelled
        if current_sentence.strip():
            await send_speech_chunks(current_sentence, websocket)

        await websocket.send_json({
            "type": "complete",
            "status": "success"
        })


    except asyncio.CancelledError:
        return
    except Exception as e:
        print(f"Error in handle_chat_message: {e}")
        raise