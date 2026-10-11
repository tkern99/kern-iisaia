-- Migraciones: Esquema de Base de Datos SQLite (GPDK045 45nm)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pdks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    drc_rules TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT 0,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pdk_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_checked_out BOOLEAN DEFAULT 0,
    FOREIGN KEY (pdk_id) REFERENCES pdks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layout_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layout_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    data TEXT NOT NULL,
    UNIQUE (layout_id, version_number),
    FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS layout_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_layout_id INTEGER NOT NULL,
    child_layout_id INTEGER NOT NULL,
    x_pos REAL,
    y_pos REAL,
    FOREIGN KEY (parent_layout_id) REFERENCES layouts(id) ON DELETE CASCADE,
    FOREIGN KEY (child_layout_id) REFERENCES layouts(id) ON DELETE CASCADE
);

-- Seed Inicial: Usuario por defecto y PDKs (GPDK045 y skywater130)
INSERT OR IGNORE INTO users (id, email) VALUES (1, 'demo@edulayout.org');

INSERT OR IGNORE INTO pdks (id, name, drc_rules, is_custom, user_id) 
VALUES (
    1, 
    'GPDK045', 
    '{"Oxide":{"min_width":0.090,"min_spacing":0.090},"Poly":{"min_width":0.045,"min_spacing":0.075},"Cont":{"min_width":0.060,"min_height":0.060,"min_spacing":0.075},"Metal1":{"min_width":0.065,"min_spacing":0.065},"Via1":{"min_size":0.070,"min_spacing":0.075},"Metal2":{"min_width":0.070,"min_spacing":0.070},"Nwell":{"min_width":0.200,"min_spacing":0.200}}', 
    0, 
    1
);

INSERT OR IGNORE INTO pdks (id, name, drc_rules, is_custom, user_id)
VALUES (
    2,
    'skywater130',
    '{"poly":{"min_width":0.150,"min_spacing":0.210},"diff":{"min_width":0.150,"min_spacing":0.270},"m1":{"min_width":0.140,"min_spacing":0.140},"m2":{"min_width":0.140,"min_spacing":0.140},"via":{"min_size":0.150,"min_spacing":0.170}}',
    0,
    1
);

