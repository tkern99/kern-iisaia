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
