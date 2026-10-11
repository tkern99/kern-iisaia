import json
import sqlite3
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from database import get_db_connection
from drc import validate_drc

router = APIRouter()

class LayoutCreate(BaseModel):
    name: str
    pdk_id: Optional[int] = 1

class LayoutVersionCreate(BaseModel):
    data: Any # Puede ser dict {'shapes': [...]} o list [...]
    skip_drc: Optional[bool] = False

class LayoutInstanceCreate(BaseModel):
    child_layout_id: int
    x_pos: float
    y_pos: float

@router.get("/api/layouts")
async def list_layouts():
    """
    GET /api/layouts: Lista todos los layouts disponibles.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT l.id, l.name, l.pdk_id, l.user_id, l.is_checked_out, p.name as pdk_name
        FROM layouts l
        LEFT JOIN pdks p ON l.pdk_id = p.id
        ORDER BY l.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "pdk_id": r["pdk_id"],
            "pdk_name": r["pdk_name"],
            "user_id": r["user_id"],
            "is_checked_out": bool(r["is_checked_out"])
        }
        for r in rows
    ]

@router.post("/api/layouts", status_code=status.HTTP_201_CREATED)
async def create_layout(layout: LayoutCreate, request: Request):
    """
    POST /api/layouts: Crea un nuevo layout.
    """
    user = request.session.get("user", {"id": 1})
    user_id = user.get("id", 1)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Validar PDK
    cursor.execute("SELECT id FROM pdks WHERE id = ?", (layout.pdk_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="PDK inexistente")

    # Si ya existe un layout con el mismo nombre, reutilizarlo
    cursor.execute("SELECT id FROM layouts WHERE name = ?", (layout.name,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {
            "id": existing["id"],
            "name": layout.name,
            "pdk_id": layout.pdk_id,
            "is_checked_out": False
        }

    cursor.execute(
        "INSERT INTO layouts (name, pdk_id, user_id, is_checked_out) VALUES (?, ?, ?, 0)",
        (layout.name, layout.pdk_id, user_id)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "name": layout.name,
        "pdk_id": layout.pdk_id,
        "is_checked_out": False
    }

@router.get("/api/layouts/{id}")
async def get_layout(id: int):
    """
    GET /api/layouts/{id}: Obtiene detalles de un layout.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT l.id, l.name, l.pdk_id, l.user_id, l.is_checked_out, p.name as pdk_name
        FROM layouts l
        LEFT JOIN pdks p ON l.pdk_id = p.id
        WHERE l.id = ?
    """, (id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"No se encontró el layout {id}")

    return {
        "id": row["id"],
        "name": row["name"],
        "pdk_id": row["pdk_id"],
        "pdk_name": row["pdk_name"],
        "is_checked_out": bool(row["is_checked_out"])
    }

@router.delete("/api/layouts/{id}")
async def delete_layout(id: int):
    """
    DELETE /api/layouts/{id}: Elimina un layout y sus versiones en cascada.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM layouts WHERE id = ?", (id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Layout no encontrado")

    cursor.execute("DELETE FROM layouts WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": id}

@router.post("/api/layouts/{id}/checkout")
async def checkout_layout(id: int):
    """
    POST /api/layouts/{id}/checkout: Bloquea el layout para edición (checkout).
    Retorna 409 si ya está bloqueado.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, is_checked_out FROM layouts WHERE id = ?", (id,))
    layout = cursor.fetchone()

    if not layout:
        conn.close()
        raise HTTPException(status_code=404, detail=f"No se encontró el layout {id}")

    if layout["is_checked_out"]:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto - El layout ya está checked out por otro usuario"
        )

    cursor.execute("UPDATE layouts SET is_checked_out = 1 WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return {
        "message": "Layout bloqueado para edición (checked out)",
        "id": id,
        "is_checked_out": True
    }

@router.post("/api/layouts/{id}/versions", status_code=status.HTTP_201_CREATED)
async def checkin_layout_version(id: int, version: LayoutVersionCreate):
    """
    POST /api/layouts/{id}/versions: Check-in de layout.
    1. Join con pdks para drc_rules (404 si no existe).
    2. Valida DRC (400 si hay violaciones).
    3. Calcula version_number (MAX + 1).
    4. Inserta atómicamente en layout_versions (409 ante concurrencia).
    5. Desbloquea el layout (is_checked_out = 0).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Buscar layout y JOIN con pdks
        cursor.execute("""
            SELECT l.id, l.name, l.is_checked_out, p.drc_rules 
            FROM layouts l
            JOIN pdks p ON l.pdk_id = p.id
            WHERE l.id = ?
        """, (id,))
        layout_row = cursor.fetchone()

        if not layout_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el layout {id}"
            )

        # Parsear reglas DRC de la base
        try:
            drc_rules = json.loads(layout_row["drc_rules"])
        except Exception:
            drc_rules = {}

        # 2. Validar DRC informativamente (no rechaza el check-in ante violaciones)
        drc_violations = []
        if not version.skip_drc and drc_rules:
            try:
                drc_violations = validate_drc(version.data, drc_rules)
            except Exception:
                drc_violations = []

        # 3 y 4. Insertar versión y desbloquear layout
        data_json_str = json.dumps(version.data)

        cursor.execute("""
            INSERT INTO layout_versions (layout_id, version_number, data)
            VALUES (
                ?,
                COALESCE((SELECT MAX(version_number) FROM layout_versions WHERE layout_id = ?), 0) + 1,
                ?
            )
        """, (id, id, data_json_str))

        new_version_id = cursor.lastrowid

        # Desbloquear layout (check-in exitoso)
        cursor.execute("UPDATE layouts SET is_checked_out = 0 WHERE id = ?", (id,))
        conn.commit()

        cursor.execute("SELECT version_number FROM layout_versions WHERE id = ?", (new_version_id,))
        new_version_number = cursor.fetchone()["version_number"]

        result = {
            "id": new_version_id,
            "version_number": new_version_number,
            "layout_id": id,
            "is_checked_out": False
        }
        if drc_violations:
            result["drc_violations"] = drc_violations
            result["warning"] = f"Versión guardada con {len(drc_violations)} advertencia(s) de DRC."

        return result

    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto de concurrencia: se intentó guardar la misma versión en simultáneo. Intente nuevamente."
        )
    finally:
        conn.close()

