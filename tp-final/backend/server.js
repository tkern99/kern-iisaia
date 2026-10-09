const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Setup DB directory
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Init DB
const dbPath = path.join(dbDir, 'edulayout.db');
const db = new Database(dbPath);

// Initialize schema
const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
db.exec(schema);

// MVP: Ensure dummy user exists for foreign key constraints
db.prepare("INSERT OR IGNORE INTO users (id, email, username, password) VALUES (1, 'demo@demo.com', 'demo', 'demo')").run();

// Seed default projects if none exist
const projectCount = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
if (projectCount === 0) {
  try {
    const stdCellsContent = fs.readFileSync(path.join(__dirname, '../frontend/src/data/standardCells.js'), 'utf8');
    // Extract the array using Function constructor since it's JS, not strict JSON
    const extractArray = new Function(`
      ${stdCellsContent.replace('export const standardCells', 'const standardCells')}
      return standardCells;
    `);
    const cells = extractArray();
    
    const insertProj = db.prepare("INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)");
    const insertVer = db.prepare("INSERT INTO versions (project_id, snapshot, version_msg) VALUES (?, ?, ?)");
    
    db.transaction(() => {
      for (const cell of cells) {
        const info = insertProj.run(1, cell.name, cell.description);
        insertVer.run(info.lastInsertRowid, JSON.stringify(cell.shapes), "Initial seed");
      }
    })();
    console.log("Seeded database with default standard cells.");
  } catch (err) {
    console.error("Failed to seed standard cells:", err);
  }
}

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Basic test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pdk: 'GPDK045' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
