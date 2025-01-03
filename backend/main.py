from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import requests
from dotenv import load_dotenv
import os
from openai import OpenAI
from service.TTS import generate_speech

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
app = FastAPI()

SYSTEM_PROMPT = {
    "role": "system", 
    "content": "You are a helpful assistant, you will answer the users question as best as you can and as short as possible unless the user asks for more information."
}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test route
@app.get("/")
async def root():
    return {"message": "AI assistant is running"}


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            question_and_context = [SYSTEM_PROMPT] + data['context']
            
            print(f"Received message: {question_and_context[-1]['content']} \n")
            print("Current context:", question_and_context)

            ai_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=question_and_context,
                stream=True
            )
            # send stream a chunk at a time
            res = ""
            current_sentence = ""
            for chunk in ai_response:
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
                            speech_base64 = generate_speech(current_sentence)
                            await websocket.send_json({
                                "audio": speech_base64,
                                "type": "audio",
                                "status": "success"
                            })
                            current_sentence = ""

            if current_sentence.strip():
                speech_base64 = generate_speech(current_sentence)
                await websocket.send_json({
                        "audio": speech_base64,
                        "type": "audio",
                        "status": "success"
                })
        


            await websocket.send_json({
                "type": "complete",
                "status": "success"
            })

        

            # speech_base64 = generate_speech(total_response)

            # await websocket.send_json({
            #     # "text": total_response,
            #     "audio": speech_base64,
            #     "type": "audio",
            #     "status": "success"
            # })
            
    except Exception as e:
        print(f"Error: {str(e)}")
        await websocket.send_json({
            "type": "error",
            "text": str(e),
            "status": "error"
        })
    finally:
        print("WebSocket closed")
        


