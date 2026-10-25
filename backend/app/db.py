"""Database connection: Supabase PostgreSQL with SQLite fallback."""
import os, pathlib
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BASE = pathlib.Path(__file__).resolve().parent.parent
# Load environment variables from backend/.env or root .env
load_dotenv(BASE / ".env")
load_dotenv(BASE.parent / ".env")

DATA = pathlib.Path(os.getenv("RESQ_DATA_DIR", str(BASE / "data")))
EVIDENCE = DATA / "evidence"
DATA.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)

# Supabase PostgreSQL or local SQLite
DB_URL = os.getenv("DATABASE_URL")
if DB_URL:
    if DB_URL.startswith("postgres://"):
        DB_URL = DB_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DB_URL.startswith("postgresql://"):
        DB_URL = DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if DB_URL and "postgresql" in DB_URL:
    engine = create_engine(
        DB_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
    )
    print(f"[Database] Connected to Supabase PostgreSQL: {DB_URL.split('@')[-1] if '@' in DB_URL else 'Postgres'}")
else:
    engine = create_engine(f"sqlite:///{DATA / 'resqroute.db'}", connect_args={"check_same_thread": False})
    print(f"[Database] Connected to local SQLite: {DATA / 'resqroute.db'}")

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

