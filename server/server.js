const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// .env 파일 로드 (없어도 무시)
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq > 0) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  });
} catch(e) {}

const app = express();
const PORT = 3001;

// DB setup
const DB_PATH = process.env.TEST_DB || path.join(__dirname, 'scores.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game TEXT NOT NULL,
    score INTEGER NOT NULL,
    user_hash TEXT,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE INDEX IF NOT EXISTS idx_game ON scores(game);
  CREATE INDEX IF NOT EXISTS idx_game_score ON scores(game, score);
`);
// Migration: add user_hash if table existed before
try { db.exec('ALTER TABLE scores ADD COLUMN user_hash TEXT'); } catch(e) {}
db.exec('CREATE INDEX IF NOT EXISTS idx_user_hash ON scores(user_hash)');
// Migration: add points column to users
try { db.exec('ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0'); } catch(e) {}

// Settings table (key-value store for runtime config)
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  )
`);

// Users table for Toss profile
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    user_gender TEXT,
    user_birthday TEXT,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  )
`);

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://littlesunnydays.com',
    /\.apps\.tossmini\.com$/,
    /\.private-apps\.tossmini\.com$/,
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  ],
  credentials: true,
}));
app.use(express.json());

// ESTIMATED: [mean, std] — mean = goalDefault (50th percentile anchor, achieving goal = average player)
// std by game type: isLevel×0.45, isTimer×0.40, special(reaction/numtouch/timing)×0.35
// reaction: score = sum of (1000-ms)/10 × 5rounds — ms unit differs, kept separately
// Overridden by calibration.json when real data accumulates (100+ players per game).
const ESTIMATED = {
  math:       [120, 48],   // isTimer, goalDefault=120
  memory:     [80,  32],   // isTimer, goalDefault=80
  reaction:   [300, 105],  // special: score=(1000-ms)/10×5, goalDefault=2000ms(다른 단위)
  stroop:     [50,  20],   // isTimer, goalDefault=50
  sequence:   [150, 68],   // isLevel, goalDefault=150
  word:       [200, 80],   // default, goalDefault=200
  pattern:    [30,  12],   // isTimer, goalDefault=30
  focus:      [200, 80],   // isTimer, goalDefault=200
  rotate:     [30,  12],   // isTimer, goalDefault=30
  reverse:    [50,  23],   // isLevel, goalDefault=50
  numtouch:   [250, 88],   // special, goalDefault=250
  rhythm:     [120, 54],   // isLevel, goalDefault=120
  rps:        [50,  20],   // isTimer, goalDefault=50
  oddone:     [100, 40],   // isTimer, goalDefault=100
  compare:    [120, 48],   // isTimer, goalDefault=120
  bulb:       [100, 45],   // isLevel, goalDefault=100
  colormix:   [70,  28],   // isTimer, goalDefault=70
  wordcomp:   [80,  32],   // isTimer, goalDefault=80
  timing:     [80,  28],   // special, goalDefault=80
  matchpair:  [150, 60],   // isTimer, goalDefault=150
  headcount:  [50,  23],   // isLevel 우선, goalDefault=50
  pyramid:    [60,  24],   // isTimer, goalDefault=60
  maxnum:     [80,  32],   // isTimer, goalDefault=80
  signfind:   [60,  24],   // isTimer, goalDefault=60
  coincount:  [50,  20],   // isTimer, goalDefault=50
  clock:      [70,  28],   // isTimer, goalDefault=70
  wordmem:    [150, 68],   // isLevel, goalDefault=150
  blockcount: [50,  20],   // isTimer, goalDefault=50
  flanker:    [120, 48],   // isTimer, goalDefault=120
  memgrid:    [200, 90],   // isLevel, goalDefault=200
  nback:      [100, 40],   // isTimer, goalDefault=100
  scramble:   [70,  28],   // default, goalDefault=70
  serial:     [80,  32],   // isTimer, goalDefault=80
  leftright:  [80,  32],   // isTimer, goalDefault=80
  calccomp:   [80,  32],   // isTimer, goalDefault=80
  flash:      [150, 68],   // isLevel, goalDefault=150
  sort:       [120, 48],   // isTimer, goalDefault=120
  mirror:     [80,  32],   // isTimer, goalDefault=80
};

// Load persisted calibration if exists (overrides ESTIMATED defaults)
const CALIBRATION_PATH = path.join(__dirname, 'calibration.json');
try {
  if (fs.existsSync(CALIBRATION_PATH)) {
    const saved = JSON.parse(fs.readFileSync(CALIBRATION_PATH, 'utf8'));
    Object.assign(ESTIMATED, saved);
    console.log(`[calibration] Loaded ${Object.keys(saved).length} game overrides`);
  }
} catch (e) {
  console.warn('[calibration] Failed to load calibration.json:', e.message);
}

// Normal CDF approximation
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-x * x / 2) * poly;
  return x >= 0 ? p : 1 - p;
}

function estimatedPercentile(game, score) {
  if (score <= 0) return 1;
  // Log-normal distribution: median = ESTIMATED mean, σ = ln(5)/1.28 ≈ 1.257
  // → 90th percentile (top 10%) = 5 × median
  const [median] = ESTIMATED[game] || [50, 20];
  const SIGMA = Math.log(5) / 1.28; // ≈ 1.257
  const z = (Math.log(score) - Math.log(median)) / SIGMA;
  return Math.max(1, Math.min(99, Math.round(normalCDF(z) * 100)));
}

function realPercentile(game, score) {
  const row = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN score <= ? THEN 1 ELSE 0 END) as below FROM scores WHERE game = ?').get(score, game);
  if (!row || row.total === 0) return null;
  return Math.max(1, Math.min(99, Math.round((row.below / row.total) * 100)));
}

// POST /api/score — submit score, get percentile
app.post('/api/score', (req, res) => {
  const { game, score, userHash } = req.body;
  if (!game || typeof score !== 'number' || score < 0) {
    return res.status(400).json({ error: 'Invalid game or score' });
  }

  // Save score
  db.prepare('INSERT INTO scores (game, score, user_hash) VALUES (?, ?, ?)').run(game, score, userHash || null);

  // Count for this game
  const { count } = db.prepare('SELECT COUNT(*) as count FROM scores WHERE game = ?').get(game);

  let percentile, source;
  if (count >= 100) {
    percentile = realPercentile(game, score);
    source = 'real';
  } else {
    // Blend: weight real data proportionally
    const est = estimatedPercentile(game, score);
    if (count >= 5) {
      const real = realPercentile(game, score);
      const w = count / 100;
      percentile = Math.round(real * w + est * (1 - w));
      source = 'blended';
    } else {
      percentile = est;
      source = 'estimated';
    }
  }

  res.json({ percentile, source, totalPlayers: count });
});

// GET /api/score/stats/:game — game stats
app.get('/api/score/stats/:game', (req, res) => {
  const { game } = req.params;
  const row = db.prepare('SELECT COUNT(*) as count, AVG(score) as avg, MAX(score) as max, MIN(score) as min FROM scores WHERE game = ?').get(game);
  res.json(row);
});

// GET /api/score/me/:userHash — user's personal stats
app.get('/api/score/me/:userHash', (req, res) => {
  const { userHash } = req.params;
  const games = db.prepare(`
    SELECT game, MAX(score) as best, COUNT(*) as plays, AVG(score) as avg
    FROM scores WHERE user_hash = ? GROUP BY game
  `).all(userHash);
  const total = db.prepare('SELECT COUNT(*) as plays, SUM(score) as totalScore FROM scores WHERE user_hash = ?').get(userHash);
  res.json({ games, ...total });
});

// GET /api/score/rank/:game/:userHash — user's rank in a game
app.get('/api/score/rank/:game/:userHash', (req, res) => {
  const { game, userHash } = req.params;
  const userBest = db.prepare('SELECT MAX(score) as best FROM scores WHERE game = ? AND user_hash = ?').get(game, userHash);
  if (!userBest?.best) return res.json({ rank: null });
  const { rank } = db.prepare('SELECT COUNT(DISTINCT user_hash) + 1 as rank FROM (SELECT user_hash, MAX(score) as best FROM scores WHERE game = ? AND user_hash IS NOT NULL GROUP BY user_hash) WHERE best > ?').get(game, userBest.best);
  const { total } = db.prepare('SELECT COUNT(DISTINCT user_hash) as total FROM scores WHERE game = ? AND user_hash IS NOT NULL').get(game);
  res.json({ rank, total, best: userBest.best });
});

// GET /api/score/overall-rank/:userHash — user's overall rank and percentile
app.get('/api/score/overall-rank/:userHash', (req, res) => {
  const { userHash } = req.params;
  
  // Calculate total points for all users
  const allUsersPoints = db.prepare(`
    SELECT user_hash, SUM(max_score) as total_points
    FROM (
      SELECT user_hash, game, MAX(score) as max_score
      FROM scores
      WHERE user_hash IS NOT NULL
      GROUP BY user_hash, game
    )
    GROUP BY user_hash
    ORDER BY total_points DESC
  `).all();

  const userIdx = allUsersPoints.findIndex(u => u.user_hash === userHash);
  if (userIdx === -1) return res.json({ rank: null, total: allUsersPoints.length });

  const total = allUsersPoints.length;
  const rank = userIdx + 1;
  const percentile = Math.max(1, Math.round(((total - rank) / total) * 100));
  
  res.json({ rank, total, percentile, totalPoints: allUsersPoints[userIdx].total_points });
});

// GET /api/score/leaderboard/:game — top 50 players for a game
app.get('/api/score/leaderboard/:game', (req, res) => {
  const { game } = req.params;
  const rows = db.prepare(`
    SELECT u.user_name, s.user_hash, MAX(s.score) as best
    FROM scores s
    JOIN users u ON s.user_hash = u.user_hash
    WHERE s.game = ? AND s.user_hash IS NOT NULL
    GROUP BY s.user_hash
    ORDER BY best DESC
    LIMIT 50
  `).all(game);
  res.json(rows);
});

// GET /api/score/overall-leaderboard — top 50 players by total points
app.get('/api/score/overall-leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.user_name, s.user_hash, SUM(s.max_score) as total_points
    FROM (
      SELECT user_hash, game, MAX(score) as max_score
      FROM scores
      WHERE user_hash IS NOT NULL
      GROUP BY user_hash, game
    ) s
    JOIN users u ON s.user_hash = u.user_hash
    GROUP BY s.user_hash
    ORDER BY total_points DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

// GET /api/score/health
app.get('/api/score/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM scores').get();
  res.json({ status: 'ok', totalScores: count });
});

// ===== TOSS LOGIN =====
const TOSS_API = 'https://apps-in-toss-api.toss.im';
const tossKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys/toss-login.json'), 'utf8'));
const ggTossKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys/gg-toss-login.json'), 'utf8'));

// mTLS: 토스 API 호출 시 클라이언트 인증서 사용 (https 내장 모듈)
const https = require('https');
const tossAgent = new https.Agent({
  cert: fs.readFileSync(path.join(__dirname, 'keys/certificate_public.crt')),
  key: fs.readFileSync(path.join(__dirname, 'keys/certificate_private.key')),
});
function tossFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      agent: tossAgent,
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function decryptToss(encryptedText) {
  const decoded = Buffer.from(encryptedText, 'base64');
  const IV_LENGTH = 12;
  const iv = decoded.subarray(0, IV_LENGTH);
  const authTagLength = 16;
  const ciphertext = decoded.subarray(IV_LENGTH, decoded.length - authTagLength);
  const authTag = decoded.subarray(decoded.length - authTagLength);
  const key = Buffer.from(tossKeys.key, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(tossKeys.aad));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function decryptGGToss(encryptedText) {
  const decoded = Buffer.from(encryptedText, 'base64');
  const IV_LENGTH = 12;
  const iv = decoded.subarray(0, IV_LENGTH);
  const authTagLength = 16;
  const ciphertext = decoded.subarray(IV_LENGTH, decoded.length - authTagLength);
  const authTag = decoded.subarray(decoded.length - authTagLength);
  const key = Buffer.from(ggTossKeys.key, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(ggTossKeys.aad));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// POST /api/score/toss/token — 인가코드 → AccessToken
app.post('/api/score/toss/token', async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
    if (!authorizationCode || !referrer) return res.status(400).json({ error: 'authorizationCode and referrer required' });
    const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer })
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error('[Toss Token Error]', e);
    res.status(500).json({ error: 'token_exchange_failed', detail: e.message });
  }
});

// POST /api/score/toss/refresh — refreshToken → 새 AccessToken
app.post('/api/score/toss/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error('[Toss Refresh Error]', e);
    res.status(500).json({ error: 'refresh_failed', detail: e.message });
  }
});

// POST /api/score/toss/login — 인가코드 → 토큰 → 유저정보 조회+복호화+저장 (올인원)
app.post('/api/score/toss/login', async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
    if (!authorizationCode || !referrer) return res.status(400).json({ error: 'authorizationCode and referrer required' });

    // 1. 토큰 발급
    const tokenResp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer })
    });
    const tokenText = await tokenResp.text();
    console.log('[Toss Token] HTTP status:', tokenResp.status, 'body:', tokenText.slice(0, 300));
    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) {
      return res.status(500).json({ error: 'token_parse_failed', httpStatus: tokenResp.status, rawBody: tokenText.slice(0, 500) });
    }
    if (tokenData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'token_failed', detail: tokenData });
    const { accessToken, refreshToken } = tokenData.success;

    // 2. 유저 정보 조회
    const meResp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meData = await meResp.json();
    if (meData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'user_info_failed', detail: meData });
    const user = meData.success;

    // 3. 복호화
    const decrypted = {};
    if (user.name) decrypted.name = decryptToss(user.name);
    if (user.gender) decrypted.gender = decryptToss(user.gender);
    if (user.birthday) decrypted.birthday = decryptToss(user.birthday);

    // 4. DB 저장 (userKey를 user_hash로 사용)
    const userHash = String(user.userKey);
    db.prepare(`INSERT INTO users (user_hash, user_name, user_gender, user_birthday, updated_at)
      VALUES (?, ?, ?, ?, (datetime('now','+9 hours')))
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, user_gender=excluded.user_gender,
        user_birthday=excluded.user_birthday, updated_at=(datetime('now','+9 hours'))
    `).run(userHash, decrypted.name || null, decrypted.gender || null, decrypted.birthday || null);

    console.log(`[Toss Login] User ${userHash} (${decrypted.name}) logged in`);

    res.json({
      status: 'ok',
      userKey: user.userKey,
      userHash,
      name: decrypted.name,
      gender: decrypted.gender,
      birthday: decrypted.birthday,
      accessToken,
      refreshToken
    });
  } catch (e) {
    console.error('[Toss Login Error]', e);
    res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

// 유저 프로필 저장/업데이트
app.post('/api/score/user', (req, res) => {
  const { user_hash, user_name, user_gender, user_birthday } = req.body;
  if (!user_hash) return res.status(400).json({ error: 'user_hash required' });
  db.prepare(`INSERT INTO users (user_hash, user_name, user_gender, user_birthday, updated_at)
    VALUES (?, ?, ?, ?, (datetime('now','+9 hours')))
    ON CONFLICT(user_hash) DO UPDATE SET
      user_name=excluded.user_name, user_gender=excluded.user_gender,
      user_birthday=excluded.user_birthday, updated_at=(datetime('now','+9 hours'))
  `).run(user_hash, user_name || null, user_gender || null, user_birthday || null);
  res.json({ status: 'ok' });
});

// 유저 프로필 조회
app.get('/api/score/user/:userHash', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE user_hash = ?').get(req.params.userHash);
  res.json(user || { error: 'not found' });
});

// ===== TOSS PROMOTION =====

// Promotion config (IDs will be filled after approval)
const PROMOTIONS = {
  FIRST_LOGIN: '01KJ8A3HFMP24HQ5743KD6Q9GK',
  POINT_100: '01KJ8BCF26T648AQ1QCKYMS4TZ',
  FIRST_WORKOUT: '01KJ8B95RPCGDQV9NZSCQ418VT'
};

// Promotion grant table (track per user to prevent duplicates)
db.exec(`
  CREATE TABLE IF NOT EXISTS promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    UNIQUE(user_hash, promo_type)
  )
