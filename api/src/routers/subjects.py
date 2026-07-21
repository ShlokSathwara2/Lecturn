from fastapi import APIRouter, HTTPException
from ..models import SubjectCreate, SubjectUpdate, SubjectOut
from ..supabase_client import supabase

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("")
async def list_subjects(user_id: str = ""):
    query = supabase.table("subjects").select("*").order("name")
    if user_id:
        query = query.eq("user_id", user_id)
    data = query.execute()
    return data.data

@router.post("", status_code=201)
async def create_subject(body: SubjectCreate):
    data = supabase.table("subjects").insert(body.model_dump()).execute()
    return data.data[0]

@router.get("/{subject_id}")
async def get_subject(subject_id: str):
    data = supabase.table("subjects").select("*").eq("id", subject_id).maybe_single().execute()
    if not data.data:
        raise HTTPException(404, "Subject not found")
    return data.data

@router.patch("/{subject_id}")
async def update_subject(subject_id: str, body: SubjectUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    data = supabase.table("subjects").update(updates).eq("id", subject_id).execute()
    if not data.data:
        raise HTTPException(404, "Subject not found")
    return data.data[0]

@router.delete("/{subject_id}")
async def delete_subject(subject_id: str):
    data = supabase.table("subjects").delete().eq("id", subject_id).execute()
    if not data.data:
        raise HTTPException(404, "Subject not found")
    return {"deleted": subject_id}
