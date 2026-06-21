import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from .db import (
    ROOT,
    bulk_create_records,
    create_record,
    delete_record,
    filter_records,
    get_record,
    hash_password,
    init_db,
    list_records,
    update_record,
    verify_password,
)

# ── JWT config ────────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production-use-a-long-random-string")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

# Public endpoints that don't require a token
PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/login",
    "/api/auth/login/director",
    "/openapi.json",
    "/docs",
    "/redoc",
}

bearer = HTTPBearer(auto_error=False)


def create_token(player_id: str, email: str, role: str = "player") -> str:
    payload = {
        "sub": player_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return decode_token(credentials.credentials)


def require_director(claims: dict = Depends(require_auth)) -> dict:
    if claims.get("role") not in ("director", "admin"):
        raise HTTPException(status_code=403, detail="Director access required")
    return claims


# ── App setup ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="River Rat Rounders API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = ROOT / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# ── Pydantic models ───────────────────────────────────────────────────────────

class QueryPayload(BaseModel):
    filter: dict = Field(default_factory=dict)
    sort: str | None = None
    limit: int | None = None
    skip: int = 0


class BulkCreatePayload(BaseModel):
    records: list[dict]


class ExternalApiPayload(BaseModel):
    action: str
    params: dict = Field(default_factory=dict)


class LoginPayload(BaseModel):
    email: str
    password: str


class DirectorLoginPayload(BaseModel):
    code: str


class SearchPayload(BaseModel):
    query: str = ""
    limit: int = 20


# ── Auth endpoints (public) ───────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def auth_login(payload: LoginPayload):
    players = filter_records("Player", filters={"email": payload.email.lower().strip()})
    if not players:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    player = players[0]
    if not verify_password(payload.password, player.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    directors = filter_records("Director", filters={"email": payload.email.lower().strip()})
    role = "director" if directors else "player"

    token = create_token(player["id"], player["email"], role)
    safe_player = {k: v for k, v in player.items() if k != "password"}
    return {"token": token, "player": safe_player, "role": role}


DIRECTOR_CODE = os.environ.get("DIRECTOR_CODE", "3855")

@app.post("/api/auth/login/director")
def auth_login_director(payload: DirectorLoginPayload, claims: dict = Depends(require_auth)):
    if payload.code != DIRECTOR_CODE:
        raise HTTPException(status_code=401, detail="Invalid director code")
    # Upgrade the token role to director
    token = create_token(claims["sub"], claims["email"], "director")
    return {"token": token}


@app.get("/api/auth/me")
def auth_me(claims: dict = Depends(require_auth)):
    player = get_record("Player", claims["sub"])
    if not player:
        # Fallback: find by email
        players = filter_records("Player", filters={"email": claims["email"]})
        player = players[0] if players else None
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return {k: v for k, v in player.items() if k != "password"}


# ── Entity endpoints (protected) ──────────────────────────────────────────────

@app.get("/api/entities/{entity_name}")
def entity_list(entity_name: str, sort: str | None = None, limit: int | None = None, skip: int = 0, claims: dict = Depends(require_auth)):
    records = list_records(entity_name, sort_key=sort, limit=limit, skip=skip)
    if entity_name == "Player":
        records = [{k: v for k, v in r.items() if k != "password"} for r in records]
    return records


@app.post("/api/entities/{entity_name}/query")
def entity_query(entity_name: str, payload: QueryPayload, claims: dict = Depends(require_auth)):
    records = filter_records(
        entity_name,
        filters=payload.filter,
        sort_key=payload.sort,
        limit=payload.limit,
        skip=payload.skip,
    )
    if entity_name == "Player":
        records = [{k: v for k, v in r.items() if k != "password"} for r in records]
    return records


def _hash_player_password(payload: dict) -> dict:
    raw = payload.get("password")
    if raw and not raw.startswith("pbkdf2:"):
        return {**payload, "password": hash_password(raw)}
    return payload


@app.post("/api/entities/{entity_name}")
def entity_create(entity_name: str, payload: dict, claims: dict = Depends(require_auth)):
    if entity_name == "Player":
        payload = _hash_player_password(payload)
    if entity_name == "GameSession" and payload.get("is_open"):
        existing = filter_records(
            "GameSession",
            filters={"is_open": True, "location": payload.get("location"), "game_type": payload.get("game_type")},
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"An open {payload.get('game_type')} at {payload.get('location')} already exists.",
            )
    record = create_record(entity_name, payload)
    if entity_name == "Player":
        record = {k: v for k, v in record.items() if k != "password"}
    return record


@app.post("/api/entities/{entity_name}/bulk")
def entity_bulk_create(entity_name: str, payload: BulkCreatePayload, claims: dict = Depends(require_auth)):
    records = payload.records
    if entity_name == "Player":
        records = [_hash_player_password(r) for r in records]
    results = bulk_create_records(entity_name, records)
    if entity_name == "Player":
        results = [{k: v for k, v in r.items() if k != "password"} for r in results]
    return results


@app.patch("/api/entities/{entity_name}/{record_id}")
def entity_update(entity_name: str, record_id: str, patch: dict, claims: dict = Depends(require_auth)):
    if entity_name == "Player":
        patch = _hash_player_password(patch)
    updated = update_record(entity_name, record_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Record not found")
    if entity_name == "Player":
        updated = {k: v for k, v in updated.items() if k != "password"}
    return updated


@app.delete("/api/entities/{entity_name}/{record_id}")
def entity_delete(entity_name: str, record_id: str, claims: dict = Depends(require_auth)):
    deleted = delete_record(entity_name, record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


@app.post("/api/admin/raw-upsert")
def admin_raw_upsert(payload: list = Body(...), claims: dict = Depends(require_auth)):
    """Temporary migration endpoint — upserts raw records directly into Postgres."""
    if claims.get("role") not in ("admin", "director"):
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.db import get_pg_connection, USE_POSTGRES
    import json as _json
    if not USE_POSTGRES:
        raise HTTPException(status_code=400, detail="Not running against Postgres")
    conn = get_pg_connection()
    inserted = 0
    try:
        with conn:
            with conn.cursor() as cur:
                for rec in payload:
                    cur.execute(
                        """INSERT INTO records (id, entity, data, created_at, updated_at)
                           VALUES (%s, %s, %s, %s, %s)
                           ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at""",
                        (rec["id"], rec["entity"], _json.dumps(rec["data"]), rec["created_at"], rec["updated_at"])
                    )
                    inserted += 1
    finally:
        conn.close()
    return {"inserted": inserted}


@app.post("/api/uploads")
async def upload_file(file: UploadFile = File(...), claims: dict = Depends(require_auth)):
    original_name = file.filename or "upload.bin"
    suffix = Path(original_name).suffix
    filename = f"{Path(original_name).stem}-{uuid.uuid4().hex[:8]}{suffix}"
    destination = uploads_dir / filename
    destination.write_bytes(await file.read())
    return {"file_url": f"/uploads/{filename}"}


@app.post("/api/functions/external-api")
def external_api(payload: ExternalApiPayload, claims: dict = Depends(require_auth)):
    action = payload.action
    params = payload.params
    if action == "getLeaderboard":
        # Determine which quarter to show — default to current quarter
        now = datetime.now(timezone.utc)
        current_quarter = f"{now.year}-Q{(now.month - 1) // 3 + 1}"
        quarter_filter = (params or {}).get("quarter", current_quarter)

        all_stats = list_records("QuarterlyStats")
        # Filter to requested quarter
        quarterly_stats = [s for s in all_stats if s.get("quarter") == quarter_filter]

        players = {player["id"]: player for player in list_records("Player")}
        totals = {}

        for stat in quarterly_stats:
            player_id = stat.get("player_id")
            if not player_id:
                continue
            current = totals.setdefault(
                player_id,
                {
                    "id": player_id,
                    "name": stat.get("player_name") or "",
                    "points": 0,
                    "wins": 0,
                },
            )
            current["points"] += stat.get("points", 0) or 0
            current["wins"] += stat.get("wins", 0) or 0

        leaderboard = []
        for player_id, entry in totals.items():
            if not entry["name"]:
                player = players.get(player_id, {})
                entry["name"] = f"{player.get('first_name', '')} {player.get('last_name', '')}".strip() or player.get("email", "Unknown Player")
            leaderboard.append(entry)

        leaderboard.sort(key=lambda item: (-item["points"], -item["wins"], item["name"]))
        for index, entry in enumerate(leaderboard, start=1):
            entry["rank"] = index
        return {"quarter": quarter_filter, "leaderboard": leaderboard}

    if action == "getAvailableQuarters":
        all_stats = list_records("QuarterlyStats")
        quarters = sorted(set(s.get("quarter") for s in all_stats if s.get("quarter")), reverse=True)
        now = datetime.now(timezone.utc)
        current_quarter = f"{now.year}-Q{(now.month - 1) // 3 + 1}"
        if current_quarter not in quarters:
            quarters.insert(0, current_quarter)
        return {"quarters": quarters, "current": current_quarter}

    if action == "getPlayerQuarterlyStats":
        player_id = (params or {}).get("player_id")
        if not player_id:
            return {"stats": []}
        all_stats = list_records("QuarterlyStats")
        player_stats = [s for s in all_stats if s.get("player_id") == player_id]
        player_stats.sort(key=lambda s: s.get("quarter", ""), reverse=True)
        return {"stats": player_stats}
    if action == "createPlayer":
        return {"ok": True, "name": params.get("name")}
    if action == "createGame":
        game = create_record("Game", {"location": params.get("location", "")})
        return {"id": game["id"]}
    if action == "createResult":
        return {"ok": True, **params}
    if action == "finalizeGame":
        return {"ok": True, **params}
    return {"ok": True, "action": action, "params": params}


@app.post("/api/functions/search-players")
def search_players(payload: SearchPayload, claims: dict = Depends(require_auth)):
    query = payload.query.strip().lower()
    players = list_records("Player")
    if not query:
        results = players[: payload.limit]
    else:
        def matches(player):
            haystack = " ".join(
                [
                    str(player.get("player_number", "")),
                    player.get("first_name", ""),
                    player.get("last_name", ""),
                    player.get("email", ""),
                ]
            ).lower()
            return query in haystack

        results = [p for p in players if matches(p)][: payload.limit]

    return [
        {
            **{k: v for k, v in p.items() if k != "password"},
            "display_name": f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or p.get("email", "Unknown Player"),
        }
        for p in results
    ]
