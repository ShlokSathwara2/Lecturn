import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE = "https://api.groq.com/openai/v1"

DEFAULT_FORMAT = "exam-oriented"

EXPLANATION_PROMPT = """You are a study assistant. Given the raw text extracted from a lecture slide, generate an enriched study note.

Format: {format}

Available formats:
- "easy": Simple explanation as if teaching a beginner, use analogies
- "exam-oriented": Key exam points, definitions, common questions, and what to focus on
- "summary": A concise plain-text summary
- "diagram-focused": Focus on explaining any diagrams or visual elements in the text

Raw text from slide:
{raw_text}

Return ONLY valid JSON with this structure:
{{
  "explanation": "string (the enriched content in the requested format)",
  "key_points": ["string", "string", ...],
  "format_used": "{format}"
}}
"""

async def enrich_text(raw_text: str, format: str = DEFAULT_FORMAT) -> dict:
    if not GROQ_API_KEY:
        return {
            "explanation": raw_text,
            "key_points": [],
            "format_used": format,
            "note": "Groq API key not configured",
        }

    prompt = EXPLANATION_PROMPT.format(raw_text=raw_text, format=format)

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient() as http:
        resp = await http.post(f"{GROQ_BASE}/chat/completions", json=body, headers=headers, timeout=30)

    if resp.status_code == 429:
        raise Exception("Groq rate limited")

    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    result = json.loads(raw)

    return {
        "explanation": result.get("explanation", raw_text),
        "key_points": result.get("key_points", []),
        "format_used": result.get("format_used", format),
    }
