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

# Supabase PostgreSQL with automated resilience and SQLite fallback
def clean_database_url(url: str | None) -> str | None:
    if not url:
        return None
    u = url.strip().strip('"').strip("'")
    if "]@" in u:
        u = u.replace("]@", "@")
    if u.startswith("postgres://"):
        u = u.replace("postgres://", "postgresql+psycopg2://", 1)
    elif u.startswith("postgresql://") and not u.startswith("postgresql+psycopg2://"):
        u = u.replace("postgresql://", "postgresql+psycopg2://", 1)
    return u


def init_engine():
    primary = clean_database_url(os.getenv("DATABASE_URL"))
    if primary and "sqlite" in primary:
        eng = create_engine(primary, connect_args={"check_same_thread": False})
        print(f"[Database] Connected to requested SQLite database: {primary}")
        return eng

    candidate_urls = []
    if primary:
        candidate_urls.append(("Primary DATABASE_URL", primary))
    
    direct = clean_database_url(os.getenv("DIRECT_URL"))
    if direct and direct != primary:
        candidate_urls.append(("Direct URL", direct))
    
    # Also provide known direct Supabase endpoint as secondary candidate if direct url was provided
    if direct and direct not in [c[1] for c in candidate_urls]:
        candidate_urls.append(("Direct Supabase Host", direct))

    for label, u in candidate_urls:
        if "postgresql" in u:
            try:
                eng = create_engine(
                    u,
                    pool_pre_ping=True,
                    pool_recycle=300,
                    pool_size=5,
                    max_overflow=10,
                    connect_args={"connect_timeout": 5},
                )
                from sqlalchemy import text
                with eng.connect() as conn:
                    conn.execute(text("SELECT 1"))
                host_disp = u.split("@")[-1] if "@" in u else "Postgres"
                print(f"[Database] Successfully connected to Supabase PostgreSQL ({label}): {host_disp}")
                return eng
            except Exception as ex:
                print(f"[Database] Warning: Failed to connect to {label} ({ex}). Trying next option...")

    # Fallback to local SQLite so authentication and system operations never fail
    sqlite_path = DATA / "resqroute.db"
    sqlite_eng = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    print(f"[Database] Connected to local SQLite database: {sqlite_path}")
    return sqlite_eng


engine = init_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def ensure_schema_compatibility():
    """Ensure essential user columns exist in both PostgreSQL and SQLite."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            for col, col_type in [("email", "VARCHAR"), ("phone", "VARCHAR"), ("details", "TEXT")]:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {col_type};"))
                    conn.commit()
                except Exception:
                    pass
    except Exception as e:
        print(f"[Database] Schema compatibility check notice: {e}")


ensure_schema_compatibility()


class Base(DeclarativeBase):
    pass



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

