import psycopg2

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

cur.execute("ALTER TABLE captures ALTER COLUMN chapter_id DROP NOT NULL;")
cur.execute("ALTER TABLE captures ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);")

conn.commit()
cur.close()
conn.close()
print("Migration applied: chapter_id nullable, subject_id added")
