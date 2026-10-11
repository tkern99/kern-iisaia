import sqlite3
import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "db"
DB_DIR.mkdir(exist_ok=True)
DB_PATH = DB_DIR / "simulator.db"
SCHEMA_PATH = BASE_DIR / "database.sql"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ejecutar esquema
    if SCHEMA_PATH.exists():
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            cursor.executescript(f.read())
    
    conn.commit()

    # Sembrar celdas estándar si no hay layouts
    cursor.execute("SELECT COUNT(*) as cnt FROM layouts")
    row = cursor.fetchone()
    if row and row["cnt"] == 0:
        seed_standard_cells(conn)

    conn.close()

def seed_standard_cells(conn):
    cursor = conn.cursor()
    # Definición de celdas estándar GPDK045
    std_cells = [
        {
            "name": "nmos_min",
            "shapes": [
                { "id": "nmos_act", "layerId": "Oxide", "x": 0, "y": 0, "width": 0.245, "height": 0.12 },
                { "id": "nmos_nimp", "layerId": "Nimp", "x": -0.02, "y": -0.02, "width": 0.285, "height": 0.16 },
                { "id": "nmos_poly", "layerId": "Poly", "x": 0.1, "y": -0.10, "width": 0.045, "height": 0.32 },
                { "id": "nmos_cs", "layerId": "Cont", "x": 0.02, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "nmos_cd", "layerId": "Cont", "x": 0.165, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "nmos_m1s", "layerId": "Metal1", "x": 0.01, "y": 0.02, "width": 0.08, "height": 0.08 },
                { "id": "nmos_m1d", "layerId": "Metal1", "x": 0.155, "y": 0.02, "width": 0.08, "height": 0.08 },
                { "id": "nmos_bact", "layerId": "Oxide", "x": 0, "y": 0.25, "width": 0.245, "height": 0.10 },
                { "id": "nmos_bpimp", "layerId": "Pimp", "x": -0.02, "y": 0.23, "width": 0.285, "height": 0.14 },
                { "id": "nmos_bct", "layerId": "Cont", "x": 0.09, "y": 0.27, "width": 0.06, "height": 0.06 },
                { "id": "nmos_bm1", "layerId": "Metal1", "x": 0.08, "y": 0.26, "width": 0.08, "height": 0.08 }
            ]
        },
        {
            "name": "pmos_min",
            "shapes": [
                { "id": "pmos_nwell", "layerId": "Nwell", "x": -0.1, "y": -0.32, "width": 0.445, "height": 0.58 },
                { "id": "pmos_act", "layerId": "Oxide", "x": 0, "y": 0, "width": 0.245, "height": 0.12 },
                { "id": "pmos_pimp", "layerId": "Pimp", "x": -0.02, "y": -0.02, "width": 0.285, "height": 0.16 },
                { "id": "pmos_poly", "layerId": "Poly", "x": 0.1, "y": -0.10, "width": 0.045, "height": 0.32 },
                { "id": "pmos_cs", "layerId": "Cont", "x": 0.02, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "pmos_cd", "layerId": "Cont", "x": 0.165, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "pmos_m1s", "layerId": "Metal1", "x": 0.01, "y": 0.02, "width": 0.08, "height": 0.08 },
                { "id": "pmos_m1d", "layerId": "Metal1", "x": 0.155, "y": 0.02, "width": 0.08, "height": 0.08 },
                { "id": "pmos_bact", "layerId": "Oxide", "x": 0, "y": -0.25, "width": 0.245, "height": 0.10 },
                { "id": "pmos_bnimp", "layerId": "Nimp", "x": -0.02, "y": -0.27, "width": 0.285, "height": 0.14 },
                { "id": "pmos_bct", "layerId": "Cont", "x": 0.09, "y": -0.23, "width": 0.06, "height": 0.06 },
                { "id": "pmos_bm1", "layerId": "Metal1", "x": 0.08, "y": -0.24, "width": 0.08, "height": 0.08 }
            ]
        },
        {
            "name": "inv_cmos",
            "shapes": [
                { "id": "inv_nwell", "layerId": "Nwell", "x": -0.10, "y": -0.32, "width": 0.445, "height": 0.58 },
                { "id": "inv_pact", "layerId": "Oxide", "x": 0, "y": 0, "width": 0.245, "height": 0.12 },
                { "id": "inv_ppimp", "layerId": "Pimp", "x": -0.02, "y": -0.02, "width": 0.285, "height": 0.16 },
                { "id": "inv_pcs", "layerId": "Cont", "x": 0.02, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "inv_pcd", "layerId": "Cont", "x": 0.165, "y": 0.03, "width": 0.06, "height": 0.06 },
                { "id": "inv_pbact", "layerId": "Oxide", "x": 0, "y": -0.25, "width": 0.245, "height": 0.10 },
                { "id": "inv_pbnimp", "layerId": "Nimp", "x": -0.02, "y": -0.27, "width": 0.285, "height": 0.14 },
                { "id": "inv_pbct", "layerId": "Cont", "x": 0.02, "y": -0.23, "width": 0.06, "height": 0.06 },
                { "id": "inv_vdd_m1", "layerId": "Metal1", "x": 0.01, "y": -0.25, "width": 0.08, "height": 0.36 },
                { "id": "inv_pin_vdd", "layerId": "PinM1", "x": 0.01, "y": -0.25, "width": 0.08, "height": 0.08, "label": "VDD" },
                { "id": "inv_nact", "layerId": "Oxide", "x": 0, "y": 0.60, "width": 0.245, "height": 0.12 },
                { "id": "inv_nnimp", "layerId": "Nimp", "x": -0.02, "y": 0.58, "width": 0.285, "height": 0.16 },
                { "id": "inv_ncs", "layerId": "Cont", "x": 0.02, "y": 0.63, "width": 0.06, "height": 0.06 },
                { "id": "inv_ncd", "layerId": "Cont", "x": 0.165, "y": 0.63, "width": 0.06, "height": 0.06 },
                { "id": "inv_nbact", "layerId": "Oxide", "x": 0, "y": 0.85, "width": 0.245, "height": 0.10 },
                { "id": "inv_nbpimp", "layerId": "Pimp", "x": -0.02, "y": 0.83, "width": 0.285, "height": 0.14 },
                { "id": "inv_nbct", "layerId": "Cont", "x": 0.02, "y": 0.87, "width": 0.06, "height": 0.06 },
                { "id": "inv_vss_m1", "layerId": "Metal1", "x": 0.01, "y": 0.61, "width": 0.08, "height": 0.34 },
                { "id": "inv_pin_vss", "layerId": "PinM1", "x": 0.01, "y": 0.87, "width": 0.08, "height": 0.08, "label": "VSS" },
                { "id": "inv_poly_v", "layerId": "Poly", "x": 0.10, "y": -0.10, "width": 0.045, "height": 0.92 },
                { "id": "inv_poly_pad", "layerId": "Poly", "x": -0.04, "y": 0.32, "width": 0.185, "height": 0.10 },
                { "id": "inv_in_ct", "layerId": "Cont", "x": -0.02, "y": 0.34, "width": 0.06, "height": 0.06 },
                { "id": "inv_in_m1", "layerId": "Metal1", "x": -0.03, "y": 0.33, "width": 0.08, "height": 0.08 },
                { "id": "inv_pin_in", "layerId": "PinM1", "x": -0.03, "y": 0.33, "width": 0.08, "height": 0.08, "label": "IN" },
                { "id": "inv_out_m1", "layerId": "Metal1", "x": 0.155, "y": 0.02, "width": 0.08, "height": 0.69 },
                { "id": "inv_pin_out", "layerId": "PinM1", "x": 0.155, "y": 0.33, "width": 0.08, "height": 0.08, "label": "OUT" }
            ]
        }
    ]

    for cell in std_cells:
        cursor.execute("INSERT INTO layouts (name, pdk_id, user_id, is_checked_out) VALUES (?, 1, 1, 0)", (cell["name"],))
        layout_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO layout_versions (layout_id, version_number, data) VALUES (?, 1, ?)",
            (layout_id, json.dumps({"shapes": cell["shapes"]}))
        )

    conn.commit()
