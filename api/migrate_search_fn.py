import psycopg2
import os

PASSWORD = "XDH5BBV5kOTkncIR"
REF = "jzemoqjpjmcrtpsnaztf"

conn = psycopg2.connect(
    host=f"db.{REF}.supabase.co",
    port=5432,
    dbname="postgres",
    user="postgres",
    password=PASSWORD,
    connect_timeout=10,
)
cur = conn.cursor()

sql = """
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
) LANGUAGE plpgsql AS
$func_body$
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
$func_body$;
"""

cur.execute(sql)
conn.commit()
cur.close()
conn.close()
print("Function created successfully")
