import asyncio, uuid, io
from PIL import Image, ImageDraw
from src.supabase_client import supabase
import httpx

async def main():
    img = Image.new("RGB", (800, 600), (20, 20, 30))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "Quick Sort Algorithm", fill=(200, 200, 255))
    draw.text((50, 100), "Divide and conquer", fill=(200, 200, 200))
    draw.text((50, 140), "Pick a pivot, partition, recurse", fill=(200, 200, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    fn = f"test-{uuid.uuid4().hex[:8]}.jpg"
    supabase.storage.from_("slide-images").upload(fn, buf.getvalue(), {"content-type": "image/jpeg"})
    url = supabase.storage.from_("slide-images").get_public_url(fn)

    subj = supabase.table("subjects").insert({"name": "DSA", "user_id": "00000000-0000-0000-0000-000000000001"}).execute().data[0]
    ch = supabase.table("chapters").insert({"subject_id": subj["id"], "title": "Sorting"}).execute().data[0]

    cap1 = supabase.table("captures").insert({"chapter_id": ch["id"], "image_url": url, "ai_status": "not_generated", "status": "pending"}).execute().data[0]
    cap2 = supabase.table("captures").insert({"chapter_id": ch["id"], "image_url": url, "ai_status": "not_generated", "status": "pending"}).execute().data[0]
    print(f"Created offline captures: {cap1['id'][:8]}... {cap2['id'][:8]}...")

    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/process/batch", json={
            "capture_ids": [cap1["id"], cap2["id"]],
            "format": "exam-oriented",
        }, timeout=180)
        print(f"Batch status: {r.status_code}")
        if r.status_code == 200:
            results = r.json()
            for res in results:
                print(f"  {res['capture_id'][:8]}... raw_text={res['raw_text'][:40]} provider={res['provider']}")

    cap1_upd = supabase.table("captures").select("ai_status").eq("id", cap1["id"]).maybe_single().execute()
    cap2_upd = supabase.table("captures").select("ai_status").eq("id", cap2["id"]).maybe_single().execute()
    print(f"Cap1 status: {cap1_upd.data['ai_status']}")
    print(f"Cap2 status: {cap2_upd.data['ai_status']}")
    print(f"Both manually_generated: {cap1_upd.data['ai_status'] == 'manually_generated' and cap2_upd.data['ai_status'] == 'manually_generated'}")

    supabase.table("captures").delete().eq("id", cap1["id"]).execute()
    supabase.table("captures").delete().eq("id", cap2["id"]).execute()
    supabase.table("chapters").delete().eq("id", ch["id"]).execute()
    supabase.table("subjects").delete().eq("id", subj["id"]).execute()
    supabase.storage.from_("slide-images").remove([fn])
    print("Cleaned up")

asyncio.run(main())
