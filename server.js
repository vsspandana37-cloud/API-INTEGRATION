const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'humanity_hub.db');

// Middleware Config
app.use(cors());
app.use(express.json());
// This tells Express that index.html is actually one folder level up (..) from the backend folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});// Automatically maps requests to files in current folder

// ── SQL DATABASE HOOK ───────────────────────────────────────
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ SQL Engine Init Crash:', err.message);
    } else {
        console.log('📦 Connected to the SQLite database successfully.');
        
        // Execute structural migrations table instantiation
        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            time TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// ── API ROUTES ──────────────────────────────────────────────

// 1. GET: Fetch community data entries
app.get('/api/wall', (req, res) => {
    const query = `SELECT name, text, time FROM posts ORDER BY id ASC LIMIT 50`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database query failure:', err.message);
            return res.status(500).json({ error: 'Failed to stream post layers.' });
        }
        res.json(rows);
    });
});

// 2. POST: Append entry data rows inside database
app.post('/api/wall', (req, res) => {
    const { name, text, time } = req.body;
    
    if (!text) {
        return res.status(400).json({ error: 'Payload configuration invalid: Missing text string.' });
    }

    const userName = name || 'Anonymous';
    const postTime = time || 'just now';
    const query = `INSERT INTO posts (name, text, time) VALUES (?, ?, ?)`;

    db.run(query, [userName, text, postTime], function(err) {
        if (err) {
            console.error('SQL Engine operational crash:', err.message);
            return res.status(500).json({ error: 'Transactional drop.' });
        }
        res.status(201).json({
            id: this.lastID,
            name: userName,
            text: text,
            time: postTime
        });
    });
});

// 3. API Proxy: Fixes public CORS issues for quotes
app.get('/api/quote', async (req, res) => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch('https://api.quotable.io/random?tags=inspirational|wisdom|motivational');
        if (!response.ok) throw new Error();
        const data = await response.json();
        res.json(data);
    } catch {
        const fallbacks = [
            { content: "No act of kindness, no matter how small, is ever wasted.", author: "Aesop", tags: ["kindness"] },
            { content: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill", tags: ["generosity"] }
        ];
        res.json(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    }
});

// Explicit base fallback mapping route redirect
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Boot listening thread
app.listen(PORT, () => {
    console.log(`🚀 Humanity Hub Server running at: http://localhost:${PORT}`);
});