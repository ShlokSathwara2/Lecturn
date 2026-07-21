import os
import uuid
import httpx
import io
from PIL import Image
from dotenv import load_dotenv
from .vision import call_openrouter

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
BUCKET = "slide-images"

async def download_image(url: str) -> bytes:
    async with httpx.AsyncClient() as http:
        resp = await http.get(url, timeout=30)
        resp.raise_for_status()
        return resp.content

async def upload_to_storage(data: bytes, filename: str) -> str:
    from ..supabase_client import supabase
    supabase.storage.from_(BUCKET).upload(filename, data, {"content-type": "image/png"})
    return supabase.storage.from_(BUCKET).get_public_url(filename)

async def crop_diagram(image_url: str, bbox: dict, index: int) -> str | None:
    bbox = {k: float(v) for k, v in bbox.items()}
    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]

    if w < 1 or h < 1:
        return None

    try:
        img_bytes = await download_image(image_url)
        img = Image.open(io.BytesIO(img_bytes))
        pw, ph = img.size

        left = int(x / 100 * pw)
        top = int(y / 100 * ph)
        right = int((x + w) / 100 * pw)
        bottom = int((y + h) / 100 * ph)

        left = max(0, left)
        top = max(0, top)
        right = min(pw, right)
        bottom = min(ph, bottom)

        cropped = img.crop((left, top, right, bottom))
        buf = io.BytesIO()
        cropped.save(buf, format="PNG")
        fn = f"diagram-crop-{uuid.uuid4().hex[:12]}.png"

        return await upload_to_storage(buf.getvalue(), fn)
    except Exception as e:
        print(f"Crop failed: {e}")
        return None

CLEAN_PROMPT = """You are a diagram cleaning assistant. Given a cropped image of a diagram from a lecture slide, redraw it cleanly:

- Make text legible, use a clean sans-serif font
- Straighten lines and align shapes
- Use consistent colors (blue for main elements, gray for secondary)
- Remove noise, glare, or artifacts from the original crop
- Output the cleaned diagram as-is, preserving the original content and labels

Return ONLY valid JSON with this structure:
{
  "description": "brief description of what this diagram shows"
}"""

async def clean_diagram(crop_url: str) -> str | None:
    try:
        result = await call_openrouter("google/gemini-3.1-flash-image", crop_url, CLEAN_PROMPT)
        return result.get("description", "")
    except Exception as e:
        print(f"Diagram clean failed: {e}")
        return None

async def process_diagrams(image_url: str, diagrams: list[dict]) -> list[dict]:
    results = []
    for i, diagram in enumerate(diagrams):
        bbox = diagram.get("bbox", {})
        crop_url = await crop_diagram(image_url, bbox, i)
        if crop_url:
            cleaned_desc = await clean_diagram(crop_url)
            results.append({
                "description": diagram.get("description", ""),
                "bbox": bbox,
                "original_crop_url": crop_url,
                "cleaned_description": cleaned_desc,
            })
    return results
