"""
One-time migration: copy all records from local SQLite → Railway Postgres.

Usage:
    DATABASE_URL="postgresql://..." python3 migrate_to_postgres.py
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: Set DATABASE_URL to your Railway Postgres connection string.")
    print("  export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

DB_PATH = Path(__file__).parent / "data" / "app.db"
if not DB_PATH.exists():
    print(f"ERROR: SQLite database not found at {DB_PATH}")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Read all records from SQLite
sqlite_conn = sqlite3.connect(DB_PATH)
sqlite_conn.row_factory = sqlite3.Row
rows = sqlite_conn.execute("SELECT id, entity, data, created_at, updated_at FROM records").fetchall()
sqlite_conn.close()

print(f"Found {len(rows)} records in SQLite.")

# Connect to Postgres and create table
pg_conn = psycopg2.connect(DATABASE_URL)
with pg_conn:
    with pg_conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                entity TEXT NOT NULL,
                data JSONB NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity)")

print("Table ready. Migrating records...")

inserted = 0
skipped = 0
errors = 0

for row in rows:
    try:
        data = json.loads(row["data"])
        with pg_conn:
            with pg_conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO records (id, entity, data, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        data = EXCLUDED.data,
                        updated_at = EXCLUDED.updated_at
                    """,
                    (row["id"], row["entity"], json.dumps(data), row["created_at"], row["updated_at"]),
                )
        inserted += 1
    except Exception as e:
        print(f"  ERROR on record {row['id']}: {e}")
        errors += 1

pg_conn.close()

print(f"\nDone! {inserted} inserted/updated, {skipped} skipped, {errors} errors.")
print("Your Railway Postgres database is ready.")
