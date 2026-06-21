import csv
import hashlib
import json
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "app.db"
CSV_PATH = Path("/Users/jayanders/Desktop/poker-backend/poker-ui/public/player-database.csv")


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(plaintext: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", plaintext.encode(), salt.encode(), 260_000)
    return f"pbkdf2:sha256:260000:{salt}:{dk.hex()}"


def import_players():
    now = utc_now()
    imported = 0
    skipped = 0

    with get_connection() as conn:
        with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                number = row.get("number", "").strip()
                first_name = (row.get("name") or row.get("First Name") or "").strip()
                last_name = (row.get("last") or row.get("Last Name") or "").strip()
                email = (row.get("email") or "").strip()
                card_guards = row.get("guards") or row.get("Card Guards") or "0"
                date_joined = (row.get("day") or "").strip()

                if not first_name and not last_name:
                    skipped += 1
                    continue

                try:
                    player_number = int(number)
                except (ValueError, TypeError):
                    player_number = 0

                try:
                    card_guards_int = int(float(card_guards))
                except (ValueError, TypeError):
                    card_guards_int = 0

                player_id = f"player-csv-{uuid.uuid4().hex[:10]}"

                # Check if player_number already exists
                existing = conn.execute(
                    "SELECT id FROM records WHERE entity = 'Player' AND json_extract(data, '$.player_number') = ?",
                    (player_number,),
                ).fetchone()

                if existing:
                    skipped += 1
                    continue

                data = {
                    "id": player_id,
                    "player_number": player_number,
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "password": hash_password("Poker123"),
                    "card_guards": card_guards_int,
                    "date_joined": date_joined,
                    "profile_picture": "",
                    "created_date": now,
                    "updated_date": now,
                }

                conn.execute(
                    "INSERT INTO records (id, entity, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    (player_id, "Player", json.dumps(data), now, now),
                )
                imported += 1

    print(f"Done — imported {imported} players, skipped {skipped}.")


if __name__ == "__main__":
    import_players()
