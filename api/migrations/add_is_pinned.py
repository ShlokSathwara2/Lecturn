import os
from supabase import create_client

url = os.getenv("SUPABASE_URL", "https://jzemoqjpjmcrtpsnaztf.supabase.co")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
client = create_client(url, key)

sql = "ALTER TABLE captures ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;"
client.rpc("exec_sql", {"query": sql}).execute()
print("Added is_pinned column to captures")
