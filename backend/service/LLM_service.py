from openai import AsyncOpenAI

from dotenv import load_dotenv
import os

load_dotenv()

LLM_API_KEY = os.getenv("PERPLEXITY_API_KEY")
client = AsyncOpenAI(api_key=LLM_API_KEY, base_url="https://api.perplexity.ai")

SYSTEM_PROMPT = {
    "role": "system", 
    "content": "You are a helpful assistant. Answer questions concisely, precisely and conversationally in your responses. Do not use markdown formatting. Do not include any citations, references, footnotes, or source markers like [1], [2], etc."
}

async def generate_LLM_response(message_and_context):
    question_and_context = [SYSTEM_PROMPT] + message_and_context
    stream = await client.chat.completions.create(
        model="llama-3.1-sonar-large-128k-online",
        messages=question_and_context,
        stream=True
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content
