import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE = "https://api.groq.com/openai/v1"

async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str | None:
    if not GROQ_API_KEY:
        print("No Groq API key configured")
        return None

    try:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                f"{GROQ_BASE}/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (filename, audio_bytes, "audio/webm")},
                data={"model": "whisper-large-v3", "language": "en"},
                timeout=60,
            )
        resp.raise_for_status()
        return resp.json().get("text", "")
    except Exception as e:
        print(f"Transcription failed: {e}")
        return None
