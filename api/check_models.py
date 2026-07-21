import os, requests
from dotenv import load_dotenv
load_dotenv()
key = os.getenv("OPENROUTER_API_KEY")
r = requests.get("https://openrouter.ai/api/v1/models", headers={"Authorization": f"Bearer {key}"})
data = r.json()["data"]
print(f"Total models: {len(data)}")
vision = [m["id"] for m in data if any(x in m["id"].lower() for x in ["qwen", "llama", "gemini", "claude", "gpt", "vision"])]
print("Vision-capable:", vision[:20])

for t in ["google/gemini-2.5-flash-lite:free", "qwen/qwen-vl-plus:free", "qwen/qwen-vl-plus"]:
    exists = any(m["id"] == t for m in data)
    print(f"{t}: {'found' if exists else 'NOT FOUND'}")
