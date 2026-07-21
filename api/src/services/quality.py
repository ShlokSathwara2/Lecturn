import io
import httpx
from imagehash import phash
from PIL import Image

DUPLICATE_THRESHOLD = 8  # hamming distance below this = duplicate

async def compute_image_hash(image_url: str) -> str | None:
    try:
        async with httpx.AsyncClient() as http:
            resp = await http.get(image_url, timeout=30)
            resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        return str(phash(img))
    except Exception as e:
        print(f"Image hash failed: {e}")
        return None

def hamming_distance(h1: str, h2: str) -> int:
    return bin(int(h1, 16) ^ int(h2, 16)).count("1")

def score_confidence(raw_text: str, summary: str | None = None) -> tuple[float, str]:
    text = raw_text.strip()
    word_count = len(text.split())
    char_count = len(text)

    score = 0.5

    if word_count < 3:
        score = 0.1
    elif word_count < 8:
        score = 0.3
    elif word_count > 20:
        score = 0.7
    elif word_count > 50:
        score = 0.9

    if char_count > 0 and text[-1] not in ".!?}":
        score -= 0.05

    lines = text.split("\n")
    avg_line_len = char_count / max(len(lines), 1)
    if avg_line_len > 200 and char_count < 50:
        score = max(0.1, score - 0.2)

    score = max(0.0, min(1.0, score))

    status = "processed" if score >= 0.4 else "needs_review"
    return round(score, 2), status
