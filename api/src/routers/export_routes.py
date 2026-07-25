from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from ..services.exporter import fetch_captures, build_txt, build_rtf, build_docx, build_enex, build_pdf
from ..supabase_client import supabase

router = APIRouter(prefix="/export", tags=["export"])


def _safe_single(query_result):
    data = query_result.execute().data
    return data[0] if data else None


def _resolve_subject_or_chapter(subject_id: str | None = None, chapter_id: str | None = None) -> tuple[str, list[dict]]:
    if subject_id:
        subj = _safe_single(supabase.table("subjects").select("name").eq("id", subject_id))
        if not subj:
            raise HTTPException(404, "Subject not found")
        import asyncio
        rows = asyncio.run(fetch_captures(subject_id=subject_id))
        return subj["name"], rows
    elif chapter_id:
        ch = _safe_single(supabase.table("chapters").select("title, subject_id").eq("id", chapter_id))
        if not ch:
            raise HTTPException(404, "Chapter not found")
        subj = _safe_single(supabase.table("subjects").select("name").eq("id", ch["subject_id"]))
        prefix = subj["name"] + " / " if subj else ""
        import asyncio
        rows = asyncio.run(fetch_captures(chapter_id=chapter_id))
        return f"{prefix}{ch['title']}", rows
    else:
        raise HTTPException(400, "Provide subject_id or chapter_id")


MIME_MAP = {
    "txt": "text/plain",
    "rtf": "application/rtf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "enex": "application/xml",
    "pdf": "application/pdf",
}

EXT_MAP = {
    "txt": ".txt",
    "rtf": ".rtf",
    "docx": ".docx",
    "enex": ".enex",
    "pdf": ".pdf",
}


@router.get("/subject/{subject_id}")
async def export_subject(subject_id: str, format: str = Query("docx"), include_images: bool = Query(True)):
    title, rows = _resolve_subject_or_chapter(subject_id=subject_id)
    return _build_export(rows, title, format, include_images)


@router.get("/chapter/{chapter_id}")
async def export_chapter(chapter_id: str, format: str = Query("docx"), include_images: bool = Query(True)):
    title, rows = _resolve_subject_or_chapter(chapter_id=chapter_id)
    return _build_export(rows, title, format, include_images)


def _build_export(rows: list[dict], title: str, format: str, include_images: bool = True):
    if format not in ("txt", "rtf", "docx", "enex", "pdf"):
        raise HTTPException(400, f"Unsupported format: {format}")
    if not rows:
        raise HTTPException(404, "No captures found to export")

    filename = title.replace(" ", "_").replace("/", "-") + EXT_MAP[format]
    mime = MIME_MAP[format]

    if format == "txt":
        content = build_txt(rows, title)
        return Response(content=content.encode("utf-8"), media_type=mime, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    if format == "rtf":
        import asyncio
        content = asyncio.run(build_rtf(rows, title, include_images))
        return Response(content=content, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    if format == "docx":
        import asyncio
        content = asyncio.run(build_docx(rows, title, include_images))
        return Response(content=content, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    if format == "enex":
        import asyncio
        content = asyncio.run(build_enex(rows, title, include_images))
        return Response(content=content.encode("utf-8"), media_type=mime, headers={"Content-Disposition": f'attachment; filename="{filename}"'})

    if format == "pdf":
        import asyncio
        content = asyncio.run(build_pdf(rows, title, include_images))
        return Response(content=content, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
