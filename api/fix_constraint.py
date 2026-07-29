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
        connect_timeout=10,
    )
    cur = conn.cursor()
    cur.execute("ALTER TABLE captures DROP CONSTRAINT IF EXISTS captures_ai_status_check;")
    cur.execute("ALTER TABLE captures ADD CONSTRAINT captures_ai_status_check CHECK (ai_status IN ('not_generated', 'auto_generated', 'manually_generated', 'ai_notes'));")
    conn.commit()
    cur.close()
    conn.close()
    print("Successfully updated captures_ai_status_check constraint!")
except Exception as e:
    print(f"Failed to alter constraint: {e}")
