# SlideScribe — Lecture Slide → Notes AI Tool
### Full Roadmap (Mobile-First, Free-Tier Stack)

## Stack Summary
- **Frontend:** Next.js (App Router) as an installable PWA — mobile-first, camera-native
- **Backend:** FastAPI
- **DB / Storage / Auth:** Supabase (Postgres + pgvector + Storage buckets + Auth)
- **Vision extraction (primary):** Gemini 2.5 Flash / Flash-Lite (multimodal — text + diagram bounding boxes)
- **Vision extraction (fallback):** OpenRouter free vision models (Qwen-VL, Llama-4 Vision) — triggered if Gemini's daily quota is hit
- **Fast text pass (exam-content generation, audio transcription):** Groq (Whisper + Llama models)
- **Deploy:** Vercel (frontend + FastAPI as serverless functions) + Supabase (managed DB)

---

## Phase 0 — Foundations & Architecture
- Set up monorepo: `/app` (Next.js PWA), `/api` (FastAPI), `/shared` (types)
- Create Supabase project: Postgres + pgvector extension + Storage bucket (`slide-images`)
- Get API keys: Gemini (AI Studio), Groq, OpenRouter — store in `.env`, never commit
- Decide DB schema early (see Phase 1) since everything else depends on it
- **Deliverable:** repo scaffolded, all services provisioned, "hello world" round-trip (upload image → stored in Supabase bucket)

## Phase 1 — Data Model
Core tables:
- `subjects` (id, name, user_id)
- `chapters` (id, subject_id, title, created_at) — the real unit of continuity (e.g. "DSA — Trees"), not just the subject
- `captures` (id, chapter_id, date_taken, image_url, raw_text, cleaned_diagram_url, original_diagram_crop_url, ai_content_json, ai_status: "not_generated" | "auto_generated" | "manually_generated", confidence_score, status: "pending" | "processed" | "needs_review", embedding vector) — one row per photo taken; multiple captures append into the same chapter over time
- `audio_notes` (id, capture_id, transcript, audio_url)
- `api_usage_log` (provider, date, request_count) — powers the quota dashboard later
- **Deliverable:** schema migrated in Supabase, basic CRUD tested via API

Phase 1.5 — Visual Identity & Design System

Establish this before building any real UI, so every later phase builds on a consistent system instead of retrofitting a look later.

