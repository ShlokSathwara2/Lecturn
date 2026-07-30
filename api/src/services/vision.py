import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_BASE = "https://openrouter.ai/api/v1"

PROMPT = """You are an expert lecture slide analyzer. Extract ALL content from this slide image intelligently.

RULES:
- Extract ONLY actual educational content. Ignore watermarks, logos, slide numbers, footers, headers, decorative elements, background patterns, and any non-content artifacts.
- If a slide has a company/institution watermark (e.g. "© 2024 University"), IGNORE it completely.
- If there are page numbers, timestamps, or navigation elements, IGNORE them.
- Focus purely on the knowledge content the lecturer intended to convey.

For TABLES:
- Detect any tabular data (grid layouts, row/column structures, comparison charts).
- Convert them to clean markdown tables with proper headers and alignment.
- Preserve all cell values accurately.

For DIAGRAMS/FIGURES:
- Describe what the diagram represents educational-wise.
- Include the bounding box as percentage coordinates (x%, y%, width%, height%).

For STRUCTURED CONTENT:
- Preserve bullet points, numbered lists, headings, and subheadings.
- Keep the logical hierarchy intact.

Return ONLY valid JSON:
{
  "verbatim_text": "string (all readable text, preserving structure: headings, bullets, paragraphs)",
  "tables": [{"headers": ["col1", "col2"], "rows": [["val1", "val2"], ["val3", "val4"]], "caption": "optional table title"}],
  "diagrams": [{"description": "educational description of what this diagram shows", "bbox": {"x": float, "y": float, "width": float, "height": float}}],
  "summary": "string (1-2 sentence summary of the slide content)",
  "content_type": "text|table|diagram|mixed"
}

If there are no tables, return empty array for "tables". If no diagrams, return empty array for "diagrams"."""

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

async def call_openrouter(model: str, image_url: str, custom_prompt: str | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    prompt_text = custom_prompt or PROMPT

    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": prompt_text},
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
            tables = result.get("tables", [])
            return {
                "raw_text": result.get("verbatim_text", ""),
                "diagrams": diagrams,
                "tables": tables,
                "summary": result.get("summary", ""),
                "content_type": result.get("content_type", "text"),
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
