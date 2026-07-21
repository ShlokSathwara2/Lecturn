import asyncio, uuid, io
from PIL import Image, ImageDraw
from src.supabase_client import supabase
import httpx

async def main():
    img = Image.new("RGB", (800, 600), (20, 20, 30))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "Hello World Slide", fill=(200, 200, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    fn = f"test-{uuid.uuid4().hex[:8]}.jpg"
    supabase.storage.from_("slide-images").upload(fn, buf.getvalue(), {"content-type": "image/jpeg"})
    url = supabase.storage.from_("slide-images").get_public_url(fn)

    subj = supabase.table("subjects").insert({"name": "Test", "user_id": "00000000-0000-0000-0000-000000000001"}).execute().data[0]
    ch = supabase.table("chapters").insert({"subject_id": subj["id"], "title": "Test"}).execute().data[0]
    cap = supabase.table("captures").insert({"chapter_id": ch["id"], "image_url": url}).execute().data[0]
    print(f"Capture ID: {cap['id']}")

    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/process", json={"capture_id": cap["id"]}, timeout=120)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            result = r.json()
            print(f"Raw text: {result['raw_text'][:100]}")
            print(f"Diagrams: {result['diagram_count']}")
            print(f"Provider: {result['provider']}")
        else:
            print(f"Error: {r.text[:300]}")

    supabase.table("captures").delete().eq("id", cap["id"]).execute()
    supabase.table("chapters").delete().eq("id", ch["id"]).execute()
    supabase.table("subjects").delete().eq("id", subj["id"]).execute()
    supabase.storage.from_("slide-images").remove([fn])
    print("Cleaned up")

asyncio.run(main())
