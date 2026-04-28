const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PIPELINE_PORT || 5005;
const DB_PATH = path.join(__dirname, 'asha_data.db');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Database connection error:", err.message);
    else console.log("Connected to ASHA Data SQLite database.");
});

// GET all documents
app.get('/api/documents', (req, res) => {
    db.all("SELECT * FROM documents ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET latest updates
app.get('/api/updates', (req, res) => {
    db.all("SELECT * FROM updates ORDER BY id DESC LIMIT 20", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Search documents
app.get('/api/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    db.all("SELECT * FROM documents WHERE title LIKE ? OR category LIKE ?", [`%${q}%`, `%${q}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`ASHA Data API running on http://localhost:${PORT}`);
});