Signature moment: the "scan" — on capture, a thin HUD scan-line sweeps top-to-bottom across the image in sync with actual OCR/AI processing time, with detected text blocks and diagram bounding boxes outlining themselves in glowing blue as they're found. This is the one place to spend real design effort; keep everything else quiet around it
Color tokens: deep charcoal/near-black base (not pure black — reads more "instrument panel" than battery-saver mode), with a single confident electric blue accent reserved exclusively for AI-generated content and the scan effect — never used decoratively elsewhere, so it keeps its meaning
Type tokens: a monospace face (Plex Mono or similar) for timestamps/metadata (reads like instrument readouts), paired with a clean readable body face (Inter or similar) for verbatim/AI note text — consistent with the type pairing approach used in Global Deal Finder
Ambient background: a subtle, slow-drifting gradient mesh or very low-key particle field (dialed down far more than the FRIDAY orb — barely-there motion so it doesn't distract during actual studying), with prefers-reduced-motion fully respected
Micro-interaction rules: ripple-on-tap for the capture button, haptic feedback on capture/save/AI-ready events, swipe gestures on note blocks (edit / mark reviewed), long-press for quick actions instead of always-visible icons
Transition rules: shared-element transitions between chapter cards and their opened note view (Framer Motion layoutId), content-shaped skeleton loaders (not generic spinners), spring-physics bottom sheets for filters/search
Libraries: Framer Motion (transitions, gestures, spring physics), Lottie for the scan/detection animation if CSS/SVG alone isn't polished enough, plain CSS custom properties for the ambient background (cheaper on mobile battery than canvas/WebGL for something this subtle)
Discipline check: one scan effect, one ambient background style, restrained micro-interactions throughout — resist adding multiple animation styles across different screens, which reads as unpolished rather than intentional
Deliverable: a small style-guide reference (colors, type scale, the scan animation prototype, one example capture block with correct blue AI styling) built and agreed on before Phase 3's UI work begins

## Phase 2 — Auth
- Supabase Auth: email or phone OTP (simple, since it's mainly for you + maybe a couple friends)
- Session handling in Next.js middleware
- **Deliverable:** login/signup flow working on mobile browser

## Phase 3 — Mobile-First Capture UI
- PWA manifest + service worker (installable, feels like an app on your phone home screen)
- Camera capture via `<input type="file" accept="image/*" capture="environment">` — opens phone camera directly, no gallery detour
- Big, thumb-reachable capture button; instant local preview before upload
- Subject/chapter picker (or "auto-detect later" placeholder for now — Phase 10.5 makes this automatic)
- **Deliverable:** you can open the PWA on your phone, snap a slide photo, and see it queued

## Phase 4 — Image Preprocessing
- Client-side or edge-function preprocessing: auto-crop, deskew (perspective correction for angled shots), glare/contrast normalization, compress before upload
- This step directly improves OCR accuracy and cuts token usage downstream
- **Deliverable:** raw photo → cleaned, upload-ready image, visible before/after

## Phase 5 — Vision Extraction Pipeline (Core Engine)
- FastAPI endpoint: receive image → call Gemini 2.5 Flash with a structured prompt asking for:
  - Verbatim text (headings, bullets, exact wording)
  - Bounding boxes for any diagrams/charts/images on the slide
- Parse response into `raw_text` + diagram bounding box coordinates
- Log every call to `api_usage_log`
- **Offline behavior (no AI attempt):** if there's no internet connection at capture time, don't attempt any AI call at all — not even a failed retry. Just run local OCR (Tesseract) for basic readable text, save the photo + raw text immediately with `ai_status: "not_generated"`, and stop there. No diagram detection, no enrichment. This keeps capture instant and battery/data-friendly in a dead-signal classroom
- **Online behavior:** if internet is available, the full Gemini pipeline runs automatically right after capture — verbatim text + diagram bounding boxes extracted, and enrichment (Phase 8) fires immediately after, no manual step needed
- **Deliverable:** with internet on, a photo produces full notes + AI content automatically within seconds; with internet off, the same photo saves instantly with just raw text and no AI attempted, ready to generate later (Phase 8.5)

## Phase 6 — Diagram Handling
- Crop original diagram(s) from the source image using bounding boxes → store as `original_diagram_crop_url`
- Send the same crop to a second Gemini/OpenRouter call to generate a cleaned/redrawn version → store as `cleaned_diagram_url`
- Notes view shows both, toggleable
- **Deliverable:** a slide with a diagram produces both crop + cleaned versions correctly placed

## Phase 7 — Multi-Provider Fallback Routing
- Build a thin routing layer: try Gemini → on 429/quota error, fall back to OpenRouter free vision model → log which provider handled each slide
- This is what makes "limit never reached" actually true day-to-day
- **Deliverable:** simulate a Gemini quota failure and confirm fallback kicks in transparently

## Phase 8 — AI Content Enrichment (Auto, When Online)
- Runs automatically right after Phase 5, only when internet was available at capture time
- Feed the extracted `raw_text` (and diagram, if relevant) to Groq/Gemini and generate content in the format you've set as default — easy explanation, exam-oriented points, or similar
- Store as `ai_content_json`, set `ai_status: "auto_generated"`
- **Rendering rule:** in the notes view, this AI content always renders directly below its own image's verbatim text, in **blue** (text or highlighted block, visually distinct from the black/default verbatim text) — so it's never confused with the original slide content
- **Deliverable:** every capture taken while online shows, in order: image → verbatim notes (default color) → AI content (blue), automatically, no manual step

## Phase 8.5 — Manual AI Generation (Offline Catch-Up)
- For any capture(s) still marked `ai_status: "not_generated"` (i.e. captured offline), give an explicit "Generate AI Content" action
- Selection: open a single chapter/topic note and generate for everything missing in it, **or** multi-select several chapters/subjects from the dashboard and batch-generate across all of them at once
- Before generating, ask once what format to use — easy/simple explanation, diagram-focused, plain text summary, or exam-oriented — and apply that **same choice across the whole batch** (not asked per item)
- After generation, the blue AI block gets inserted in its correct position under the relevant image within each note, `ai_status` updates to `manually_generated`
- **Deliverable:** capture a few slides offline, go back later, multi-select them across two different subjects, choose "exam-oriented" once, and see blue AI content correctly appended under each of the right images

## Phase 9 — Notes Assembly & Rendering
- Build the actual chapter-note view: a single continuous, scrollable document per chapter, made up of sequential capture blocks — each block is [image → verbatim text (default color) → AI content in blue, if generated]
- New captures for the same chapter append as a new block at the end, in date order — not a new separate note
- Markdown-style rendering, mobile-optimized (readable font size, no horizontal scroll)
- **Deliverable:** a chapter with captures from three different days renders as one continuous note, each day's block clearly separated and dated, blue AI content visible wherever it's been generated

## Phase 10 — Dashboard: Organize & Search
- Subject → Chapter → Capture hierarchy view
- **Persistent search bar** at the top of the dashboard (not buried in a menu) — always visible, tap-to-focus, works from any screen
- Search is dual-mode: instant keyword match on verbatim/AI text as you type, plus full semantic search (pgvector) for fuzzy queries like "what did sir say about recursion" that don't use exact wording
- **Filters** alongside the search bar: by subject, by chapter, by date range, by whether AI content exists yet (`not_generated` / `auto_generated` / `manually_generated`), and by `needs_review` (low-confidence captures)
- Filters and search combine — e.g. search "linked list" filtered to just DSA and just captures missing AI content
- Full-text + semantic search using pgvector embeddings (search "what did sir say about X" across the whole semester)
- **Deliverable:** searchable dashboard across all subjects, mobile-friendly list/grid views, search bar + filters usable one-handed on a phone

## Phase 10.5 — Smart Chapter Continuity
- Problem: DSA lecture on Monday covering "Trees," next DSA lecture is Thursday — if it's still "Trees," it should append into the *same chapter note*; if it's moved on to "Graphs," that's a genuinely new chapter/note. Subject alone isn't precise enough — this needs to work at the chapter/topic level
- Approach: extract a probable chapter/topic title from each capture (slide headers often literally say "Unit 3: Trees") combined with embedding similarity against recent captures in that subject, to decide append-vs-new automatically
- Every capture is auto-tagged with the real date/time it was taken, so within one chapter note, blocks are always in correct chronological order even if they're days apart
- If chapter-match confidence is low (genuinely ambiguous or a new topic), ask once rather than guessing — never silently misfile
- **Deliverable:** capture a "Trees" slide Monday and another "Trees" slide Thursday — both append into the same chapter note, correctly dated and ordered; capture a "Graphs" slide next and confirm it correctly starts a new chapter note instead of appending

## Phase 10.6 — Notes Management (Edit, Delete, Rename)
- Every capture's note is editable, not read-only: fix a bad OCR extraction, correct a mislabeled diagram, tweak the AI-generated content
- Rename any chapter/note title (e.g. "DSA — 21 Jul" → "DSA — Trees Intro")
- Delete individual captures/blocks, or whole chapter notes, with a confirmation step (no accidental data loss)
- Manual "add note" option — type something in directly if you want to add context sir mentioned that wasn't captured any other way
- Edit history isn't required for v1, but keep the schema open to it later (e.g. an `updated_at` timestamp per capture is enough for now)
- **Deliverable:** open any note, edit the text inline, rename the chapter, delete a capture you don't need — all from the mobile UI, no rough edges

## Phase 11 — Offline Queue & Background Sync
- If no signal in class: queue photos locally (IndexedDB via service worker), auto-upload + process when back online
- Visual indicator: "3 photos waiting to sync"
- **Deliverable:** airplane-mode test — capture works offline, syncs cleanly once reconnected

## Phase 12 — Audio Capture & Transcription
- Optional voice-note recording alongside a slide photo (captures what sir says that isn't on the slide)
- Transcribe via Groq Whisper, attach to the slide as `audio_notes`
- **Deliverable:** record a short voice note, see transcript appear under the relevant slide

## Phase 13 — Duplicate Detection & Confidence Flagging
- Perceptual image hashing to catch accidental duplicate photos of the same slide
- Flag slides with low-confidence extraction (glare, blur, garbled text) as "needs review" instead of silently guessing
- **Deliverable:** duplicate slide gets merged/skipped; a deliberately blurry photo gets flagged, not silently botched

## Phase 14 — Revision / Quiz Mode
- Pull from `exam_notes_json` across a subject to generate a quick quiz/flashcard session
- Simple spaced-repetition style ordering (surface weaker/flagged topics more often)
- **Deliverable:** tap "Revise [Subject]" → get quizzed on your own exam-focused notes

## Phase 15 — Export (Cross-Platform, Notes-App Compatible)
- One-click PDF/DOCX export per subject or lecture for offline cramming
- **Samsung Notes / Apple Notes compatibility:** neither app has a public API for direct write access from a third-party tool, so the realistic path is exporting formats their native "import" / share-sheet flow already accepts:
  - **.txt / .rtf export** — both Samsung Notes and Apple Notes can create a new note directly from a shared text/RTF file via the OS share sheet ("Open in Notes"), preserving basic formatting (headings, bullets) in RTF
  - **.enex export** (Evernote's open note format) as a bonus option — many third-party note apps beyond Samsung/Apple support importing it, giving broader compatibility with minimal extra work
  - Images (diagrams) get embedded inline in the RTF export so they carry over, not just referenced as links
- **Deliverable:** export a lecture, share it via your phone's share sheet, confirm it opens as a clean new note in both Samsung Notes and Apple Notes (test on whichever devices you have access to)

## Phase 16 — API Usage Dashboard
- Simple view of `api_usage_log`: daily requests per provider, remaining estimated quota, which provider handled today's slides
- **Deliverable:** at a glance, see if you're near a fallback trigger for the day

## Phase 17 — Mobile Polish
- PWA install prompt, home-screen icon, splash screen
- Gesture-friendly navigation, dark mode (useful for late-night studying), large tap targets throughout
- Performance pass: image compression, lazy loading in dashboard
- **Deliverable:** feels like a native app on your phone, not a website

## Phase 18 — Deployment
- Frontend + API routes on Vercel, Supabase as managed backend
- Environment variables secured, custom domain (optional)
- **Deliverable:** live app, installed on your phone, ready for actual lecture use

---

### Suggested Build Order for MVP (fastest path to daily usable)
Phases 0 → 1 → 2 → 3 → 5 → 9 → 10 first (skip diagrams/audio/offline initially) — gets you a working "photo → searchable notes" loop in class ASAP. Layer in diagrams (6), enrichment (8), offline (11), audio (12), and polish (13-18) once the core loop is proven.