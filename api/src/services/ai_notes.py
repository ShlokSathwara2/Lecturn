import os
import json
import re
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE = "https://api.groq.com/openai/v1"

# Max chars of slide content to include per slide to avoid exceeding context limits
MAX_CHARS_PER_SLIDE = 1500
# Max total chars for the chapters block
MAX_TOTAL_CHARS = 25000

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
    total_chars = 0
    for ch in chapters_data:
        ch_title = ch.get("title", "Untitled Chapter")
        caps = ch.get("captures", [])
        cap_texts = []
        for i, cap in enumerate(caps, 1):
            if total_chars >= MAX_TOTAL_CHARS:
                cap_texts.append(f"  Slide {i}: [truncated — content limit reached]")
                continue
            raw = cap.get("raw_text", "").strip()
            ai = cap.get("ai_content_json", {})
            enrichment = ai.get("enrichment", {}) if ai else {}
            explanation = enrichment.get("explanation", "") if enrichment else ""
            key_points = enrichment.get("key_points", []) if enrichment else []
            parts = [f"  Slide {i}:"]
            # Prefer AI enrichment over raw text as it's more concise
            if explanation:
                text = explanation[:MAX_CHARS_PER_SLIDE]
                parts.append(f"    AI Notes: {text}")
                total_chars += len(text)
            elif raw:
                text = raw[:MAX_CHARS_PER_SLIDE]
                parts.append(f"    Raw text: {text}")
                total_chars += len(text)
            if key_points:
                kp_text = '; '.join(key_points[:8])
                parts.append(f"    Key points: {kp_text}")
                total_chars += len(kp_text)
            cap_texts.append("\n".join(parts))
        blocks.append(f"Chapter: {ch_title}\n" + "\n".join(cap_texts))
    return "\n\n".join(blocks) if blocks else "No captures available yet."


def _extract_json_from_response(raw: str) -> dict:
    """Robustly extract JSON from LLM response, handling markdown fences and control chars."""
    raw = raw.strip()

    # Remove markdown code fences
    if raw.startswith("```"):
        # Remove opening fence (with optional language tag)
        raw = re.sub(r'^```(?:json)?\s*\n?', '', raw)
        # Remove closing fence
        raw = re.sub(r'\n?```\s*$', '', raw)
        raw = raw.strip()

    # Remove control characters (but preserve newlines and tabs which are valid in JSON strings)
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', ' ', raw)

    # First attempt: parse as-is (newlines are valid inside JSON string values)
    try:
        return json.loads(raw, strict=False)
    except json.JSONDecodeError:
        pass

    # Second attempt: try to extract the JSON object with regex
    match = re.search(r'\{[\s\S]*\}', raw)
    if match:
        try:
            return json.loads(match.group(), strict=False)
        except json.JSONDecodeError:
            pass

    # Third attempt: collapse newlines inside string values only
    # This is safer than collapsing all newlines
    try:
        collapsed = re.sub(r'(?<=": ")([^"]*?)(?=")', lambda m: m.group(1).replace('\n', '\\n'), raw)
        return json.loads(collapsed, strict=False)
    except (json.JSONDecodeError, re.error):
        pass

    # Final fallback: wrap raw content as explanation
    return {
        "explanation": raw[:8000],
        "key_points": [],
        "topic_count": 0,
        "total_slides_analyzed": 0,
        "diagrams_included": [],
    }


async def _call_groq_with_retry(prompt: str, max_retries: int = 2) -> dict:
    """Call Groq API with retry logic for transient failures."""
    if not GROQ_API_KEY:
        raise Exception("Groq API key not configured")

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

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as http:
                resp = await http.post(
                    f"{GROQ_BASE}/chat/completions",
                    json=body,
                    headers=headers,
                    timeout=120,
                )

            if resp.status_code == 429:
                if attempt < max_retries:
                    wait = (attempt + 1) * 5  # 5s, 10s backoff
                    print(f"Groq rate limited, retrying in {wait}s (attempt {attempt + 1})")
                    await asyncio.sleep(wait)
                    continue
                raise Exception("Groq rate limited — please wait a minute and try again")

            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            return _extract_json_from_response(raw)

        except httpx.TimeoutException:
            last_error = "Request timed out — the subject may have too many slides. Try again."
            if attempt < max_retries:
                print(f"Groq timeout, retrying (attempt {attempt + 1})")
                await asyncio.sleep(3)
                continue
        except httpx.HTTPStatusError as e:
            last_error = f"Groq API error: {e.response.status_code}"
            if attempt < max_retries and e.response.status_code >= 500:
                await asyncio.sleep(3)
                continue
            raise Exception(last_error)
        except Exception as e:
            if "rate limited" in str(e).lower():
                raise
            last_error = str(e)
            if attempt < max_retries:
                await asyncio.sleep(2)
                continue

    raise Exception(last_error or "AI generation failed after retries")


async def generate_combined_notes(subject_name: str, chapters_data: list[dict]) -> dict:
    chapters_block = build_chapters_block(chapters_data)
    total_slides = sum(len(ch.get("captures", [])) for ch in chapters_data)

    prompt = COMBINED_NOTES_PROMPT.format(
        subject_name=subject_name,
        chapters_block=chapters_block,
    )

    result = await _call_groq_with_retry(prompt)

    return {
        "explanation": result.get("explanation", ""),
        "key_points": result.get("key_points", []),
        "topic_count": result.get("topic_count", 0),
        "total_slides_analyzed": total_slides,
        "diagrams_included": result.get("diagrams_included", []),
    }