`);

// Check if promotion already granted
app.get('/api/score/promo/check/:userHash/:promoType', (req, res) => {
  const { userHash, promoType } = req.params;
  const row = db.prepare('SELECT * FROM promotion_grants WHERE user_hash = ? AND promo_type = ?').get(userHash, promoType);
  res.json({ granted: !!row, detail: row || null });
});

// Record promotion grant (called from client after SDK grantPromotionRewardForGame succeeds)
app.post('/api/score/promo/record', (req, res) => {
  const { userHash, promoType, promoCode, amount } = req.body;
  if (!userHash || !promoType) return res.status(400).json({ error: 'userHash and promoType required' });
  try {
    db.prepare(`INSERT OR IGNORE INTO promotion_grants (user_hash, promo_type, promo_code, amount, status)
      VALUES (?, ?, ?, ?, 'granted')
    `).run(userHash, promoType, promoCode || null, amount || 0);
    console.log(`[Promo] ${promoType} granted to ${userHash} (${amount})`);
    res.json({ status: 'ok' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.json({ status: 'already_granted' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/score/points/add — 서버에 포인트 적립 기록
app.post('/api/score/points/add', (req, res) => {
  const { userHash, amount } = req.body;
  if (!userHash || !amount || amount <= 0) return res.status(400).json({ error: 'userHash and positive amount required' });
  const user = db.prepare('SELECT points FROM users WHERE user_hash = ?').get(userHash);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const newPoints = (user.points || 0) + amount;
  db.prepare('UPDATE users SET points = ? WHERE user_hash = ?').run(newPoints, userHash);
  res.json({ status: 'ok', points: newPoints });
});

// GET /api/score/points/:userHash — 서버 포인트 잔액 조회
app.get('/api/score/points/:userHash', (req, res) => {
  const user = db.prepare('SELECT points FROM users WHERE user_hash = ?').get(req.params.userHash);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ points: user.points || 0 });
});

// Point exchange (두뇌점수 100점 → 100원)
db.exec(`
  CREATE TABLE IF NOT EXISTS point_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    points INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  )
`);

// ===== CASHWORD DB =====
db.exec(`
  CREATE TABLE IF NOT EXISTS cashword_users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    user_gender TEXT,
    user_birthday TEXT,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS cashword_promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS cashword_coins (
    user_hash TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS cashword_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins_spent INTEGER NOT NULL DEFAULT 10,
    toss_points INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
`);

// ===== Golden Goose Tables =====
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS gg_promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER DEFAULT 1,
    status TEXT DEFAULT 'granted',
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS gg_coins (
    user_hash TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS gg_reward_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS gg_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins_spent INTEGER DEFAULT 10,
    promo_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS gg_referral_codes (
    user_hash TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS gg_referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_hash TEXT NOT NULL,
    referred_hash TEXT NOT NULL,
    referred_name TEXT,
    referral_code TEXT NOT NULL,
    claimed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    claimed_at DATETIME,
    UNIQUE(referred_hash)
  );
  CREATE INDEX IF NOT EXISTS idx_gg_referrals_referrer ON gg_referrals(referrer_hash);
`);

// 일일 접속 기록 (17시 재유도 알림용)
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_access_log (
    user_hash TEXT NOT NULL,
    access_date TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    PRIMARY KEY (user_hash, access_date)
  )
`);

// ===== Golden Goose Analytics Tables =====
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_analytics_users (
    user_hash TEXT PRIMARY KEY,
    first_visit_at DATETIME DEFAULT (datetime('now','+9 hours')),
    first_hatch_at DATETIME,
    first_login_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS gg_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    event TEXT NOT NULL,
    params TEXT,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE INDEX IF NOT EXISTS idx_gg_events_user ON gg_events(user_hash);
  CREATE INDEX IF NOT EXISTS idx_gg_events_event ON gg_events(event, created_at);
  CREATE INDEX IF NOT EXISTS idx_gg_events_date ON gg_events(created_at);
`);

// GG 프로모션 ID 초기화
db.exec(`
  INSERT OR REPLACE INTO settings (key, value) VALUES ('gg_promo_exchange', '01KJQMQJHX7Y5MAVRVTN0A4VNZ');
  INSERT OR REPLACE INTO settings (key, value) VALUES ('gg_promo_login', '01KJQKQHVSCC3WC4Q7AGFWTWN6');
`);

app.post('/api/score/promo/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });

  // 서버 잔액 확인
  const user = db.prepare('SELECT points FROM users WHERE user_hash = ?').get(userHash);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const serverPoints = user.points || 0;
  if (serverPoints < 100) return res.status(400).json({ error: 'insufficient_points', points: serverPoints });

  // 최근 10초 내 동일 유저 교환 요청 방지 (동시성)
  const recent = db.prepare(
    "SELECT * FROM point_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds')"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast', message: '잠시 후 다시 시도해주세요' });

  // 서버 잔액 차감 + 교환 기록 (트랜잭션)
  const doExchange = db.transaction(() => {
    db.prepare('UPDATE users SET points = points - 100 WHERE user_hash = ?').run(userHash);
    return db.prepare(
      'INSERT INTO point_exchanges (user_hash, points, amount, status) VALUES (?, ?, 100, ?)'
    ).run(userHash, serverPoints, 'pending');
  });
  const result = doExchange();

  console.log(`[Exchange] user=${userHash} points=${serverPoints} → 100원 (id=${result.lastInsertRowid})`);
  res.json({ status: 'ok', exchangeId: result.lastInsertRowid });
});

// POST /api/score/promo/exchange/:id/confirm — SDK 성공 후 'granted' 확정
app.post('/api/score/promo/exchange/:id/confirm', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM point_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.json({ status: row.status }); // 이미 처리됨
  db.prepare("UPDATE point_exchanges SET status = 'granted' WHERE id = ?").run(id);
  res.json({ status: 'ok' });
});

// POST /api/score/promo/exchange/:id/restore — SDK 실패 시 포인트 복원
app.post('/api/score/promo/exchange/:id/restore', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM point_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'already_processed' });
  db.transaction(() => {
    db.prepare('UPDATE users SET points = points + 100 WHERE user_hash = ?').run(row.user_hash);
    db.prepare("UPDATE point_exchanges SET status = 'cancelled' WHERE id = ?").run(id);
  })();
  console.log(`[Exchange Restore] id=${id} user=${row.user_hash} +100점 복원`);
  res.json({ status: 'ok' });
});

// Exchange history for a user
app.get('/api/score/promo/exchanges/:userHash', (req, res) => {
  const rows = db.prepare('SELECT * FROM point_exchanges WHERE user_hash = ? ORDER BY created_at DESC LIMIT 50').all(req.params.userHash);
  res.json(rows);
});

// List all grants for a user
app.get('/api/score/promo/list/:userHash', (req, res) => {
  const rows = db.prepare('SELECT * FROM promotion_grants WHERE user_hash = ?').all(req.params.userHash);
  res.json(rows);
});

// Debug: set user points directly (server + test only)
app.post('/api/score/debug/set-points', (req, res) => {
  const { userHash, points } = req.body;
  if (!userHash || points == null) return res.status(400).json({ error: 'missing params' });
  db.prepare('UPDATE users SET points = ? WHERE user_hash = ?').run(points, userHash);
  console.log(`[Debug] set points=${points} for ${userHash}`);
  res.json({ ok: true, points });
});

// Delete all promotion grants for a user (debug/test reset)
app.delete('/api/score/promo/reset/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });
  const { changes } = db.prepare('DELETE FROM promotion_grants WHERE user_hash = ?').run(userHash);
  console.log(`[Promo] reset ${changes} grants for ${userHash}`);
  res.json({ ok: true, deleted: changes });
});

// Disconnect cleanup: also remove promotion_grants
// (already handled in handleDisconnect, adding below)

// ===== TOSS SMART MESSAGE (알림) =====

