from google.cloud import speech
import os
from google.oauth2 import service_account
from dotenv import load_dotenv

load_dotenv()

# Initialize the client with credentials
credentials = service_account.Credentials.from_service_account_file(
    os.getenv('GOOGLE_API_FILE_PATH')
)
client = speech.SpeechClient(credentials=credentials)

async def transcribe_stream(websocket):
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sample_rate_hertz=48000,
        language_code="en-US",
        enable_automatic_punctuation=True
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
    )

    async def audio_generator():
        print("Audio generator started")
        while True:
            print("Waiting for audio data")
            try:
                # receive audio data from websocket
                audio_data = await websocket.receive_bytes()
                print(f"Received audio data: {len(audio_data)} bytes")
                yield speech.StreamingRecognizeRequest(audio_content=audio_data)
            except Exception as e:
                print("Error receiving audio data", e)
                break
            
    print("Audio generator: ", audio_generator)
    requests = audio_generator()
    print("Requests: ", requests)
    
    responses = client.streaming_recognize(streaming_config, requests)
 
    for response in responses:
        for result in response.results:
            transcript = result.alternatives[0].transcript
            is_final = result.is_final

            await websocket.send_json({
                "text": transcript,
                "is_final": is_final,
                "type": "transcription"
            })