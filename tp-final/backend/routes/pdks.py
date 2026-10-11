import json
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
from database import get_db_connection

router = APIRouter()

class PdkCreate(BaseModel):
    name: str
    drc_rules: Dict[str, Any]
    is_custom: Optional[bool] = True

@router.get("/api/pdks")
async def list_pdks():
    """
    GET /api/pdks: Lista todos los PDKs (incluyendo GPDK045 y personalizados).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, drc_rules, is_custom, user_id FROM pdks ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        try:
            rules = json.loads(r["drc_rules"])
        except Exception:
            rules = {}
        result.append({
            "id": r["id"],
            "name": r["name"],
            "drc_rules": rules,
            "is_custom": bool(r["is_custom"])
        })
    return result

@router.post("/api/pdks", status_code=status.HTTP_201_CREATED)
async def create_pdk(pdk: PdkCreate, request: Request):
    """
    POST /api/pdks: Crea un PDK personalizado.
    """
    user = request.session.get("user", {"id": 1})
    user_id = user.get("id", 1)

    conn = get_db_connection()
    cursor = conn.cursor()
    drc_rules_str = json.dumps(pdk.drc_rules)

    cursor.execute(
        "INSERT INTO pdks (name, drc_rules, is_custom, user_id) VALUES (?, ?, ?, ?)",
        (pdk.name, drc_rules_str, 1 if pdk.is_custom else 0, user_id)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "name": pdk.name,
        "drc_rules": pdk.drc_rules,
        "is_custom": bool(pdk.is_custom)
    }
