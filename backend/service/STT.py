from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions
import json
import os
from dotenv import load_dotenv
import base64
import asyncio

load_dotenv()

config = DeepgramClientOptions(
    options={"keepalive": "true"}
             
)

options = LiveOptions(
  punctuate=True,
  interim_results=True,
)

# setup deepgram client
dg_client = DeepgramClient(os.getenv('DEEPGRAM_API_KEY'), config)

# connect to deepgram async socket and return the connection socket
async def connect_to_deepgram():
    dg_connection = dg_client.listen.asyncwebsocket.v("1")
    return dg_connection

async def keep_alive(dg_connection):
    keep_alive_msg = json.dumps({"type": "KeepAlive"})
    await dg_connection.send(keep_alive_msg)

async def send_transcript_to_frontend(websocket, transcript):
    print("Transcript received:", transcript)
    await websocket.send_json({
        "type": "transcription",
        "text": transcript.channel.alternatives[0].transcript,
        "is_final": transcript.speech_final
    })

# transcribe the audio stream from the websocket
async def transcribe_stream(websocket):
    try:
        dg_connection = await connect_to_deepgram()
        print("Deepgram connection established")

        # send keepalive messages to deepgram every 3 seconds
        async def send_keepalive():
            while True:
                try:
                    print("Sending keepalive message")
                    await dg_connection.send(json.dumps({"type": "KeepAlive"}))
                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"Error in send_keepalive: {e}")
                    break

        async def on_transcript(*args, result):
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            print(f"speaker: {sentence}")
            await send_transcript_to_frontend(websocket, result)

        await dg_connection.start(options)
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_transcript)
        keep_alive_task = asyncio.create_task(send_keepalive())

        try:
            while True:
                base_64_audio = await websocket.receive_text()
                audio_data = base64.b64decode(base_64_audio)
                await dg_connection.send(audio_data)
        except Exception as e:
            print(f"Error in websocket communication: {e}")
        finally:
            keep_alive_task.cancel()
    except Exception as e:
        print(f"Error in transcribe_stream: {e}")
        if dg_connection:
            await dg_connection.finish()