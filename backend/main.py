from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat_route import router as chat_route


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_route)
