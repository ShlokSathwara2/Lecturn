from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from .routers import subjects, chapters, captures, audio_notes, usage_log, process, search, quiz, export_routes as export_router

app = FastAPI(title="SlideScribe API", version="1.0.0")

origins = os.getenv("ALLOWED_ORIGINS", "")
if origins:
    origin_list = [o.strip() for o in origins.split(",") if o.strip()]
else:
    app_url = os.getenv("NEXT_PUBLIC_APP_URL", "")
    origin_list = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(subjects.router)
app.include_router(chapters.router)
app.include_router(captures.router)
app.include_router(audio_notes.router)
app.include_router(usage_log.router)
app.include_router(process.router)
app.include_router(search.router)
app.include_router(quiz.router)
app.include_router(export_router.router)

@app.get("/health")
async def health():
    from .supabase_client import supabase
    return {"status": "ok", "service": "slidescribe-api", "db_connected": supabase is not None}
