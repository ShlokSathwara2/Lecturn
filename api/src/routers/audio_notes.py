from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from ..models import AudioNoteCreate
from ..supabase_client import supabase
from ..services.transcription import transcribe_audio
import uuid
from datetime import date

router = APIRouter(prefix="/audio-notes", tags=["audio_notes"])
BUCKET_NAME = "slide-images"

@router.get("")
async def list_audio_notes(capture_id: str = ""):
    query = supabase.table("audio_notes").select("*")
    if capture_id:
        query = query.eq("capture_id", capture_id)
    return query.execute().data

@router.post("", status_code=201)
async def create_audio_note(body: AudioNoteCreate):
    data = supabase.table("audio_notes").insert(body.model_dump()).execute()
    return data.data[0]

@router.post("/upload", status_code=201)
async def upload_audio_note(capture_id: str = Form(...), file: UploadFile = File(...)):
    content = await file.read()

    ext = file.filename.split(".")[-1] if "." in file.filename else "webm"
    file_name = f"audio/{capture_id}/{uuid.uuid4()}.{ext}"

    supabase.storage.from_(BUCKET_NAME).upload(
        file_name, content, {"content-type": file.content_type or "audio/webm"}
    )
    audio_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)

    transcript = await transcribe_audio(content, filename=file.filename or "audio.webm")

    result = supabase.table("audio_notes").insert({
        "capture_id": capture_id,
        "audio_url": audio_url,
        "transcript": transcript,
    }).execute()

    supabase.table("api_usage_log").insert({
        "provider": "groq-whisper",
        "date": str(date.today()),
        "request_count": 1,
    }).execute()

    return result.data[0]

@router.get("/{note_id}")
async def get_audio_note(note_id: str):
    data = supabase.table("audio_notes").select("*").eq("id", note_id).maybe_single().execute()
    if not data.data:
        raise HTTPException(404, "Audio note not found")
    return data.data

@router.delete("/{note_id}")
async def delete_audio_note(note_id: str):
    data = supabase.table("audio_notes").delete().eq("id", note_id).execute()
    if not data.data:
        raise HTTPException(404, "Audio note not found")
    return {"deleted": note_id}