// 특정 유저에게 메시지 발송
app.post('/api/score/toss/message', async (req, res) => {
  try {
    const { userKey, templateSetCode, context } = req.body;
    if (!userKey || !templateSetCode) {
      return res.status(400).json({ error: 'userKey and templateSetCode required' });
    }
    const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Toss-User-Key': String(userKey)
      },
      body: JSON.stringify({ templateSetCode, context: context || {} })
    });
    const data = await resp.json();
    console.log(`[Toss Message] userKey=${userKey} template=${templateSetCode}`, data.resultType);
    res.json(data);
  } catch (e) {
    console.error('[Toss Message Error]', e);
    res.status(500).json({ error: 'message_failed', detail: e.message });
  }
});

// 테스트 메시지 발송 (개발용)
app.post('/api/score/toss/message/test', async (req, res) => {
  try {
    const { userKey, templateSetCode, context } = req.body;
    if (!userKey || !templateSetCode) {
      return res.status(400).json({ error: 'userKey and templateSetCode required' });
    }
    const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-test-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Toss-User-Key': String(userKey)
      },
      body: JSON.stringify({ templateSetCode, context: context || {} })
    });
    const data = await resp.json();
    console.log(`[Toss Test Message] userKey=${userKey} template=${templateSetCode}`, data.resultType);
    res.json(data);
  } catch (e) {
    console.error('[Toss Test Message Error]', e);
    res.status(500).json({ error: 'test_message_failed', detail: e.message });
  }
});

// 전체 유저에게 메시지 일괄 발송
app.post('/api/score/toss/message/broadcast', async (req, res) => {
  try {
    const { templateSetCode, context } = req.body;
    if (!templateSetCode) return res.status(400).json({ error: 'templateSetCode required' });
    
    const users = db.prepare('SELECT user_hash FROM users').all();
    const results = { success: 0, fail: 0, errors: [] };
    
    for (const user of users) {
      try {
        const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Toss-User-Key': String(user.user_hash)
          },
          body: JSON.stringify({ templateSetCode, context: context || {} })
        });
        const data = await resp.json();
        if (data.resultType === 'SUCCESS') results.success++;
        else { results.fail++; results.errors.push({ userKey: user.user_hash, error: data }); }
      } catch (e) {
        results.fail++;
        results.errors.push({ userKey: user.user_hash, error: e.message });
      }
    }
    
    console.log(`[Toss Broadcast] template=${templateSetCode} success=${results.success} fail=${results.fail}`);
    res.json(results);
  } catch (e) {
    console.error('[Toss Broadcast Error]', e);
    res.status(500).json({ error: 'broadcast_failed', detail: e.message });
  }
});

// 비활성 유저 리인게이지먼트 (N일 이상 미접속 유저에게 발송)
app.post('/api/score/toss/message/inactive', async (req, res) => {
  try {
    const { templateSetCode, context, inactiveDays } = req.body;
    if (!templateSetCode || !inactiveDays) {
      return res.status(400).json({ error: 'templateSetCode and inactiveDays required' });
    }
    
    const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString();
    const inactiveUsers = db.prepare(`
      SELECT u.user_hash FROM users u
      LEFT JOIN (SELECT user_hash, MAX(created_at) as last_play FROM scores GROUP BY user_hash) s
      ON u.user_hash = s.user_hash
      WHERE s.last_play IS NULL OR s.last_play < ?
    `).all(cutoff);
    
    const results = { total: inactiveUsers.length, success: 0, fail: 0 };
    
    for (const user of inactiveUsers) {
      try {
        const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Toss-User-Key': String(user.user_hash)
          },
          body: JSON.stringify({ templateSetCode, context: context || {} })
        });
        const data = await resp.json();
        if (data.resultType === 'SUCCESS') results.success++;
        else results.fail++;
      } catch (e) { results.fail++; }
    }
    
    console.log(`[Toss Inactive] ${inactiveDays}days template=${templateSetCode} sent=${results.success}/${results.total}`);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: 'inactive_message_failed', detail: e.message });
  }
});

