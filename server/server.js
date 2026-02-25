import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'database.db'));
const app = express();

app.use(cors());
app.use(express.json());

// DB 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_hash, promo_type)
  );

  CREATE TABLE IF NOT EXISTS points_exchange (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// API: 프로모션 지급 여부 확인
app.get('/api/score/promo/check/:userHash/:promoType', (req, res) => {
  const { userHash, promoType } = req.params;
  const row = db.prepare('SELECT * FROM promotion_grants WHERE user_hash = ? AND promo_type = ?').get(userHash, promoType);
  res.json({ granted: !!row, detail: row || null });
});

// API: 프로모션 지급 기록
app.post('/api/score/promo/record', (req, res) => {
  const { userHash, promoType, promoCode, amount } = req.body;
  if (!userHash || !promoType) return res.status(400).json({ error: 'userHash and promoType required' });
  try {
    db.prepare(`
      INSERT OR IGNORE INTO promotion_grants (user_hash, promo_type, promo_code, amount, status)
      VALUES (?, ?, ?, ?, 'granted')
    `).run(userHash, promoType, promoCode || null, amount || 0);
    res.json({ status: 'ok' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.json({ status: 'already_granted' });
    res.status(500).json({ error: e.message });
  }
});

// API: 포인트 교환 기록
app.post('/api/score/promo/exchange', (req, res) => {
  const { userHash, points } = req.body;
  if (!userHash || !points) return res.status(400).json({ error: 'userHash and points required' });
  try {
    db.prepare('INSERT INTO points_exchange (user_hash, points) VALUES (?, ?)').run(userHash, points);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
