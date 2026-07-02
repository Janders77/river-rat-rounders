import hashlib
import json
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Railway provides postgres:// but psycopg2 needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

USE_POSTGRES = bool(DATABASE_URL)

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "app.db"


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def current_quarter(dt=None):
    dt = dt or datetime.now(timezone.utc)
    return f"{dt.year}-Q{(dt.month - 1) // 3 + 1}"


def hash_password(plaintext: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", plaintext.encode(), salt.encode(), 260_000)
    return f"pbkdf2:sha256:260000:{salt}:{dk.hex()}"


def verify_password(plaintext: str, stored: str) -> bool:
    try:
        _, alg, iterations_str, salt, stored_hash = stored.split(":")
        dk = hashlib.pbkdf2_hmac(alg, plaintext.encode(), salt.encode(), int(iterations_str))
        return dk.hex() == stored_hash
    except Exception:
        return False


# ── Connection helpers ────────────────────────────────────────────────────────

def get_pg_connection():
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def get_sqlite_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_connection():
    if USE_POSTGRES:
        return get_pg_connection()
    return get_sqlite_connection()


# ── Schema init ───────────────────────────────────────────────────────────────

def init_db():
    if USE_POSTGRES:
        _init_postgres()
    else:
        _init_sqlite()


def _init_sqlite():
    with get_sqlite_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                entity TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity)
        """)
        seed_demo_data_conn(conn, sqlite=True)


def _init_postgres():
    import psycopg2.extras
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS records (
                        id TEXT PRIMARY KEY,
                        entity TEXT NOT NULL,
                        data JSONB NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity)
                """)
        seed_demo_data_pg(conn)
    finally:
        conn.close()


# ── Seed data ─────────────────────────────────────────────────────────────────

def _seed_records():
    now = utc_now()
    return [
        ("User", {"id": "user-demo-admin", "email": "admin@riverrat.local", "full_name": "River Rat Admin", "role": "admin", "games_played": 0, "wins": 0, "total_points": 0, "current_streak": 0, "best_streak": 0, "created_date": now, "updated_date": now}),
        ("User", {"id": "user-demo-jay", "email": "jay@riverrat.local", "full_name": "Jay Anders", "role": "user", "games_played": 0, "wins": 0, "total_points": 0, "current_streak": 0, "best_streak": 0, "created_date": now, "updated_date": now}),
        ("Director", {"id": "director-demo-admin", "email": "admin@riverrat.local", "full_name": "River Rat Admin", "role": "Head Director", "created_date": now, "updated_date": now}),
        ("Director", {"id": "director-demo-jay", "email": "jay@riverrat.local", "full_name": "Jay Anders", "role": "Head Director", "created_date": now, "updated_date": now}),
        ("Player", {"id": "player-demo-admin", "player_number": 1, "first_name": "River", "last_name": "Admin", "email": "admin@riverrat.local", "password": hash_password("Poker123"), "card_guards": 0, "date_joined": "2026-01-01", "profile_picture": "", "created_date": now, "updated_date": now}),
        ("Player", {"id": "player-demo-2", "player_number": 2, "first_name": "Jay", "last_name": "Anders", "email": "jay@riverrat.local", "password": hash_password("Poker123"), "card_guards": 1, "date_joined": "2026-01-02", "profile_picture": "", "created_date": now, "updated_date": now}),
    ]


def seed_demo_data_conn(conn, sqlite=True):
    now = utc_now()
    for entity, data in _seed_records():
        if sqlite:
            existing = conn.execute("SELECT id FROM records WHERE id = ?", (data["id"],)).fetchone()
            if not existing:
                conn.execute(
                    "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    (data["id"], entity, json.dumps(data), now, now),
                )
        else:
            conn.cursor().execute(
                "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (data["id"], entity, json.dumps(data), now, now),
            )


def seed_demo_data_pg(conn):
    now = utc_now()
    with conn:
        with conn.cursor() as cur:
            for entity, data in _seed_records():
                cur.execute(
                    "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (data["id"], entity, json.dumps(data), now, now),
                )


# ── CRUD ──────────────────────────────────────────────────────────────────────

