from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import secrets
import sqlite3

from fastapi import Cookie, FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "contacts.db"
INDEX_PATH = BASE_DIR / "index.html"
SESSION_COOKIE = "session_token"
PBKDF2_ITERATIONS = 100_000


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        columns = [row[1] for row in conn.execute("PRAGMA table_info(contacts)").fetchall()]
        if "user_id" not in columns:
            conn.execute("ALTER TABLE contacts ADD COLUMN user_id INTEGER")
        conn.commit()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    ).hex()


def row_to_contact(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "phone_number": row["phone_number"],
        "created_at": row["created_at"],
    }


def row_to_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "username": row["username"]}


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_hex(32)
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, now_iso()),
    )
    return token


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE)


def require_user(session_token: str | None) -> sqlite3.Row:
    if not session_token:
        raise HTTPException(status_code=401, detail="No hay sesion")
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.username
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (session_token,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Sesion invalida")
    return row


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Agenda Tiro al Blanco", lifespan=lifespan)


class AuthIn(BaseModel):
    username: str
    password: str = ""


class ContactIn(BaseModel):
    name: str = Field(..., min_length=1)
    phone_number: str = Field(..., min_length=1)


@app.post("/register", status_code=201)
def register(payload: AuthIn, response: Response) -> dict:
    username = payload.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="El usuario no puede estar vacio")

    salt = secrets.token_bytes(16)
    password_hash = hash_password(payload.password, salt)
    try:
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users (username, password_hash, password_salt, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (username, password_hash, salt.hex(), now_iso()),
            )
            user_id = cursor.lastrowid
            token = create_session(conn, user_id)
            conn.commit()
            user = conn.execute(
                "SELECT id, username FROM users WHERE id = ?", (user_id,)
            ).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")

    set_session_cookie(response, token)
    return row_to_user(user)


@app.post("/login")
def login(payload: AuthIn, response: Response) -> dict:
    username = payload.username.strip()
    with get_connection() as conn:
        user = conn.execute(
            "SELECT id, username, password_hash, password_salt FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="Usuario o contrasena invalidos")
        salt = bytes.fromhex(user["password_salt"])
        if hash_password(payload.password, salt) != user["password_hash"]:
            raise HTTPException(status_code=401, detail="Usuario o contrasena invalidos")
        token = create_session(conn, user["id"])
        conn.commit()

    set_session_cookie(response, token)
    return {"id": user["id"], "username": user["username"]}


@app.post("/logout")
def logout(
    response: Response, session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE)
) -> dict:
    if session_token:
        with get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (session_token,))
            conn.commit()
    clear_session_cookie(response)
    return {"ok": True}


@app.get("/me")
def me(session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> dict:
    user = require_user(session_token)
    return row_to_user(user)


@app.get("/contacts")
def list_contacts(session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> list[dict]:
    user = require_user(session_token)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, phone_number, created_at
            FROM contacts
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        ).fetchall()
    return [row_to_contact(row) for row in rows]


@app.post("/contacts", status_code=201)
def create_contact(
    payload: ContactIn,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> dict:
    user = require_user(session_token)
    name = payload.name.strip()
    phone_number = payload.phone_number.strip()
    if not name or not phone_number:
        raise HTTPException(status_code=400, detail="name y phone_number son requeridos")

    created_at = now_iso()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO contacts (user_id, name, phone_number, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user["id"], name, phone_number, created_at),
        )
        conn.commit()
        contact_id = cursor.lastrowid
        row = conn.execute(
            "SELECT id, name, phone_number, created_at FROM contacts WHERE id = ?",
            (contact_id,),
        ).fetchone()
    return row_to_contact(row)


@app.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> Response:
    user = require_user(session_token)
    with get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM contacts WHERE id = ? AND user_id = ?",
            (contact_id, user["id"]),
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return Response(status_code=204)


@app.get("/")
def index() -> FileResponse:
    if not INDEX_PATH.exists():
        raise HTTPException(status_code=404, detail="index.html no encontrado")
    return FileResponse(INDEX_PATH)
