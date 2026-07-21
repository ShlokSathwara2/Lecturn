from fastapi import APIRouter, Query
from ..supabase_client import supabase
from ..services.embeddings import generate_embedding

router = APIRouter(prefix="/search", tags=["search"])

@router.get("")
async def search_captures(
    q: str = "",
    subject_id: str = "",
    chapter_id: str = "",
    ai_status: str = "",
    date_from: str = "",
    date_to: str = "",
    needs_review: bool = False,
):
    builder = supabase.table("captures").select("*, chapters!inner(id, title, subject_id)")

    if q:
        safe_q = q.replace("'", "''")
        builder = builder.or_(f"raw_text.ilike.%{safe_q}%,ai_content_json->>raw_text.ilike.%{safe_q}%,ai_content_json->enrichment->>explanation.ilike.%{safe_q}%")

    if chapter_id:
        builder = builder.eq("chapter_id", chapter_id)

    if subject_id:
        builder = builder.eq("chapters.subject_id", subject_id)

    if ai_status:
        builder = builder.eq("ai_status", ai_status)

    if needs_review:
        builder = builder.eq("status", "needs_review")

    if date_from:
        builder = builder.gte("date_taken", date_from)

    if date_to:
        builder = builder.lte("date_taken", date_to)

    builder = builder.order("date_taken", desc=True).limit(50)
    return builder.execute().data


@router.get("/semantic")
async def semantic_search(
    q: str = Query(..., min_length=3),
    subject_id: str = "",
    ai_status: str = "",
    match_threshold: float = 0.4,
    match_count: int = 20,
):
    try:
        emb = generate_embedding(q)
    except Exception as e:
        return {"error": f"Embedding failed: {e}"}

    params = {
        "query_embedding": emb,
        "match_threshold": match_threshold,
        "match_count": match_count,
    }

    if subject_id:
        params["filter_subject_id"] = subject_id
    if ai_status:
        params["filter_ai_status"] = ai_status

    try:
        results = supabase.rpc("search_captures_semantic", params).execute()
        return results.data
    except Exception as e:
        return {"error": f"Semantic search failed: {e}"}