def load_records(entity):
    if USE_POSTGRES:
        conn = get_pg_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM records WHERE entity = %s", (entity,))
                rows = cur.fetchall()
            return [r[0] if isinstance(r[0], dict) else json.loads(r[0]) for r in rows]
        finally:
            conn.close()
    else:
        with get_sqlite_connection() as conn:
            rows = conn.execute("SELECT data FROM records WHERE entity = ?", (entity,)).fetchall()
        return [json.loads(row["data"]) for row in rows]


def _sort_val(val):
    if val is None or val == "":
        return (1, 0, "")
    if isinstance(val, bool):
        return (0, int(val), "")
    if isinstance(val, (int, float)):
        return (0, float(val), "")
    try:
        return (0, float(str(val)), "")
    except (ValueError, TypeError):
        return (0, 0, str(val))


def sort_records(records, sort_key):
    if not sort_key:
        return records
    descending = sort_key.startswith("-")
    key = sort_key[1:] if descending else sort_key
    return sorted(records, key=lambda item: _sort_val(item.get(key)), reverse=descending)


def matches_filter(item, filters):
    for key, expected in (filters or {}).items():
        value = item.get(key)
        if isinstance(expected, dict):
            if "$in" in expected:
                if value not in expected["$in"]:
                    return False
            else:
                return False
        elif value != expected:
            return False
    return True


def list_records(entity, sort_key=None, limit=None, skip=0):
    records = sort_records(load_records(entity), sort_key)
    if skip:
        records = records[skip:]
    if limit is not None:
        records = records[:limit]
    return records


def filter_records(entity, filters=None, sort_key=None, limit=None, skip=0):
    records = [item for item in load_records(entity) if matches_filter(item, filters)]
    records = sort_records(records, sort_key)
    if skip:
        records = records[skip:]
    if limit is not None:
        records = records[:limit]
    return records


def get_record(entity, record_id):
    if USE_POSTGRES:
        conn = get_pg_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT data FROM records WHERE entity = %s AND id = %s", (entity, record_id))
                row = cur.fetchone()
            if not row:
                return None
            return row[0] if isinstance(row[0], dict) else json.loads(row[0])
        finally:
            conn.close()
    else:
        with get_sqlite_connection() as conn:
            row = conn.execute("SELECT data FROM records WHERE entity = ? AND id = ?", (entity, record_id)).fetchone()
        return json.loads(row["data"]) if row else None


def create_record(entity, payload):
    now = utc_now()
    data = dict(payload)
    data.setdefault("id", f"{entity.lower()}-{uuid.uuid4().hex[:10]}")
    data.setdefault("created_date", now)
    data["updated_date"] = now
    if USE_POSTGRES:
        conn = get_pg_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (%s, %s, %s, %s, %s)",
                        (data["id"], entity, json.dumps(data), now, now),
                    )
        finally:
            conn.close()
    else:
        with get_sqlite_connection() as conn:
            conn.execute(
                "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (data["id"], entity, json.dumps(data), now, now),
            )
    return data


def bulk_create_records(entity, payloads):
    return [create_record(entity, payload) for payload in payloads]


def update_record(entity, record_id, patch):
    existing = get_record(entity, record_id)
    if not existing:
        return None
    updated = {**existing, **patch, "id": record_id, "updated_date": utc_now()}
    if USE_POSTGRES:
        conn = get_pg_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE records SET data = %s, updated_at = %s WHERE entity = %s AND id = %s",
                        (json.dumps(updated), updated["updated_date"], entity, record_id),
                    )
        finally:
            conn.close()
    else:
        with get_sqlite_connection() as conn:
            conn.execute(
                "UPDATE records SET data = ?, updated_at = ? WHERE entity = ? AND id = ?",
                (json.dumps(updated), updated["updated_date"], entity, record_id),
            )
    return updated


def delete_record(entity, record_id):
    if USE_POSTGRES:
        conn = get_pg_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM records WHERE entity = %s AND id = %s", (entity, record_id))
                    rowcount = cur.rowcount
        finally:
            conn.close()
        return rowcount > 0
    else:
        with get_sqlite_connection() as conn:
            cursor = conn.execute("DELETE FROM records WHERE entity = ? AND id = ?", (entity, record_id))
            rowcount = cursor.rowcount
        return rowcount > 0
