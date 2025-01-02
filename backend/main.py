from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import requests
from dotenv import load_dotenv
import os
from openai import OpenAI

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
                messages=question_and_context
            )

            response = ai_response.choices[0].message.content
            print("AI response:", response)
            await websocket.send_json({
                "text": response,
                "type": "text",
                "status": "success"
            })
            
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "text": str(e),
            "status": "error"
        })
    finally:
        print("WebSocket closed")
        


