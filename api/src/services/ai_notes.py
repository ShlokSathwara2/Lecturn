import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE = "https://api.groq.com/openai/v1"

COMBINED_NOTES_PROMPT = """You are an expert study assistant. You are given ALL the raw text and AI-generated content from every lecture slide capture in a subject. Your job is to combine everything into ONE comprehensive, well-organized study note.

Subject: {subject_name}

Here are all the captures from this subject, organized by chapter:

{chapters_block}

TASK:
Create a single, comprehensive study guide that:
1. Synthesizes ALL the content above into one cohesive document
2. Organizes the material by topic/theme (not by individual slide)
3. Includes clear headings and subheadings
4. Uses bullet points, numbered lists, and tables where appropriate
5. Adds ASCII diagrams, flowcharts, and visual representations using markdown art where they help explain concepts
6. Highlights key definitions, formulas, and important concepts in bold
7. Creates a "Quick Reference" section at the end with the most critical points
8. Adds helpful analogies and examples to make complex topics easier to understand
9. Identifies connections between different topics

FORMAT:
Use markdown with these sections:
- # Subject Name - Complete Study Guide
- ## Overview (brief intro to the subject)
- ## Topic sections (one per major topic/theme, with subtopics)
- ### Key Definitions (within each topic)
- ### Diagrams & Flowcharts (ASCII art where helpful)
- ### Examples & Applications
- ## Quick Reference Card (bulleted summary of everything critical)
- ## Common Exam Questions (predict likely questions based on content)

Be thorough but concise. A student should be able to study from this single document and understand the entire subject.

Return ONLY valid JSON with this structure:
{{
  "explanation": "string (the full combined study notes in markdown)",
  "key_points": ["string", "string", ...],
  "topic_count": 0,
  "total_slides_analyzed": 0,
  "diagrams_included": ["string describing each diagram/flowchart added"]
}}
"""


def build_chapters_block(chapters_data: list[dict]) -> str:
    blocks = []
    for ch in chapters_data:
        ch_title = ch.get("title", "Untitled Chapter")
        caps = ch.get("captures", [])
        cap_texts = []
        for i, cap in enumerate(caps, 1):
            raw = cap.get("raw_text", "").strip()
            ai = cap.get("ai_content_json", {})
            enrichment = ai.get("enrichment", {}) if ai else {}
            explanation = enrichment.get("explanation", "") if enrichment else ""
            key_points = enrichment.get("key_points", []) if enrichment else []
            parts = [f"  Slide {i}:"]
            if raw:
                parts.append(f"    Raw text: {raw[:2000]}")
            if explanation:
                parts.append(f"    AI Notes: {explanation[:2000]}")
            if key_points:
                parts.append(f"    Key points: {'; '.join(key_points[:10])}")
            cap_texts.append("\n".join(parts))
        blocks.append(f"Chapter: {ch_title}\n" + "\n".join(cap_texts))
    return "\n\n".join(blocks) if blocks else "No captures available yet."


async def generate_combined_notes(subject_name: str, chapters_data: list[dict]) -> dict:
    if not GROQ_API_KEY:
        raise Exception("Groq API key not configured")

    chapters_block = build_chapters_block(chapters_data)
    total_slides = sum(len(ch.get("captures", [])) for ch in chapters_data)

    prompt = COMBINED_NOTES_PROMPT.format(
        subject_name=subject_name,
        chapters_block=chapters_block,
    )

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    body = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 8192,
    }

    async with httpx.AsyncClient() as http:
        resp = await http.post(f"{GROQ_BASE}/chat/completions", json=body, headers=headers, timeout=60)

    if resp.status_code == 429:
        raise Exception("Groq rate limited")

    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    result = json.loads(raw)

    return {
        "explanation": result.get("explanation", ""),
        "key_points": result.get("key_points", []),
        "topic_count": result.get("topic_count", 0),
        "total_slides_analyzed": total_slides,
        "diagrams_included": result.get("diagrams_included", []),
    }