// Toss 연결 끊기 콜백 (회원 탈퇴/연결 해제)
const DISCONNECT_AUTH = process.env.DISCONNECT_AUTH;
if (!DISCONNECT_AUTH) console.warn('[WARN] DISCONNECT_AUTH가 .env에 설정되지 않았습니다');
function verifyDisconnectAuth(req) {
  const auth = req.headers.authorization;
  return auth && auth === 'Basic ' + Buffer.from(DISCONNECT_AUTH).toString('base64');
}
function handleDisconnect(userKey, referrer) {
  const userHash = String(userKey);
  db.prepare('DELETE FROM scores WHERE user_hash = ?').run(userHash);
  db.prepare('DELETE FROM users WHERE user_hash = ?').run(userHash);
  db.prepare('DELETE FROM promotion_grants WHERE user_hash = ?').run(userHash);
  db.prepare('DELETE FROM point_exchanges WHERE user_hash = ?').run(userHash);
  db.prepare('DELETE FROM cashword_coins WHERE user_hash = ?').run(userHash);
  db.prepare('DELETE FROM cashword_exchanges WHERE user_hash = ?').run(userHash);
  console.log(`[Disconnect] ${referrer || 'UNKNOWN'} — deleted data for userKey: ${userKey}`);
}
function setDisconnectCors(req, res, next) {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (origin) res.setHeader('Vary', 'Origin');
  next();
}
app.options('/api/score/disconnect', setDisconnectCors, (req, res) => res.status(204).end());
app.get('/api/score/disconnect', setDisconnectCors, (req, res) => {
  if (!req.headers.authorization) return res.json({ status: 'ok' }); // 포털 연결 테스트
  if (!verifyDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.query;
  if (userKey) handleDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});
app.post('/api/score/disconnect', setDisconnectCors, (req, res) => {
  if (!req.headers.authorization) return res.json({ status: 'ok' }); // 포털 연결 테스트
  if (!verifyDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.body;
  if (userKey) handleDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});

// POST /api/admin/recalibrate — recalibrate ESTIMATED from real data
// Requires header: x-admin-secret matching ADMIN_SECRET env var
app.post('/api/admin/recalibrate', (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: 'Admin not configured' });
  if (req.headers['x-admin-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const MIN_SAMPLES = 30;
  const changes = [];

  for (const game of Object.keys(ESTIMATED)) {
    const row = db.prepare(`
      SELECT COUNT(*) as cnt,
             AVG(score) as mean,
             AVG((score * score)) - (AVG(score) * AVG(score)) as variance
      FROM scores WHERE game = ?
    `).get(game);

    if (!row || row.cnt < MIN_SAMPLES) continue;

    const newMean = Math.round(row.mean);
    const newStd  = Math.round(Math.sqrt(Math.max(row.variance || 1, 1)));
    if (newStd < 5) continue;

    const before = [...ESTIMATED[game]];
    ESTIMATED[game] = [newMean, newStd];
    changes.push({ game, before, after: [newMean, newStd], samples: row.cnt });
  }

  if (changes.length > 0) {
    const toSave = {};
    for (const { game, after } of changes) toSave[game] = after;
    try {
      fs.writeFileSync(CALIBRATION_PATH, JSON.stringify(toSave, null, 2));
    } catch (e) {
      console.warn('[calibration] Failed to save:', e.message);
    }
  }

  res.json({ updated: changes.length, changes });
});

// POST /api/score/promo/grant — 비게임 프로모션 리워드 지급 (Toss REST API 프록시, mTLS)
app.post('/api/score/promo/grant', async (req, res) => {
  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || amount == null) return res.status(400).json({ error: 'missing params' });
  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };
  try {
    const keyRes = await (await tossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    console.log('[Toss promo] get-key response:', JSON.stringify(keyRes));
    if (keyRes.resultType !== 'SUCCESS') return res.json({ error: keyRes });
    const key = keyRes.success.key;
    const execRes = await (await tossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key, amount })
    })).json();
    console.log('[Toss promo] execute response:', JSON.stringify(execRes));
    if (execRes.resultType !== 'SUCCESS') return res.json({ error: execRes });
    res.json({ key: execRes.success.key });
  } catch (e) {
    console.error('[Toss promo] error:', e);
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/admin/reset-db — 테스트용 전체 DB 초기화
app.post('/api/admin/reset-db', (req, res) => {
  if (req.headers['x-debug-token'] !== 'brain-debug-reset-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  db.prepare('DELETE FROM scores').run();
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM promotion_grants').run();
  db.prepare('DELETE FROM point_exchanges').run();
  res.json({ ok: true });
});

// ===== 일일 알림 (매일 KST 09:00) =====

const BULK_BATCH_SIZE = 2500;

// 서버 시작 시 DB에서 1회 로드, admin API 업데이트 시 같이 갱신
let dailyNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_notify_template')?.value ?? null;

async function sendDailyNotification() {
  if (!dailyNotifyTemplate) {
    console.log('[DailyNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const users = db.prepare('SELECT user_hash FROM users').all();
  if (users.length === 0) {
    console.log('[DailyNotify] 발송 대상 유저 없음');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
    const chunk = users.slice(i, i + BULK_BATCH_SIZE);
    const contextList = chunk.map(u => ({
      userKey: parseInt(u.user_hash, 10),
      context: {}
    }));

    try {
      const resp = await tossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSetCode: dailyNotifyTemplate, contextList })
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess += chunk.length;
      } else {
        totalFail += chunk.length;
        console.error('[DailyNotify] 배치 실패:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      totalFail += chunk.length;
      console.error('[DailyNotify] 배치 오류:', e.message);
    }
  }

  console.log(`[DailyNotify] 완료 — 대상: ${users.length}명, 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// PATCH /api/admin/settings — 런타임 설정값 업데이트 (재배포 없이)
// x-admin-secret 헤더 필요
app.patch('/api/admin/settings', (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: 'Admin not configured' });
  if (req.headers['x-admin-secret'] !== secret) return res.status(403).json({ error: 'Forbidden' });

  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key, value 필요' });

  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, (datetime('now','+9 hours'))) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, value);

  // 메모리 캐시 갱신
  if (key === 'daily_notify_template') dailyNotifyTemplate = value;
  if (key === 'cashword_daily_notify_template') cashwordDailyNotifyTemplate = value;
  if (key === 'gg_lottery_notify_template') ggLotteryNotifyTemplate = value;
  if (key === 'gg_reengage_notify_template') ggReengageNotifyTemplate = value;

  res.json({ ok: true, key, value });
});

// 매일 KST 09:00 발송 (Asia/Seoul timezone 기준 "0 9 * * *")
cron.schedule('0 9 * * *', sendDailyNotification, { timezone: 'Asia/Seoul' });

// ===== CASHWORD API =====

// CashWord 전용 mTLS agent (인증서 위치: /root/ or 로컬 CashWord-english 프로젝트)
const cashwordCertPath = fs.existsSync('/root/cashword_public.crt')
  ? '/root/cashword_public.crt'
  : path.join(__dirname, '../../../CashWord-english/cashword_public.crt');
const cashwordKeyPath = fs.existsSync('/root/cashword_private.key')
  ? '/root/cashword_private.key'
  : path.join(__dirname, '../../../CashWord-english/cashword_private.key');
const cashwordTossAgent = new https.Agent({
  cert: fs.readFileSync(cashwordCertPath),
  key: fs.readFileSync(cashwordKeyPath),
});
function cashwordTossFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      agent: cashwordTossAgent,
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Golden Goose mTLS agent
const ggCertPath = fs.existsSync('/root/golden-goose_public.crt')
  ? '/root/golden-goose_public.crt'
  : path.join(__dirname, '../../../golden-goose/golden-goose_public.crt');
const ggKeyPath = fs.existsSync('/root/golden-goose_private.key')
  ? '/root/golden-goose_private.key'
  : path.join(__dirname, '../../../golden-goose/golden-goose_private.key');
const ggTossAgent = new https.Agent({
  cert: fs.readFileSync(ggCertPath),
  key: fs.readFileSync(ggKeyPath),
});
function ggTossFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      agent: ggTossAgent,
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// CashWord 전용 복호화 (AES-256-GCM)
const cashwordKey = Buffer.from('G4yBKG3UWOIFwnDbjjUOJLHgDBRQTF2sbcWgIKYzd+A=', 'base64');
function decryptCashword(encryptedText) {
  try {
    const decoded = Buffer.from(encryptedText, 'base64');
    const iv = decoded.slice(0, 12);
    const tag = decoded.slice(decoded.length - 16);
    const ciphertext = decoded.slice(12, decoded.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', cashwordKey, iv);
    decipher.setAAD(Buffer.from('TOSS'));
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch (e) { console.warn('[CashWord decrypt] failed:', e.message); return null; }
}

// POST /api/cashword/toss/login — CashWord 전용 로그인 (cashword_users 테이블에 저장)
app.post('/api/cashword/toss/login', async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
    if (!authorizationCode || !referrer) return res.status(400).json({ error: 'authorizationCode and referrer required' });

    // 1. 토큰 발급 (CashWord 인증서 사용)
    const tokenResp = await cashwordTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer })
    });
    const tokenText = await tokenResp.text();
    console.log('[CashWord Token] HTTP status:', tokenResp.status, 'body:', tokenText.slice(0, 300));
    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) {
      return res.status(500).json({ error: 'token_parse_failed', httpStatus: tokenResp.status, rawBody: tokenText.slice(0, 500) });
    }
    if (tokenData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'token_failed', detail: tokenData });
    const { accessToken, refreshToken } = tokenData.success;

    // 2. 유저 정보 조회
    const meResp = await cashwordTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meData = await meResp.json();
    if (meData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'user_info_failed', detail: meData });
    const user = meData.success;

    // 3. CashWord 전용 복호화키로 복호화
    const decrypted = {};
    if (user.name) decrypted.name = decryptCashword(user.name);
    if (user.gender) decrypted.gender = decryptCashword(user.gender);
    if (user.birthday) decrypted.birthday = decryptCashword(user.birthday);

    // 4. cashword_users 테이블에 저장 (brain-exercise users 테이블과 별도)
    const userHash = String(user.userKey);
    db.prepare(`INSERT INTO cashword_users (user_hash, user_name, user_gender, user_birthday, updated_at)
      VALUES (?, ?, ?, ?, (datetime('now','+9 hours')))
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, user_gender=excluded.user_gender,
        user_birthday=excluded.user_birthday, updated_at=(datetime('now','+9 hours'))
    `).run(userHash, decrypted.name || null, decrypted.gender || null, decrypted.birthday || null);

    console.log(`[CashWord Login] User ${userHash} (${decrypted.name}) logged in`);

    res.json({
      status: 'ok',
      userKey: user.userKey,
      userHash,
      name: decrypted.name,
      gender: decrypted.gender,
      birthday: decrypted.birthday,
      accessToken,
      refreshToken
    });
  } catch (e) {
    console.error('[CashWord Login Error]', e);
    res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

// GET /api/cashword/promo/check/:userHash/:promoType — 프로모션 지급 여부 확인
app.get('/api/cashword/promo/check/:userHash/:promoType', (req, res) => {
  const { userHash, promoType } = req.params;
  const row = db.prepare('SELECT * FROM cashword_promotion_grants WHERE user_hash = ? AND promo_type = ?').get(userHash, promoType);
  res.json({ granted: !!row, detail: row || null });
});

// POST /api/cashword/promo/record — 프로모션 지급 기록 (SDK 성공 후 호출)
app.post('/api/cashword/promo/record', (req, res) => {
  const { userHash, promoType, promoCode, amount } = req.body;
  if (!userHash || !promoType) return res.status(400).json({ error: 'userHash and promoType required' });
  try {
    db.prepare(`INSERT OR IGNORE INTO cashword_promotion_grants (user_hash, promo_type, promo_code, amount, status)
      VALUES (?, ?, ?, ?, 'granted')
    `).run(userHash, promoType, promoCode || null, amount || 0);
    console.log(`[CashWord Promo] ${promoType} granted to ${userHash} (${amount})`);
    res.json({ status: 'ok' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.json({ status: 'already_granted' });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/cashword/promo/execute — 일회성 프로모션 원자적 처리 (중복체크 + Toss API + 기록)
app.post('/api/cashword/promo/execute', async (req, res) => {
  const { userHash, userKey, promoType, promoCode, amount } = req.body;
  if (!userHash || !userKey || !promoType || !promoCode) return res.status(400).json({ error: 'missing params' });

  // 서버에서 프로모 타입별 지급 금액 강제 (클라 배포 없이 변경 가능)
  const promoAmounts = { 'FIRST_LOGIN': 3 };
  const finalAmount = promoAmounts[promoType] || amount || 1;

  const existing = db.prepare('SELECT * FROM cashword_promotion_grants WHERE user_hash = ? AND promo_type = ?').get(userHash, promoType);
  if (existing) return res.json({ status: 'already_granted' });

  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };
  try {
    const keyRes = await (await cashwordTossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    console.log('[CashWord Promo] execute get-key:', JSON.stringify(keyRes));
    if (keyRes.resultType !== 'SUCCESS') return res.json({ error: keyRes });
    const key = keyRes.success.key;
    const execRes = await (await cashwordTossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode: promoCode, key, amount: finalAmount })
    })).json();
    console.log('[CashWord Promo] execute result:', JSON.stringify(execRes));
    if (execRes.resultType !== 'SUCCESS') return res.json({ error: execRes });

    db.prepare('INSERT OR IGNORE INTO cashword_promotion_grants (user_hash, promo_type, promo_code, amount, status) VALUES (?, ?, ?, ?, ?)').run(userHash, promoType, promoCode, finalAmount, 'granted');
    console.log(`[CashWord Promo] ${promoType} granted to ${userHash} (${finalAmount})`);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('[CashWord Promo Execute Error]', e);
    res.status(500).json({ error: 'promo_execute_failed', detail: e.message });
  }
});

// POST /api/cashword/promo/grant — Toss 프로모션 지급 (CashWord mTLS)
app.post('/api/cashword/promo/grant', async (req, res) => {
  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || amount == null) return res.status(400).json({ error: 'missing params' });
  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };
  try {
    const keyRes = await (await cashwordTossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    console.log('[CashWord Promo] grant get-key:', JSON.stringify(keyRes));
    if (keyRes.resultType !== 'SUCCESS') return res.json({ error: keyRes });
    const key = keyRes.success.key;
    const execRes = await (await cashwordTossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key, amount })
    })).json();
    console.log('[CashWord Promo] grant execute:', JSON.stringify(execRes));
    if (execRes.resultType !== 'SUCCESS') return res.json({ error: execRes });
    res.json(execRes.success);
  } catch (e) {
    console.error('[CashWord Promo Error]', e);
    res.status(500).json({ error: 'promo_grant_failed', detail: e.message });
  }
});

// GET /api/cashword/promo-config
app.get('/api/cashword/promo-config', (req, res) => {
  console.log('[CashWord PromoConfig] requested');
  const tossLogin = db.prepare("SELECT value FROM settings WHERE key = 'cashword_promo_toss_login'").get();
  const firstQuestion = db.prepare("SELECT value FROM settings WHERE key = 'cashword_promo_first_question'").get();
  const exchange = db.prepare("SELECT value FROM settings WHERE key = 'cashword_promo_exchange'").get();
  res.json({
    tossLogin: tossLogin?.value || null,
    firstQuestion: firstQuestion?.value || null,
    exchange: exchange?.value || null
  });
});

// GET /api/cashword/coins/:userHash — 코인 잔액 조회
app.get('/api/cashword/coins/:userHash', (req, res) => {
  const { userHash } = req.params;
  const row = db.prepare('SELECT coins, total_earned FROM cashword_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins: row?.coins || 0, totalEarned: row?.total_earned || 0 });
});

// POST /api/cashword/coins/add — 코인 적립 (정답 시)
app.post('/api/cashword/coins/add', (req, res) => {
  const { userHash, amount } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });
  // anti-cheat: 1~100 범위만 허용
  const safeAmount = Math.max(1, Math.min(100, parseInt(amount) || 1));
  db.prepare(`
    INSERT INTO cashword_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.total_earned,
      updated_at = (datetime('now','+9 hours'))
  `).run(userHash, safeAmount, safeAmount);
  const row = db.prepare('SELECT coins, total_earned FROM cashword_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins: row.coins, totalEarned: row.total_earned });
});

// POST /api/cashword/exchange — 코인 차감 + 교환 ID 발급 (count: 교환 횟수, 기본 1)
app.post('/api/cashword/exchange', (req, res) => {
  const { userHash, count: rawCount } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });

  const count = Math.max(1, Math.floor(Number(rawCount) || 1));
  const coinsNeeded = count * 10;
  const tossPoints = count;

  const row = db.prepare('SELECT coins FROM cashword_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < coinsNeeded) {
    return res.status(400).json({ error: 'insufficient_coins', coins: row?.coins || 0 });
  }
  // 동시성: 10초 내 중복 교환 차단
  const recent = db.prepare(
    "SELECT id FROM cashword_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds') AND status = 'pending'"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast' });

  const doExchange = db.transaction(() => {
    db.prepare(`UPDATE cashword_coins SET coins = coins - ?, updated_at = (datetime('now','+9 hours')) WHERE user_hash = ?`).run(coinsNeeded, userHash);
    return db.prepare(
      'INSERT INTO cashword_exchanges (user_hash, coins_spent, toss_points, status) VALUES (?, ?, ?, ?)'
    ).run(userHash, coinsNeeded, tossPoints, 'pending');
  });
  const result = doExchange();
  const promoCfg = db.prepare("SELECT value FROM settings WHERE key = 'cashword_promo_exchange'").get();
  res.json({ exchangeId: result.lastInsertRowid, promoId: promoCfg?.value || null, coinsSpent: coinsNeeded, tossPoints });
});

// POST /api/cashword/exchange/:id/confirm — SDK 성공 후 확정
app.post('/api/cashword/exchange/:id/confirm', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM cashword_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.json({ status: row.status });
  db.prepare("UPDATE cashword_exchanges SET status = 'granted' WHERE id = ?").run(id);
  res.json({ status: 'ok' });
});

// POST /api/cashword/exchange/:id/restore — SDK 실패 시 코인 복원
app.post('/api/cashword/exchange/:id/restore', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM cashword_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'already_processed' });
  db.transaction(() => {
    db.prepare('UPDATE cashword_coins SET coins = coins + ? WHERE user_hash = ?').run(row.coins_spent, row.user_hash);
    db.prepare("UPDATE cashword_exchanges SET status = 'cancelled' WHERE id = ?").run(id);
  })();
  res.json({ status: 'ok' });
});

// ===== CASHWORD 기능성 알림 =====

// DB에서 일일 알림 템플릿 로드 (설정되지 않으면 null)
let cashwordDailyNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('cashword_daily_notify_template')?.value ?? null;

// POST /api/cashword/notify — 단건 발송 (특정 유저에게 즉시)
// body: { userKey, templateSetCode, context? }
app.post('/api/cashword/notify', async (req, res) => {
  try {
    const { userKey, templateSetCode, context } = req.body;
    if (!userKey || !templateSetCode) {
      return res.status(400).json({ error: 'userKey and templateSetCode required' });
    }
    const resp = await cashwordTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Toss-User-Key': String(userKey),
      },
      body: JSON.stringify({ templateSetCode, context: context || {} }),
    });
    const data = await resp.json();
    console.log(`[CashWord Notify] userKey=${userKey} template=${templateSetCode} result=${data.resultType}`);
    res.json(data);
  } catch (e) {
    console.error('[CashWord Notify Error]', e);
    res.status(500).json({ error: 'notify_failed', detail: e.message });
  }
});

// 전체 CashWord 유저에게 일일 알림 bulk 발송
async function sendCashwordDailyNotification() {
  if (!cashwordDailyNotifyTemplate) {
    console.log('[CashWord DailyNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const users = db.prepare('SELECT user_hash FROM cashword_users').all();
  if (users.length === 0) {
    console.log('[CashWord DailyNotify] 발송 대상 유저 없음');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
    const chunk = users.slice(i, i + BULK_BATCH_SIZE);
    const contextList = chunk.map(u => ({ userKey: parseInt(u.user_hash, 10), context: {} }));

    try {
      const resp = await cashwordTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSetCode: cashwordDailyNotifyTemplate, contextList }),
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess += chunk.length;
      } else {
        totalFail += chunk.length;
        console.error('[CashWord DailyNotify] 배치 실패:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      totalFail += chunk.length;
      console.error('[CashWord DailyNotify] 배치 오류:', e.message);
    }
  }

  console.log(`[CashWord DailyNotify] 완료 — 대상: ${users.length}명, 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// 매일 KST 09:00 CashWord 유저에게 알림 발송
cron.schedule('0 9 * * *', sendCashwordDailyNotification, { timezone: 'Asia/Seoul' });

// ===== 황금알 거위 알림 =====

// DB에서 알림 템플릿 로드 (설정되지 않으면 null)
let ggLotteryNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_lottery_notify_template')?.value ?? null;
let ggReengageNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_reengage_notify_template')?.value ?? null;

// 전체 거위 유저에게 복권 충전 알림 bulk 발송 (매일 09:00 KST)
async function sendGoldenGooseLotteryNotification() {
  if (!ggLotteryNotifyTemplate) {
    console.log('[GG LotteryNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const users = db.prepare(`
    SELECT user_hash FROM gg_coins
    WHERE CAST(user_hash AS INTEGER) > 0
    AND user_hash NOT IN (
      SELECT user_hash FROM gg_access_log WHERE access_date = ?
    )
  `).all(today);
  if (users.length === 0) {
    console.log('[GG LotteryNotify] 발송 대상 유저 없음');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
    const chunk = users.slice(i, i + BULK_BATCH_SIZE);
    const contextList = chunk.map(u => ({ userKey: parseInt(u.user_hash, 10), context: {} }));

    try {
      const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSetCode: ggLotteryNotifyTemplate, contextList }),
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess += chunk.length;
      } else {
        totalFail += chunk.length;
        console.error('[GG LotteryNotify] 배치 실패:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      totalFail += chunk.length;
      console.error('[GG LotteryNotify] 배치 오류:', e.message);
    }
  }

  console.log(`[GG LotteryNotify] 완료 — 대상: ${users.length}명, 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// 오늘 미접속 거위 유저에게 재유도 알림 bulk 발송 (매일 17:00 KST)
async function sendGoldenGooseReengageNotification() {
  if (!ggReengageNotifyTemplate) {
    console.log('[GG ReengageNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const users = db.prepare(`
    SELECT user_hash FROM gg_coins
    WHERE CAST(user_hash AS INTEGER) > 0
    AND user_hash NOT IN (
      SELECT user_hash FROM gg_access_log WHERE access_date = ?
    )
  `).all(today);

  if (users.length === 0) {
    console.log('[GG ReengageNotify] 미접속 유저 없음 — 발송 건너뜀');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
    const chunk = users.slice(i, i + BULK_BATCH_SIZE);
    const contextList = chunk.map(u => ({ userKey: parseInt(u.user_hash, 10), context: {} }));

    try {
      const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSetCode: ggReengageNotifyTemplate, contextList }),
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess += chunk.length;
      } else {
        totalFail += chunk.length;
        console.error('[GG ReengageNotify] 배치 실패:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      totalFail += chunk.length;
      console.error('[GG ReengageNotify] 배치 오류:', e.message);
    }
  }

  console.log(`[GG ReengageNotify] 완료 — 대상: ${users.length}명 (미접속), 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// 매일 KST 09:13 당일 미접속 유저 복권 알림
cron.schedule('13 9 * * *', sendGoldenGooseLotteryNotification, { timezone: 'Asia/Seoul' });
// 매일 KST 18:13 당일 미접속 유저 복권 알림 (2차)
cron.schedule('13 18 * * *', sendGoldenGooseLotteryNotification, { timezone: 'Asia/Seoul' });

// POST /api/golden-goose/toss/login — 인가코드 → 토큰 → 유저정보 조회+저장 (GG mTLS)
app.post('/api/golden-goose/toss/login', async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
    console.log('[GG Login] request body:', JSON.stringify({ authorizationCode: authorizationCode?.slice(0, 10) + '...', referrer }));
    if (!authorizationCode || !referrer) return res.status(400).json({ error: 'authorizationCode and referrer required' });

    // 1. 토큰 발급 (GG mTLS)
    const tokenResp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer })
    });
    const tokenText = await tokenResp.text();
    console.log('[GG Login] HTTP status:', tokenResp.status, 'body:', tokenText.slice(0, 300));
    let tokenData;
    try { tokenData = JSON.parse(tokenText); } catch (e) {
      return res.status(500).json({ error: 'token_parse_failed', httpStatus: tokenResp.status, rawBody: tokenText.slice(0, 500) });
    }
    if (tokenData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'token_failed', detail: tokenData });
    const { accessToken, refreshToken } = tokenData.success;

    // 2. 유저 정보 조회
    const meResp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const meData = await meResp.json();
    if (meData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'user_info_failed', detail: meData });
    const user = meData.success;

    // 3. 복호화 + DB 저장 (GG 전용 키 사용)
    const userHash = String(user.userKey);
    let name = null;
    try { if (user.name) name = decryptGGToss(user.name); } catch (e) { console.warn('[GG Login] name decrypt failed:', e.message); }
    db.prepare(`INSERT INTO gg_users (user_hash, user_name, updated_at)
      VALUES (?, ?, (datetime('now','+9 hours')))
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, updated_at=(datetime('now','+9 hours'))
    `).run(userHash, name || null);

    console.log(`[GG Login] User ${userHash} (${name}) logged in`);
    res.json({ status: 'ok', userKey: user.userKey, userHash, name, accessToken, refreshToken });
  } catch (e) {
    console.error('[GG Login Error]', e);
    res.status(500).json({ error: 'login_failed', detail: e.message });
  }
});

// ── 황금알을 낳는 거위 연결 끊기 콜백 ──────────────────────────────────────
const GG_DISCONNECT_AUTH = process.env.GG_DISCONNECT_AUTH;
if (!GG_DISCONNECT_AUTH) console.warn('[WARN] GG_DISCONNECT_AUTH가 .env에 설정되지 않았습니다');
function verifyGGDisconnectAuth(req) {
  const auth = req.headers.authorization;
  return auth && auth === 'Basic ' + Buffer.from(GG_DISCONNECT_AUTH).toString('base64');
}
function handleGGDisconnect(userKey, referrer) {
  const userHash = String(userKey);
  try { db.prepare('DELETE FROM gg_coins WHERE user_hash = ?').run(userHash); } catch(e) {}
  try { db.prepare('DELETE FROM gg_exchanges WHERE user_hash = ?').run(userHash); } catch(e) {}
  console.log(`[GG Disconnect] ${referrer || 'UNKNOWN'} — deleted data for userKey: ${userKey}`);
}
app.options('/api/golden-goose/disconnect', setDisconnectCors, (req, res) => res.status(204).end());
app.get('/api/golden-goose/disconnect', setDisconnectCors, (req, res) => {
  if (!req.headers.authorization) return res.json({ status: 'ok' }); // 포털 연결 테스트
  if (!verifyGGDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.query;
  if (userKey) handleGGDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});
app.post('/api/golden-goose/disconnect', setDisconnectCors, (req, res) => {
  if (!req.headers.authorization) return res.json({ status: 'ok' }); // 포털 연결 테스트
  if (!verifyGGDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.body;
  if (userKey) handleGGDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});

// ===== Golden Goose API =====

// GET /api/golden-goose/recent-rewards — 최근 보상 티커용
app.get('/api/golden-goose/recent-rewards', (req, res) => {
  const rows = db.prepare(`
    SELECT r.coins, r.created_at as time, COALESCE(r.reason, 'reward') as reason,
           COALESCE(u.user_name, '익명') as name
    FROM gg_reward_log r
    LEFT JOIN gg_users u ON r.user_hash = u.user_hash
    WHERE r.coins >= 20
    ORDER BY r.id DESC LIMIT 20
  `).all();
  // 영문 이름 제외 + 마스킹 + 연속 동일 유저 제거
  const korean = rows.filter(r => /^[가-힣]+$/.test(r.name));
  const deduped = korean.filter((r, i) => i === 0 || r.name !== korean[i - 1].name);
  const masked = deduped.map(r => ({
    ...r,
    name: r.name.length >= 2 ? r.name[0] + '*'.repeat(r.name.length - 2) + r.name[r.name.length - 1] : r.name
  }));
  res.json(masked);
});

// GET /api/golden-goose/coins/:userHash — 금화 잔액 조회
app.get('/api/golden-goose/coins/:userHash', (req, res) => {
  const { userHash } = req.params;
  const row = db.prepare('SELECT coins, total_earned, milestone_eggs FROM gg_coins WHERE user_hash = ?').get(userHash);
  const exchangeRow = db.prepare("SELECT COALESCE(SUM(coins_spent), 0) / 10 as total_points FROM gg_exchanges WHERE user_hash = ? AND status = 'confirmed'").get(userHash);
  // 마일스톤: 프로모 ID가 등록된 것만 활성
  const MILESTONE_POINTS = { 20:1, 50:5, 100:10, 200:20, 500:50, 1000:100, 2000:100, 3000:100, 5000:200, 8000:300, 10000:500, 15000:700, 20000:1000 };
  const msRows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gg_milestone_%' AND value != ''").all();
  const milestones = msRows
    .map(r => { const eggs = parseInt(r.key.replace('gg_milestone_', '')); return { eggs, points: MILESTONE_POINTS[eggs] || 0, promo: r.value }; })
    .filter(m => m.points > 0)
    .sort((a, b) => a.eggs - b.eggs);
  // 공지사항
  const noticeId = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_id'").get()?.value || '';
  const noticeTitle = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_title'").get()?.value || '';
  const noticeBody = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_body'").get()?.value || '';
  const notice = noticeId ? { id: noticeId, title: noticeTitle, body: noticeBody } : null;

  res.json({
    coins: row?.coins ?? 0, totalEarned: row?.total_earned ?? 0,
    totalExchangedPoints: exchangeRow?.total_points ?? 0,
    milestoneEggs: row?.milestone_eggs ?? 0,
    milestones,
    notice
  });
});

// POST /api/golden-goose/reward — 광고 완료 후 금화 지급 (서버에서 확률 추첨)
app.post('/api/golden-goose/reward', (req, res) => {
  const { userHash, fixedCoins } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  // 오늘 지급 횟수 조회 (KST 오전 9시 = UTC 자정 기준)
  const todayCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM gg_reward_log
    WHERE user_hash = ? AND created_at >= datetime(date('now'), '+9 hours')
  `).get(userHash)?.cnt || 0;

  // fixedCoins: 최초 로그인 보너스 등 고정 코인 지급 (1~50 범위 제한)
  let coins;
  if (fixedCoins && Number.isInteger(fixedCoins) && fixedCoins >= 1 && fixedCoins <= 50) {
    coins = fixedCoins;
  } else {

  const rand = Math.random();
  if (todayCount >= 20) {
    // 20회+: 1~5코인 (기대값 2)
    if (rand < 0.45)       coins = 1;
    else if (rand < 0.70)  coins = 2;
    else if (rand < 0.90)  coins = 3;
    else if (rand < 0.95)  coins = 4;
    else                   coins = 5;
  } else if (todayCount >= 15) {
    // 16~20회: 기대값 ~3코인
    if (rand < 0.60)       coins = Math.floor(Math.random() * 3) + 1;   // 1~3 (60%)
    else if (rand < 0.90)  coins = Math.floor(Math.random() * 3) + 3;   // 3~5 (30%)
    else                   coins = Math.floor(Math.random() * 4) + 5;   // 5~8 (10%)
  } else if (todayCount >= 10) {
    // 11~15회: 기대값 ~4코인
    if (rand < 0.50)       coins = Math.floor(Math.random() * 3) + 1;   // 1~3 (50%)
    else if (rand < 0.85)  coins = Math.floor(Math.random() * 3) + 4;   // 4~6 (35%)
    else                   coins = Math.floor(Math.random() * 4) + 7;   // 7~10 (15%)
  } else {
    // 1~10회: 기본 확률 테이블 (기대값 ~7코인)
    if (rand < 0.40)       coins = Math.floor(Math.random() * 4) + 1;
    else if (rand < 0.88)  coins = Math.floor(Math.random() * 6) + 5;
    else if (rand < 0.985) coins = Math.floor(Math.random() * 15) + 11;
    else                   coins = Math.floor(Math.random() * 25) + 26;
  }
  } // end fixedCoins else

  // 지급 로그 기록
  db.prepare('INSERT INTO gg_reward_log (user_hash, coins) VALUES (?, ?)').run(userHash, coins);

  db.prepare(`
    INSERT INTO gg_coins (user_hash, coins, total_earned, milestone_eggs)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.coins,
      milestone_eggs = milestone_eggs + 1,
      updated_at = (datetime('now','+9 hours'))
  `).run(userHash, coins, coins);

  const updated = db.prepare('SELECT coins, total_earned, milestone_eggs FROM gg_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins, totalCoins: updated.coins, totalEarned: updated.total_earned, milestoneEggs: updated.milestone_eggs ?? 0 });
});

// POST /api/golden-goose/reset — 유저 데이터 초기화 (디버그용)
app.post('/api/golden-goose/reset', (req, res) => {
  const { userHash, tossUserKey } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  const hashes = [userHash, tossUserKey].filter(Boolean);
  console.log(`[GG Reset] users: ${hashes.join(', ')}`);
  for (const h of hashes) {
    db.prepare('DELETE FROM gg_coins WHERE user_hash = ?').run(h);
    db.prepare('DELETE FROM gg_reward_log WHERE user_hash = ?').run(h);
    db.prepare('DELETE FROM gg_exchanges WHERE user_hash = ?').run(h);
  }
  console.log(`[GG Reset] done`);
  res.json({ ok: true });
});

// POST /api/golden-goose/lottery — 복권 금화 지급 (서버에서 추첨)
app.post('/api/golden-goose/lottery', (req, res) => {
  const { userHash, type } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  let coins;
  if (type === 'premium') {
    // 꽝없는 복권: 80% → 10~20 / 17% → 20~50 / 2.95% → 50~100 / 0.035% → 1000 / 0.015% → 10000
    const r = Math.random();
    if (r < 0.80)         coins = Math.floor(Math.random() * 11) + 10;
    else if (r < 0.97)    coins = Math.floor(Math.random() * 31) + 20;
    else if (r < 0.9995)  coins = Math.floor(Math.random() * 51) + 50;
    else if (r < 0.99985) coins = 1000;
    else                   coins = 10000;
  } else {
    // 일반 복권: 35% 꽝 / 35% 1코인 / 20% 3코인 / 10% 5코인
    const r = Math.random();
    if (r < 0.35)      { return res.json({ coins: 0, bust: true, totalCoins: null }); }
    else if (r < 0.70) coins = 1;
    else if (r < 0.90) coins = 3;
    else                coins = 5;
  }

  // 복권 로그 기록
  db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, coins, `lottery_${type}`);

  db.prepare(`
    INSERT INTO gg_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.coins,
      updated_at = (datetime('now','+9 hours'))
  `).run(userHash, coins, coins);

  const updated = db.prepare('SELECT coins, total_earned FROM gg_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins, bust: false, totalCoins: updated.coins, totalEarned: updated.total_earned });
});

// POST /api/golden-goose/exchange — 금화 10단위 일괄 차감 + 교환 ID 발급
// PROMO_COIN_EXCHANGE만 사용 (최대 1,000원 지급 가능)
app.post('/api/golden-goose/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  const row = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < 10) return res.json({ error: 'insufficient_coins' });

  const coinCount = Math.floor(row.coins / 10) * 10;
  const points = coinCount / 10;

  const promoCfg = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_exchange'").get();
  const promoId = promoCfg?.value || 'GOLDEN_GOOSE_EXCHANGE_PROMO';

  const tx = db.transaction(() => {
    db.prepare(`UPDATE gg_coins SET coins = coins - ?, updated_at = (datetime('now','+9 hours')) WHERE user_hash = ?`).run(coinCount, userHash);
    const result = db.prepare(
      'INSERT INTO gg_exchanges (user_hash, coins_spent, promo_id, status) VALUES (?, ?, ?, ?)'
    ).run(userHash, coinCount, promoId, 'pending');
    return result.lastInsertRowid;
  });
  const exchangeId = tx();

  res.json({ exchangeId, promoId, coinCount, points });
});

// POST /api/golden-goose/exchange/:id/confirm — 교환 확정
app.post('/api/golden-goose/exchange/:id/confirm', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE gg_exchanges SET status = 'confirmed' WHERE id = ?").run(id);
  res.json({ ok: true });
});

// POST /api/golden-goose/exchange/:id/restore — 교환 실패 시 금화 복원
app.post('/api/golden-goose/exchange/:id/restore', (req, res) => {
  const { id } = req.params;
  const exchange = db.prepare('SELECT * FROM gg_exchanges WHERE id = ?').get(id);
  if (!exchange || exchange.status !== 'pending') return res.json({ ok: false });

  db.transaction(() => {
    db.prepare(`UPDATE gg_coins SET coins = coins + ?, updated_at = (datetime('now','+9 hours')) WHERE user_hash = ?`).run(exchange.coins_spent, exchange.user_hash);
    db.prepare("UPDATE gg_exchanges SET status = 'restored' WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

// GET /api/golden-goose/promo-config
app.get('/api/golden-goose/promo-config', (req, res) => {
  const exchange = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_exchange'").get();
  const login = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_login'").get();
  res.json({
    exchange: exchange?.value || '01KJQMQJHX7Y5MAVRVTN0A4VNZ',
    login: login?.value || '01KJQKQHVSCC3WC4Q7AGFWTWN6',
  });
});

// GET /api/golden-goose/promo/check/:userHash/:promoType
app.get('/api/golden-goose/promo/check/:userHash/:promoType', (req, res) => {
  const { userHash, promoType } = req.params;
  const row = db.prepare('SELECT * FROM gg_promotion_grants WHERE user_hash = ? AND promo_type = ?').get(userHash, promoType);
  res.json({ granted: !!row });
});

// POST /api/golden-goose/promo/record
app.post('/api/golden-goose/promo/record', (req, res) => {
  const { userHash, promoType, promoCode, amount } = req.body;
  try {
    db.prepare(`
      INSERT OR IGNORE INTO gg_promotion_grants (user_hash, promo_type, promo_code, amount, status)
      VALUES (?, ?, ?, ?, 'granted')
    `).run(userHash, promoType, promoCode, amount ?? 1);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// POST /api/golden-goose/promo/grant — Toss 프로모션 지급 (GG mTLS)
app.post('/api/golden-goose/promo/grant', async (req, res) => {
  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || amount == null) return res.status(400).json({ error: 'missing params' });
  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };
  try {
    const keyRes = await (await ggTossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    console.log('[GG Promo] get-key response:', JSON.stringify(keyRes));
    if (keyRes.resultType !== 'SUCCESS') return res.json({ error: keyRes });
    const key = keyRes.success.key;
    const execRes = await (await ggTossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key, amount })
    })).json();
    console.log('[GG Promo] execute response:', JSON.stringify(execRes));
    if (execRes.resultType !== 'SUCCESS') return res.json({ error: execRes });
    res.json(execRes.success);
  } catch (e) {
    console.error('[GG Promo Error]', e);
    res.status(500).json({ error: 'promo_grant_failed', detail: e.message });
  }
});

// POST /api/golden-goose/access/record — 일일 접속 기록 (17시 재유도 알림용)
app.post('/api/golden-goose/access/record', (req, res) => {
  const { userHash, date } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  const today = date || new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  db.prepare('INSERT OR IGNORE INTO gg_access_log (user_hash, access_date) VALUES (?, ?)').run(userHash, today);
  res.json({ ok: true });
});

// POST /api/golden-goose/event — 클라이언트 이벤트 수집
app.post('/api/golden-goose/event', (req, res) => {
  const { userHash, event, params } = req.body || {};
  if (!userHash || !event) return res.status(400).json({ error: 'userHash and event required' });

  // analytics_users: 첫 방문 자동 등록
  db.prepare('INSERT OR IGNORE INTO gg_analytics_users (user_hash) VALUES (?)').run(userHash);

  // 최초 이벤트 업데이트 (first_hatch, first_login)
  if (event === 'egg_hatch') {
    db.prepare('UPDATE gg_analytics_users SET first_hatch_at = datetime(\'now\',\'+9 hours\') WHERE user_hash = ? AND first_hatch_at IS NULL').run(userHash);
  } else if (event === 'login_success') {
    db.prepare('UPDATE gg_analytics_users SET first_login_at = datetime(\'now\',\'+9 hours\') WHERE user_hash = ? AND first_login_at IS NULL').run(userHash);
  }

  // 이벤트 기록
  db.prepare('INSERT INTO gg_events (user_hash, event, params) VALUES (?, ?, ?)').run(userHash, event, params ? JSON.stringify(params) : null);
  res.json({ ok: true });
});

// GET /api/golden-goose/analytics/dashboard-data — 대시보드용 통합 데이터
app.get('/api/golden-goose/analytics/dashboard-data', (req, res) => {
  const { date, cohort_date } = req.query;
  const today = date || new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cohortDate = cohort_date || today;

  // 1. 신규 유저 첫 알 부화율
  const firstHatchRate = db.prepare(`
    SELECT
      COUNT(*) as total_new,
      COUNT(first_hatch_at) as hatched
    FROM gg_analytics_users WHERE DATE(first_visit_at) = ?
  `).get(cohortDate);

  // 2. 신규 유저 로그인 전환율
  const loginRate = db.prepare(`
    SELECT
      COUNT(*) as total_new,
      COUNT(first_login_at) as logged_in
    FROM gg_analytics_users WHERE DATE(first_visit_at) = ?
  `).get(cohortDate);

  // 3. D1~D7 리텐션 (코호트 기준)
  const retention = db.prepare(`
    SELECT
      CAST(julianday(DATE(e.created_at)) - julianday(?) AS INT) as day_n,
      COUNT(DISTINCT e.user_hash) as users
    FROM gg_events e
    JOIN gg_analytics_users u ON e.user_hash = u.user_hash
    WHERE DATE(u.first_visit_at) = ? AND e.event = 'app_open'
      AND CAST(julianday(DATE(e.created_at)) - julianday(?) AS INT) BETWEEN 0 AND 28
    GROUP BY day_n ORDER BY day_n
  `).all(cohortDate, cohortDate, cohortDate);
  const cohortSize = db.prepare('SELECT COUNT(*) as cnt FROM gg_analytics_users WHERE DATE(first_visit_at) = ?').get(cohortDate)?.cnt || 0;

  // 4. 유저별 일평균 부화 수
  const avgHatches = db.prepare(`
    SELECT AVG(daily_count) as avg_daily FROM (
      SELECT user_hash, DATE(created_at) as day, COUNT(*) as daily_count
      FROM gg_events WHERE event = 'egg_hatch' GROUP BY user_hash, day
    )
  `).get();

  // 5. Daily 부화 횟수별 유저 분포 (오늘)
  const hatchDistribution = db.prepare(`
    SELECT daily_count, COUNT(*) as users FROM (
      SELECT user_hash, COUNT(*) as daily_count
      FROM gg_events WHERE event = 'egg_hatch' AND DATE(created_at) = ?
      GROUP BY user_hash
    ) GROUP BY daily_count ORDER BY daily_count
  `).all(today);

  // 6. 장기 유저 vs 이탈 유저 첫날 행동 비교
  const behaviorComparison = db.prepare(`
    WITH user_lifespan AS (
      SELECT user_hash,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        MIN(DATE(created_at)) as first_day
      FROM gg_events WHERE event = 'app_open' GROUP BY user_hash
    ),
    first_day_actions AS (
      SELECT e.user_hash,
        SUM(CASE WHEN e.event='egg_hatch' THEN 1 ELSE 0 END) as hatches,
        MAX(CASE WHEN e.event='lottery_result' THEN 1 ELSE 0 END) as used_lottery,
        MAX(CASE WHEN e.event='login_success' THEN 1 ELSE 0 END) as logged_in,
        MAX(COALESCE(json_extract(e.params,'$.amount'),0)) as max_lottery_win,
        SUM(CASE WHEN e.event='egg_hatch' THEN COALESCE(json_extract(e.params,'$.coins'),0) ELSE 0 END) as total_coins
      FROM gg_events e JOIN user_lifespan u
        ON e.user_hash = u.user_hash AND DATE(e.created_at) = u.first_day
      GROUP BY e.user_hash
    )
    SELECT
      CASE WHEN u.active_days >= 7 THEN 'retained' ELSE 'churned' END as segment,
      COUNT(*) as users,
      AVG(f.hatches) as avg_hatches,
      AVG(f.used_lottery) as lottery_rate,
      AVG(f.logged_in) as login_rate,
      AVG(f.max_lottery_win) as avg_max_lottery_win,
      AVG(f.total_coins) as avg_first_day_coins
    FROM user_lifespan u JOIN first_day_actions f ON u.user_hash = f.user_hash
    GROUP BY segment
  `).all();

  // 7. 복권 이용 유저 비율 (오늘)
  const lotteryUsage = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN event='lottery_result' THEN user_hash END) as lottery_users,
      COUNT(DISTINCT CASE WHEN event='app_open' THEN user_hash END) as total_users
    FROM gg_events WHERE DATE(created_at) = ?
  `).get(today);

  // 오늘 요약 (이벤트 기반)
  const todaySummary = db.prepare(`
    SELECT
      COUNT(DISTINCT user_hash) as dau,
      COUNT(CASE WHEN event='egg_hatch' THEN 1 END) as total_hatches,
      COUNT(CASE WHEN event='lottery_result' THEN 1 END) as total_lotteries,
      COUNT(CASE WHEN event='exchange_complete' THEN 1 END) as total_exchanges,
      COUNT(CASE WHEN event='ad_fail' THEN 1 END) as ad_fails
    FROM gg_events WHERE DATE(created_at) = ?
  `).get(today);

  // 오늘 실제 비즈니스 지표 (기존 DB 테이블에서)
  const todayBiz = db.prepare(`
    SELECT
      COUNT(*) as ad_views,
      COALESCE(SUM(coins), 0) as total_coins_given
    FROM gg_reward_log WHERE DATE(created_at) = DATE(?, '+9 hours')
  `).get(today);
  const todayExchange = db.prepare(`
    SELECT
      COALESCE(SUM(coins_spent), 0) as coins_exchanged,
      COALESCE(SUM(coins_spent / 10), 0) as points_exchanged
    FROM gg_exchanges WHERE status = 'confirmed' AND DATE(created_at) = DATE(?, '+9 hours')
  `).get(today);
  const todayShares = db.prepare(`
    SELECT COUNT(*) as share_count, COUNT(DISTINCT user_hash) as share_users
    FROM gg_reward_log WHERE reason = 'share' AND DATE(created_at) = DATE(?, '+9 hours')
  `).get(today);

  // 일별 DAU 추이 (최근 30일) — gg_events 기반 + gg_access_log 폴백
  let dauTrend = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(DISTINCT user_hash) as dau
    FROM gg_events WHERE event = 'app_open' AND DATE(created_at) >= DATE(?, '-30 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all(today);
  if (dauTrend.length === 0) {
    dauTrend = db.prepare(`
      SELECT access_date as date, COUNT(DISTINCT user_hash) as dau
      FROM gg_access_log WHERE access_date >= DATE(?, '-30 days')
      GROUP BY access_date ORDER BY access_date
    `).all(today);
  }

  // 신규 유저 수 추이 (최근 30일)
  let newUserTrend = db.prepare(`
    SELECT DATE(first_visit_at) as date, COUNT(*) as new_users
    FROM gg_analytics_users WHERE DATE(first_visit_at) >= DATE(?, '-30 days')
    GROUP BY DATE(first_visit_at) ORDER BY date
  `).all(today);
  if (newUserTrend.length === 0) {
    newUserTrend = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as new_users
      FROM gg_users WHERE DATE(created_at) >= DATE(?, '-30 days')
      GROUP BY DATE(created_at) ORDER BY date
    `).all(today);
  }

  // === 기존 DB 기반 지표 (이벤트 배포 전에도 사용 가능) ===

  // 일별 광고 노출(부화) 추이 (최근 30일, gg_reward_log에서)
  const adTrend = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as ad_views, SUM(coins) as coins_given
    FROM gg_reward_log WHERE DATE(created_at) >= DATE(?, '-30 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all(today);

  // 일별 교환 포인트 추이 (최근 30일)
  const exchangeTrend = db.prepare(`
    SELECT DATE(created_at) as date, SUM(coins_spent / 10) as points, COUNT(*) as count
    FROM gg_exchanges WHERE status = 'confirmed' AND DATE(created_at) >= DATE(?, '-30 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all(today);

  // 총 유저 수
  const totalUsers = db.prepare('SELECT COUNT(*) as cnt FROM gg_coins').get()?.cnt || 0;

  // 일별 부화 횟수별 유저 분포 (기존 gg_reward_log에서, 오늘)
  let hatchDistLegacy = [];
  if (hatchDistribution.length === 0) {
    hatchDistLegacy = db.prepare(`
      SELECT daily_count, COUNT(*) as users FROM (
        SELECT user_hash, COUNT(*) as daily_count
        FROM gg_reward_log WHERE DATE(created_at) = DATE(?, '+9 hours')
        GROUP BY user_hash
      ) GROUP BY daily_count ORDER BY daily_count
    `).all(today);
  }

  // 유저별 일평균 부화 수 (기존 gg_reward_log에서)
  let avgHatchesLegacy = 0;
  if (!avgHatches?.avg_daily) {
    avgHatchesLegacy = db.prepare(`
      SELECT AVG(daily_count) as avg_daily FROM (
        SELECT user_hash, DATE(created_at) as day, COUNT(*) as daily_count
        FROM gg_reward_log GROUP BY user_hash, day
      )
    `).get()?.avg_daily || 0;
  }

  res.json({
    today,
    cohortDate,
    cohortSize,
    firstHatchRate,
    loginRate,
    retention,
    avgDailyHatches: avgHatches?.avg_daily || 0,
    hatchDistribution,
    behaviorComparison,
    lotteryUsage,
    todaySummary,
    todayBiz,
    todayExchange,
    todayShares,
    dauTrend,
    newUserTrend,
    adTrend,
    exchangeTrend,
    totalUsers,
    hatchDistLegacy,
    avgHatchesLegacy,
  });
});

// POST /api/golden-goose/debug/reset — 디버그용: 유저 데이터 전체 초기화
app.post('/api/golden-goose/debug/reset', (req, res) => {
  const { userHash } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM gg_users WHERE user_hash = ?').run(userHash);
    db.prepare('DELETE FROM gg_coins WHERE user_hash = ?').run(userHash);
    db.prepare('DELETE FROM gg_exchanges WHERE user_hash = ?').run(userHash);
    db.prepare('DELETE FROM gg_promotion_grants WHERE user_hash = ?').run(userHash);
    db.prepare('DELETE FROM gg_access_log WHERE user_hash = ?').run(userHash);
  });
  tx();
  console.log(`[GG Debug] Full reset for ${userHash} (users, coins, exchanges, promotions, access)`);
  res.json({ ok: true });
});

// POST /api/golden-goose/debug/add-coins — 디버그용: 금화 추가
app.post('/api/golden-goose/debug/add-coins', (req, res) => {
  const { userHash, coins: amount } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  const addAmount = Number(amount) || 5;
  db.prepare(`
    INSERT INTO gg_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.coins,
      updated_at = (datetime('now','+9 hours'))
  `).run(userHash, addAmount, addAmount);
  const row = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
  console.log(`[GG Debug] Added ${addAmount} coins for ${userHash}, total: ${row?.coins}`);
  res.json({ ok: true, totalCoins: row?.coins ?? addAmount });
});

// ===== GOLDEN-GOOSE REFERRAL API =====

// GET /api/golden-goose/referral/code/:userHash — 추천 코드 조회/생성
app.get('/api/golden-goose/referral/code/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });

  try {
    let row = db.prepare('SELECT code FROM gg_referral_codes WHERE user_hash = ?').get(userHash);
    if (!row) {
      let code;
      for (let i = 0; i < 10; i++) {
        code = crypto.randomBytes(3).toString('hex');
        if (!db.prepare('SELECT 1 FROM gg_referral_codes WHERE code = ?').get(code)) break;
        if (i === 9) return res.status(500).json({ error: '코드 생성 실패' });
      }
      db.prepare('INSERT INTO gg_referral_codes (user_hash, code) VALUES (?, ?)').run(userHash, code);
      row = { code };
    }
    res.json({ code: row.code });
  } catch (err) {
    console.error('[GG Referral] code error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/golden-goose/referral/register — 추천 관계 등록
app.post('/api/golden-goose/referral/register', (req, res) => {
  const { referrerCode, referredHash, referredName } = req.body || {};
  if (!referrerCode || !referredHash) {
    return res.status(400).json({ error: 'referrerCode, referredHash 필요' });
  }

  try {
    const registerReferral = db.transaction(() => {
      const codeRow = db.prepare('SELECT user_hash FROM gg_referral_codes WHERE code = ?').get(referrerCode);
      if (!codeRow) return { error: '유효하지 않은 추천 코드' };

      const referrerHash = codeRow.user_hash;
      if (referrerHash === referredHash) return { error: '자기 자신은 추천할 수 없습니다' };

      const existing = db.prepare('SELECT 1 FROM gg_referrals WHERE referred_hash = ?').get(referredHash);
      if (existing) return { ok: true, message: '이미 등록됨' };

      const count = db.prepare('SELECT COUNT(*) as cnt FROM gg_referrals WHERE referrer_hash = ?').get(referrerHash);
      if (count.cnt >= 300) return { error: '추천 상한 초과' };

      db.prepare(
        'INSERT INTO gg_referrals (referrer_hash, referred_hash, referred_name, referral_code) VALUES (?, ?, ?, ?)'
      ).run(referrerHash, referredHash, referredName || null, referrerCode);

      return { ok: true };
    });

    const result = registerReferral();
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('[GG Referral] register error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /api/golden-goose/referral/status/:userHash — 초대 현황
app.get('/api/golden-goose/referral/status/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });

  try {
    let codeRow = db.prepare('SELECT code FROM gg_referral_codes WHERE user_hash = ?').get(userHash);
    if (!codeRow) {
      const code = crypto.randomBytes(3).toString('hex');
      db.prepare('INSERT OR IGNORE INTO gg_referral_codes (user_hash, code) VALUES (?, ?)').run(userHash, code);
      codeRow = { code };
    }

    const list = db.prepare(
      'SELECT id, referred_name as name, claimed, created_at FROM gg_referrals WHERE referrer_hash = ? ORDER BY created_at DESC'
    ).all(userHash);

    const total = list.length;
    const unclaimed = list.filter(r => !r.claimed).length;
    const claimed = total - unclaimed;

    res.json({
      code: codeRow.code,
      total,
      limit: 300,
      unclaimed,
      claimed,
      unclaimedCoins: unclaimed * 10,
      list: list.map(r => ({
        id: r.id,
        created_at: r.created_at,
        claimed: !!r.claimed,
        name: r.name || '익명',
      })),
    });
  } catch (err) {
    console.error('[GG Referral] status error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// POST /api/golden-goose/referral/claim — 미수령 일괄 클레임
app.post('/api/golden-goose/referral/claim', (req, res) => {
  const { userHash } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });

  try {
    const claimReferrals = db.transaction(() => {
      const unclaimed = db.prepare(
        'SELECT COUNT(*) as cnt FROM gg_referrals WHERE referrer_hash = ? AND claimed = 0'
      ).get(userHash);

      if (unclaimed.cnt === 0) return { ok: true, claimedCount: 0, coins: 0 };

      const coins = unclaimed.cnt * 10;

      db.prepare(
        "UPDATE gg_referrals SET claimed = 1, claimed_at = datetime('now','+9 hours') WHERE referrer_hash = ? AND claimed = 0"
      ).run(userHash);

      db.prepare(`
        INSERT INTO gg_coins (user_hash, coins, total_earned)
        VALUES (?, ?, ?)
        ON CONFLICT(user_hash) DO UPDATE SET
          coins = coins + excluded.coins,
          total_earned = total_earned + excluded.coins,
          updated_at = (datetime('now','+9 hours'))
      `).run(userHash, coins, coins);

      db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, coins, 'referral_claim');

      return { ok: true, claimedCount: unclaimed.cnt, coins };
    });

    const result = claimReferrals();
    res.json(result);
  } catch (err) {
    console.error('[GG Referral] claim error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// ===== SLEEP-MONEY API =====

// Sleep-Money mTLS agent
const smCertPath = fs.existsSync('/root/sleep-money_public.crt')
  ? '/root/sleep-money_public.crt'
  : path.join(__dirname, '../../../sleep-money/sleep-money_public.crt');
const smKeyPath = fs.existsSync('/root/sleep-money_private.key')
  ? '/root/sleep-money_private.key'
  : path.join(__dirname, '../../../sleep-money/sleep-money_private.key');
const smTossAgent = new https.Agent({
  cert: fs.readFileSync(smCertPath),
  key: fs.readFileSync(smKeyPath),
});
function smTossFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      agent: smTossAgent,
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Sleep-Money DB
const SM_DB_PATH = fs.existsSync('/var/www/sleep-money/server/sleep-money.db')
  ? '/var/www/sleep-money/server/sleep-money.db'
  : path.join(__dirname, '../../../sleep-money/server/sleep-money.db');
const smDb = new Database(SM_DB_PATH);
smDb.pragma('journal_mode = WAL');
smDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    user_gender TEXT,
    user_birthday TEXT,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS promo_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','+9 hours')),
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coin_count INTEGER NOT NULL,
    points INTEGER NOT NULL,
    promo_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS sleep_settings (
    user_hash TEXT PRIMARY KEY,
    bedtime TEXT NOT NULL,
    wake_time TEXT NOT NULL,
    updated_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
  CREATE TABLE IF NOT EXISTS sleep_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    sleep_start DATETIME,
    sleep_end DATETIME,
    total_minutes INTEGER,
    coins_earned INTEGER,
    bonus_multiplier REAL DEFAULT 1.0,
    ad_watched INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','+9 hours'))
  );
`);

// Sleep-Money 토스 복호화 키
const smTossKeysPath = path.join(__dirname, '../../../sleep-money/server/keys/toss-login.json');
const smTossKeys = fs.existsSync(smTossKeysPath)
  ? JSON.parse(fs.readFileSync(smTossKeysPath, 'utf8'))
  : null;

function smDecryptToss(encryptedText) {
  if (!smTossKeys) return encryptedText;
  try {
    const decoded = Buffer.from(encryptedText, 'base64');
    const IV_LENGTH = 12;
    const iv = decoded.subarray(0, IV_LENGTH);
    const authTagLength = 16;
    const ciphertext = decoded.subarray(IV_LENGTH, decoded.length - authTagLength);
    const authTag = decoded.subarray(decoded.length - authTagLength);
    const key = Buffer.from(smTossKeys.key, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(smTossKeys.aad));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (e) {
    console.warn('[sleep-money auth] decrypt failed:', e.message);
    return encryptedText;
  }
}

const smPrefix = '/api/sleep-money';

// Auth - 토스 로그인
app.post(`${smPrefix}/toss/login`, async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
    if (!authorizationCode) return res.status(400).json({ error: 'missing_auth_code' });

    let userHash, userName, userGender, userBirthday;

    const result = await smTossFetch('https://oauth2.cert.toss.im/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode }),
    });
    const data = await result.json();

    userHash = data.userHash || crypto.createHash('sha256').update(authorizationCode).digest('hex').slice(0, 16);
    userName = data.name ? smDecryptToss(data.name) : '사용자';
    userGender = data.gender ? smDecryptToss(data.gender) : '';
    userBirthday = data.birthday ? smDecryptToss(data.birthday) : '';

    smDb.prepare(`
      INSERT INTO users (user_hash, user_name, user_gender, user_birthday, updated_at)
      VALUES (?, ?, ?, ?, datetime('now','+9 hours'))
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name = excluded.user_name,
        updated_at = datetime('now','+9 hours')
    `).run(userHash, userName, userGender, userBirthday);

    res.json({
      status: 'ok',
      userHash,
      userKey: userHash,
      name: userName,
      referrer: referrer || null,
    });
  } catch (err) {
    console.error('[sleep-money auth] login error:', err);
    res.status(500).json({ error: 'login_failed' });
  }
});

// Coins
app.get(`${smPrefix}/coins/:userHash`, (req, res) => {
  const { userHash } = req.params;
  const row = smDb.prepare(`SELECT COALESCE(SUM(amount), 0) as coins FROM coin_transactions WHERE user_hash = ?`).get(userHash);
  res.json({ coins: row?.coins || 0 });
});

app.post(`${smPrefix}/coins/add`, (req, res) => {
  const { userHash, amount, reason } = req.body;
  if (!userHash || !amount) return res.status(400).json({ error: 'missing_params' });
  smDb.prepare(`INSERT INTO coin_transactions (user_hash, amount, reason) VALUES (?, ?, ?)`).run(userHash, amount, reason || 'game_reward');
  const row = smDb.prepare(`SELECT COALESCE(SUM(amount), 0) as coins FROM coin_transactions WHERE user_hash = ?`).get(userHash);
  res.json({ success: true, coins: row.coins });
});

// Config
app.get(`${smPrefix}/config`, (req, res) => {
  const rows = smDb.prepare(`SELECT key, value FROM settings`).all();
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  res.json(config);
});

app.get(`${smPrefix}/promo-config`, (req, res) => {
  const rows = smDb.prepare(`SELECT key, value FROM settings WHERE key LIKE 'promo_%'`).all();
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  res.json(config);
});

// Exchange
const SM_EXCHANGE_RATE = 10;

app.post(`${smPrefix}/exchange`, (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_user' });
  const coinRow = smDb.prepare(`SELECT COALESCE(SUM(amount), 0) as coins FROM coin_transactions WHERE user_hash = ?`).get(userHash);
  const coins = coinRow?.coins || 0;
  if (coins < SM_EXCHANGE_RATE) return res.json({ error: 'insufficient_coins' });
  const exchangeCoins = Math.floor(coins / SM_EXCHANGE_RATE) * SM_EXCHANGE_RATE;
  const points = exchangeCoins / SM_EXCHANGE_RATE;
  smDb.prepare(`INSERT INTO coin_transactions (user_hash, amount, reason) VALUES (?, ?, 'exchange')`).run(userHash, -exchangeCoins);
  const result = smDb.prepare(`INSERT INTO exchanges (user_hash, coin_count, points, status) VALUES (?, ?, ?, 'pending')`).run(userHash, exchangeCoins, points);
  const promoSetting = smDb.prepare(`SELECT value FROM settings WHERE key = 'promo_exchange'`).get();
  res.json({ exchangeId: result.lastInsertRowid, promoId: promoSetting?.value || null, coinCount: exchangeCoins, points });
});

app.post(`${smPrefix}/exchange/:id/confirm`, (req, res) => {
  smDb.prepare(`UPDATE exchanges SET status = 'confirmed' WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

app.post(`${smPrefix}/exchange/:id/restore`, (req, res) => {
  const ex = smDb.prepare(`SELECT * FROM exchanges WHERE id = ? AND status = 'pending'`).get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'not_found' });
  smDb.prepare(`INSERT INTO coin_transactions (user_hash, amount, reason) VALUES (?, ?, 'exchange_restore')`).run(ex.user_hash, ex.coin_count);
  smDb.prepare(`UPDATE exchanges SET status = 'restored' WHERE id = ?`).run(req.params.id);
  res.json({ success: true, restoredCoins: ex.coin_count });
});

app.get(`${smPrefix}/exchanges/:userHash`, (req, res) => {
  const rows = smDb.prepare(`SELECT * FROM exchanges WHERE user_hash = ? ORDER BY created_at DESC LIMIT 50`).all(req.params.userHash);
  res.json({ exchanges: rows });
});

// Promo
app.get(`${smPrefix}/promo/check/:userHash/:type`, (req, res) => {
  const { userHash, type } = req.params;
  const row = smDb.prepare(`SELECT * FROM promo_records WHERE user_hash = ? AND promo_type = ?`).get(userHash, type);
  res.json({ used: !!row, record: row || null });
});

app.post(`${smPrefix}/promo/record`, (req, res) => {
  const { userHash, promoType, promoCode, amount } = req.body;
  if (!userHash || !promoType) return res.status(400).json({ error: 'missing_params' });
  try {
    smDb.prepare(`INSERT INTO promo_records (user_hash, promo_type, promo_code, amount) VALUES (?, ?, ?, ?)`).run(userHash, promoType, promoCode || '', amount || 0);
    res.json({ success: true });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.json({ success: false, error: 'already_used' });
    throw err;
  }
});

app.post(`${smPrefix}/promo/grant`, (req, res) => {
  const { promoCode, amount, userHash } = req.body;
  console.log(`[sleep-money promo] grant: code=${promoCode}, amount=${amount}, user=${userHash}`);
  res.json({ success: true, granted: amount });
});

// Sleep
app.get(`${smPrefix}/sleep/settings/:userHash`, (req, res) => {
  const row = smDb.prepare('SELECT * FROM sleep_settings WHERE user_hash = ?').get(req.params.userHash);
  res.json(row || { bedtime: '23:00', wake_time: '07:00' });
});

app.post(`${smPrefix}/sleep/settings`, (req, res) => {
  const { userHash, bedtime, wakeTime } = req.body;
  if (!userHash || !bedtime || !wakeTime) return res.status(400).json({ error: 'missing_params' });
  smDb.prepare(`
    INSERT INTO sleep_settings (user_hash, bedtime, wake_time) VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET bedtime = excluded.bedtime, wake_time = excluded.wake_time, updated_at = (datetime('now','+9 hours'))
  `).run(userHash, bedtime, wakeTime);
  res.json({ success: true });
});

app.post(`${smPrefix}/sleep/complete`, (req, res) => {
  const { userHash, sleepStart, sleepEnd, totalMinutes, coinsEarned, bonusMultiplier, adWatched } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_params' });
  smDb.prepare(`
    INSERT INTO sleep_sessions (user_hash, sleep_start, sleep_end, total_minutes, coins_earned, bonus_multiplier, ad_watched)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userHash, sleepStart, sleepEnd, totalMinutes, coinsEarned, bonusMultiplier || 1, adWatched || 0);
  res.json({ success: true });
});

app.get(`${smPrefix}/sleep/stats/:userHash`, (req, res) => {
  const rows = smDb.prepare(`SELECT * FROM sleep_sessions WHERE user_hash = ? ORDER BY created_at DESC LIMIT 30`).all(req.params.userHash);
  res.json({ sessions: rows });
});

// Golden Goose Analytics Dashboard
// GET /api/golden-goose/notice — 현재 공지 조회
app.get('/api/golden-goose/notice', (req, res) => {
  const id = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_id'").get()?.value || '';
  const title = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_title'").get()?.value || '';
  const body = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_body'").get()?.value || '';
  res.json({ id, title, body, enabled: !!id });
});

// POST /api/golden-goose/notice — 공지 수정
app.post('/api/golden-goose/notice', (req, res) => {
  const { id, title, body } = req.body;
  db.prepare("UPDATE settings SET value = ? WHERE key = 'gg_notice_id'").run(id || '');
  db.prepare("UPDATE settings SET value = ? WHERE key = 'gg_notice_title'").run(title || '');
  db.prepare("UPDATE settings SET value = ? WHERE key = 'gg_notice_body'").run(body || '');
  console.log(`[GG Notice] ${id ? 'ON' : 'OFF'}: ${title}`);
  res.json({ ok: true });
});

app.get('/api/golden-goose/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'gg-dashboard.html'));
});

if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Score API running on port ${PORT}`);
  });
}

module.exports = { app };
