from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import requests
from dotenv import load_dotenv
import os
load_dotenv()

API_URL = os.getenv("API_URL")
MODEL_NAME = os.getenv("MODEL_NAME")

app = FastAPI()

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
            message = await websocket.receive_text()
            print(f"Received message: {message}")
            response = requests.post(API_URL, json={
                "model": MODEL_NAME,
                "prompt": message,
                "stream": False
            })
            response = response.json()
            print("full response:", response)
            print("short response:", response["response"])
            await websocket.send_text(response["response"])
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        print("WebSocket closed")
        
