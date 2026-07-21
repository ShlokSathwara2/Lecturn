import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

try:
    conn = psycopg2.connect(
        host="db.jzemoqjpjmcrtpsnaztf.supabase.co",
        port=5432,
        user="postgres",
        password=key,
        dbname="postgres",
        connect_timeout=5,
    )
    cur = conn.cursor()
    cur.execute("ALTER TABLE subjects ALTER COLUMN user_id TYPE TEXT;")
    cur.execute("ALTER TABLE chapters ALTER COLUMN subject_id TYPE TEXT;")
    conn.commit()
    cur.close()
    conn.close()
    print("Altered columns to TEXT successfully")
except Exception as e:
    print(f"Direct connect failed: {e}")
