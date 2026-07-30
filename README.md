# Lecturn

A mobile-first PWA that transforms lecture slide photos into organized, searchable notes with AI-powered content enrichment.

## Features

- **Snap & Capture** — Take photos of lecture slides directly from your phone camera
- **AI Text Extraction** — Automatically extracts verbatim text and diagrams from slide images
- **Smart Chapter Grouping** — Auto-detects topic continuity and groups related captures
- **AI Content Enrichment** — Generates exam-oriented summaries and explanations in blue
- **Semantic Search** — Search across all your notes using natural language queries
- **Offline Support** — Capture slides offline, auto-sync when back online
- **Audio Transcription** — Record voice notes alongside slides, transcribed via Whisper
- **Duplicate Detection** — Perceptual hashing catches accidental duplicate photos
- **PDF/DOCX Export** — One-click export for offline cramming
- **Dark Mode** — Easy on the eyes for late-night study sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Backend | FastAPI (Python) |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth (email/phone OTP) |
| Vision AI | Gemini 2.5 Flash + OpenRouter (fallback) |
| Transcription | Groq Whisper |
| Deployment | Vercel (frontend) + Supabase (managed backend) |

## Project Structure

```
Lecturn/
├── app/                  # Next.js frontend (PWA)
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & Supabase client
│   │   └── styles/       # CSS & design tokens
│   └── public/           # Static assets & PWA manifest
├── api/                  # FastAPI backend
│   ├── src/
│   │   ├── main.py       # FastAPI app entry
│   │   ├── models.py     # Pydantic models
│   │   ├── routers/      # API route handlers
│   │   └── services/     # Business logic (vision, AI, etc.)
│   └── migrations/       # Database migrations
├── shared/               # Shared TypeScript types
└── scripts/              # Build & utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Supabase](https://supabase.com) project
- API keys for AI providers (see Environment Variables below)

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/lecturn.git
   cd lecturn
   ```

2. Install dependencies:
   ```bash
   npm install
   cd api && pip install -r requirements.txt && cd ..
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your keys (see below)
   ```

4. Set up the database:
   - Go to your Supabase SQL Editor
   - Run the contents of `api/supabase-schema.sql`

5. Start development:
   ```bash
   npm run dev          # Frontend on http://localhost:3000
   npm run dev:api      # Backend on http://localhost:8000
   ```

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Providers
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Never commit your `.env` file.** It is already included in `.gitignore`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run dev:app` | Start frontend dev server only |
| `npm run dev:api` | Start backend dev server |
| `npm run build:app` | Build frontend for production |
| `npm run build:api` | Build backend for production |

## How It Works

1. **Capture** — Snap a photo of a lecture slide using the PWA camera
2. **Extract** — AI extracts verbatim text and identifies diagrams via bounding boxes
3. **Enrich** — Generated AI summaries appear in blue below the original content
4. **Organize** — Captures auto-group into chapters by topic detection
5. **Search** — Find anything with keyword or semantic search across all notes
6. **Revise** — Use quiz mode to test yourself on exam-focused content

## License

MIT