@router.get("/api/layouts/{id}/versions")
async def list_layout_versions(id: int):
    """
    GET /api/layouts/{id}/versions: Lista historial de versiones de un layout.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, layout_id, version_number, data 
        FROM layout_versions 
        WHERE layout_id = ? 
        ORDER BY version_number DESC
    """, (id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        try:
            data_parsed = json.loads(r["data"])
        except Exception:
            data_parsed = []
        result.append({
            "id": r["id"],
            "layout_id": r["layout_id"],
            "version_number": r["version_number"],
            "data": data_parsed
        })
    return result

@router.get("/api/layouts/{id}/versions/{version_id}")
async def get_layout_version(id: int, version_id: int):
    """
    GET /api/layouts/{id}/versions/{version_id}: Obtiene los datos de una versión específica.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, layout_id, version_number, data 
        FROM layout_versions 
        WHERE layout_id = ? AND id = ?
    """, (id, version_id))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Versión no encontrada")

    try:
        data_parsed = json.loads(row["data"])
    except Exception:
        data_parsed = []

    shapes_list = data_parsed if isinstance(data_parsed, list) else (data_parsed.get("shapes") or data_parsed.get("polygons") or [])

    return {
        "id": row["id"],
        "layout_id": row["layout_id"],
        "version_number": row["version_number"],
        "data": data_parsed,
        "snapshot": json.dumps(shapes_list)
    }


@router.post("/api/layouts/{id}/instances", status_code=status.HTTP_201_CREATED)
async def create_layout_instance(id: int, inst: LayoutInstanceCreate):
    """
    POST /api/layouts/{id}/instances: Instancia un layout hijo dentro de un layout padre.
    """
    if id == inst.child_layout_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependencia circular: un layout no puede instanciarse a sí mismo."
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verificar existencia de ambos layouts
    cursor.execute("SELECT id FROM layouts WHERE id = ?", (id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Layout padre {id} no existe")

    cursor.execute("SELECT id FROM layouts WHERE id = ?", (inst.child_layout_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Layout hijo {inst.child_layout_id} no existe")

    cursor.execute("""
        INSERT INTO layout_instances (parent_layout_id, child_layout_id, x_pos, y_pos)
        VALUES (?, ?, ?, ?)
    """, (id, inst.child_layout_id, inst.x_pos, inst.y_pos))
    conn.commit()
    new_inst_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_inst_id,
        "parent_layout_id": id,
        "child_layout_id": inst.child_layout_id,
        "x_pos": inst.x_pos,
        "y_pos": inst.y_pos
    }

@router.get("/api/layouts/{id}/instances")
async def list_layout_instances(id: int):
    """
    GET /api/layouts/{id}/instances: Lista las sub-instancias contenidas en un layout.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT i.id, i.parent_layout_id, i.child_layout_id, i.x_pos, i.y_pos, l.name as child_name
        FROM layout_instances i
        JOIN layouts l ON i.child_layout_id = l.id
        WHERE i.parent_layout_id = ?
    """, (id,))
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "parent_layout_id": r["parent_layout_id"],
            "child_layout_id": r["child_layout_id"],
            "child_name": r["child_name"],
            "x_pos": r["x_pos"],
            "y_pos": r["y_pos"]
        }
        for r in rows
    ]
