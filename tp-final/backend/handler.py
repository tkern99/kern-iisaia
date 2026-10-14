"""
handler.py — Rutas de la API para EduLayout.

Implementa los endpoints definidos en openapi.yaml:
  - GET/POST  /api/layouts                         → listar y crear layouts
  - POST      /api/layouts/{id}/checkout            → bloquear para edición
  - GET/POST  /api/layouts/{id}/versions            → historial y check-in
  - GET       /api/layouts/{id}/versions/{vid}      → versión específica
  - DELETE    /api/layouts/{id}                     → eliminar layout
  - POST      /api/layouts/{id}/instances           → instanciar sub-layout

Además expone aliases /api/projects/* que el botón "Guardar" del Header usa,
mapeados 1-a-1 a los endpoints de /api/layouts.
"""

import json
import sqlite3
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Any, Optional

router = APIRouter()

DB_PATH = "simulator.db"


# ─── Helpers ────────────────────────────────────────────────────────────────

def get_db():
    """Abre una conexión a SQLite con acceso por nombre de columna."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def validate_drc(shapes: list, drc_rules: dict) -> list[str]:
    """
    Validación DRC básica del lado servidor.
    Verifica que cada geometría supere el ancho mínimo de su capa.
    El motor completo de DRC está en el frontend (drcEngine.js).
    """
    violations = []
    if not shapes:
        violations.append("El layout está vacío.")
        return violations

    for shape in shapes:
        layer = shape.get("layerId", "")
        rules = drc_rules.get(layer, {})
        min_w = rules.get("min_width", 0)
        w = abs(shape.get("width", 0))
        h = abs(shape.get("height", 0))
        if min_w and min(w, h) < min_w:
            violations.append(
                f"{layer}: dimensión mínima {min(w,h):.4f} µm < {min_w} µm requerido"
            )
    return violations


# ─── Schemas Pydantic ────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "1234"

class LayoutCreate(BaseModel):
    name: str
    pdk_id: Optional[int] = 1
    user_id: Optional[int] = 1

class CheckoutRequest(BaseModel):
    user_id: Optional[int] = 1

class LayoutVersionCreate(BaseModel):
    data: Any                       # acepta list de shapes o dict con clave 'shapes'
    comment: Optional[str] = ""     # comentario descriptivo de la versión
    skip_drc: Optional[bool] = False
    user_id: Optional[int] = None

class LayoutInstanceCreate(BaseModel):
    child_layout_id: int
    x_pos: float
    y_pos: float

# Para el endpoint de "Guardar" del Header (usa 'snapshot' en lugar de 'data')
class ProjectVersionCreate(BaseModel):
    version_num: Optional[str] = "1.0"
    label: Optional[str] = "Manual save"
    comment: Optional[str] = ""
    snapshot: Any                   # JSON string o lista de shapes
    skip_drc: Optional[bool] = True
    user_id: Optional[int] = None


# ─── /api/users y /api/login ──────────────────────────────────────────────────

@router.get("/api/users")
def list_users():
    """Lista todos los usuarios registrados."""
    conn = get_db()
    rows = conn.execute("SELECT id, email FROM users ORDER BY id ASC").fetchall()
    conn.close()
    return [{"id": r["id"], "email": r["email"]} for r in rows]


@router.post("/api/login")
@router.post("/api/auth/login")
def login(req: LoginRequest):
    """
    Inicio de sesión con validación de contraseña:
    - Si el usuario existe, valida su contraseña (devuelve 401 si no coincide).
    - Si el usuario no existe, lo crea con la contraseña ingresada.
    """
    email = req.email.strip()
    pwd = (req.password or "1234").strip()
    if not email:
        raise HTTPException(status_code=400, detail="El email o usuario es requerido")

    conn = get_db()
    row = conn.execute("SELECT id, email, password FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
    if not row:
        cur = conn.execute("INSERT INTO users (email, password) VALUES (?, ?)", (email, pwd))
        conn.commit()
        user_id = cur.lastrowid
        user = {"id": user_id, "email": email}
    else:
        user_pwd = row["password"] if row["password"] is not None else "1234"
        if user_pwd != pwd:
            conn.close()
            raise HTTPException(status_code=401, detail="Contraseña incorrecta. Por favor verifica tus credenciales.")
        user = {"id": row["id"], "email": row["email"]}
    conn.close()
    return {"user": user, "token": f"token-{user['id']}"}


# ─── /api/layouts ────────────────────────────────────────────────────────────

@router.get("/api/layouts")
def list_layouts():
    """Lista todos los layouts disponibles con estado de checkout y quién lo bloqueó."""
    conn = get_db()
    rows = conn.execute("""
        SELECT l.id, l.name, l.pdk_id, l.user_id, l.is_checked_out, l.checked_out_by,
               u.email as checked_out_by_email, p.name as pdk_name
        FROM layouts l
        LEFT JOIN pdks p ON l.pdk_id = p.id
        LEFT JOIN users u ON l.checked_out_by = u.id
        ORDER BY l.id ASC
    """).fetchall()
    conn.close()
    return [
        {
            "id": r["id"], "name": r["name"],
            "pdk_id": r["pdk_id"], "pdk_name": r["pdk_name"],
            "user_id": r["user_id"],
            "is_checked_out": bool(r["is_checked_out"]),
            "checked_out_by": r["checked_out_by"],
            "checked_out_by_email": r["checked_out_by_email"]
        }
        for r in rows
    ]


@router.post("/api/layouts", status_code=201)
def create_layout(layout: LayoutCreate):
    """Crea un nuevo layout. Si ya existe uno con ese nombre, lo devuelve."""
    conn = get_db()
    # Validar que el PDK exista
    if not conn.execute("SELECT id FROM pdks WHERE id = ?", (layout.pdk_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="PDK inexistente")

    creator_id = layout.user_id or 1
    existing = conn.execute("""
        SELECT l.id, l.name, l.pdk_id, l.is_checked_out, l.checked_out_by, u.email as checked_out_by_email
        FROM layouts l
        LEFT JOIN users u ON l.checked_out_by = u.id
        WHERE l.name = ?
    """, (layout.name,)).fetchone()

    if existing:
        conn.close()
        return {
            "id": existing["id"], "name": layout.name, "pdk_id": layout.pdk_id,
            "is_checked_out": bool(existing["is_checked_out"]),
            "checked_out_by": existing["checked_out_by"],
            "checked_out_by_email": existing["checked_out_by_email"]
        }

    cur = conn.execute(
        "INSERT INTO layouts (name, pdk_id, user_id, is_checked_out, checked_out_by) VALUES (?, ?, ?, 0, NULL)",
        (layout.name, layout.pdk_id, creator_id)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {
        "id": new_id, "name": layout.name, "pdk_id": layout.pdk_id,
        "is_checked_out": False, "checked_out_by": None, "checked_out_by_email": None
    }


@router.delete("/api/layouts/{id}")
def delete_layout(id: int):
    """Elimina un layout y todas sus versiones en cascada."""
    conn = get_db()
    if not conn.execute("SELECT id FROM layouts WHERE id = ?", (id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Layout no encontrado")
    conn.execute("DELETE FROM layouts WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": id}


# ─── /api/layouts/{id}/checkout ─────────────────────────────────────────────

@router.post("/api/layouts/{id}/checkout")
def checkout_layout(id: int, req: Optional[CheckoutRequest] = None, user_id: Optional[int] = None):
    """
    Bloquea el layout para edición exclusiva (checkout).
    Retorna 409 si ya está bloqueado por otro usuario.
    """
    actual_user_id = (req.user_id if req and req.user_id else None) or user_id or 1
    conn = get_db()
    row = conn.execute("""
        SELECT l.id, l.name, l.is_checked_out, l.checked_out_by, u.email as checked_out_by_email
        FROM layouts l
        LEFT JOIN users u ON l.checked_out_by = u.id
        WHERE l.id = ?
    """, (id,)).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"No se encontró el layout {id}")

    if row["is_checked_out"]:
        if row["checked_out_by"] is not None and row["checked_out_by"] != actual_user_id:
            owner = row["checked_out_by_email"] or f"usuario #{row['checked_out_by']}"
            conn.close()
            raise HTTPException(
                status_code=409,
                detail=f"Conflicto - El layout ya está bloqueado (checked out) por {owner}"
            )
        else:
            conn.close()
            return {
                "message": "El layout ya se encuentra bloqueado por ti para edición",
                "id": id,
                "is_checked_out": True,
                "checked_out_by": actual_user_id,
                "checked_out_by_email": row["checked_out_by_email"]
            }

    conn.execute("UPDATE layouts SET is_checked_out = 1, checked_out_by = ? WHERE id = ?", (actual_user_id, id))
    conn.commit()

    u_row = conn.execute("SELECT email FROM users WHERE id = ?", (actual_user_id,)).fetchone()
    email_str = u_row["email"] if u_row else None
    conn.close()
    return {
        "message": "Layout bloqueado para edición (checked out)",
        "id": id,
        "is_checked_out": True,
        "checked_out_by": actual_user_id,
        "checked_out_by_email": email_str
    }


# ─── /api/layouts/{id}/versions ─────────────────────────────────────────────

@router.get("/api/layouts/{id}/versions")
def list_versions(id: int):
    """Lista el historial de versiones de un layout, ordenado de más nuevo a más viejo."""
    conn = get_db()
    rows = conn.execute("""
        SELECT id, layout_id, version_number, comment, data
        FROM layout_versions
        WHERE layout_id = ?
        ORDER BY version_number DESC
    """, (id,)).fetchall()
    conn.close()
    result = []
    for r in rows:
        try:
            data = json.loads(r["data"])
        except Exception:
            data = []
        result.append({
            "id": r["id"],
            "layout_id": r["layout_id"],
            "version_number": r["version_number"],
            "comment": r["comment"] or "",
            "data": data
        })
    return result


@router.get("/api/layouts/{id}/versions/{version_id}")
def get_version(id: int, version_id: int):
    """Obtiene los datos de una versión específica."""
    conn = get_db()
    row = conn.execute(
        "SELECT id, layout_id, version_number, comment, data FROM layout_versions WHERE layout_id = ? AND id = ?",
        (id, version_id)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Versión no encontrada")
    try:
        data = json.loads(row["data"])
    except Exception:
        data = []
    # 'snapshot' como lista directa para compatibilidad con LibraryPanel
    shapes = data if isinstance(data, list) else (data.get("shapes") or data.get("polygons") or [])
    return {
        "id": row["id"],
        "layout_id": row["layout_id"],
        "version_number": row["version_number"],
        "comment": row["comment"] or "",
        "data": data,
        "snapshot": json.dumps(shapes)
    }


@router.post("/api/layouts/{id}/versions", status_code=201)
def checkin_layout(id: int, version: LayoutVersionCreate):
    """
    Check-in: guarda el estado actual del canvas como nueva versión.
    1. Busca el layout y sus reglas DRC.
    2. Valida que el layout no esté bloqueado (checked out) por otro usuario.
    3. Valida DRC (si skip_drc=False).
    4. Inserta la versión de forma atómica (COALESCE para auto-numerar).
    5. Desbloquea el layout (is_checked_out = 0, checked_out_by = NULL).
    """
    conn = get_db()
    try:
        row = conn.execute("""
            SELECT l.id, l.name, l.is_checked_out, l.checked_out_by, u.email as checked_out_by_email, p.drc_rules
            FROM layouts l
            LEFT JOIN users u ON l.checked_out_by = u.id
            JOIN pdks p ON l.pdk_id = p.id
            WHERE l.id = ?
        """, (id,)).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"No se encontró el layout {id}")

        # Validar bloqueo exclusivo si está en checkout por otro usuario
        if row["is_checked_out"] and row["checked_out_by"] is not None:
            if version.user_id is not None and row["checked_out_by"] != version.user_id:
                owner = row["checked_out_by_email"] or f"usuario #{row['checked_out_by']}"
                raise HTTPException(
                    status_code=403,
                    detail=f"No puedes modificar este layout: está bloqueado (checked out) por {owner}. Debe hacer check-in primero."
                )

        # Normalizar shapes: acepta lista directa o dict con clave 'shapes'
        shapes = version.data
        if isinstance(shapes, dict):
            shapes = shapes.get("shapes") or shapes.get("polygons") or []
        if not isinstance(shapes, list):
            shapes = []

        # Validar DRC si corresponde
        if not version.skip_drc:
            try:
                drc_rules = json.loads(row["drc_rules"])
            except Exception:
                drc_rules = {}
            violations = validate_drc(shapes, drc_rules)
            if violations:
                raise HTTPException(
                    status_code=400,
                    detail={"error": "DRC violations found", "details": violations}
                )

        data_str = json.dumps(shapes)
        comment_str = (version.comment or "").strip()
        cur = conn.execute("""
            INSERT INTO layout_versions (layout_id, version_number, comment, data)
            VALUES (
                ?,
                COALESCE((SELECT MAX(version_number) FROM layout_versions WHERE layout_id = ?), 0) + 1,
                ?,
                ?
            )
        """, (id, id, comment_str, data_str))
        conn.execute("UPDATE layouts SET is_checked_out = 0, checked_out_by = NULL WHERE id = ?", (id,))
        conn.commit()

        new_id = cur.lastrowid
        row_v = conn.execute(
            "SELECT version_number, comment FROM layout_versions WHERE id = ?", (new_id,)
        ).fetchone()

        return {
            "id": new_id,
            "version_number": row_v["version_number"],
            "comment": row_v["comment"] or "",
            "layout_id": id,
            "is_checked_out": False,
            "checked_out_by": None
        }

    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=409, detail={
            "error": "Conflicto de concurrencia: se intentó guardar la misma versión en simultáneo. Intente nuevamente."
        })
    finally:
        conn.close()


# ─── /api/layouts/{id}/instances ────────────────────────────────────────────

@router.post("/api/layouts/{id}/instances", status_code=201)
def create_instance(id: int, inst: LayoutInstanceCreate):
    """Instancia un layout hijo dentro de un layout padre."""
    if id == inst.child_layout_id:
        raise HTTPException(status_code=400, detail="Dependencia circular: un layout no puede instanciarse a sí mismo.")
    conn = get_db()
    if not conn.execute("SELECT id FROM layouts WHERE id = ?", (id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Layout padre {id} no existe")
    if not conn.execute("SELECT id FROM layouts WHERE id = ?", (inst.child_layout_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Layout hijo {inst.child_layout_id} no existe")
    cur = conn.execute(
        "INSERT INTO layout_instances (parent_layout_id, child_layout_id, x_pos, y_pos) VALUES (?, ?, ?, ?)",
        (id, inst.child_layout_id, inst.x_pos, inst.y_pos)
    )
    conn.commit()
    conn.close()
    return {"id": cur.lastrowid, "parent_layout_id": id,
            "child_layout_id": inst.child_layout_id, "x_pos": inst.x_pos, "y_pos": inst.y_pos}


# ─── Aliases /api/projects/* ─────────────────────────────────────────────────
# El Header.jsx y LibraryPanel.jsx usan /api/projects en lugar de /api/layouts.
# Estos aliases los redirigen al mismo sistema sin duplicar lógica.

@router.get("/api/projects")
def list_projects():
    return list_layouts()


@router.post("/api/projects", status_code=201)
def create_project(layout: LayoutCreate):
    return create_layout(layout)


@router.delete("/api/projects/{id}")
def delete_project(id: int):
    return delete_layout(id)


@router.get("/api/projects/{id}/versions")
def list_project_versions(id: int):
    return list_versions(id)


@router.get("/api/projects/{id}/versions/{version_id}")
def get_project_version(id: int, version_id: int):
    return get_version(id, version_id)


@router.post("/api/projects/{id}/versions", status_code=201)
def save_project_version(id: int, body: ProjectVersionCreate):
    """
    Endpoint que usa el botón 'Guardar' del Header.
    Acepta 'snapshot' (JSON string o lista) y lo guarda como nueva versión.
    """
    # Normalizar snapshot a lista de shapes
    shapes = body.snapshot
    if isinstance(shapes, str):
        try:
            shapes = json.loads(shapes)
        except Exception:
            shapes = []
    comment_to_use = (body.comment or body.label or "").strip()
    ver = LayoutVersionCreate(data=shapes, comment=comment_to_use, skip_drc=body.skip_drc, user_id=body.user_id)
    return checkin_layout(id, ver)
