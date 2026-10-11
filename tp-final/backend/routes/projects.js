const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');
const router = express.Router();

const dbPath = path.join(__dirname, '..', 'db', 'edulayout.db');
const db = new Database(dbPath);
const JWT_SECRET = process.env.JWT_SECRET || 'edulayout-secret-key-123';

// Auth middleware mock for MVP
const requireAuth = (req, res, next) => {
  req.user = { id: 1, username: 'demo' };
  next();
};

router.use(requireAuth);

router.get('/', (req, res) => {
  const stmt = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC');
  res.json(stmt.all(req.user.id));
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const stmt = db.prepare('INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)');
  const info = stmt.run(req.user.id, name, description || '');
  res.json({ id: info.lastInsertRowid, name, description, pdk: 'GPDK045' });
});

// Versions
router.get('/:id/versions', (req, res) => {
  const stmt = db.prepare('SELECT id, version_num, label, created_at FROM versions WHERE project_id = ? ORDER BY created_at DESC');
  res.json(stmt.all(req.params.id));
});

router.post('/:id/versions', (req, res) => {
  const { version_num, label, snapshot } = req.body;
  const stmt = db.prepare('INSERT INTO versions (project_id, version_num, label, snapshot) VALUES (?, ?, ?, ?)');
  const info = stmt.run(req.params.id, version_num || '1.0', label || 'Auto-save', snapshot);
  
  // Update project updated_at
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  
  res.json({ id: info.lastInsertRowid, success: true });
});

// Get specific version
router.get('/:id/versions/:versionId', (req, res) => {
  const stmt = db.prepare('SELECT * FROM versions WHERE id = ? AND project_id = ?');
  const version = stmt.get(req.params.versionId, req.params.id);
  if (!version) return res.status(404).json({ error: 'Versión no encontrada' });
  res.json(version);
});

// Delete project and all its versions
router.delete('/:id', (req, res) => {
  const projectId = req.params.id;
  try {
    const deleteVersions = db.prepare('DELETE FROM versions WHERE project_id = ?');
    const deleteProject = db.prepare('DELETE FROM projects WHERE id = ?');

    db.transaction(() => {
      deleteVersions.run(projectId);
      deleteProject.run(projectId);
    })();

    res.json({ success: true, id: projectId });
  } catch (err) {
    console.error('Error al eliminar proyecto:', err);
    res.status(500).json({ error: 'Error al eliminar el proyecto' });
  }
});

module.exports = router;
