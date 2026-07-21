from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..supabase_client import supabase
from ..services.vision import process_image
from ..services.diagrams import process_diagrams
from ..services.enrichment import enrich_text
from ..services.embeddings import generate_embedding
from ..services.quality import compute_image_hash, hamming_distance, score_confidence
from .chapters import suggest_chapter_for_text
from datetime import date

router = APIRouter(prefix="/process", tags=["process"])

class ProcessRequest(BaseModel):
    capture_id: str

class BatchProcessRequest(BaseModel):
    capture_ids: list[str]
    format: str = "exam-oriented"

class DiagramOut(BaseModel):
    description: str
    original_crop_url: str | None = None
    cleaned_description: str | None = None

class ProcessResponse(BaseModel):
    capture_id: str
    raw_text: str
    diagram_count: int
    summary: str
    provider: str
    diagrams: list[DiagramOut] = []
    chapter_id: str | None = None
    chapter_title: str | None = None

async def process_single_capture(capture_id: str, format: str = "exam-oriented", ai_status: str = "auto_generated") -> ProcessResponse:
    capture = supabase.table("captures").select("*").eq("id", capture_id).maybe_single().execute()
    if not capture.data:
        raise HTTPException(404, f"Capture {capture_id} not found")

    image_url = capture.data.get("image_url")
    existing_raw = capture.data.get("raw_text")

    if not image_url and not existing_raw:
        raise HTTPException(400, f"Capture {capture_id} has no image URL and no text")

    if existing_raw:
        raw_text = existing_raw
        provider = "from_cache"
        diagrams = capture.data.get("ai_content_json", {}).get("diagrams", [])
        diagram_results = []
    else:
        result = await process_image(image_url)
        provider = result.get("provider", "unknown")
        raw_text = result.get("raw_text", "")
        diagrams = result.get("diagrams", [])
        diagram_results = []
        if diagrams:
            try:
                diagram_results = await process_diagrams(image_url, diagrams)
            except Exception as e:
                print(f"Diagram processing failed: {e}")

    image_hash = None
    if image_url and not existing_raw:
        image_hash = await compute_image_hash(image_url)

    if image_hash and not existing_raw:
        existing_hash = supabase.table("captures").select("id, image_hash").neq("id", capture_id).execute().data
        for cap in existing_hash:
            if cap.get("image_hash"):
                dist = hamming_distance(image_hash, cap["image_hash"])
                if dist < DUPLICATE_THRESHOLD:
                    print(f"Duplicate detected: {capture_id} matches {cap['id']} (dist={dist})")
                    update_data = {
                        "image_hash": image_hash,
                        "ai_status": "auto_generated",
                        "status": "duplicate",
                    }
                    supabase.table("captures").update(update_data).eq("id", capture_id).execute()
                    return ProcessResponse(
                        capture_id=capture_id, raw_text=raw_text or "",
                        diagram_count=0, summary="Duplicate slide skipped", provider="duplicate",
                    )

    enrichment = None
    if raw_text:
        try:
            enrichment = await enrich_text(raw_text, format=format)
        except Exception as e:
            print(f"Enrichment failed: {e}")

    chapter_id = capture.data.get("chapter_id")
    if not chapter_id and raw_text:
        subject_id = capture.data.get("subject_id")
        if subject_id:
            try:
                suggestion = await suggest_chapter_for_text(subject_id, raw_text)
                if suggestion.action == "append" and suggestion.chapter_id:
                    chapter_id = suggestion.chapter_id
                elif suggestion.action == "new" and suggestion.title:
                    new_ch = supabase.table("chapters").insert({
                        "subject_id": subject_id, "title": suggestion.title,
                    }).execute()
                    if new_ch.data:
                        chapter_id = new_ch.data[0]["id"]
                # action == "ask": leave chapter_id as null for frontend to resolve
            except Exception as e:
                print(f"Chapter suggestion failed: {e}")

    ai_content = {
        "raw_text": raw_text,
        "diagrams": diagrams,
        "enrichment": enrichment,
    }
    if not existing_raw:
        ai_content["provider"] = provider

    update_data = {
        "raw_text": raw_text,
        "chapter_id": chapter_id,
        "ai_content_json": ai_content,
        "ai_status": ai_status,
        "status": "processed",
    }

    if existing_raw and diagram_results:
        first = diagram_results[0]
        if first.get("original_crop_url"):
            update_data["original_diagram_crop_url"] = first["original_crop_url"]

    if raw_text:
        confidence, status_label = score_confidence(raw_text, enrichment.get("explanation") if enrichment else None)
        update_data["confidence_score"] = confidence
        if status_label == "needs_review":
            update_data["status"] = "needs_review"

    if image_hash:
        update_data["image_hash"] = image_hash

    try:
        emb_text = f"{raw_text} {enrichment.get('explanation', '') if enrichment else ''}"
        update_data["embedding"] = generate_embedding(emb_text)
    except Exception as e:
        print(f"Embedding generation failed: {e}")

    supabase.table("captures").update(update_data).eq("id", capture_id).execute()

    supabase.table("api_usage_log").insert({
        "provider": provider if not existing_raw else "enrichment_only",
        "date": str(date.today()),
        "request_count": 1,
    }).execute()

    ch_title = None
    if chapter_id:
        ch = supabase.table("chapters").select("title").eq("id", chapter_id).maybe_single().execute()
        if ch.data:
            ch_title = ch.data["title"]

    return ProcessResponse(
        capture_id=capture_id,
        raw_text=raw_text,
        diagram_count=len(diagram_results if existing_raw else diagrams),
        summary=enrichment.get("explanation", "")[:100] if enrichment else "",
        provider=provider if not existing_raw else "enrichment_only",
        diagrams=[DiagramOut(description=d.get("description", ""), original_crop_url=d.get("original_crop_url")) for d in (diagram_results or diagrams)],
        chapter_id=chapter_id,
        chapter_title=ch_title,
    )

@router.post("")
async def process_capture(body: ProcessRequest) -> ProcessResponse:
    return await process_single_capture(body.capture_id)

@router.post("/batch")
async def process_batch(body: BatchProcessRequest) -> list[ProcessResponse]:
    results = []
    for cid in body.capture_ids:
        try:
            result = await process_single_capture(cid, format=body.format, ai_status="manually_generated")
            results.append(result)
        except Exception as e:
            results.append(ProcessResponse(
                capture_id=cid, raw_text="", diagram_count=0,
                summary=f"Failed: {e}", provider="error",
            ))
    return results
