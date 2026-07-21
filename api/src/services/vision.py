import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

PROMPT = """You are analyzing a lecture slide image. Extract the following:

1. **verbatim_text**: All readable text content on the slide, preserving headings, bullets, and structure exactly as written.

2. **diagrams**: For any diagrams, charts, graphs, or images on the slide, describe what it represents and its approximate bounding box as percentage coordinates (x%, y%, width%, height%).

3. **summary**: A brief 1-2 sentence summary of what this slide covers.

Return ONLY valid JSON with this exact structure:
{
  "verbatim_text": "string",
  "diagrams": [{"description": "string", "bbox": {"x": float, "y": float, "width": float, "height": float}}],
  "summary": "string"
}

If there are no diagrams, return an empty array for "diagrams"."""

def parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw.strip())

async def call_gemini(image_url: str) -> dict:
    from google import genai
    from google.genai import types
    import httpx as _httpx

    async with _httpx.AsyncClient() as http:
        resp = await http.get(image_url, timeout=30)
        resp.raise_for_status()
        image_bytes = resp.content

    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    types.Part.from_text(text=PROMPT),
                ],
            )
        ],
        config=types.GenerateContentConfig(temperature=0.1, max_output_tokens=4096),
    )
    return parse_json(response.text)

async def call_openrouter(model: str, image_url: str) -> dict:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": PROMPT},
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    async with httpx.AsyncClient() as http:
        resp = await http.post(f"{OPENROUTER_BASE}/chat/completions", json=body, headers=headers, timeout=60)

    if resp.status_code == 429:
        raise Exception("rate_limited")

    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    return parse_json(raw)

ROUTES = [
    ("gemini", call_gemini),
    ("openrouter-primary", lambda url: call_openrouter("google/gemini-3.1-flash-lite-image", url)),
    ("openrouter-fallback", lambda url: call_openrouter("google/gemini-3.1-flash-image", url)),
]

async def process_image(image_url: str) -> dict:
    errors = []

    for provider_name, call_fn in ROUTES:
        # Skip Gemini if no API key
        if provider_name == "gemini" and not GEMINI_API_KEY:
            errors.append("Gemini: no API key configured")
            continue

        try:
            result = await call_fn(image_url)
            diagrams = result.get("diagrams", [])
            return {
                "raw_text": result.get("verbatim_text", ""),
                "diagrams": diagrams,
                "summary": result.get("summary", ""),
                "raw_response": json.dumps(result),
                "provider": provider_name,
            }
        except Exception as e:
            msg = str(e)
            # Don't retry on model-not-found (different model might work on next route)
            if "model not found" in msg.lower() or "not found" in msg.lower():
                errors.append(f"{provider_name}: model unavailable")
                continue
            # 429 = quota exhausted, try next provider
            if "rate_limited" in msg or "429" in msg or "quota" in msg.lower() or "resource_exhausted" in msg.lower():
                errors.append(f"{provider_name}: quota exhausted")
                continue
            errors.append(f"{provider_name}: {msg}")
            continue

    raise Exception(f"All providers failed: {'; '.join(errors)}")
