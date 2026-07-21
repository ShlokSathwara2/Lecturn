import asyncio, uuid, io
from PIL import Image, ImageDraw
from src.supabase_client import supabase
import httpx

async def main():
    img = Image.new("RGB", (800, 600), (20, 20, 30))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "Binary Search Trees", fill=(200, 200, 255))
    draw.text((50, 100), "Left < parent < right", fill=(200, 200, 200))
    draw.text((50, 140), "Each node has 0, 1, or 2 children", fill=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    fn = f"test-{uuid.uuid4().hex[:8]}.jpg"
    supabase.storage.from_("slide-images").upload(fn, buf.getvalue(), {"content-type": "image/jpeg"})
    url = supabase.storage.from_("slide-images").get_public_url(fn)

    subj = supabase.table("subjects").insert({"name": "Test", "user_id": "00000000-0000-0000-0000-000000000001"}).execute().data[0]
    ch = supabase.table("chapters").insert({"subject_id": subj["id"], "title": "Test"}).execute().data[0]
    cap = supabase.table("captures").insert({"chapter_id": ch["id"], "image_url": url}).execute().data[0]
    print(f"Capture: {cap['id']}")

    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/process", json={"capture_id": cap["id"]}, timeout=120)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Raw text: {data['raw_text'][:80]}")
            print(f"Provider: {data['provider']}")

    updated = supabase.table("captures").select("ai_content_json").eq("id", cap["id"]).maybe_single().execute()
    ai = updated.data.get("ai_content_json", {}) if updated.data else {}
    enrichment = ai.get("enrichment", {})
    has_explanation = bool(enrichment.get("explanation"))
    print(f"Enrichment present: {has_explanation}")
    if has_explanation:
        print(f"Explanation preview: {enrichment['explanation'][:100]}")

    supabase.table("captures").delete().eq("id", cap["id"]).execute()
    supabase.table("chapters").delete().eq("id", ch["id"]).execute()
    supabase.table("subjects").delete().eq("id", subj["id"]).execute()
    supabase.storage.from_("slide-images").remove([fn])

asyncio.run(main())
