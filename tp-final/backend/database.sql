-- Schema de Base de Datos SQLite para EduLayout (GPDK045 45nm)
-- Usa CREATE TABLE IF NOT EXISTS para que el servidor pueda arrancar sin errores
-- aunque la base ya exista.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    email    TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '1234'
);

CREATE TABLE IF NOT EXISTS pdks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    drc_rules  TEXT NOT NULL,
    is_custom  BOOLEAN DEFAULT 0,
    user_id    INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS layouts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    pdk_id         INTEGER NOT NULL,
    user_id        INTEGER NOT NULL,
    is_checked_out BOOLEAN DEFAULT 0,
    checked_out_by INTEGER,
    FOREIGN KEY (pdk_id)         REFERENCES pdks(id)   ON DELETE CASCADE,
    FOREIGN KEY (user_id)        REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (checked_out_by) REFERENCES users(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS layout_versions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    layout_id      INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    comment        TEXT DEFAULT '',
    data           TEXT NOT NULL,
    UNIQUE (layout_id, version_number),
    FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layout_instances (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_layout_id INTEGER NOT NULL,
    child_layout_id  INTEGER NOT NULL,
    x_pos            REAL,
    y_pos            REAL,
    FOREIGN KEY (parent_layout_id) REFERENCES layouts(id) ON DELETE CASCADE,
    FOREIGN KEY (child_layout_id)  REFERENCES layouts(id) ON DELETE CASCADE
);

-- Datos iniciales: usuario demo y PDK GPDK045
INSERT OR IGNORE INTO users (id, email) VALUES (1, 'demo@edulayout.org');

INSERT OR IGNORE INTO pdks (id, name, drc_rules, is_custom, user_id)
VALUES (
    1,
    'GPDK045',
    '{"Oxide":{"min_width":0.09,"min_spacing":0.09},"Poly":{"min_width":0.045,"min_spacing":0.075},"Cont":{"min_width":0.06,"min_height":0.06,"min_spacing":0.075},"Metal1":{"min_width":0.065,"min_spacing":0.065},"Via1":{"min_size":0.07,"min_spacing":0.075},"Metal2":{"min_width":0.07,"min_spacing":0.07},"Nwell":{"min_width":0.2,"min_spacing":0.2}}',
    0,
    1
);
