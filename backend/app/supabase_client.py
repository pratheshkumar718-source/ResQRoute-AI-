"""Supabase Python SDK client initialized with project credentials."""
import os
import pathlib
from dotenv import load_dotenv
from supabase import create_client, Client

BASE = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(BASE / ".env")
load_dotenv(BASE.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
)

try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"[Supabase] Python SDK client initialized: {SUPABASE_URL}")
    else:
        print("[Supabase] SUPABASE_URL or SUPABASE_KEY not configured. Supabase client disabled.")
        supabase = None
except Exception as e:
    print(f"[Supabase] Client init warning: {e}")
    supabase = None
