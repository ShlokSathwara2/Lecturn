import asyncio
import io
import uuid
from PIL import Image, ImageDraw
from src.supabase_client import supabase
from src.services.vision import process_image

FILENAME = f"test-slide-{uuid.uuid4().hex[:8]}.jpg"

def create_test_slide():
    img = Image.new("RGB", (1200, 900), (20, 20, 30))
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 1150, 150], fill=(40, 40, 60))
    draw.text((80, 70), "Binary Search Trees", fill=(200, 200, 255))
    draw.text((80, 200), "Definition:", fill=(180, 180, 200))
    draw.text((80, 240), "Left subtree contains only nodes with keys less than the node's key", fill=(200, 200, 200))
    draw.text((80, 280), "Right subtree contains only nodes with keys greater than the node's key", fill=(200, 200, 200))
    draw.text((80, 320), "Both left and right subtrees must also be binary search trees", fill=(200, 200, 200))
    draw.rectangle([80, 400, 500, 700], outline=(100, 150, 200), width=2)
    draw.text((100, 410), "Diagram placeholder", fill=(150, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

async def main():
    image_bytes = create_test_slide()
    supabase.storage.from_("slide-images").upload(FILENAME, image_bytes, {"content-type": "image/jpeg"})
    url = supabase.storage.from_("slide-images").get_public_url(FILENAME)
    print("Uploaded:", url)

    extraction = await process_image(url)
    print("=== EXTRACTION RESULT ===")
    print("Raw text:", extraction["raw_text"])
    print("Diagrams:", extraction["diagrams"])
    print("Summary:", extraction["summary"])
    print("Pipeline OK")

    supabase.storage.from_("slide-images").remove([FILENAME])
    print("Cleaned up")

asyncio.run(main())

