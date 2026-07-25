from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..supabase_client import supabase
from ..services.ai_notes import generate_combined_notes

router = APIRouter(prefix="/ai-notes", tags=["ai-notes"])


class GenerateNotesRequest(BaseModel):
    subject_id: str
    user_id: str


class NotesOut(BaseModel):
    id: str
    subject_id: str
    content: dict
    created_at: str
    updated_at: str | None = None


def _safe_single(result):
    data = result.data
    if isinstance(data, list):
        return data[0] if data else None
    return data


@router.post("/generate")
async def generate_notes(body: GenerateNotesRequest):
    subject = _safe_single(
        supabase.table("subjects").select("*").eq("id", body.subject_id).execute()
    )
    if not subject:
        raise HTTPException(404, "Subject not found")

    chapters_raw = supabase.table("chapters").select("*").eq("subject_id", body.subject_id).execute().data or []

    chapters_data = []
    for ch in chapters_raw:
        caps = supabase.table("captures").select("*").eq("chapter_id", ch["id"]).execute().data or []
        caps_with_content = []
        for cap in caps:
            caps_with_content.append({
                "raw_text": cap.get("raw_text", ""),
                "ai_content_json": cap.get("ai_content_json"),
            })
        chapters_data.append({
            "title": ch.get("title", "Untitled"),
            "captures": caps_with_content,
        })

    total_slides = sum(len(ch["captures"]) for ch in chapters_data)
    if total_slides == 0:
        raise HTTPException(400, "No captures found for this subject. Capture some slides first!")

    try:
        result = await generate_combined_notes(subject["name"], chapters_data)
    except Exception as e:
        raise HTTPException(500, f"AI generation failed: {e}")

    content_json = {
        "combined_notes": True,
        "subject_id": body.subject_id,
        "subject_name": subject["name"],
        "explanation": result["explanation"],
        "key_points": result["key_points"],
        "topic_count": result["topic_count"],
        "total_slides_analyzed": result["total_slides_analyzed"],
        "diagrams_included": result.get("diagrams_included", []),
    }

    existing = _safe_single(
        supabase.table("captures")
        .select("id")
        .eq("subject_id", body.subject_id)
        .eq("ai_status", "ai_notes")
        .execute()
    )

    if existing:
        supabase.table("captures").update({
            "ai_content_json": content_json,
            "raw_text": result["explanation"][:5000],
        }).eq("id", existing["id"]).execute()
        note_id = existing["id"]
    else:
        new_cap = _safe_single(
            supabase.table("captures").insert({
                "subject_id": body.subject_id,
                "raw_text": result["explanation"][:5000],
                "ai_content_json": content_json,
                "ai_status": "ai_notes",
                "status": "processed",
            }).execute()
        )
        note_id = new_cap["id"] if new_cap else None

    supabase.table("api_usage_log").insert({
        "provider": "groq_ai_notes",
        "date": __import__("datetime").date.today().isoformat(),
        "request_count": 1,
    }).execute()

    return {
        "id": note_id,
        "subject_id": body.subject_id,
        "content": content_json,
        "total_slides_analyzed": result["total_slides_analyzed"],
        "topic_count": result["topic_count"],
    }


@router.get("/{subject_id}")
async def get_notes(subject_id: str):
    existing = _safe_single(
        supabase.table("captures")
        .select("*")
        .eq("subject_id", subject_id)
        .eq("ai_status", "ai_notes")
        .execute()
    )

    if not existing:
        raise HTTPException(404, "No AI notes found for this subject")

    return {
        "id": existing["id"],
        "subject_id": subject_id,
        "content": existing.get("ai_content_json", {}),
        "created_at": existing.get("date_taken", ""),
        "updated_at": existing.get("updated_at"),
    }


@router.delete("/{subject_id}")
async def delete_notes(subject_id: str):
    existing = _safe_single(
        supabase.table("captures")
        .select("id")
        .eq("subject_id", subject_id)
        .eq("ai_status", "ai_notes")
        .execute()
    )
    if not existing:
        raise HTTPException(404, "No AI notes found")

    supabase.table("captures").delete().eq("id", existing["id"]).execute()
    return {"deleted": True}
