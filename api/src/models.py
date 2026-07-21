from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- Subjects ---
class SubjectCreate(BaseModel):
    name: str
    user_id: str

class SubjectUpdate(BaseModel):
    name: Optional[str] = None

class SubjectOut(BaseModel):
    id: str
    name: str
    user_id: str

# --- Chapters ---
class ChapterCreate(BaseModel):
    subject_id: str
    title: str

class ChapterUpdate(BaseModel):
    title: Optional[str] = None

class ChapterOut(BaseModel):
    id: str
    subject_id: str
    title: str
    created_at: str

# --- Captures ---
class CaptureCreate(BaseModel):
    chapter_id: Optional[str] = None
    subject_id: Optional[str] = None
    image_url: Optional[str] = None
    raw_text: Optional[str] = None
    ai_status: str = "not_generated"
    status: str = "pending"
    image_hash: Optional[str] = None

class CaptureUpdate(BaseModel):
    raw_text: Optional[str] = None
    ai_content_json: Optional[dict] = None
    ai_status: Optional[str] = None
    confidence_score: Optional[float] = None
    status: Optional[str] = None
    subject_id: Optional[str] = None
    chapter_id: Optional[str] = None
    image_hash: Optional[str] = None
    cleaned_diagram_url: Optional[str] = None
    original_diagram_crop_url: Optional[str] = None

class CaptureOut(BaseModel):
    id: str
    chapter_id: Optional[str] = None
    date_taken: str
    image_url: Optional[str] = None
    raw_text: Optional[str] = None
    cleaned_diagram_url: Optional[str] = None
    original_diagram_crop_url: Optional[str] = None
    ai_content_json: Optional[dict] = None
    ai_status: str
    confidence_score: Optional[float] = None
    status: str
    updated_at: Optional[str] = None

# --- Audio Notes ---
class AudioNoteCreate(BaseModel):
    capture_id: str
    transcript: Optional[str] = None
    audio_url: Optional[str] = None

class AudioNoteOut(BaseModel):
    id: str
    capture_id: str
    transcript: Optional[str] = None
    audio_url: Optional[str] = None

# --- API Usage Log ---
class ApiUsageLogCreate(BaseModel):
    provider: str
    request_count: int = 1

class ApiUsageLogOut(BaseModel):
    id: str
    provider: str
    date: str
    request_count: int
