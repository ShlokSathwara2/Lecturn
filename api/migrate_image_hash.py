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

cur.execute("ALTER TABLE captures ADD COLUMN IF NOT EXISTS image_hash TEXT;")
cur.execute("CREATE INDEX IF NOT EXISTS idx_captures_image_hash ON captures(image_hash);")

conn.commit()
cur.close()
conn.close()
print("Migration applied: image_hash column added")
