from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models import ChapterCreate, ChapterUpdate
from ..supabase_client import supabase
from ..services.embeddings import generate_embedding
import numpy as np
import re

class SuggestRequest(BaseModel):
    subject_id: str
    text: str

class SuggestResponse(BaseModel):
    chapter_id: str | None = None
    title: str = ""
    confidence: float = 0.0
    action: str = "ask"  # "append" | "new" | "ask"

def extract_topic(text: str) -> str:
    lines = text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if re.match(r'^[A-Z][A-Za-z0-9\s\-:]{3,80}$', line):
            return line[:80]
    topic = lines[0].strip()[:80] if lines else ""
    return topic if topic else "Untitled Slide"

def cosine_similarity(a: list[float], b: list[float]) -> float:
    arr_a = np.array(a)
    arr_b = np.array(b)
    denom = np.linalg.norm(arr_a) * np.linalg.norm(arr_b)
    if denom == 0:
        return 0.0
    return float(np.dot(arr_a, arr_b) / denom)

router = APIRouter(prefix="/chapters", tags=["chapters"])

@router.get("")
async def list_chapters(subject_id: str = ""):
    query = supabase.table("chapters").select("*").order("created_at")
    if subject_id:
        query = query.eq("subject_id", subject_id)
    return query.execute().data

@router.post("", status_code=201)
async def create_chapter(body: ChapterCreate):
    data = supabase.table("chapters").insert(body.model_dump()).execute()
    return data.data[0]

@router.get("/{chapter_id}")
async def get_chapter(chapter_id: str):
    data = supabase.table("chapters").select("*").eq("id", chapter_id).maybe_single().execute()
    if not data.data:
        raise HTTPException(404, "Chapter not found")
    return data.data

@router.patch("/{chapter_id}")
async def update_chapter(chapter_id: str, body: ChapterUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    data = supabase.table("chapters").update(updates).eq("id", chapter_id).execute()
    if not data.data:
        raise HTTPException(404, "Chapter not found")
    return data.data[0]

async def suggest_chapter_for_text(subject_id: str, text: str) -> SuggestResponse:
    chapters = supabase.table("chapters").select("id, title").eq("subject_id", subject_id).execute().data

    topic = extract_topic(text)

    if not chapters:
        return SuggestResponse(title=topic, confidence=0.0, action="new")

    try:
        topic_emb = generate_embedding(topic)
    except Exception as e:
        print(f"Embedding for suggest failed: {e}")
        return SuggestResponse(title=topic, confidence=0.0, action="new")

    best = None
    best_score = -1.0

    for ch in chapters:
        try:
            ch_emb = generate_embedding(ch["title"])
            score = cosine_similarity(topic_emb, ch_emb)
            if score > best_score:
                best_score = score
                best = ch
        except Exception:
            continue

    if best is None:
        return SuggestResponse(title=topic, confidence=0.0, action="new")

    if best_score > 0.7:
        return SuggestResponse(
            chapter_id=best["id"], title=best["title"],
            confidence=best_score, action="append",
        )
    elif best_score > 0.35:
        return SuggestResponse(
            chapter_id=best["id"], title=best["title"],
            confidence=best_score, action="ask",
        )

    return SuggestResponse(title=topic, confidence=best_score, action="new")

@router.post("/suggest")
async def suggest_chapter(body: SuggestRequest) -> SuggestResponse:
    return await suggest_chapter_for_text(body.subject_id, body.text)


@router.delete("/{chapter_id}")
async def delete_chapter(chapter_id: str):
    data = supabase.table("chapters").delete().eq("id", chapter_id).execute()
    if not data.data:
        raise HTTPException(404, "Chapter not found")
    return {"deleted": chapter_id}
