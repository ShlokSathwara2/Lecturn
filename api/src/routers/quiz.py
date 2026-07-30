from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..supabase_client import supabase

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/{subject_id}")
async def get_subject_quiz(subject_id: str, chapters: Optional[str] = Query(None)):
    query = supabase.table("chapters").select("id, title").eq("subject_id", subject_id)
    
    if chapters:
        chapter_ids_filter = [c.strip() for c in chapters.split(",") if c.strip()]
        if chapter_ids_filter:
            query = query.in_("id", chapter_ids_filter)
    
    chapters_data = query.execute().data
    if not chapters_data:
        raise HTTPException(404, "Subject not found or has no chapters")

    chapter_ids = [ch["id"] for ch in chapters_data]
    chapter_map = {ch["id"]: ch["title"] for ch in chapters_data}

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
        
        front = "Slide"
        if lines:
            title = lines[0][:120]
            if key_points:
                front = f"{title}\n\nKey concept: {key_points[0][:100]}"
            elif len(lines) > 1:
                front = f"{title}\n\n{lines[1][:100]}"
            else:
                front = title

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
