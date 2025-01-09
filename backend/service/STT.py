from deepgram import DeepgramClient, DeepgramClientOptions, LiveTranscriptionEvents, LiveOptions
import json
import os
from dotenv import load_dotenv
import base64
import asyncio
import time

load_dotenv()

config = DeepgramClientOptions(
    options={"keepalive": "true"}
             
)

options = LiveOptions(
    model="nova-2",
    smart_format=True,
    sample_rate=16000,
    channels=1,
    language="en",
    interim_results=True,
    utterance_end_ms="1000",     # Longer pause threshold
    vad_events=True,
)

# setup deepgram client
dg_client = DeepgramClient(os.getenv('DEEPGRAM_API_KEY'), config)

# connect to deepgram async socket and return the connection socket
async def connect_to_deepgram():
    dg_connection = dg_client.listen.asyncwebsocket.v("1")
    return dg_connection

# keep alive message
async def keep_alive(dg_connection):
    keep_alive_msg = json.dumps({"type": "KeepAlive"})
    await dg_connection.send(keep_alive_msg)

# send transcript to frontend
# async def send_transcript_to_frontend(websocket, transcript):
#     await websocket.send_json({
#         "type": "transcription",
#         "text": transcript.channel.alternatives[0].transcript,
#         "is_final": transcript.speech_final
#     })

# send keepalive message to deepgram every 3 seconds
async def send_keepalive(dg_connection):
    while True:
        try:
            await keep_alive(dg_connection)
            await asyncio.sleep(3)
        except Exception as e:
            print(f"Error in send_keepalive: {e}")
            break

def create_transcript_handler(websocket):
    async def on_transcript(*args, result):
        sentence = result.channel.alternatives[0].transcript

        if len(sentence) == 0:
            return 
        
        if result.speech_final:
            await websocket.send_json({
                "type": "transcription",
                "text": sentence,
                "is_final": True
            })

    return on_transcript

# transcribe the audio stream from the websocket
async def transcribe_stream(websocket):
    try:
        dg_connection = await connect_to_deepgram()
        print("Deepgram connection established")

        # start the deepgram connection
        await dg_connection.start(options)

        # Create the transcript handler with websocket access
        transcript_handler = create_transcript_handler(websocket)
        
        # When there is transcript event, send the transcript to the frontend
        dg_connection.on(LiveTranscriptionEvents.Transcript, transcript_handler)

        # send keepalive message every 3 seconds
        asyncio.create_task(send_keepalive(dg_connection))

        try:
            while True:
                # receive audio data from the websocket
                base_64_audio = await websocket.receive_text()
                audio_data = base64.b64decode(base_64_audio)

                # send the audio data to deepgram
                await dg_connection.send(audio_data)
        except Exception as e:
            print(f"Error in websocket communication: {e}")

    except Exception as e:
        print(f"Error in transcribe_stream: {e}")
        if dg_connection:
            await dg_connection.finish()
