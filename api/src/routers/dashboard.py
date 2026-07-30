from fastapi import APIRouter
from ..supabase_client import supabase

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/{user_id}")
async def get_dashboard(user_id: str):
    subjects_data = supabase.table("subjects").select("id, name").eq("user_id", user_id).execute().data
    if not subjects_data:
        return {"subjects": [], "chapters_count": {}, "notes_count": {}, "unassigned": []}

    subject_ids = [s["id"] for s in subjects_data]
    chapters_data = supabase.table("chapters").select("id, subject_id, title").in_("subject_id", subject_ids).execute().data

    chapters_count: dict[str, int] = {}
    for ch in chapters_data:
        sid = ch["subject_id"]
        chapters_count[sid] = chapters_count.get(sid, 0) + 1

    chapter_ids = [ch["id"] for ch in chapters_data]
    if chapter_ids:
        captures_data = supabase.table("captures").select("id, chapter_id").in_("chapter_id", chapter_ids).execute().data
    else:
        captures_data = []

    notes_count: dict[str, int] = {s["id"]: 0 for s in subjects_data}
    chapter_to_subject = {ch["id"]: ch["subject_id"] for ch in chapters_data}
    for cap in captures_data:
        cid = cap.get("chapter_id")
        if cid and cid in chapter_to_subject:
            sid = chapter_to_subject[cid]
            notes_count[sid] = notes_count.get(sid, 0) + 1

    unassigned = supabase.table("captures").select("id, image_url, raw_text, ai_status, status, date_taken, chapter_id, subject_id").is_("chapter_id", "null").order("date_taken", desc=True).limit(20).execute().data

    return {
        "subjects": subjects_data,
        "chapters_count": chapters_count,
        "notes_count": notes_count,
        "unassigned": unassigned,
    }
