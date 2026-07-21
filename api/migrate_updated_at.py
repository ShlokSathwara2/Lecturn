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

cur.execute("ALTER TABLE captures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();")
cur.execute("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();")

conn.commit()
cur.close()
conn.close()
print("Migration applied: updated_at columns added")
