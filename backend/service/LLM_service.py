from openai import AsyncOpenAI

from dotenv import load_dotenv
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = {
    "role": "system", 
    "content": "You are a helpful assistant, you will answer the users question as best as you can and as short as possible unless the user asks for more information. Answer in a conversational manner. Do not use markdown."
}

async def generate_response(chat_history):
    question_and_context = [SYSTEM_PROMPT] + chat_history
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=question_and_context,
        stream=True
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content
