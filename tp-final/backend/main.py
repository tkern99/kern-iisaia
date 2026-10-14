"""
main.py — Punto de entrada del backend de EduLayout.

Estructura del proyecto:
  main.py       → este archivo: arranca el servidor y conecta todo
  handler.py    → endpoints de la API (/api/layouts, /api/projects, etc.)
  database.sql  → schema de la base de datos SQLite
  openapi.yaml  → documentación de la API (referencia, no se usa en código)

Para correr el servidor:
  python main.py
  — o —
  python -m uvicorn main:app --port 3001 --reload
"""

import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from handler import router

# ─── Inicializar la base de datos ────────────────────────────────────────────

DB_PATH = Path(__file__).parent / "simulator.db"
SCHEMA_PATH = Path(__file__).parent / "database.sql"


def init_db():
    """
    Crea las tablas e inserta datos iniciales leyendo database.sql.
    Usa CREATE TABLE IF NOT EXISTS, por lo que es seguro llamar siempre al inicio.
    """
    conn = sqlite3.connect(DB_PATH)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema)

    # Migración segura: agregar checked_out_by si la base de datos ya existía
    table_info = conn.execute("PRAGMA table_info(layouts)").fetchall()
    columns = [col[1] for col in table_info]
    if "checked_out_by" not in columns:
        conn.execute("ALTER TABLE layouts ADD COLUMN checked_out_by INTEGER REFERENCES users(id)")

    # Migración segura: agregar password en users
    user_info = conn.execute("PRAGMA table_info(users)").fetchall()
    user_cols = [col[1] for col in user_info]
    if "password" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT '1234'")

    # Migración segura: agregar comment en layout_versions
    ver_info = conn.execute("PRAGMA table_info(layout_versions)").fetchall()
    ver_cols = [col[1] for col in ver_info]
    if "comment" not in ver_cols:
        conn.execute("ALTER TABLE layout_versions ADD COLUMN comment TEXT DEFAULT ''")

    # Asegurar usuario inicial demo con contraseña por defecto
    conn.execute("INSERT OR IGNORE INTO users (id, email, password) VALUES (1, 'demo@edulayout.org', '1234')")
    # Actualizar contraseñas si eran null o vacías
    conn.execute("UPDATE users SET password = '1234' WHERE password IS NULL OR password = ''")

    # Sembrar celdas estándar si la DB está vacía
    count = conn.execute("SELECT COUNT(*) FROM layouts").fetchone()[0]
    if count == 0:
        seed_standard_cells(conn)

    conn.commit()
    conn.close()
    print(f"✔ Base de datos lista en: {DB_PATH}")


def seed_standard_cells(conn):
    """Carga las 3 celdas estándar del PDK GPDK045 como layouts iniciales."""
    import json
    # Leer desde el frontend para mantener una única fuente de verdad
    std_cells_path = Path(__file__).parent.parent / "frontend" / "src" / "data" / "standardCells.js"
    cells = []

    if std_cells_path.exists():
        # Extraer el array JS con una función temporal
        content = std_cells_path.read_text(encoding="utf-8")
        content = content.replace("export const standardCells", "const standardCells")
        try:
            ns = {}
            exec(
                "import json\n" + content.replace("export ", "") +
                "\nresult = [{'name': c['name'], 'shapes': c['shapes']} for c in standardCells]",
                ns
            )
            cells = ns.get("result", [])
        except Exception:
            cells = []

    if not cells:
        # Fallback: 3 celdas mínimas hardcodeadas
        cells = [
            {"name": "nmos_min",  "shapes": []},
            {"name": "pmos_min",  "shapes": []},
            {"name": "inv_cmos",  "shapes": []},
        ]

    for cell in cells:
        cur = conn.execute(
            "INSERT INTO layouts (name, pdk_id, user_id, is_checked_out) VALUES (?, 1, 1, 0)",
            (cell["name"],)
        )
        conn.execute(
            "INSERT INTO layout_versions (layout_id, version_number, data) VALUES (?, 1, ?)",
            (cur.lastrowid, json.dumps(cell["shapes"]))
        )
    print(f"✔ Celdas estándar cargadas: {[c['name'] for c in cells]}")


# ─── Crear la app FastAPI ─────────────────────────────────────────────────────

init_db()

app = FastAPI(
    title="EduLayout API",
    version="1.0.0",
    description="Backend para el editor de layouts CMOS educativo (PDK GPDK045 45nm)."
)

# Permitir peticiones desde el frontend Vite (puerto 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar todos los endpoints definidos en handler.py
app.include_router(router)


@app.get("/api/health")
def health():
    return {"status": "ok", "pdk": "GPDK045", "architecture": "FastAPI"}


# ─── Arranque directo ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3001"))
    print(f"Iniciando EduLayout Backend en http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
