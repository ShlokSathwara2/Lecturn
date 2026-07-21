-- SlideScribe Supabase Schema
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('slide-images', 'slide-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2b. Storage policies (allow all uploads to public bucket)
CREATE POLICY "Allow all uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'slide-images');

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'slide-images');

-- 3. Tables
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  date_taken TIMESTAMPTZ DEFAULT now(),
  image_url TEXT,
  raw_text TEXT,
  cleaned_diagram_url TEXT,
  original_diagram_crop_url TEXT,
  ai_content_json JSONB,
  ai_status TEXT NOT NULL DEFAULT 'not_generated'
    CHECK (ai_status IN ('not_generated', 'auto_generated', 'manually_generated')),
  confidence_score REAL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'needs_review', 'duplicate')),
  image_hash TEXT,
  embedding VECTOR(384)
);

CREATE TABLE IF NOT EXISTS audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID NOT NULL REFERENCES captures(id) ON DELETE CASCADE,
  transcript TEXT,
  audio_url TEXT
);

CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 1
);

-- 4. Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_notes ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_captures_chapter ON captures(chapter_id);
CREATE INDEX IF NOT EXISTS idx_captures_embedding ON captures USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_captures_image_hash ON captures(image_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(provider, date);

-- 6. Semantic search function
CREATE OR REPLACE FUNCTION search_captures_semantic(
  query_embedding VECTOR(384),
  match_threshold FLOAT DEFAULT 0.4,
  match_count INT DEFAULT 20,
  filter_subject_id TEXT DEFAULT NULL,
  filter_ai_status TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  chapter_id UUID,
  date_taken TIMESTAMPTZ,
  image_url TEXT,
  raw_text TEXT,
  ai_content_json JSONB,
  ai_status TEXT,
  status TEXT,
  chapter_title TEXT,
  subject_id UUID,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.chapter_id, c.date_taken, c.image_url, c.raw_text, 
    c.ai_content_json, c.ai_status, c.status,
    ch.title, ch.subject_id,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM captures c
  JOIN chapters ch ON ch.id = c.chapter_id
  WHERE c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
    AND (filter_subject_id IS NULL OR ch.subject_id::text = filter_subject_id)
    AND (filter_ai_status IS NULL OR c.ai_status = filter_ai_status)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
