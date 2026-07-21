from fastapi import APIRouter, HTTPException
from ..supabase_client import supabase

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/{subject_id}")
async def get_subject_quiz(subject_id: str):
    chapters = supabase.table("chapters").select("id, title").eq("subject_id", subject_id).execute().data
    if not chapters:
        raise HTTPException(404, "Subject not found or has no chapters")

    chapter_ids = [ch["id"] for ch in chapters]
    chapter_map = {ch["id"]: ch["title"] for ch in chapters}

    captures = supabase.table("captures").select(
        "id, chapter_id, raw_text, ai_content_json"
    ).in_("chapter_id", chapter_ids).execute().data

    cards = []
    for cap in captures:
        ai = cap.get("ai_content_json") or {}
        enrichment = ai.get("enrichment") or {}
        explanation = enrichment.get("explanation") or ""
        key_points = enrichment.get("key_points") or []
        if not explanation:
            continue

        raw = cap.get("raw_text") or ""
        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        front = lines[0][:120] if lines else "Slide"

        cards.append({
            "id": cap["id"],
            "chapter_id": cap["chapter_id"],
            "chapter_title": chapter_map.get(cap["chapter_id"], ""),
            "front": front,
            "back": explanation,
            "key_points": key_points[:5],
        })

    return {
        "subject_id": subject_id,
        "total_cards": len(cards),
        "cards": cards,
    }
