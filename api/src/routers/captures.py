from fastapi import APIRouter, HTTPException, UploadFile, File
from ..models import CaptureCreate, CaptureUpdate
from ..supabase_client import supabase
import uuid

router = APIRouter(prefix="/captures", tags=["captures"])
BUCKET_NAME = "slide-images"

@router.get("")
async def list_captures(chapter_id: str = ""):
    query = supabase.table("captures").select("*").order("date_taken")
    if chapter_id:
        query = query.eq("chapter_id", chapter_id)
    return query.execute().data

@router.post("", status_code=201)
async def create_capture(body: CaptureCreate):
    data = body.model_dump()
    if not data.get("chapter_id"):
        data.pop("chapter_id", None)
    result = supabase.table("captures").insert(data).execute()
    return result.data[0]

@router.get("/{capture_id}")
async def get_capture(capture_id: str):
    data = supabase.table("captures").select("*").eq("id", capture_id).maybe_single().execute()
    if not data.data:
        raise HTTPException(404, "Capture not found")
    return data.data

@router.patch("/{capture_id}")
async def update_capture(capture_id: str, body: CaptureUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    data = supabase.table("captures").update(updates).eq("id", capture_id).execute()
    if not data.data:
        raise HTTPException(404, "Capture not found")
    return data.data[0]

@router.delete("/{capture_id}")
async def delete_capture(capture_id: str):
    data = supabase.table("captures").delete().eq("id", capture_id).execute()
    if not data.data:
        raise HTTPException(404, "Capture not found")
    return {"deleted": capture_id}

@router.post("/upload")
async def upload_capture_image(file: UploadFile = File(...)):
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{file_ext}"
    content = await file.read()
    supabase.storage.from_(BUCKET_NAME).upload(
        file_name, content, {"content-type": file.content_type or "image/jpeg"}
    )
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
    return {"filename": file_name, "url": public_url}
