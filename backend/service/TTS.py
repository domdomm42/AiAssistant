from openai import OpenAI
import base64

from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# generate speech and return encoded audio
def generate_speech(text):
    response = client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text,
    )
    audio_data = response.content 
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    return audio_base64

async def send_speech_chunks(current_sentence, websocket):
    speech_base64 = generate_speech(current_sentence)
    await websocket.send_json({
        "audio": speech_base64,
        "type": "audio",
        "status": "success"
    })
