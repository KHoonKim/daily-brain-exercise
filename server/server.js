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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, user_gender=excluded.user_gender,
        user_birthday=excluded.user_birthday, updated_at=CURRENT_TIMESTAMP
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
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_hash) DO UPDATE SET
      user_name=excluded.user_name, user_gender=excluded.user_gender,
      user_birthday=excluded.user_birthday, updated_at=CURRENT_TIMESTAMP
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

// POST /api/score/points/sync — 클라 LS ↔ server max 동기화
app.post('/api/score/points/sync', (req, res) => {
  const { userHash, localPoints } = req.body;
  console.log(`[Points Sync IN] userHash=${userHash} localPoints=${localPoints}`);
  if (!userHash || typeof localPoints !== 'number' || localPoints < 0) {
    return res.status(400).json({ error: 'userHash and non-negative localPoints required' });
  }
  const user = db.prepare('SELECT points FROM users WHERE user_hash = ?').get(userHash);
  if (!user) {
    console.log(`[Points Sync 404] user not found: ${userHash}`);
    return res.status(404).json({ error: 'user not found' });
  }
  const server = user.points || 0;
  const finalPoints = Math.max(server, localPoints);
  if (finalPoints > server) {
    db.prepare('UPDATE users SET points = ? WHERE user_hash = ?').run(finalPoints, userHash);
    console.log(`[Points Sync] ${userHash}: server ${server} → ${finalPoints} (local was ${localPoints})`);
  } else if (finalPoints > localPoints) {
    console.log(`[Points Sync] ${userHash}: local ${localPoints} ← server ${server} (pull down)`);
  } else {
    console.log(`[Points Sync OK] ${userHash}: server=${server} local=${localPoints} (no change)`);
  }
  res.json({ status: 'ok', server, local: localPoints, points: finalPoints });
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ===== CASHWORD DB =====
db.exec(`
  CREATE TABLE IF NOT EXISTS cashword_users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    user_gender TEXT,
    user_birthday TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cashword_promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS cashword_coins (
    user_hash TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cashword_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins_spent INTEGER NOT NULL DEFAULT 10,
    toss_points INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ===== Golden Goose Tables =====
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS gg_promotion_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER DEFAULT 1,
    status TEXT DEFAULT 'granted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS gg_coins (
    user_hash TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS gg_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins_spent INTEGER DEFAULT 10,
    promo_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 일일 접속 기록 (17시 재유도 알림용)
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_access_log (
    user_hash TEXT NOT NULL,
    access_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_hash, access_date)
  )
`);

// 코인 미션 — 미션 클레임 / 미니게임 윈도우 / 크로스프로모
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_coin_mission_claimed (
    user_hash TEXT NOT NULL,
    mission_date TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_hash, mission_date, mission_id)
  );
  CREATE TABLE IF NOT EXISTS gg_minigame_rewards (
    user_hash TEXT NOT NULL,
    game TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    window_start_at DATETIME,
    PRIMARY KEY (user_hash, game)
  );
  CREATE TABLE IF NOT EXISTS gg_cross_promo_claimed (
    user_hash TEXT NOT NULL,
    claim_date TEXT NOT NULL,
    app_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_hash, claim_date, app_id)
  );
`);

// 행운 추첨 테이블
db.exec(`
  CREATE TABLE IF NOT EXISTS gg_lottery_draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_date TEXT NOT NULL UNIQUE,
    tier TEXT,
    prize_pool INTEGER,
    real_tickets INTEGER DEFAULT 0,
    virtual_tickets INTEGER DEFAULT 0,
    total_burned INTEGER DEFAULT 0,
    drawn_at TEXT
  );

  CREATE TABLE IF NOT EXISTS gg_lottery_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_date TEXT NOT NULL,
    user_hash TEXT NOT NULL,
    tickets INTEGER NOT NULL DEFAULT 0,
    ad_tickets INTEGER NOT NULL DEFAULT 0,
    coin_tickets INTEGER NOT NULL DEFAULT 0,
    coins_burned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','+9 hours')),
    UNIQUE(draw_date, user_hash)
  );

  CREATE INDEX IF NOT EXISTS idx_gg_lottery_entries_draw_date ON gg_lottery_entries(draw_date);

  CREATE TABLE IF NOT EXISTS gg_lottery_winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_date TEXT NOT NULL,
    rank INTEGER NOT NULL,
    user_hash TEXT,
    user_name TEXT,
    prize INTEGER NOT NULL,
    is_virtual INTEGER DEFAULT 0,
    claimed INTEGER DEFAULT 0,
    claimed_at TEXT,
    testimonial TEXT,
    placeholder_id INTEGER,
    created_at TEXT DEFAULT (datetime('now','+9 hours'))
  );

  CREATE INDEX IF NOT EXISTS idx_gg_lottery_winners_draw_date ON gg_lottery_winners(draw_date);
  CREATE INDEX IF NOT EXISTS idx_gg_lottery_winners_user_hash ON gg_lottery_winners(user_hash);

  CREATE TABLE IF NOT EXISTS gg_lottery_placeholders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    active INTEGER DEFAULT 1
  );
`);

// Seed placeholder testimonials (only on first boot / new empty table)
const seedPlaceholders = [
  // Brief / reactive
  '어머 진짜 됐어요 ㅎㅎ', '와 신기하네', '깜짝이야 진짜 됐어', '어 진짜요?', '와 됐다',
  '신기하네요', '어머나 세상에', '와 운 좋네', '어머 진짜네', '깜짝 놀랐어요',
  '와 됐네', '어 됐다 ㅎㅎ', '진짜요? 와', '어 진짜 받았어', '와 처음이에요',
  '헐 진짜네', '어머 됐다', '와 신기해요', '깜짝이야', '어 됐네 ㅎㅎ',
  '와 진짜네', '어머 운 좋다', '신기하네요 진짜', '와 됐어요', '어 됐어요',
  '깜짝 놀랐네', '와 됐네요 ㅎ', '어머 정말요?', '진짜 됐다', '와 진짜 운 좋은 날이네',
  // Family mentions
  '딸한테 알려야겠어요', '아들한테 자랑해야지', '손주 용돈으로 쓸게요', '손녀한테 사탕 사줘야겠어', '며느리한테 자랑해야겠다',
  '사위한테 보여줘야지', '남편한테 얘기해야겠어요', '와이프한테 자랑해야지', '어머니한테 알려드려야지', '아버지한테 보여드려야겠어',
  '친정엄마한테 알려야겠어요', '시어머니한테 자랑해야지', '형제들한테 알려야겠어', '언니한테 보여줘야지', '오빠한테 자랑해야겠어요',
  '동생한테 추천해야지', '조카 용돈으로 쓸게요', '손주 간식값은 됐네요', '우리집 강아지 간식 ㅎㅎ', '손녀 학용품 사줘야지',
  '가족 모임에서 자랑해야겠어', '딸한테 보여줘야지', '며느리도 같이 해야겠어요', '사위한테 알려줘야겠어', '손주가 좋아하겠다',
  '손녀가 신나겠어요', '가족 단톡방에 올려야지', '와이프 깜짝 놀라겠다', '남편이 신기해 할거야', '손주 학원비라도',
  '딸이 놀라겠네요', '아들도 같이 해야겠어요', '손녀 동화책 사줘야겠어', '가족들한테 자랑해야지', '손주 떡볶이 사줘야겠어요',
  '우리 손주 신난다', '아버지께 알려드려야지', '어머니 좋아하시겠다', '가족 다 같이 해야겠어요', '딸한테 추천해야겠어요',
  // Daily life
  '점심값 벌었네요', '커피값은 벌었어요', '시장 갈 때 보태야지', '약값에 보탬이 되네요', '반찬값 굳었어요',
  '빵값은 벌었네요', '동네 마트 갈 때 쓸게요', '가스비에 보태야지', '택시비는 벌었어', '빨래값 벌었네 ㅎㅎ',
  '김밥 한 줄 사먹을 수 있겠어', '라면 한 박스는 살 수 있겠다', '우유값은 됐네요', '채소값에 보태야지', '두부값은 벌었어요',
  '아침 커피값', '떡 사먹을 돈 됐네요', '호떡 한 봉지 살 수 있겠어', '음료수값', '동네 카페 갈 수 있겠어요',
  '시장에서 채소 한 묶음', '내일 반찬 거리 사야지', '김치 사야지', '라면 살 거예요', '햄버거 하나 사먹을 수 있겠다',
  '빵집 갈 거예요', '마트 갈 때 쓸게요', '동네 분식집 갈 수 있겠어요', '떡볶이 한 그릇 사먹어야지', '김밥집 갈 거예요',
  '우유 한 팩', '두부랑 콩나물 사야지', '시장 보러 갈 때 보태야겠어요', '약국 갈 때 쓸게요', '우체국 가는 길에 사먹을게요',
  '베이커리 가야지', '분식 사먹을 돈', '군것질 거리 살 수 있겠어', '작은 선물 살 수 있겠어요', '손주 과자 사줘야겠어요',
  // Habit / persistence
  '며칠 들어왔는데 오늘 됐네요', '매일 들어오길 잘했어요', '한참 했는데 드디어 됐어요', '꾸준히 하니 되네요', '오랜만에 들어왔는데 운이 좋네요',
  '며칠째 도전 중이었는데', '한 달째 하는데 처음 됐어요', '매일 잠깐씩 했는데 받았어요', '일주일 만에 됐네요', '매일 빼먹지 않고 했어요',
  '출퇴근길에 잠깐씩 했는데', '자기 전에 한 번씩 들어와요', '식사 후 잠깐 들어와요', '화장실에서 잠깐 ㅎㅎ', '버스에서 했는데 됐네요',
  '지하철 타면서 했어요', '점심시간에 잠깐', '쉬는 시간에 들어와요', '아침마다 한 번씩', '저녁 먹고 잠깐 했어요',
  '잠시 짬내서 했는데', '한 번 시도해봤는데 됐네요', '우연히 시작했어요', '작년부터 하고 있어요', '손주가 알려줘서 시작했어요',
  '친구 권유로 시작했어요', '며느리가 알려줘서 했어요', '우연히 보고 시작했어요', '광고 보고 들어왔어요', '친구 따라 시작했어요',
  // Plans / future
  '다음에도 도전해봐야지', '내일도 빠지지 말아야지', '이번 주 매일 들어와야겠어요', '다음 주도 기대돼요', '내일도 와봐야겠어요',
  '다음 추첨도 노려봐야지', '한 번 더 받아보고 싶어요', '1등도 한번 노려봐야지', '내일도 잊지 말아야겠어', '다음에도 운이 좋길',
  '친구한테 추천해줘야겠어요', '동네 사람들한테 알려야지', '모임에서 얘기해야겠어요', '단톡방에 공유해야지', '카페에서 자랑해야겠어요',
  '다음에 또 만나요 ㅎㅎ', '내일도 출근하듯 할게요', '다음 추첨 기다려져요', '1등 한 번 해보고 싶어요', '다음에 또 도전!',
  '주말에도 빠지지 말아야지', '매일 출근 도장', '한 달에 한 번이라도', '매주 한 번씩이라도', '또 받고 싶어요',
  // Modest gratitude
  '잘 받았습니다', '감사히 잘 쓰겠습니다', '작지만 고맙습니다', '적지만 감사합니다', '잘 쓰겠습니다',
  '감사합니다', '큰 도움이 됩니다', '보탬이 되네요', '정말 감사합니다', '진심으로 감사해요',
  '마음이 따뜻하네요', '좋은 일이 있네요', '행운이네요', '운 좋은 날입니다', '보람있네요',
  '기다린 보람이 있어요', '노력한 보람이 있네요', '작은 행복이에요', '소소한 즐거움', '일상의 작은 기쁨',
  '마음이 풍족해지네요', '기분 전환 됐어요', '즐거운 하루 보낼게요', '좋은 하루 시작이에요', '아침이 즐겁네요',
  '하루가 좋네요', '한 주가 즐겁겠어요', '일주일이 좋아질 것 같아요', '오늘 하루 행복하게', '기분이 좋네요',
  '미소 짓게 되네요', '즐겁게 잘 쓸게요', '알차게 쓸게요', '의미있게 쓸게요', '잘 활용하겠습니다',
];
const phCount = db.prepare('SELECT COUNT(*) as cnt FROM gg_lottery_placeholders').get().cnt;
if (phCount === 0) {
  const insertPh = db.prepare('INSERT INTO gg_lottery_placeholders (text, active) VALUES (?, 1)');
  const insertAll = db.transaction((items) => { for (const t of items) insertPh.run(t); });
  insertAll(seedPlaceholders);
  console.log(`[GG Lottery] Seeded ${seedPlaceholders.length} placeholder testimonials`);
}

// Seed lottery settings defaults (only if not already set)
const lotteryDefaults = [
  ['lottery_tier_bronze_max', '199'],
  ['lottery_tier_silver_max', '799'],
  ['lottery_tier_gold_max', '1999'],
  ['lottery_prize_bronze', '10000'],
  ['lottery_prize_silver', '12000'],
  ['lottery_prize_gold', '14500'],
  ['lottery_prize_platinum', '16000'],
  ['lottery_virtual_floor', '100'],
  ['lottery_virtual_base', '600'],
  ['lottery_ticket_price', '10'],
  ['lottery_max_tickets_per_day', '5'],
  ['lottery_max_ad_tickets_per_day', '1'],
  ['lottery_claim_hours', '24'],
  ['gg_lottery_remind_template_id', ''],
  ['gg_lottery_winner_template_id', ''],
  ['lottery_sim_users_per_interval', '3'],
  ['lottery_sim_tickets_avg', '2'],
  ['lottery_sim_start_hour', '8'],
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of lotteryDefaults) insertSetting.run(k, v);

// ── GG Lottery Helper Functions ──────────────────────────────────────────────

function ggLotterySettings() {
  const get = (k, fallback) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    return row ? Number(row.value) : fallback;
  };
  return {
    tierBronzeMax: get('lottery_tier_bronze_max', 199),
    tierSilverMax: get('lottery_tier_silver_max', 799),
    tierGoldMax: get('lottery_tier_gold_max', 1999),
    prizeBronze: get('lottery_prize_bronze', 10000),
    prizeSilver: get('lottery_prize_silver', 12000),
    prizeGold: get('lottery_prize_gold', 14500),
    prizePlatinum: get('lottery_prize_platinum', 16000),
    virtualFloor: get('lottery_virtual_floor', 100),
    virtualBase: get('lottery_virtual_base', 600),
    ticketPrice: get('lottery_ticket_price', 10),
    maxTickets: get('lottery_max_tickets_per_day', 5),
    maxAdTickets: get('lottery_max_ad_tickets_per_day', 1),
    claimHours: get('lottery_claim_hours', 24),
    simUsersPerInterval: get('lottery_sim_users_per_interval', 3),
    simTicketsAvg: get('lottery_sim_tickets_avg', 2),
    simStartHour: get('lottery_sim_start_hour', 8),
  };
}

function ggLotteryTier(realTickets, s = ggLotterySettings()) {
  if (realTickets <= s.tierBronzeMax) return { tier: 'bronze', prize: s.prizeBronze };
  if (realTickets <= s.tierSilverMax) return { tier: 'silver', prize: s.prizeSilver };
  if (realTickets <= s.tierGoldMax) return { tier: 'gold', prize: s.prizeGold };
  return { tier: 'platinum', prize: s.prizePlatinum };
}

function ggLotteryNextTier(realTickets, s = ggLotterySettings()) {
  if (realTickets <= s.tierBronzeMax) return { nextTierAt: s.tierBronzeMax + 1, nextTierPrize: s.prizeSilver };
  if (realTickets <= s.tierSilverMax) return { nextTierAt: s.tierSilverMax + 1, nextTierPrize: s.prizeGold };
  if (realTickets <= s.tierGoldMax) return { nextTierAt: s.tierGoldMax + 1, nextTierPrize: s.prizePlatinum };
  return { nextTierAt: null, nextTierPrize: null };
}

function ggLotteryVirtualCount(realTickets, s = ggLotterySettings()) {
  return Math.max(s.virtualFloor, s.virtualBase - realTickets);
}

function ggLotteryTodayDate() {
  // KST date in YYYY-MM-DD
  const row = db.prepare("SELECT date(datetime('now','+9 hours')) as d").get();
  return row.d;
}

function ggLotteryEntriesClosed() {
  // 20:00 추첨 후 ~ 24:00 자정까지는 응모 마감 (다음날 00:00부터 새 회차 시작)
  const row = db.prepare("SELECT CAST(strftime('%H', datetime('now','+9 hours')) AS INTEGER) as h").get();
  return row.h >= 20;
}

function ggLotteryMaskName(name) {
  if (!name || name.length === 0) return '익명';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*' + name.slice(2);
}

function ggLotterySimulated(s = ggLotterySettings()) {
  // KST current hour and minute
  const row = db.prepare("SELECT CAST(strftime('%H', datetime('now','+9 hours')) AS INTEGER) as h, CAST(strftime('%M', datetime('now','+9 hours')) AS INTEGER) as m").get();
  const hour = row.h;
  const minute = row.m;
  const DRAW_HOUR = 20; // 20:00 KST fixed
  let minutesElapsed = (hour - s.simStartHour) * 60 + minute;
  if (minutesElapsed < 0) minutesElapsed = 0;
  const maxMinutes = (DRAW_HOUR - s.simStartHour) * 60;
  if (minutesElapsed > maxMinutes) minutesElapsed = maxMinutes;
  const intervals = Math.floor(minutesElapsed / 15);
  const simUsers = intervals * s.simUsersPerInterval;
  const simTickets = simUsers * s.simTicketsAvg;
  return { simUsers, simTickets };
}

// Variant for a specific moment (used by /draw which runs at a known time)
function ggLotterySimulatedAtMax(s = ggLotterySettings()) {
  const DRAW_HOUR = 20;
  const maxMinutes = (DRAW_HOUR - s.simStartHour) * 60;
  const intervals = Math.floor(maxMinutes / 15);
  const simUsers = intervals * s.simUsersPerInterval;
  const simTickets = simUsers * s.simTicketsAvg;
  return { simUsers, simTickets };
}

function ggLotteryPickVirtualName(drawDate) {
  // Sample a masked name from gg_users, excluding today's participants
  const row = db.prepare(`
    SELECT user_name FROM gg_users
    WHERE user_name IS NOT NULL AND user_name != ''
      AND user_hash NOT IN (SELECT user_hash FROM gg_lottery_entries WHERE draw_date = ?)
    ORDER BY RANDOM() LIMIT 1
  `).get(drawDate);
  const name = row?.user_name || '익명';
  return ggLotteryMaskName(name);
}

function ggLotteryPickPlaceholder() {
  const row = db.prepare('SELECT id, text FROM gg_lottery_placeholders WHERE active = 1 ORDER BY RANDOM() LIMIT 1').get();
  return row || { id: null, text: '감사합니다' };
}

// ─────────────────────────────────────────────────────────────────────────────

// GG 프로모션 ID 초기화
db.exec(`
  INSERT OR REPLACE INTO settings (key, value) VALUES ('gg_promo_exchange', '01KJQMQJHX7Y5MAVRVTN0A4VNZ');
  INSERT OR REPLACE INTO settings (key, value) VALUES ('gg_promo_login', '01KJQKQHVSCC3WC4Q7AGFWTWN6');
`);

// === Debug 라우트: exchange catch 에서 클라가 보낸 실패 정보 로깅 ===
// 클라 fetch 실패 환경에서도 추적 가능하도록 sendBeacon + LS 큐 fallback 도 같이 사용.
app.post('/api/score/debug/exchange-fail', (req, res) => {
  const { userHash, error, stack, ua, localPoints, stage, ts } = req.body || {};
  const tsStr = ts ? new Date(ts).toISOString() : 'now';
  console.log(`[Exchange Fail] user=${userHash} stage=${stage} err=${error} localPoints=${localPoints} ts=${tsStr}`);
  if (ua) console.log(`[Exchange Fail UA] user=${userHash} ua=${String(ua).slice(0,150)}`);
  if (stack) console.log(`[Exchange Fail Stack] user=${userHash} stack=${String(stack).slice(0,300)}`);
  res.json({ ok: true });
});

// LS 큐에 누적된 디버그 로그를 다음 진입 시 batch 전송
app.post('/api/score/debug/queue-flush', (req, res) => {
  const queue = Array.isArray(req.body?.queue) ? req.body.queue : [];
  for (const q of queue) {
    const tsStr = q?.ts ? new Date(q.ts).toISOString() : 'now';
    console.log(`[Exchange Fail QUEUE] user=${q?.userHash} stage=${q?.stage} err=${q?.error} localPoints=${q?.localPoints} ts=${tsStr}`);
  }
  res.json({ ok: true, count: queue.length });
});

app.post('/api/score/promo/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) {
    console.log(`[Exchange REJECT 400] userHash empty`);
    return res.status(400).json({ error: 'userHash required' });
  }

  // 서버 잔액 확인
  const user = db.prepare('SELECT points FROM users WHERE user_hash = ?').get(userHash);
  if (!user) {
    console.log(`[Exchange REJECT 404] user not found: ${userHash}`);
    return res.status(404).json({ error: 'user not found' });
  }
  const serverPoints = user.points || 0;
  if (serverPoints < 100) {
    console.log(`[Exchange REJECT 400] insufficient_points: user=${userHash} server=${serverPoints}`);
    return res.status(400).json({ error: 'insufficient_points', points: serverPoints });
  }

  // 최근 10초 내 동일 유저 교환 요청 방지 (동시성)
  const recent = db.prepare(
    "SELECT * FROM point_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds')"
  ).get(userHash);
  if (recent) {
    console.log(`[Exchange REJECT 429] too_fast: user=${userHash}`);
    return res.status(429).json({ error: 'too_fast', message: '잠시 후 다시 시도해주세요' });
  }

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
  const ukShort = String(userKey).slice(0, 12);
  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };
  try {
    const keyRes = await (await tossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    if (keyRes.resultType !== 'SUCCESS') {
      console.log(`[Toss promo FAIL get-key] code=${promotionCode} amount=${amount} user=${ukShort} err=${keyRes?.error?.errorCode || 'unknown'} reason=${keyRes?.error?.reason || ''}`);
      return res.json({ error: keyRes });
    }
    const key = keyRes.success.key;
    const execRes = await (await tossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key, amount })
    })).json();
    if (execRes.resultType !== 'SUCCESS') {
      console.log(`[Toss promo FAIL exec] code=${promotionCode} amount=${amount} user=${ukShort} err=${execRes?.error?.errorCode || 'unknown'} reason=${execRes?.error?.reason || ''}`);
      return res.json({ error: execRes });
    }
    console.log(`[Toss promo OK] code=${promotionCode} amount=${amount} user=${ukShort}`);
    res.json({ key: execRes.success.key });
  } catch (e) {
    console.error('[Toss promo] exception:', String(e), 'code=', promotionCode, 'user=', ukShort);
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

  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').run(key, value);

  // 메모리 캐시 갱신
  if (key === 'daily_notify_template') dailyNotifyTemplate = value;
  if (key === 'cashword_daily_notify_template') cashwordDailyNotifyTemplate = value;
  if (key === 'gg_lottery_notify_template') ggLotteryNotifyTemplate = value;
  if (key === 'gg_reengage_notify_template') ggReengageNotifyTemplate = value;
  if (key === 'gg_morning_notify_template') ggMorningNotifyTemplate = value;
  if (key === 'gg_afternoon_notify_template') ggAfternoonNotifyTemplate = value;
  if (key === 'gg_exp_schedule_active') ggExpScheduleActive = value === '1';
  if (key === 'gg_lottery_remind_template_id') ggLotteryRemindTemplateId = value || null;
  if (key === 'gg_lottery_winner_template_id') ggLotteryWinnerTemplateId = value || null;

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
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, user_gender=excluded.user_gender,
        user_birthday=excluded.user_birthday, updated_at=CURRENT_TIMESTAMP
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

// GET /api/cashword/promo-config — 프로모션 코드 동적 설정 (settings 테이블 기반)
app.get('/api/cashword/promo-config', (req, res) => {
  const get = (key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null;
  res.json({
    tossLogin: get('cashword_promo_toss_login'),
    firstQuestion: get('cashword_promo_first_question'),
    exchange: get('cashword_promo_exchange'),
    points: get('cashword_promo_points'),
  });
});

// POST /api/cashword/promo/grant — Toss 프로모션 지급 (CashWord mTLS)
app.post('/api/cashword/promo/grant', async (req, res) => {
  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || amount == null) return res.status(400).json({ error: 'missing params' });
  const BASE = `${TOSS_API}/api-partner/v1/apps-in-toss/promotion`;
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': String(userKey) };
  console.log(`[CashWord Promo] userKey=${userKey} code=${promotionCode} amount=${amount}`);
  try {
    const keyRes = await (await cashwordTossFetch(`${BASE}/execute-promotion/get-key`, { method: 'POST', headers })).json();
    if (keyRes.resultType !== 'SUCCESS') {
      console.log(`[CashWord Promo] userKey=${userKey} get-key FAIL:`, JSON.stringify(keyRes));
      return res.json({ error: keyRes });
    }
    const key = keyRes.success.key;
    const execRes = await (await cashwordTossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key, amount })
    })).json();
    if (execRes.resultType !== 'SUCCESS') {
      console.log(`[CashWord Promo] userKey=${userKey} execute FAIL:`, JSON.stringify(execRes));
      return res.json({ error: execRes });
    }
    console.log(`[CashWord Promo] userKey=${userKey} SUCCESS`);
    res.json(execRes.success);
  } catch (e) {
    console.error('[CashWord Promo Error]', e);
    res.status(500).json({ error: 'promo_grant_failed', detail: e.message });
  }
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
  // anti-cheat: 1~3 범위만 허용
  const safeAmount = Math.max(1, Math.min(3, parseInt(amount) || 1));
  db.prepare(`
    INSERT INTO cashword_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.total_earned,
      updated_at = CURRENT_TIMESTAMP
  `).run(userHash, safeAmount, safeAmount);
  const row = db.prepare('SELECT coins, total_earned FROM cashword_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins: row.coins, totalEarned: row.total_earned });
});

// POST /api/cashword/exchange — N×10코인 차감 + 교환 ID 발급 (count 파라미터로 묶음 교환 지원)
app.post('/api/cashword/exchange', (req, res) => {
  const { userHash, count } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });

  const row = db.prepare('SELECT coins FROM cashword_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < 10) {
    return res.status(400).json({ error: 'insufficient_coins', coins: row?.coins || 0 });
  }

  const maxCount = Math.floor(row.coins / 10);
  const safeCount = Math.max(1, Math.min(maxCount, parseInt(count) || 1));
  const coinsSpent = safeCount * 10;
  const tossPoints = safeCount * 1;

  // 동시성: 10초 내 중복 교환 차단
  const recent = db.prepare(
    "SELECT id FROM cashword_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds') AND status = 'pending'"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast' });

  const promoId = db.prepare('SELECT value FROM settings WHERE key = ?').get('cashword_promo_exchange')?.value || null;

  const doExchange = db.transaction(() => {
    db.prepare('UPDATE cashword_coins SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_hash = ?').run(coinsSpent, userHash);
    return db.prepare(
      'INSERT INTO cashword_exchanges (user_hash, coins_spent, toss_points, status) VALUES (?, ?, ?, ?)'
    ).run(userHash, coinsSpent, tossPoints, 'pending');
  });
  const result = doExchange();
  res.json({ exchangeId: result.lastInsertRowid, coinsSpent, tossPoints, promoId });
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

// POST /api/cashword/exchange/:id/restore — SDK 실패 시 코인 복원 (실제 차감액 기준)
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
// A/B 실험 2 (황금알 15+15 split) 전용 템플릿 — split arm만 사용
let ggMorningNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_morning_notify_template')?.value ?? null;
let ggAfternoonNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_afternoon_notify_template')?.value ?? null;
// 실험 활성화 플래그 — off 상태일 때는 split 템플릿이 DB에 있어도 발송 안 함 (클라-서버 동기화 유지)
let ggExpScheduleActive = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_exp_schedule_active')?.value === '1';
let ggLotteryRemindTemplateId = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_lottery_remind_template_id')?.value ?? null;
let ggLotteryWinnerTemplateId = db.prepare('SELECT value FROM settings WHERE key = ?').get('gg_lottery_winner_template_id')?.value ?? null;

// 클라이언트와 동일한 해시 버킷 (hash 40-79 = split variant)
function _scheduleHashBucket(str) {
  let h = 5381;
  const s = String(str || 'anon');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}
function _isSplitVariant(userHash) {
  const b = _scheduleHashBucket(userHash);
  return b >= 40 && b < 80;
}

// 전체 거위 유저에게 복권 충전 알림 bulk 발송 (매일 09:00 KST)
async function sendGoldenGooseLotteryNotification() {
  if (!ggLotteryNotifyTemplate) {
    console.log('[GG LotteryNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const users = db.prepare(
    "SELECT user_hash FROM gg_coins WHERE CAST(user_hash AS INTEGER) > 0"
  ).all();
  if (users.length === 0) {
    console.log('[GG LotteryNotify] 발송 대상 유저 없음');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (const user of users) {
    // split variant + 실험 활성 + 템플릿 설정됨 → morning 발송, 아니면 기존 lottery
    const template = (ggExpScheduleActive && _isSplitVariant(user.user_hash) && ggMorningNotifyTemplate)
      ? ggMorningNotifyTemplate
      : ggLotteryNotifyTemplate;
    try {
      const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-toss-user-key': user.user_hash },
        body: JSON.stringify({ templateSetCode: template, context: {} }),
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess++;
      } else {
        totalFail++;
      }
    } catch (e) {
      totalFail++;
    }
  }

  console.log(`[GG LotteryNotify] 완료 — 대상: ${users.length}명, 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// 오늘 미접속 거위 유저에게 재유도 알림 발송 (매일 17:00 KST)
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

  for (const user of users) {
    // split variant + 실험 활성 + 템플릿 설정됨 → afternoon 발송, 아니면 기존 reengage
    const template = (ggExpScheduleActive && _isSplitVariant(user.user_hash) && ggAfternoonNotifyTemplate)
      ? ggAfternoonNotifyTemplate
      : ggReengageNotifyTemplate;
    try {
      const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-toss-user-key': user.user_hash },
        body: JSON.stringify({ templateSetCode: template, context: {} }),
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess++;
      } else {
        totalFail++;
      }
    } catch (e) {
      totalFail++;
    }
  }

  console.log(`[GG ReengageNotify] 완료 — 대상: ${users.length}명 (미접속), 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

// 매일 KST 09:00 복권 충전 알림 (전체 유저)
cron.schedule('13 9 * * *', sendGoldenGooseLotteryNotification, { timezone: 'Asia/Seoul' });
// 매일 KST 17:00 미접속 유저 재유도 알림
cron.schedule('0 17 * * *', sendGoldenGooseReengageNotification, { timezone: 'Asia/Seoul' });

// POST /api/golden-goose/toss/login — 인가코드 → 토큰 → 유저정보 조회+저장 (GG mTLS)
app.post('/api/golden-goose/toss/login', async (req, res) => {
  try {
    const { authorizationCode, referrer } = req.body;
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
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name=excluded.user_name, updated_at=CURRENT_TIMESTAMP
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

// GET /api/golden-goose/coins/:userHash — 금화 잔액 조회
app.get('/api/golden-goose/coins/:userHash', (req, res) => {
  const { userHash } = req.params;
  const row = db.prepare('SELECT coins, total_earned, milestone_eggs FROM gg_coins WHERE user_hash = ?').get(userHash);
  const exchangeRow = db.prepare("SELECT COALESCE(SUM(coins_spent), 0) / 12 as total_points FROM gg_exchanges WHERE user_hash = ? AND status = 'confirmed'").get(userHash);
  const shareCoins = parseInt(db.prepare("SELECT value FROM settings WHERE key = 'gg_share_coins'").get()?.value) || 10;
  const shareModuleId = db.prepare("SELECT value FROM settings WHERE key = 'gg_share_module_id'").get()?.value || null;
  const shareCount = db.prepare("SELECT COUNT(*) as cnt FROM gg_events WHERE user_hash = ? AND event = 'share_complete'").get(userHash)?.cnt || 0;
  const MILESTONE_POINTS = { 20:1, 50:5, 100:10, 200:20, 500:50, 1000:100, 2000:100, 3000:100, 5000:200, 8000:300, 10000:500, 15000:700, 20000:1000 };
  const msRows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gg_milestone_%' AND value != ''").all();
  const milestones = msRows.map(r => { const eggs = parseInt(r.key.replace('gg_milestone_', '')); return { eggs, points: MILESTONE_POINTS[eggs] || 0, promo: r.value }; }).filter(m => m.points > 0).sort((a, b) => a.eggs - b.eggs);
  const noticeId = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_id'").get()?.value || '';
  const noticeTitle = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_title'").get()?.value || '';
  const noticeBody = db.prepare("SELECT value FROM settings WHERE key = 'gg_notice_body'").get()?.value || '';
  const notice = noticeId ? { id: noticeId, title: noticeTitle, body: noticeBody } : null;
  const referralEnabled = db.prepare("SELECT value FROM settings WHERE key = 'gg_referral_enabled'").get()?.value === '1';
  res.json({ coins: row?.coins ?? 0, totalEarned: row?.total_earned ?? 0, totalExchangedPoints: exchangeRow?.total_points ?? 0, milestoneEggs: row?.milestone_eggs ?? 0, milestones, notice, shareCoins, shareModuleId, shareCount, referralEnabled });
});

// POST /api/golden-goose/reward — 광고 완료 후 금화 지급 (서버에서 확률 추첨)
app.post('/api/golden-goose/reward', (req, res) => {
  const { userHash, fixedCoins, reason } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  if (reason === 'share') {
    const sc = db.prepare("SELECT COUNT(*) as cnt FROM gg_events WHERE user_hash = ? AND event = 'share_complete'").get(userHash)?.cnt || 0;
    if (sc >= 30) return res.json({ coins: 0, totalCoins: db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash)?.coins ?? 0, shareLimited: true });
  }

  const todayCount = db.prepare(`SELECT COUNT(*) as cnt FROM gg_reward_log WHERE user_hash = ? AND created_at >= datetime(date('now'), '+9 hours')`).get(userHash)?.cnt || 0;
  const totalEarnedVal = db.prepare('SELECT total_earned FROM gg_coins WHERE user_hash = ?').get(userHash)?.total_earned || 0;
  const lifetimeCount = db.prepare(`SELECT COUNT(*) as cnt FROM gg_reward_log WHERE user_hash = ? AND (reason IS NULL OR reason = 'reward')`).get(userHash)?.cnt || 0;
  const isNewUser = totalEarnedVal < 100;
  const first5Max = isNewUser ? (db.prepare(`SELECT MAX(coins) as mx FROM gg_reward_log WHERE user_hash = ? AND (reason IS NULL OR reason = 'reward')`).get(userHash)?.mx || 0) : 999;
  const todayEggCoins = db.prepare(`SELECT COALESCE(SUM(coins), 0) as total FROM gg_reward_log WHERE user_hash = ? AND created_at >= datetime(date('now'), '+9 hours') AND (reason IS NULL OR reason = 'reward')`).get(userHash)?.total || 0;
  const dailyCap = isNewUser ? 180 : 160;
  const remaining = Math.max(0, dailyCap - todayEggCoins);
  const todayMax = db.prepare(`SELECT MAX(coins) as mx FROM gg_reward_log WHERE user_hash = ? AND created_at >= datetime(date('now'), '+9 hours') AND (reason IS NULL OR reason = 'reward')`).get(userHash)?.mx || 0;

  // ===== split variant 감지 + 현재 window의 count/max 쿼리 =====
  const userIsSplit = ggExpScheduleActive && (() => { const b = _scheduleHashBucket(userHash); return b >= 40 && b < 80; })();
  const kstHour = new Date(Date.now() + 9 * 3600000).getUTCHours();
  const currentWindow = kstHour < 15 ? 'morning' : 'afternoon';
  let windowCount = 0, windowMax = 0;
  if (userIsSplit) {
    // 오전: today KST 00:00 ~ 15:00 / 오후: today KST 15:00 ~ 24:00
    const boundSql = currentWindow === 'morning'
      ? [`datetime('now', '+9 hours', 'start of day', '-9 hours')`, `datetime('now', '+9 hours', 'start of day', '-9 hours', '+15 hours')`]
      : [`datetime('now', '+9 hours', 'start of day', '-9 hours', '+15 hours')`, `datetime('now', '+9 hours', 'start of day', '-9 hours', '+24 hours')`];
    const wRow = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(MAX(coins), 0) as mx FROM gg_reward_log WHERE user_hash = ? AND created_at >= ${boundSql[0]} AND created_at < ${boundSql[1]} AND (reason IS NULL OR reason = 'reward')`).get(userHash);
    windowCount = wRow?.cnt || 0;
    windowMax = wRow?.mx || 0;
  }

  let coins;
  if (fixedCoins && Number.isInteger(fixedCoins) && fixedCoins >= 1 && fixedCoins <= 100) {
    coins = fixedCoins;
  } else if (isNewUser && lifetimeCount >= 3 && lifetimeCount < 5 && first5Max < 30) {
    // 신규 유저 초기 보상 teaser (유지)
    coins = Math.floor(Math.random() * 8) + 28;
  } else if (userIsSplit && windowCount >= 10 && windowCount < 15 && windowMax < 15 && remaining >= 15) {
    // split: 오전/오후 window의 10~14번째 탭에서 windowMax<15 시 → 15~30 보장
    coins = Math.floor(Math.random() * 16) + 15;
  } else if (!userIsSplit && todayCount >= 15 && todayCount < 20 && todayMax < 20 && remaining >= 20) {
    // at_once: 16~19번째 탭에서 todayMax<20 시 → 20~40 보장 (기존 20~50에서 축소)
    coins = Math.floor(Math.random() * Math.min(21, remaining - 19)) + 20;
  } else {
    const rand = Math.random();
    if (todayCount >= 20) {
      if (rand < 0.40) coins = 2; else if (rand < 0.70) coins = 3; else if (rand < 0.90) coins = 4; else coins = 5;
    } else if (todayCount >= 15) {
      const avgRemaining = remaining / (20 - todayCount + 1);
      if (avgRemaining <= 3) { coins = Math.floor(Math.random() * 2) + 2; }
      else if (avgRemaining <= 6) { if (rand < 0.60) coins = Math.floor(Math.random() * 3) + 2; else coins = Math.floor(Math.random() * 3) + 4; }
      else { if (rand < 0.50) coins = Math.floor(Math.random() * 3) + 2; else if (rand < 0.89) coins = Math.floor(Math.random() * 4) + 4; else if (rand < 0.985) coins = Math.floor(Math.random() * 12) + 9; else coins = Math.floor(Math.random() * 19) + 22; }
    } else {
      // 1~14번째 기본 분포 (Option B 적용: 전체 구간 축소)
      if (rand < 0.60) coins = Math.floor(Math.random() * 3) + 2;                    // 2~4
      else if (rand < 0.90) coins = Math.floor(Math.pow(Math.random(), 3) * 4) + 4;    // 4~7 (5~9→)
      else if (rand < 0.985) coins = Math.floor(Math.pow(Math.random(), 3.67) * 12) + 9; // 9~20 (11~25→)
      else coins = Math.floor(Math.pow(Math.random(), 5) * 19) + 22;                   // 22~40 (26~50→)
    }
    coins = Math.max(1, Math.min(coins, remaining));
  }

  db.prepare(`INSERT INTO gg_coins (user_hash, coins, total_earned, milestone_eggs) VALUES (?, ?, ?, 1) ON CONFLICT(user_hash) DO UPDATE SET coins = coins + excluded.coins, total_earned = total_earned + excluded.coins, milestone_eggs = milestone_eggs + 1, updated_at = (datetime('now','+9 hours'))`).run(userHash, coins, coins);
  // Stale 클라이언트가 reason 없이 fixedCoins만 보내면 미션 카운트(reward)에서 제외하기 위해
  // 'fixed_unknown'으로 기록. (egg-hatch 경로는 fixedCoins/reason 둘 다 없어서 'reward' 유지)
  const finalReason = reason || (fixedCoins ? 'fixed_unknown' : 'reward');
  db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, coins, finalReason);
  const updated = db.prepare('SELECT coins, total_earned, milestone_eggs FROM gg_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins, totalCoins: updated.coins, totalEarned: updated.total_earned, milestoneEggs: updated.milestone_eggs ?? 0 });
});

// POST /api/golden-goose/lottery — 복권 금화 지급 (서버에서 추첨)
app.post('/api/golden-goose/lottery', (req, res) => {
  const { userHash, type } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  let coins;
  if (type === 'premium') {
    // 꽝없는 복권 (3장/일): 80% → 8~18 / 17% → 18~40 / 2.95% → 50~80 / 0.035% → 1000 / 0.015% → 10000
    // 2026-04-24 EV 하향 (18.55 → 16.26 코인/회): 비용 약 -12% 목표
    const r = Math.random();
    if (r < 0.80)         coins = Math.floor(Math.pow(Math.random(), 2.33) * 11) + 8;
    else if (r < 0.97)    coins = Math.floor(Math.pow(Math.random(), 5) * 23) + 18;
    else if (r < 0.9995)  coins = Math.floor(Math.pow(Math.random(), 4) * 31) + 50;
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

  db.prepare(`
    INSERT INTO gg_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.coins,
      updated_at = CURRENT_TIMESTAMP
  `).run(userHash, coins, coins);

  db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, coins, `lottery_${type}`);
  const updated = db.prepare('SELECT coins, total_earned FROM gg_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins, bust: false, totalCoins: updated.coins, totalEarned: updated.total_earned });
});

// POST /api/golden-goose/exchange — 금화 12단위 일괄 차감 + 교환 ID 발급
// PROMO_COIN_EXCHANGE만 사용 (최대 1,000원 지급 가능)
app.post('/api/golden-goose/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  const row = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < 12) return res.json({ error: 'insufficient_coins' });

  const coinCount = Math.floor(row.coins / 12) * 12;
  const points = coinCount / 12;

  const promoCfg = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_exchange'").get();
  const promoId = promoCfg?.value || 'GOLDEN_GOOSE_EXCHANGE_PROMO';

  const tx = db.transaction(() => {
    db.prepare('UPDATE gg_coins SET coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE user_hash = ?').run(coinCount, userHash);
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
    db.prepare('UPDATE gg_coins SET coins = coins + ?, updated_at = CURRENT_TIMESTAMP WHERE user_hash = ?').run(exchange.coins_spent, exchange.user_hash);
    db.prepare("UPDATE gg_exchanges SET status = 'restored' WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

// GET /api/golden-goose/promo-config?userHash=xxx
app.get('/api/golden-goose/promo-config', (req, res) => {
  const userHash = String(req.query.userHash || '');
  const exchange = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_exchange'").get();
  const login = db.prepare("SELECT value FROM settings WHERE key = 'gg_promo_login'").get();
  // A/B 실험 활성화 플래그 (DB value === '1'일 때만 활성)
  const expAd = db.prepare("SELECT value FROM settings WHERE key = 'gg_exp_ad_active'").get();
  const expSchedule = db.prepare("SELECT value FROM settings WHERE key = 'gg_exp_schedule_active'").get();
  // 테스트 유저 리스트 (comma-separated userHashes)
  const testUsersRaw = db.prepare("SELECT value FROM settings WHERE key = 'gg_exp_test_users'").get()?.value || '';
  const testUsers = testUsersRaw.split(',').map(s => s.trim()).filter(Boolean);
  const isTestUser = userHash && testUsers.includes(userHash);
  // 퍼널 실험 variant 목록 (DB에서 관리, 기본값 v2,v3)
  const funnelVariantsRaw = db.prepare("SELECT value FROM settings WHERE key = 'gg_funnel_variants'").get()?.value || 'v2,v3';
  const funnelVariants = funnelVariantsRaw.split(',').map(s => s.trim()).filter(Boolean);
  res.json({
    exchange: exchange?.value || '01KJQMQJHX7Y5MAVRVTN0A4VNZ',
    login: login?.value || '01KJQKQHVSCC3WC4Q7AGFWTWN6',
    exp_ad_active: isTestUser || expAd?.value === '1',
    exp_schedule_active: isTestUser || expSchedule?.value === '1',
    // 테스트 유저는 treatment arm으로 강제 배정
    force_ad_arm: isTestUser ? 'variant' : null,
    force_schedule_arm: isTestUser ? 'split' : null,
    funnel_variants: funnelVariants,
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
      updated_at = CURRENT_TIMESTAMP
  `).run(userHash, addAmount, addAmount);
  const row = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
  console.log(`[GG Debug] Added ${addAmount} coins for ${userHash}, total: ${row?.coins}`);
  res.json({ ok: true, totalCoins: row?.coins ?? addAmount });
});

// ===== GOLDEN-GOOSE COIN MISSION API =====
// 오늘의 미션 (오전/오후 황금알) + 미니게임 (3시간당 3판) + 다른 미니앱 써보기

// 모든 가능한 미션 정의. A/B variant에 따라 노출되는 리스트가 달라짐:
//   - split variant (hash 40-79): morning_eggs + afternoon_eggs
//   - at_once variant (나머지, 또는 실험 비활성화): daily_eggs 단일
const GG_COIN_MISSIONS_ALL = {
  morning_eggs:   { id: 'morning_eggs',   label: '오전 황금알 모두 낳기', target: 15, rewardCoins: 10, rewardLabel: '10코인' },
  afternoon_eggs: { id: 'afternoon_eggs', label: '오후 황금알 모두 낳기', target: 15, rewardCoins: 10, rewardLabel: '10코인' },
  daily_eggs:     { id: 'daily_eggs',     label: '황금알 20개 다 열기',   target: 20, rewardCoins: 20, rewardLabel: '20코인' },
};

function _ggGetUserMissionIds(userHash) {
  // 실험 비활성화 시 at_once, 활성화 시 hash-bucket으로 판정
  const isSplit = ggExpScheduleActive && (() => { const b = _scheduleHashBucket(userHash); return b >= 40 && b < 80; })();
  return isSplit ? ['morning_eggs', 'afternoon_eggs'] : ['daily_eggs'];
}
const GG_MINIGAME_GAMES = ['memory', 'oddone', 'numtouch', 'compare'];
const GG_MINIGAME_WINDOW_HOURS = 3;
const GG_MINIGAME_WINDOW_LIMIT = 3;
const GG_MINIGAME_REWARD_NORMAL = 5;
const GG_MINIGAME_REWARD_X2 = 10;
const GG_CROSS_PROMO_APPS = ['moneyfarm', 'brainexercise', 'hwatu', 'watercat'];
const GG_CROSS_PROMO_REWARD = 5;

function _ggTodayKst() {
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

function _ggGetMissionProgress(userHash, missionId) {
  // gg_reward_log.created_at 은 KST로 저장됨 (DEFAULT datetime('now','+9 hours'))
  // → 각 윈도우 바운드는 KST 기준 직접 산출
  const bounds = missionId === 'morning_eggs'
    ? [`datetime('now', '+9 hours', 'start of day')`, `datetime('now', '+9 hours', 'start of day', '+15 hours')`]
    : missionId === 'afternoon_eggs'
      ? [`datetime('now', '+9 hours', 'start of day', '+15 hours')`, `datetime('now', '+9 hours', 'start of day', '+1 day')`]
      : missionId === 'daily_eggs'
        ? [`datetime('now', '+9 hours', 'start of day')`, `datetime('now', '+9 hours', 'start of day', '+1 day')`]
        : null;
  if (!bounds) return 0;
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM gg_reward_log WHERE user_hash = ? AND created_at >= ${bounds[0]} AND created_at < ${bounds[1]} AND (reason IS NULL OR reason = 'reward')`).get(userHash);
  return row?.cnt || 0;
}

function _ggReadMinigameWindow(userHash, game) {
  const row = db.prepare('SELECT count, window_start_at FROM gg_minigame_rewards WHERE user_hash = ? AND game = ?').get(userHash, game);
  if (!row || !row.window_start_at) return { count: 0, expired: true, resetAt: null };
  const startMs = new Date(row.window_start_at + 'Z').getTime();
  const windowMs = GG_MINIGAME_WINDOW_HOURS * 3600 * 1000;
  const expired = Date.now() - startMs >= windowMs;
  return {
    count: expired ? 0 : row.count,
    expired,
    resetAt: expired ? null : startMs + windowMs,
  };
}

// GET /api/golden-goose/coin-mission/:userHash — 통합 상태
app.get('/api/golden-goose/coin-mission/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });

  const today = _ggTodayKst();

  const claimedRows = db.prepare('SELECT mission_id FROM gg_coin_mission_claimed WHERE user_hash = ? AND mission_date = ?').all(userHash, today);
  const claimedSet = new Set(claimedRows.map(r => r.mission_id));

  const missionIds = _ggGetUserMissionIds(userHash);
  const missions = missionIds.map(id => {
    const def = GG_COIN_MISSIONS_ALL[id];
    return {
      id: def.id,
      label: def.label,
      target: def.target,
      rewardLabel: def.rewardLabel,
      progress: _ggGetMissionProgress(userHash, id),
      claimed: claimedSet.has(id),
    };
  });

  const minigameLimits = {};
  for (const g of GG_MINIGAME_GAMES) {
    const w = _ggReadMinigameWindow(userHash, g);
    minigameLimits[g] = { count: w.count, max: GG_MINIGAME_WINDOW_LIMIT, resetAt: w.resetAt };
  }

  const crossPromoRows = db.prepare('SELECT app_id FROM gg_cross_promo_claimed WHERE user_hash = ? AND claim_date = ?').all(userHash, today);
  const crossPromoClaimed = crossPromoRows.map(r => r.app_id);

  res.json({ missions, minigameLimits, crossPromoClaimed });
});

// POST /api/golden-goose/coin-mission/claim — 미션 보상 (오전/오후 황금알)
app.post('/api/golden-goose/coin-mission/claim', (req, res) => {
  const { userHash, missionId } = req.body || {};
  if (!userHash || !missionId) return res.status(400).json({ error: 'missing_params' });

  const allowedIds = _ggGetUserMissionIds(userHash);
  if (!allowedIds.includes(missionId)) return res.status(400).json({ error: 'invalid_mission' });
  const mission = GG_COIN_MISSIONS_ALL[missionId];
  if (!mission) return res.status(400).json({ error: 'invalid_mission' });

  const today = _ggTodayKst();
  const already = db.prepare('SELECT 1 FROM gg_coin_mission_claimed WHERE user_hash = ? AND mission_date = ? AND mission_id = ?').get(userHash, today, missionId);
  if (already) return res.status(400).json({ error: 'already_claimed' });

  const progress = _ggGetMissionProgress(userHash, missionId);
  if (progress < mission.target) return res.status(400).json({ error: 'not_completed', progress, target: mission.target });

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO gg_coin_mission_claimed (user_hash, mission_date, mission_id) VALUES (?, ?, ?)').run(userHash, today, missionId);
    db.prepare(`
      INSERT INTO gg_coins (user_hash, coins, total_earned)
      VALUES (?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        coins = coins + excluded.coins,
        total_earned = total_earned + excluded.coins,
        updated_at = CURRENT_TIMESTAMP
    `).run(userHash, mission.rewardCoins, mission.rewardCoins);
    db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, mission.rewardCoins, `coin_mission_${missionId}`);
  });
  tx();

  const total = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash)?.coins ?? 0;
  res.json({ status: 'ok', reward: { type: 'coin', amount: mission.rewardCoins }, totalCoins: total });
});

// POST /api/golden-goose/coin-mission/minigame — 미니게임 완료 (노멀 5 / 어려움 10)
app.post('/api/golden-goose/coin-mission/minigame', (req, res) => {
  const { userHash, game, variant } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'missing_userHash' });
  if (!game || !GG_MINIGAME_GAMES.includes(game)) return res.status(400).json({ error: 'invalid_game' });

  const w = _ggReadMinigameWindow(userHash, game);
  if (!w.expired && w.count >= GG_MINIGAME_WINDOW_LIMIT) {
    return res.json({ status: 'ok', cooldown: true, reward: null, limit: { count: w.count, max: GG_MINIGAME_WINDOW_LIMIT, resetAt: w.resetAt } });
  }

  const reward = variant === 'x2' ? GG_MINIGAME_REWARD_X2 : GG_MINIGAME_REWARD_NORMAL;

  const tx = db.transaction(() => {
    if (w.expired) {
      db.prepare(`
        INSERT INTO gg_minigame_rewards (user_hash, game, count, window_start_at)
        VALUES (?, ?, 1, datetime('now'))
        ON CONFLICT(user_hash, game) DO UPDATE SET count = 1, window_start_at = datetime('now')
      `).run(userHash, game);
    } else {
      db.prepare('UPDATE gg_minigame_rewards SET count = count + 1 WHERE user_hash = ? AND game = ?').run(userHash, game);
    }
    db.prepare(`
      INSERT INTO gg_coins (user_hash, coins, total_earned)
      VALUES (?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        coins = coins + excluded.coins,
        total_earned = total_earned + excluded.coins,
        updated_at = CURRENT_TIMESTAMP
    `).run(userHash, reward, reward);
    db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, reward, `minigame_${game}_${variant || 'normal'}`);
  });
  tx();

  const newW = _ggReadMinigameWindow(userHash, game);
  const total = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash)?.coins ?? 0;
  res.json({
    status: 'ok',
    reward: { type: 'coin', amount: reward },
    limit: { count: newW.count, max: GG_MINIGAME_WINDOW_LIMIT, resetAt: newW.resetAt },
    totalCoins: total,
  });
});

// POST /api/golden-goose/coin-mission/cross-promo — 미니앱 방문 보상 (앱당 하루 1회 5코인)
app.post('/api/golden-goose/coin-mission/cross-promo', (req, res) => {
  const { userHash, appId } = req.body || {};
  if (!userHash || !appId) return res.status(400).json({ error: 'missing_params' });
  if (!GG_CROSS_PROMO_APPS.includes(appId)) return res.status(400).json({ error: 'invalid_app' });

  const today = _ggTodayKst();
  const already = db.prepare('SELECT 1 FROM gg_cross_promo_claimed WHERE user_hash = ? AND claim_date = ? AND app_id = ?').get(userHash, today, appId);
  if (already) return res.status(400).json({ error: 'already_claimed' });

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO gg_cross_promo_claimed (user_hash, claim_date, app_id) VALUES (?, ?, ?)').run(userHash, today, appId);
    db.prepare(`
      INSERT INTO gg_coins (user_hash, coins, total_earned)
      VALUES (?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        coins = coins + excluded.coins,
        total_earned = total_earned + excluded.coins,
        updated_at = CURRENT_TIMESTAMP
    `).run(userHash, GG_CROSS_PROMO_REWARD, GG_CROSS_PROMO_REWARD);
    db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, GG_CROSS_PROMO_REWARD, `cross_promo_${appId}`);
  });
  tx();

  const total = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash)?.coins ?? 0;
  res.json({ status: 'ok', reward: { type: 'coin', amount: GG_CROSS_PROMO_REWARD }, totalCoins: total });
});

// ===== SLEEP-MONEY API =====

// ===== GOLDEN-GOOSE REFERRAL API =====

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
  } catch (err) { console.error('[GG Referral] code error:', err); res.status(500).json({ error: '서버 오류' }); }
});

app.post('/api/golden-goose/referral/register', (req, res) => {
  const { referrerCode, referredHash, referredName } = req.body || {};
  if (!referrerCode || !referredHash) return res.status(400).json({ error: 'referrerCode, referredHash 필요' });
  try {
    const registerReferral = db.transaction(() => {
      const codeRow = db.prepare('SELECT user_hash FROM gg_referral_codes WHERE code = ?').get(referrerCode);
      if (!codeRow) return { error: '유효하지 않은 추천 코드' };
      const referrerHash = codeRow.user_hash;
      // 테스트 계정은 self-referral 허용 (레퍼럴 플로우 검증용)
      const TEST_SELF_REFERRAL_HASH = '346663790';
      if (referrerHash === referredHash && referredHash !== TEST_SELF_REFERRAL_HASH) return { error: '자기 자신은 추천할 수 없습니다' };
      const existing = db.prepare('SELECT 1 FROM gg_referrals WHERE referred_hash = ?').get(referredHash);
      if (existing) return { ok: true, message: '이미 등록됨' };
      const count = db.prepare('SELECT COUNT(*) as cnt FROM gg_referrals WHERE referrer_hash = ?').get(referrerHash);
      if (count.cnt >= 300) return { error: '추천 상한 초과' };
      db.prepare('INSERT INTO gg_referrals (referrer_hash, referred_hash, referred_name, referral_code) VALUES (?, ?, ?, ?)').run(referrerHash, referredHash, referredName || null, referrerCode);
      return { ok: true };
    });
    const result = registerReferral();
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) { console.error('[GG Referral] register error:', err); res.status(500).json({ error: '서버 오류' }); }
});

app.get('/api/golden-goose/referral/status/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  // Toss WebView가 304 ETag 응답에서 body 복원에 실패해 await res.json()이 throw됨.
  // 매번 200 + body로 응답하도록 캐시 비활성화.
  res.set('Cache-Control', 'no-store');
  try {
    let codeRow = db.prepare('SELECT code FROM gg_referral_codes WHERE user_hash = ?').get(userHash);
    if (!codeRow) {
      const code = crypto.randomBytes(3).toString('hex');
      db.prepare('INSERT OR IGNORE INTO gg_referral_codes (user_hash, code) VALUES (?, ?)').run(userHash, code);
      codeRow = { code };
    }
    const list = db.prepare('SELECT id, referred_name as name, claimed, created_at FROM gg_referrals WHERE referrer_hash = ? ORDER BY created_at DESC').all(userHash);
    const total = list.length;
    const unclaimed = list.filter(r => !r.claimed).length;
    res.json({
      code: codeRow.code, total, limit: 300, unclaimed, claimed: total - unclaimed, unclaimedCoins: unclaimed * 10,
      list: list.map(r => ({ id: r.id, created_at: r.created_at, claimed: !!r.claimed, name: r.name || '익명' })),
    });
  } catch (err) { console.error('[GG Referral] status error:', err); res.status(500).json({ error: '서버 오류' }); }
});

app.post('/api/golden-goose/referral/claim', (req, res) => {
  const { userHash } = req.body || {};
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  try {
    const claimReferrals = db.transaction(() => {
      const unclaimed = db.prepare('SELECT COUNT(*) as cnt FROM gg_referrals WHERE referrer_hash = ? AND claimed = 0').get(userHash);
      if (unclaimed.cnt === 0) return { ok: true, claimedCount: 0, coins: 0 };
      const coins = unclaimed.cnt * 10;
      db.prepare("UPDATE gg_referrals SET claimed = 1, claimed_at = datetime('now','+9 hours') WHERE referrer_hash = ? AND claimed = 0").run(userHash);
      db.prepare('INSERT INTO gg_coins (user_hash, coins, total_earned) VALUES (?, ?, ?) ON CONFLICT(user_hash) DO UPDATE SET coins = coins + excluded.coins, total_earned = total_earned + excluded.coins, updated_at = (datetime(\'now\',\'+9 hours\'))').run(userHash, coins, coins);
      db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, coins, 'referral_claim');
      return { ok: true, claimedCount: unclaimed.cnt, coins };
    });
    const result = claimReferrals();
    res.json(result);
  } catch (err) { console.error('[GG Referral] claim error:', err); res.status(500).json({ error: '서버 오류' }); }
});


// ===== GOLDEN-GOOSE LOTTERY API =====

app.get('/api/golden-goose/lottery/today', (req, res) => {
  const { userHash } = req.query;
  try {
    const s = ggLotterySettings();
    const drawDate = ggLotteryTodayDate();
    const agg = db.prepare(`
      SELECT
        COALESCE(SUM(tickets), 0) as real_tickets,
        COUNT(*) as participants
      FROM gg_lottery_entries WHERE draw_date = ?
    `).get(drawDate);
    const realTickets = agg.real_tickets || 0;
    const participants = agg.participants || 0;
    const sim = ggLotterySimulated(s);
    const effectiveRealTickets = realTickets + sim.simTickets;
    const effectiveParticipants = participants + sim.simUsers;
    const { tier, prize } = ggLotteryTier(effectiveRealTickets, s);
    const { nextTierAt, nextTierPrize } = ggLotteryNextTier(effectiveRealTickets, s);

    let myTickets = 0, myAdTickets = 0, myCoinTickets = 0;
    if (userHash) {
      const mine = db.prepare('SELECT tickets, ad_tickets, coin_tickets FROM gg_lottery_entries WHERE draw_date = ? AND user_hash = ?').get(drawDate, userHash);
      if (mine) { myTickets = mine.tickets; myAdTickets = mine.ad_tickets; myCoinTickets = mine.coin_tickets; }
    }
    const canUseAd = myAdTickets < s.maxAdTickets;
    const remainingCoinTickets = Math.max(0, (s.maxTickets - s.maxAdTickets) - myCoinTickets);
    const drawTime = drawDate + 'T20:00:00+09:00';
    const entriesClosed = ggLotteryEntriesClosed();

    res.json({
      drawDate, drawTime, tier, prizePool: prize,
      realTickets: effectiveRealTickets, participants: effectiveParticipants,
      nextTierAt, nextTierPrize, myTickets, myAdTickets, myCoinTickets,
      canUseAd, remainingCoinTickets, maxTickets: s.maxTickets,
      entriesClosed,
    });
  } catch (err) {
    console.error('[GG Lottery] today error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.post('/api/golden-goose/lottery/enter', (req, res) => {
  const { userHash, source, count } = req.body || {};
  if (!userHash || !source) return res.status(400).json({ error: 'userHash, source 필요' });
  if (source !== 'ad' && source !== 'coin') return res.status(400).json({ error: 'source는 ad 또는 coin' });
  if (ggLotteryEntriesClosed()) return res.status(400).json({ error: '오늘 응모는 마감되었어요. 내일 0시부터 참여 가능합니다.' });
  const reqCount = source === 'ad' ? 1 : Number(count || 0);
  if (source === 'coin' && (!Number.isInteger(reqCount) || reqCount < 1 || reqCount > 4)) {
    return res.status(400).json({ error: 'coin count는 1~4' });
  }

  try {
    const s = ggLotterySettings();
    const drawDate = ggLotteryTodayDate();

    const result = db.transaction(() => {
      const existing = db.prepare('SELECT tickets, ad_tickets, coin_tickets, coins_burned FROM gg_lottery_entries WHERE draw_date = ? AND user_hash = ?').get(drawDate, userHash) || { tickets: 0, ad_tickets: 0, coin_tickets: 0, coins_burned: 0 };

      if (source === 'ad') {
        if (existing.ad_tickets >= s.maxAdTickets) return { error: '오늘 광고 응모권 이미 사용' };
        if (existing.tickets >= s.maxTickets) return { error: '일일 응모권 상한 초과' };
        const newAd = existing.ad_tickets + 1;
        const newTotal = existing.tickets + 1;
        db.prepare(`
          INSERT INTO gg_lottery_entries (draw_date, user_hash, tickets, ad_tickets, coin_tickets, coins_burned)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(draw_date, user_hash) DO UPDATE SET
            tickets = excluded.tickets,
            ad_tickets = excluded.ad_tickets
        `).run(drawDate, userHash, newTotal, newAd, existing.coin_tickets, existing.coins_burned);
      } else { // coin
        const coinMax = s.maxTickets - s.maxAdTickets; // coin-path cap = 4
        if (existing.coin_tickets + reqCount > coinMax) return { error: '코인 응모권 상한 초과' };
        if (existing.tickets + reqCount > s.maxTickets) return { error: '일일 응모권 상한 초과' };
        const cost = reqCount * s.ticketPrice;
        const coinRow = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
        if (!coinRow || coinRow.coins < cost) return { error: '코인 부족' };
        db.prepare('UPDATE gg_coins SET coins = coins - ?, updated_at = (datetime(\'now\',\'+9 hours\')) WHERE user_hash = ?').run(cost, userHash);
        db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, -cost, 'lottery_entry');
        const newCoin = existing.coin_tickets + reqCount;
        const newTotal = existing.tickets + reqCount;
        const newBurned = existing.coins_burned + cost;
        db.prepare(`
          INSERT INTO gg_lottery_entries (draw_date, user_hash, tickets, ad_tickets, coin_tickets, coins_burned)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(draw_date, user_hash) DO UPDATE SET
            tickets = excluded.tickets,
            coin_tickets = excluded.coin_tickets,
            coins_burned = excluded.coins_burned
        `).run(drawDate, userHash, newTotal, existing.ad_tickets, newCoin, newBurned);
      }
      return { ok: true };
    })();

    if (result.error) return res.status(400).json(result);

    // Rebuild response like /today
    const agg = db.prepare('SELECT COALESCE(SUM(tickets),0) as rt, COUNT(*) as pc FROM gg_lottery_entries WHERE draw_date = ?').get(drawDate);
    const sim = ggLotterySimulated(s);
    const effectiveRealTickets = agg.rt + sim.simTickets;
    const effectiveParticipants = agg.pc + sim.simUsers;
    const { tier, prize } = ggLotteryTier(effectiveRealTickets, s);
    const mine = db.prepare('SELECT tickets, ad_tickets, coin_tickets FROM gg_lottery_entries WHERE draw_date = ? AND user_hash = ?').get(drawDate, userHash);
    const coinRow = db.prepare('SELECT coins FROM gg_coins WHERE user_hash = ?').get(userHash);
    res.json({
      ok: true,
      myTickets: mine.tickets, myAdTickets: mine.ad_tickets, myCoinTickets: mine.coin_tickets,
      canUseAd: mine.ad_tickets < s.maxAdTickets,
      remainingCoinTickets: Math.max(0, (s.maxTickets - s.maxAdTickets) - mine.coin_tickets),
      tier, prizePool: prize, realTickets: effectiveRealTickets, participants: effectiveParticipants,
      remainingCoins: coinRow?.coins ?? 0,
    });
  } catch (err) {
    console.error('[GG Lottery] enter error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.post('/api/golden-goose/lottery/draw', (req, res) => {
  const { drawDate: reqDate, secret } = req.body || {};
  // Protect: require internal secret (env var), or allow when called locally
  if (secret !== process.env.GG_LOTTERY_SECRET && req.ip !== '127.0.0.1' && req.ip !== '::1' && req.ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const drawDate = reqDate || ggLotteryTodayDate();

  try {
    const alreadyDrawn = db.prepare("SELECT drawn_at FROM gg_lottery_draws WHERE draw_date = ?").get(drawDate);
    if (alreadyDrawn?.drawn_at) return res.status(409).json({ error: 'already drawn', drawnAt: alreadyDrawn.drawn_at });

    const s = ggLotterySettings();
    const entries = db.prepare('SELECT user_hash, tickets FROM gg_lottery_entries WHERE draw_date = ?').all(drawDate);
    const realTicketsActual = entries.reduce((sum, e) => sum + e.tickets, 0);
    const sim = ggLotterySimulatedAtMax(s);
    const realTickets = realTicketsActual + sim.simTickets; // effective for tier calc
    const virtualTickets = ggLotteryVirtualCount(realTicketsActual, s); // displacement uses actual only
    const total = realTickets + virtualTickets;
    const { tier, prize } = ggLotteryTier(realTickets, s);

    // Build weighted pool: array of user_hash strings (real) + null (virtual/sim)
    const pool = [];
    for (const e of entries) for (let i = 0; i < e.tickets; i++) pool.push(e.user_hash);
    for (let i = 0; i < virtualTickets + sim.simTickets; i++) pool.push(null); // displacement + sim both burn on win

    const pickOne = () => pool[Math.floor(Math.random() * pool.length)];

    // Prize distribution: 1등 50% / 2등 20% / 3등 10% / 4등 10명×1% / 소각 10%
    const prize1 = Math.floor(prize * 0.50);
    const prize2 = Math.floor(prize * 0.20);
    const prize3 = Math.floor(prize * 0.10);
    const prize4 = Math.floor(prize * 0.01); // per person of 10
    const picks = [
      { rank: 1, prize: prize1 },
      { rank: 2, prize: prize2 },
      { rank: 3, prize: prize3 },
    ];
    for (let i = 0; i < 10; i++) picks.push({ rank: 4, prize: prize4 });

    const drawTx = db.transaction(() => {
      // 가상 당첨자 placeholder 중복 방지 — 사전 셔플 후 순차 pop
      const phPool = db.prepare('SELECT id, text FROM gg_lottery_placeholders WHERE active = 1').all();
      for (let i = phPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [phPool[i], phPool[j]] = [phPool[j], phPool[i]];
      }
      let phIdx = 0;
      const pickUniquePh = () => {
        if (phIdx >= phPool.length) return { id: null, text: '감사합니다' };
        return phPool[phIdx++];
      };

      const winners = [];
      for (const p of picks) {
        const hash = pickOne();
        const isVirtual = hash === null ? 1 : 0;
        let userName = null;
        if (isVirtual) {
          userName = ggLotteryPickVirtualName(drawDate);
        } else {
          const row = db.prepare('SELECT user_name FROM gg_users WHERE user_hash = ?').get(hash);
          userName = ggLotteryMaskName(row?.user_name || '');
        }
        const ph = isVirtual ? pickUniquePh() : { id: null, text: null };
        const info = db.prepare(`
          INSERT INTO gg_lottery_winners (draw_date, rank, user_hash, user_name, prize, is_virtual, testimonial, placeholder_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(drawDate, p.rank, isVirtual ? null : hash, userName, p.prize, isVirtual, ph.text, ph.id);
        winners.push({ id: info.lastInsertRowid, rank: p.rank, userHash: isVirtual ? null : hash, userName, prize: p.prize, isVirtual });
      }
      const totalPrizeDistributed = picks.reduce((sum, p) => sum + p.prize, 0);
      const burnFromPool = prize - totalPrizeDistributed + winners.filter(w => w.isVirtual).reduce((sum, w) => sum + w.prize, 0);
      // Upsert draw summary
      db.prepare(`
        INSERT INTO gg_lottery_draws (draw_date, tier, prize_pool, real_tickets, virtual_tickets, total_burned, drawn_at)
        VALUES (?, ?, ?, ?, ?, ?, (datetime('now','+9 hours')))
        ON CONFLICT(draw_date) DO UPDATE SET
          tier = excluded.tier, prize_pool = excluded.prize_pool,
          real_tickets = excluded.real_tickets, virtual_tickets = excluded.virtual_tickets,
          total_burned = excluded.total_burned, drawn_at = excluded.drawn_at
      `).run(drawDate, tier, prize, realTicketsActual, virtualTickets + sim.simTickets, burnFromPool);
      return winners;
    });
    const winners = drawTx();

    res.json({ ok: true, drawDate, tier, prizePool: prize, realTickets: realTicketsActual, virtualTickets: virtualTickets + sim.simTickets, winners });
  } catch (err) {
    console.error('[GG Lottery] draw error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.get('/api/golden-goose/lottery/result/:drawDate', (req, res) => {
  const { drawDate } = req.params;
  try {
    const draw = db.prepare('SELECT * FROM gg_lottery_draws WHERE draw_date = ?').get(drawDate);
    if (!draw) return res.json({ drawDate, drawn: false, winners: [] });
    const winners = db.prepare(`
      SELECT rank, user_name as name, prize, testimonial, claimed, is_virtual
      FROM gg_lottery_winners WHERE draw_date = ?
      ORDER BY rank ASC, id ASC
    `).all(drawDate).map(w => ({ ...w, claimed: !!w.claimed, is_virtual: undefined })); // hide is_virtual flag in UI
    res.json({
      drawDate, drawn: true, tier: draw.tier, prizePool: draw.prize_pool,
      realTickets: draw.real_tickets, winners,
    });
  } catch (err) {
    console.error('[GG Lottery] result error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.get('/api/golden-goose/lottery/me/:userHash', (req, res) => {
  const { userHash } = req.params;
  if (!userHash) return res.status(400).json({ error: 'userHash 필요' });
  try {
    const s = ggLotterySettings();
    const rows = db.prepare(`
      SELECT id, draw_date, rank, prize, claimed, claimed_at, testimonial, created_at
      FROM gg_lottery_winners
      WHERE user_hash = ?
      ORDER BY draw_date DESC, rank ASC
      LIMIT 30
    `).all(userHash);
    const now = Date.now();
    const unclaimed = [];
    const history = [];
    for (const r of rows) {
      // Claim deadline: created_at + claimHours
      const created = new Date(r.created_at.replace(' ', 'T') + '+09:00').getTime();
      const deadline = created + s.claimHours * 3600 * 1000;
      const expired = now > deadline;
      const item = {
        id: r.id, drawDate: r.draw_date, rank: r.rank, prize: r.prize,
        claimed: !!r.claimed,
        claimDeadline: new Date(deadline).toISOString(),
        expired,
      };
      if (!r.claimed && !expired) unclaimed.push(item);
      else history.push(item);
    }
    res.json({ unclaimed, history });
  } catch (err) {
    console.error('[GG Lottery] me error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.post('/api/golden-goose/lottery/claim', (req, res) => {
  const { userHash, winnerId, testimonial } = req.body || {};
  if (!userHash || !winnerId) return res.status(400).json({ error: 'userHash, winnerId 필요' });

  try {
    const s = ggLotterySettings();
    const result = db.transaction(() => {
      const w = db.prepare('SELECT * FROM gg_lottery_winners WHERE id = ? AND user_hash = ?').get(winnerId, userHash);
      if (!w) return { error: '당첨 내역 없음' };
      if (w.claimed) return { error: '이미 클레임 완료' };
      if (w.is_virtual) return { error: '클레임 불가' };
      // Expiry check
      const created = new Date(w.created_at.replace(' ', 'T') + '+09:00').getTime();
      if (Date.now() > created + s.claimHours * 3600 * 1000) return { error: '클레임 기한 만료' };

      // Testimonial 필수 — 빈 값 거부 (가상 winner의 placeholder와 명확히 구분)
      const txt = (testimonial || '').trim();
      if (!txt) return { error: '한마디를 남겨주세요' };
      const placeholderId = null;

      // Grant coins
      db.prepare(`
        INSERT INTO gg_coins (user_hash, coins, total_earned) VALUES (?, ?, ?)
        ON CONFLICT(user_hash) DO UPDATE SET
          coins = coins + excluded.coins,
          total_earned = total_earned + excluded.coins,
          updated_at = (datetime('now','+9 hours'))
      `).run(userHash, w.prize, w.prize);
      db.prepare('INSERT INTO gg_reward_log (user_hash, coins, reason) VALUES (?, ?, ?)').run(userHash, w.prize, 'lottery_claim');

      db.prepare(`
        UPDATE gg_lottery_winners
        SET claimed = 1, claimed_at = (datetime('now','+9 hours')),
            testimonial = ?, placeholder_id = ?
        WHERE id = ?
      `).run(txt, placeholderId, winnerId);

      return { ok: true, coins: w.prize };
    })();
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error('[GG Lottery] claim error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.get('/api/golden-goose/lottery/winners/recent', (req, res) => {
  try {
    const before = req.query.before; // YYYY-MM-DD, load dates strictly before this
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    let rows;
    if (before) {
      rows = db.prepare(`
        SELECT draw_date, rank, user_name as name, prize, testimonial, is_virtual
        FROM gg_lottery_winners
        WHERE draw_date < ?
        ORDER BY draw_date DESC, rank ASC, id ASC
        LIMIT ?
      `).all(before, limit);
    } else {
      // Default: today + yesterday (KST)
      rows = db.prepare(`
        SELECT draw_date, rank, user_name as name, prize, testimonial, is_virtual
        FROM gg_lottery_winners
        WHERE draw_date >= date('now','+9 hours','-1 day')
        ORDER BY draw_date DESC, rank ASC, id ASC
        LIMIT ?
      `).all(limit);
    }
    const winners = rows.map(r => ({
      drawDate: r.draw_date, rank: r.rank, name: r.name, prize: r.prize,
      testimonial: r.is_virtual ? null : (r.testimonial || null),
    }));
    // For default (no before), check if older records exist
    let hasMore;
    if (before) {
      hasMore = rows.length === limit;
    } else {
      const oldest = rows.length ? rows[rows.length - 1].draw_date : null;
      hasMore = oldest ? !!db.prepare('SELECT 1 FROM gg_lottery_winners WHERE draw_date < ? LIMIT 1').get(oldest) : false;
    }
    res.json({ winners, hasMore });
  } catch (err) {
    console.error('[GG Lottery] winners/recent error:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS coin_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS promo_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    promo_code TEXT,
    amount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_hash, promo_type)
  );
  CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coin_count INTEGER NOT NULL,
    points INTEGER NOT NULL,
    promo_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sleep_settings (
    user_hash TEXT PRIMARY KEY,
    bedtime TEXT NOT NULL,
    wake_time TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_hash) DO UPDATE SET
        user_name = excluded.user_name,
        updated_at = datetime('now')
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
    ON CONFLICT(user_hash) DO UPDATE SET bedtime = excluded.bedtime, wake_time = excluded.wake_time, updated_at = CURRENT_TIMESTAMP
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

if (require.main === module) {
  // GET /api/golden-goose/migration-list — 마이그레이션 대상 유저 목록
app.get('/api/golden-goose/migration-list', (req, res) => {
  const hashUsers = db.prepare(`
    SELECT user_hash, coins, total_earned, milestone_eggs
    FROM gg_coins
    WHERE user_hash LIKE '%-%' OR user_hash LIKE '%_%' OR user_hash LIKE '%/%' OR user_hash LIKE '%+%' OR user_hash LIKE '%=%'
    OR (length(user_hash) > 15 AND user_hash GLOB '*[a-zA-Z]*')
  `).all();

  const rows = hashUsers.filter(h => h.user_hash !== 'toss_anonymous').map(h => {
    // Find matching numeric account via gg_users is not possible
    // Just show hash account info
    return {
      hash: h.user_hash,
      hashCoins: h.coins,
      hashEarned: h.total_earned,
      hashEggs: h.milestone_eggs || 0
    };
  });

  if (req.query.json !== undefined) return res.json(rows);

  const L = (n) => Number(n || 0).toLocaleString();
  let tableRows = rows.map(r => `<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${r.hash}</td><td>${L(r.hashCoins)}</td><td>${L(r.hashEarned)}</td><td>${r.hashEggs}</td></tr>`).join('');

  res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GG Migration List</title>
<style>
body{font-family:-apple-system,sans-serif;margin:0;padding:16px;background:#f5f5f5;color:#333}
h1{font-size:20px;margin:0 0 8px}
.summary{font-size:14px;color:#666;margin-bottom:16px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);font-size:12px}
th,td{padding:6px 8px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap}
th{background:#fafafa;font-weight:600;position:sticky;top:0}
td:first-child,th:first-child{text-align:left}
tr:hover{background:#fffde7}
</style></head><body>
<h1>Migration Target Users</h1>
<div class="summary">${rows.length}명 | 총코인: ${L(rows.reduce((s,r) => s + r.hashCoins, 0))} | 총 earned: ${L(rows.reduce((s,r) => s + r.hashEarned, 0))}</div>
<div style="overflow-x:auto"><table>
<tr><th>Hash</th><th>코인잔액</th><th>총earned</th><th>eggs</th></tr>
${tableRows}
</table></div>
</body></html>`);
});

// GET /api/golden-goose/analytics
app.get('/api/golden-goose/analytics', (req, res) => {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() + 9*3600000 - i*86400000);
    days.push(d.toISOString().slice(0,10));
  }

  // ===== eCPM 로드 + 가중 이동평균 예측 =====
  // 실측: 토스 admin에서 주 1회 업데이트 (INSERT INTO gg_ecpm_daily)
  // 빈 날짜: 최근 실측 가중평균 (최근 3일 85%, 나머지 4일 15%) — eCPM 변동폭 작으므로 추세 연장 대신 안정적 평균값 사용
  const ecpmRows = db.prepare("SELECT date, ecpm, ad_views, source FROM gg_ecpm_daily ORDER BY date").all();
  const ecpmMap = new Map(ecpmRows.map(r => [r.date, r]));
  const actualPoints = ecpmRows.filter(r => r.source === 'actual');

  let ecpmPredict = null;
  if (actualPoints.length >= 1) {
    const recent = actualPoints.slice(-7).reverse(); // 최근 → 과거
    const weights = [0.40, 0.30, 0.15, 0.08, 0.04, 0.02, 0.01]; // 합 1.00
    let wSum = 0, vSum = 0;
    for (let i = 0; i < recent.length; i++) {
      const w = weights[i] || 0;
      vSum += recent[i].ecpm * w;
      wSum += w;
    }
    const prediction = wSum > 0 ? vSum / wSum : recent[0].ecpm;
    const clamped = Math.max(500, Math.min(3000, prediction));
    ecpmPredict = () => clamped;
  }
  function getEcpm(date) {
    const row = ecpmMap.get(date);
    if (row) return { value: Math.round(row.ecpm), source: row.source || 'actual', adViews: row.ad_views || null };
    if (ecpmPredict) return { value: Math.round(ecpmPredict()), source: 'predicted', adViews: null };
    return { value: 1000, source: 'default', adViews: null };
  }

  const rows = days.map(day => {
    const dau = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_reward_log WHERE created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(day, day)?.cnt || 0;
    const dauNew = db.prepare(`SELECT COUNT(DISTINCT r.user_hash) as cnt FROM gg_reward_log r JOIN gg_coins c ON r.user_hash = c.user_hash WHERE c.total_earned < 100 AND r.created_at >= datetime(?, '+0 hours') AND r.created_at < datetime(?, '+24 hours')`).get(day, day)?.cnt || 0;
    const dauOld = dau - dauNew;
    const rewards = db.prepare(`SELECT reason, COUNT(*) as cnt, SUM(coins) as total FROM gg_reward_log WHERE created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours') GROUP BY reason`).all(day, day);
    const totalCoins = rewards.reduce((s, r) => s + (r.total || 0), 0);
    const rewardCnt = rewards.filter(r => r.reason === 'reward' || !r.reason).reduce((s, r) => s + (r.cnt || 0), 0);
    const lotteryCnt = rewards.filter(r => r.reason && r.reason.startsWith('lottery')).reduce((s, r) => s + (r.cnt || 0), 0);
    const shareCnt = rewards.filter(r => r.reason === 'share').reduce((s, r) => s + (r.cnt || 0), 0);
    const attendCnt = rewards.filter(r => r.reason === 'attendance').reduce((s, r) => s + (r.cnt || 0), 0);
    const rewardCoins = rewards.filter(r => r.reason === 'reward' || !r.reason).reduce((s, r) => s + (r.total || 0), 0);
    const lotteryCoins = rewards.filter(r => r.reason && r.reason.startsWith('lottery')).reduce((s, r) => s + (r.total || 0), 0);
    const avgEgg = rewardCnt > 0 ? Math.round(rewardCoins / rewardCnt * 10) / 10 : 0;
    const avgLottery = lotteryCnt > 0 ? Math.round(lotteryCoins / lotteryCnt * 10) / 10 : 0;
    const exchanged = db.prepare(`SELECT COALESCE(SUM(coins_spent), 0) / 12 as points FROM gg_exchanges WHERE created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours') AND status = 'confirmed'`).get(day, day)?.points || 0;
    const adEgg = rewardCnt;
    const adLottery = lotteryCnt;
    const internalAds = adEgg + adLottery;
    const ecpmInfo = getEcpm(day);
    // 토스에서 받은 ad_views가 있으면 우선 사용 (배너+꽝 등 포함된 정확한 count), 없으면 내부 count fallback
    const totalAds = ecpmInfo.adViews != null ? ecpmInfo.adViews : internalAds;
    const adsIsActual = ecpmInfo.adViews != null;
    const grossRevenue = Math.round(totalAds * ecpmInfo.value / 1000);
    const tossFee = Math.round(grossRevenue * 0.15);   // 토스 광고 수수료 15%
    const estRevenue = grossRevenue - tossFee;           // 실수익 (net)
    const estCost = Math.round(totalCoins / 12);  // 12코인 = 1원
    const profit = estRevenue - estCost;
    const profitRate = estRevenue > 0 ? Math.round(profit / estRevenue * 100) : 0;
    const newUserReward = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(r.coins),0) as total FROM gg_reward_log r JOIN gg_coins c ON r.user_hash = c.user_hash WHERE r.reason = 'reward' AND c.total_earned < 100 AND r.created_at >= datetime(?, '+0 hours') AND r.created_at < datetime(?, '+24 hours')`).get(day, day);
    const oldUserReward = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(r.coins),0) as total FROM gg_reward_log r JOIN gg_coins c ON r.user_hash = c.user_hash WHERE r.reason = 'reward' AND c.total_earned >= 100 AND r.created_at >= datetime(?, '+0 hours') AND r.created_at < datetime(?, '+24 hours')`).get(day, day);
    const newAvg = newUserReward.cnt > 0 ? Math.round(newUserReward.total / newUserReward.cnt * 10) / 10 : 0;
    const oldAvg = oldUserReward.cnt > 0 ? Math.round(oldUserReward.total / oldUserReward.cnt * 10) / 10 : 0;
    return { date: day, dau, dauNew, dauOld, totalCoins, breakdown: { reward: rewardCnt, lottery: lotteryCnt, share: shareCnt, attendance: attendCnt }, avgEgg, avgLottery, exchangedWon: exchanged, ads: { total: totalAds, internal: internalAds, isActual: adsIsActual }, ecpm: ecpmInfo, ecpm1000: { gross: grossRevenue, fee: tossFee, revenue: estRevenue, cost: estCost, profit, profitRate }, newUser: { cnt: newUserReward.cnt, avg: newAvg }, oldUser: { cnt: oldUserReward.cnt, avg: oldAvg } };
  });


  // ===== 퍼널 분석 (최근 7일) =====
  const funnelDays = days.slice(-7);
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
  const funnelData = funnelDays.map(day => {
    const DS = day, DE = day; // datetime(DS, '+0h') ~ datetime(DE, '+24h')

    // 인입: 비로그인 앱 오픈
    const entry = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='app_open' AND params LIKE '%"logged_in":false%' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;

    // 전체 로그인 (source 무관)
    const allLogin = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='login_success' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;

    // 새 이벤트 (source 구분)
    const eggTap1 = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='funnel_egg_tap_1' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggTap2 = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='funnel_egg_tap_2' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggTap3 = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='funnel_egg_tap_3' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggOpen = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='funnel_egg_open' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggTapNew = eggTap1;
    const eggLoginClick = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='funnel_login_click' AND params LIKE '%"source":"egg"%' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggLoginNew = db.prepare(`SELECT COUNT(DISTINCT user_hash) as cnt FROM gg_events WHERE event='login_success' AND params LIKE '%"source":"egg"%' AND created_at >= datetime(?, '+0 hours') AND created_at < datetime(?, '+24 hours')`).get(DS, DE)?.cnt || 0;
    const eggLogin = eggLoginNew;

    return { date: day, entry, allLogin, eggTap1, eggTap2, eggTap3, eggOpen, eggLoginClick, eggLogin };
  });

  // ===== 행운추첨 통계 (최근 14일) =====
  const lotteryStats = days.map(day => {
    const participants = db.prepare(`SELECT COUNT(*) as cnt FROM gg_lottery_entries WHERE draw_date = ?`).get(day)?.cnt || 0;
    const totalEntries = db.prepare(`SELECT COALESCE(SUM(tickets), 0) as cnt FROM gg_lottery_entries WHERE draw_date = ?`).get(day)?.cnt || 0;
    const coinBurned = db.prepare(`SELECT COALESCE(SUM(coins_burned), 0) as cnt FROM gg_lottery_entries WHERE draw_date = ?`).get(day)?.cnt || 0;
    const sim = ggLotterySimulatedAtMax();
    const draw = db.prepare(`SELECT * FROM gg_lottery_draws WHERE draw_date = ?`).get(day);
    const virtualParticipants = draw ? draw.virtual_tickets : 0;
    return { date: day, participants, totalEntries, coinBurned, virtualParticipants, simUsers: sim.simUsers };
  });

  if (req.query.json !== undefined) return res.json({ rows, funnelData, lotteryStats });

  const L = (n) => Number(n).toLocaleString();

  const lotteryRows = lotteryStats.map(r => {
    return `<tr><td>${r.date.slice(5)}</td><td>${L(r.participants)}</td><td>${L(r.totalEntries)}</td><td>${L(r.coinBurned)}</td><td>${L(Math.round(r.coinBurned / 12))}원</td><td>${L(r.virtualParticipants)}</td><td>${L(r.simUsers)}</td></tr>`;
  }).join('');
  const maxDau = Math.max(...rows.map(r => r.dau), 1);

  let dauBars = rows.map(r => {
    const oldPct = Math.round(r.dauOld / maxDau * 100);
    const newPct = Math.round(r.dauNew / maxDau * 100);
    return `<div class="bar-col">
      <div class="bar-label">
        <div class="bar-label__total">${L(r.dau)}</div>
        <div class="bar-label__new">+${L(r.dauNew)}</div>
      </div>
      <div class="bar-stack" style="height:120px">
        <div class="bar-seg bar-new" style="height:${newPct}%" title="\uC2E0\uADDC ${L(r.dauNew)}"></div>
        <div class="bar-seg bar-old" style="height:${oldPct}%" title="\uAE30\uC874 ${L(r.dauOld)}"></div>
      </div>
      <div class="bar-date">${r.date.slice(5)}</div>
    </div>`;
  }).join('');

  let usageRows = rows.map(r => `<tr><td>${r.date.slice(5)}</td><td>${L(r.dau)}</td><td>${L(r.breakdown.reward)}</td><td>${r.avgEgg}</td><td>${L(r.breakdown.lottery)}</td><td>${r.avgLottery}</td><td>${L(r.breakdown.share)}</td><td>${L(r.breakdown.attendance)}</td><td>${L(r.totalCoins)}</td></tr>`).join('');

  let revenueRows = rows.map(r => {
    const ecpmCls = r.ecpm.source === 'actual' ? '' : 'ecpm-pred';
    const ecpmMark = r.ecpm.source === 'predicted' ? '<span class="ecpm-badge">예측</span>' : r.ecpm.source === 'default' ? '<span class="ecpm-badge">—</span>' : '';
    const adsCls = r.ads.isActual ? '' : 'ecpm-pred';
    const adsMark = r.ads.isActual ? '' : '<span class="ecpm-badge">내부</span>';
    return `<tr><td>${r.date.slice(5)}</td><td>${L(r.dau)}</td><td class="${adsCls}">${L(r.ads.total)}${adsMark}</td><td class="${ecpmCls}">${L(r.ecpm.value)}${ecpmMark}</td><td>${L(r.ecpm1000.gross)}</td><td class="fee">-${L(r.ecpm1000.fee)}</td><td>${L(r.ecpm1000.revenue)}</td><td>${L(r.ecpm1000.cost)}</td><td class="${r.ecpm1000.profit>=0?'pos':'neg'}">${L(r.ecpm1000.profit)}</td><td class="${r.ecpm1000.profitRate>=0?'pos':'neg'}">${r.ecpm1000.profitRate}%</td><td>${L(r.exchangedWon)}</td></tr>`;
  }).join('');

  const buildDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  res.type('html').send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>Golden Goose · Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --surface-alt: #f8fafc;
  --surface-hover: #f1f5f9;
  --border: #e5e7eb;
  --border-strong: #d1d5db;
  --border-muted: #f1f5f9;
  --ink: #0f172a;
  --ink-2: #334155;
  --muted: #64748b;
  --muted-soft: #94a3b8;
  --accent: #2563eb;
  --accent-soft: #dbeafe;
  --pos: #047857;
  --pos-soft: #d1fae5;
  --neg: #dc2626;
  --neg-soft: #fee2e2;
  --cvr: #0369a1;
  --font: 'Inter', system-ui, -apple-system, 'Noto Sans KR', sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;
}
* { box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
body {
  margin: 0;
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.5;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  font-feature-settings: 'cv11', 'ss01';
}

.masthead { max-width: 1440px; margin: 0 auto; padding: 28px 32px 0; }
.masthead__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 24px;
  padding-bottom: 14px;
  flex-wrap: wrap;
}
.masthead__brand { display: flex; align-items: baseline; gap: 10px; }
.masthead__title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--ink);
}
.masthead__product {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  padding: 3px 7px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 4px;
  letter-spacing: 0.01em;
}
.masthead__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  font-feature-settings: 'tnum';
}
.masthead__meta::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--pos);
  box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.14);
}

.container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.section { animation: fadeUp 0.35s ease-out backwards; }
.section:nth-of-type(1) { animation-delay: 0.02s; }
.section:nth-of-type(2) { animation-delay: 0.06s; }
.section:nth-of-type(3) { animation-delay: 0.10s; }
.section:nth-of-type(4) { animation-delay: 0.14s; }
.section:nth-of-type(5) { animation-delay: 0.18s; }
.section:nth-of-type(6) { animation-delay: 0.22s; }
.section:nth-of-type(7) { animation-delay: 0.26s; }

.section__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.section__head-left { display: flex; align-items: baseline; gap: 10px; min-width: 0; flex-wrap: wrap; }
.section__num {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-soft);
  letter-spacing: 0.02em;
  font-feature-settings: 'tnum';
}
.section__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0;
}
.section__subtitle {
  font-size: 14px;
  font-weight: 400;
  color: var(--muted);
}
.section__range {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.02em;
  font-feature-settings: 'tnum';
  white-space: nowrap;
}
.section__note {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.55;
  max-width: 860px;
}
.section__note code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--surface-hover);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--ink);
  border: 1px solid var(--border);
}
.section__note a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.section__note a:hover { border-color: var(--accent); }
.section__caption {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.card--chart { padding: 18px 18px 12px; }

.dau-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-muted);
  font-size: 12px;
}
.dau-legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-2);
}
.dau-legend__dot {
  width: 10px; height: 10px;
  border-radius: 2px;
}

.chart-scroll {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
  padding-bottom: 4px;
}
.chart-scroll::-webkit-scrollbar { height: 6px; }
.chart-scroll::-webkit-scrollbar-track { background: transparent; }
.chart-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

.bar-chart {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  min-width: 700px;
  padding: 4px 0 0;
}
.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 40px;
  position: relative;
}
.bar-label {
  margin-bottom: 6px;
  text-align: center;
  line-height: 1.2;
}
.bar-label__total {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
  font-feature-settings: 'tnum';
  letter-spacing: -0.02em;
}
.bar-label__new {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  color: #334155;
  font-feature-settings: 'tnum';
  letter-spacing: -0.02em;
  margin-top: 1px;
}
.bar-stack {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
  height: 150px !important;
  border-radius: 3px 3px 0 0 !important;
  overflow: hidden !important;
}
.bar-seg {
  width: 100%;
  min-height: 1px;
  transition: opacity 0.15s;
  animation: barGrow 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  transform-origin: bottom;
}
.bar-col:hover .bar-seg { opacity: 0.65; }
.bar-col:hover .bar-seg:hover { opacity: 1; }
.bar-old { background: #cbd5e1; }
.bar-new { background: #334155; }
.bar-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  margin-top: 6px;
  letter-spacing: -0.02em;
}

.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
.table-scroll::-webkit-scrollbar { height: 6px; }
.table-scroll::-webkit-scrollbar-track { background: transparent; }
.table-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead th {
  background: var(--surface-alt);
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 10px 14px;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}
.data-table tbody td {
  padding: 11px 14px;
  text-align: right;
  font-family: var(--font-mono);
  font-feature-settings: 'tnum';
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
  border-bottom: 1px solid var(--border-muted);
}
.data-table td:first-child,
.data-table th:first-child {
  text-align: left;
  padding-left: 18px;
  font-family: var(--font);
}
.data-table td:last-child,
.data-table th:last-child { padding-right: 18px; }
.data-table tbody td:first-child { font-weight: 500; color: var(--ink); }
.data-table tbody tr:hover td { background: var(--surface-alt); }
.data-table tbody tr:last-child td { border-bottom: none; }

.pos { color: var(--pos); font-weight: 500; }
.neg { color: var(--neg); font-weight: 500; }
.cvr { color: var(--cvr); font-weight: 500; }

#exp2-table .exp2-summary { cursor: pointer; transition: background 0.15s; }
#exp2-table .exp2-summary td:first-child { font-weight: 600; color: var(--ink); }
#exp2-table .exp2-detail { display: none; }
#exp2-table .exp2-detail td {
  color: var(--ink-2);
  background: var(--surface-alt);
  font-size: 12px;
  padding-top: 9px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--border-muted);
}
#exp2-table .exp2-detail td:first-child {
  padding-left: 48px;
  font-weight: 500;
  color: var(--muted);
}
#exp2-table.expanded-at_once tr.exp2-detail[data-variant="at_once"],
#exp2-table.expanded-split tr.exp2-detail[data-variant="split"] { display: table-row; }
.exp2-arrow {
  display: inline-block;
  width: 12px;
  color: var(--muted-soft);
  margin-right: 8px;
  font-size: 9px;
  transition: transform 0.15s, color 0.15s;
  transform-origin: center;
  line-height: 1;
}
#exp2-table.expanded-at_once .exp2-summary[data-variant="at_once"] .exp2-arrow,
#exp2-table.expanded-split .exp2-summary[data-variant="split"] .exp2-arrow {
  transform: rotate(90deg);
  color: var(--accent);
}

.subsection { margin-top: 18px; }
.subsection__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 10px;
  letter-spacing: -0.005em;
}

.chart-frame {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.footer {
  max-width: 1440px;
  margin: 16px auto 0;
  padding: 20px 32px 28px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted-soft);
  letter-spacing: 0.02em;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
}

@media (max-width: 960px) {
  .masthead { padding: 20px 18px 0; }
  .container { padding: 20px 18px 40px; gap: 28px; }
  .footer { padding: 16px 18px 20px; margin-top: 8px; }
  .section__head { gap: 8px; }
  .data-table thead th { padding: 9px 12px; font-size: 10px; }
  .data-table tbody td { padding: 9px 12px; font-size: 12px; }
  .card--chart { padding: 14px 14px 10px; }
  .bar-chart { min-width: 560px; }
}
@media (max-width: 560px) {
  .masthead { padding: 16px 14px 0; }
  .container { padding: 16px 14px 32px; }
  .footer { padding: 14px 14px 18px; }
  .masthead__title { font-size: 17px; }
  .data-table thead th { padding: 8px 10px; font-size: 10px; }
  .data-table tbody td { padding: 8px 10px; font-size: 11px; }
  .data-table td:first-child, .data-table th:first-child { padding-left: 12px; }
  .data-table td:last-child, .data-table th:last-child { padding-right: 12px; }
  #exp2-table .exp2-detail td:first-child { padding-left: 32px; }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes barGrow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

/* eCPM column */
.ecpm-pred { color: var(--muted); }
.ecpm-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 5px;
  background: var(--surface-hover);
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.02em;
  font-family: var(--font);
  vertical-align: 1px;
}
.data-table tbody td.fee { color: var(--muted); }

.tabs {
  max-width: 1440px;
  margin: 14px auto 0;
  padding: 0 32px;
  display: flex;
  gap: 2px;
}
.tab {
  background: transparent;
  border: 0;
  padding: 10px 16px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  letter-spacing: -0.005em;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  margin-bottom: -1px;
  border-radius: 4px 4px 0 0;
}
.tab:hover { color: var(--ink-2); background: var(--surface-hover); }
.tab--active {
  color: var(--ink);
  border-bottom-color: var(--ink);
  background: transparent;
}
.tab--active:hover { background: transparent; }
.tabs-rule {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
}
.tabs-rule__line {
  height: 1px;
  background: var(--border);
}
.tab-panel { display: flex; flex-direction: column; gap: 36px; }
.tab-panel--hidden { display: none !important; }
@media (max-width: 960px) {
  .tabs { padding: 0 18px; margin-top: 10px; }
  .tabs-rule { padding: 0 18px; }
  .tab-panel { gap: 28px; }
}
@media (max-width: 560px) {
  .tabs { padding: 0 14px; }
  .tabs-rule { padding: 0 14px; }
  .tab { padding: 9px 12px; font-size: 12px; }
}
</style>
</head>
<body>

<header class="masthead">
  <div class="masthead__row">
    <div class="masthead__brand">
      <h1 class="masthead__title">Analytics</h1>
      <span class="masthead__product">Golden Goose</span>
    </div>
    <div class="masthead__meta">
      <span>${buildDate} KST</span>
    </div>
  </div>
</header>

<main class="container">

<section class="section">
  <div class="section__head">
    <div class="section__head-left">
      <span class="section__num">01</span>
      <h2 class="section__title">일일 활성 유저</h2>
    </div>
    <span class="section__range">Last 14 days</span>
  </div>
  <div class="card card--chart">
    <div class="dau-legend">
      <div class="dau-legend__item"><span class="dau-legend__dot" style="background:#cbd5e1"></span>기존 유저</div>
      <div class="dau-legend__item"><span class="dau-legend__dot" style="background:#334155"></span>신규 유저</div>
    </div>
    <div class="chart-scroll">
      <div class="bar-chart">${dauBars}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="section__head">
    <div class="section__head-left">
      <span class="section__num">02</span>
      <h2 class="section__title">사용성</h2>
      <span class="section__subtitle">유저가 어떻게 보상을 받고 있나</span>
    </div>
    <span class="section__range">Last 14 days</span>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table class="data-table">
    <thead><tr><th>날짜</th><th>DAU</th><th>황금알</th><th>알 / avg</th><th>복권</th><th>복권 / avg</th><th>공유</th><th>출석</th><th>총코인</th></tr></thead>
    <tbody>${usageRows}</tbody>
  </table></div></div>
</section>

<section class="section">
  <div class="section__head">
    <div class="section__head-left">
      <span class="section__num">03</span>
      <h2 class="section__title">수익성</h2>
      <span class="section__subtitle">광고 수익 · 코인 비용 · 이익률</span>
    </div>
    <span class="section__range">Last 14 days</span>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table class="data-table">
    <thead><tr><th>날짜</th><th>DAU</th><th>광고노출</th><th title="토스 애즈 실측 or 선형회귀 예측">eCPM</th><th title="광고노출 × eCPM ÷ 1000">총수익</th><th title="토스 광고 수수료 15%">수수료</th><th title="총수익 - 수수료">순수익</th><th title="지급 코인 ÷ 10">비용</th><th>이익</th><th>이익률</th><th>교환 (원)</th></tr></thead>
    <tbody>${revenueRows}</tbody>
  </table></div></div>
</section>

<section class="section">
  <div class="section__head">
    <div class="section__head-left">
      <span class="section__num">04</span>
      <h2 class="section__title">신규유저 퍼널</h2>
      <span class="section__subtitle">로그인 전환율</span>
    </div>
    <span class="section__range">Last 7 days</span>
  </div>

  <div class="subsection">
    <h3 class="subsection__title">통합 — 인입 → 로그인</h3>
    <div class="table-wrap"><div class="table-scroll"><table class="data-table">
      <thead><tr><th>날짜</th><th>인입</th><th>로그인</th><th>전환율</th></tr></thead>
      <tbody>${funnelData.map(f => '<tr><td>' + f.date.slice(5) + '</td><td>' + L(f.entry) + '</td><td>' + L(f.allLogin) + '</td><td class="cvr">' + pct(f.allLogin, f.entry) + '%</td></tr>').join('')}</tbody>
    </table></div></div>
  </div>

  <div class="subsection">
    <h3 class="subsection__title">퍼널 1 — 황금알 → 로그인</h3>
    <div class="table-wrap"><div class="table-scroll"><table class="data-table">
      <thead><tr><th>날짜</th><th>인입</th><th>1탭</th><th>전환</th><th>2탭</th><th>전환</th><th>3탭</th><th>전환</th><th>알오픈</th><th>전환</th><th>로그인클릭</th><th>전환</th><th>로그인완료</th><th>전환</th></tr></thead>
      <tbody>${funnelData.map(f => '<tr><td>' + f.date.slice(5) + '</td><td>' + L(f.entry) + '</td><td>' + L(f.eggTap1) + '</td><td class="cvr">' + pct(f.eggTap1, f.entry) + '%</td><td>' + L(f.eggTap2) + '</td><td class="cvr">' + pct(f.eggTap2, f.eggTap1) + '%</td><td>' + L(f.eggTap3) + '</td><td class="cvr">' + pct(f.eggTap3, f.eggTap2) + '%</td><td>' + L(f.eggOpen) + '</td><td class="cvr">' + pct(f.eggOpen, f.eggTap3) + '%</td><td>' + L(f.eggLoginClick) + '</td><td class="cvr">' + pct(f.eggLoginClick, f.eggOpen) + '%</td><td>' + L(f.eggLogin) + '</td><td class="cvr">' + pct(f.eggLogin, f.eggLoginClick) + '%</td></tr>').join('')}</tbody>
    </table></div></div>
  </div>

  <p class="section__caption">퍼널 추적 이벤트 배포 후부터 데이터가 쌓입니다</p>
</section>

<section class="section">
  <div class="section__head">
    <div class="section__head-left">
      <span class="section__num">05</span>
      <h2 class="section__title">행운추첨</h2>
      <span class="section__subtitle">참여자 · 응모 · 소각</span>
    </div>
    <span class="section__range">Last 14 days</span>
  </div>
  <div class="table-wrap"><div class="table-scroll"><table class="data-table">
    <thead><tr><th>날짜</th><th>참여자수</th><th>응모횟수</th><th>코인소각</th><th>소각비용(원)</th><th>가상참여</th><th>가상응모</th></tr></thead>
    <tbody>${lotteryRows || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">데이터 없음</td></tr>'}</tbody>
  </table></div></div>
</section>

</main>

<footer class="footer">
  <span>Golden Goose · Internal report</span>
  <span>littlesunnydays.com</span>
</footer>


</body>
</html>`);
});

// POST /api/golden-goose/event — 이벤트 트래킹
app.post('/api/golden-goose/event', (req, res) => {
  const { userHash, event, params } = req.body;
  if (!userHash || !event) return res.status(400).json({ error: 'userHash and event required' });
  db.prepare('INSERT INTO gg_events (user_hash, event, params) VALUES (?, ?, ?)').run(userHash, event, params ? JSON.stringify(params) : null);
  res.json({ ok: true });
});

// GET /api/golden-goose/recent-rewards — 티커 피드 (프리미엄 7일 + 일반 24h, 한국명만)
// 30초 인메모리 캐시: 동시 접속자 모두 동일 응답 서빙, SQLite 부하 경감
let _recentRewardsCache = { items: null, expiresAt: 0 };
app.get('/api/golden-goose/recent-rewards', (req, res) => {
  if (_recentRewardsCache.items && Date.now() < _recentRewardsCache.expiresAt) {
    return res.json(_recentRewardsCache.items);
  }
  const premium = db.prepare(`
    SELECT r.user_hash, u.user_name, r.coins, r.reason, r.created_at as time
    FROM gg_reward_log r
    LEFT JOIN gg_users u ON r.user_hash = u.user_hash
    WHERE r.created_at >= datetime('now', '-7 day')
      AND r.coins >= 1000
      AND u.user_name IS NOT NULL
      AND unicode(u.user_name) BETWEEN 44032 AND 55203
    ORDER BY r.coins DESC, r.created_at DESC
    LIMIT 10
  `).all();
  const regular = db.prepare(`
    SELECT * FROM (
      SELECT r.user_hash, u.user_name, r.coins, r.reason, r.created_at as time
      FROM gg_reward_log r
      LEFT JOIN gg_users u ON r.user_hash = u.user_hash
      WHERE r.created_at >= datetime('now', '-24 hours')
        AND r.coins BETWEEN 30 AND 999
        AND u.user_name IS NOT NULL
        AND unicode(u.user_name) BETWEEN 44032 AND 55203
      ORDER BY r.coins DESC LIMIT 30
    ) ORDER BY RANDOM()
  `).all();
  // 눈에 보이는 HH:MM 기준 오름차순 정렬 (날짜 무시 — "오늘 하루 피드" 느낌)
  const rows = [...premium, ...regular].sort((a, b) => {
    const ta = (a.time || '').slice(11, 16);
    const tb = (b.time || '').slice(11, 16);
    return ta.localeCompare(tb);
  });
  const items = rows.map(r => ({
    name: r.user_name ? r.user_name.charAt(0) + '*' + r.user_name.slice(2) : '익명',
    coins: r.coins,
    reason: r.reason || 'reward',
    time: r.time
  }));
  _recentRewardsCache = { items, expiresAt: Date.now() + 30000 };
  res.json(items);
});

// ===== GOLDEN-GOOSE LOTTERY CRON (20:00 KST draw) =====
cron.schedule('0 20 * * *', () => {
  const drawDate = ggLotteryTodayDate();
  try {
    // Call the /draw handler via HTTP to localhost (avoid re-implementing logic)
    fetch(`http://localhost:${PORT}/api/golden-goose/lottery/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawDate, secret: process.env.GG_LOTTERY_SECRET }),
    }).then(r => r.json()).then(result => {
      console.log('[GG Lottery Cron] Draw executed:', drawDate, result.ok ? 'OK' : result.error);
    }).catch(err => console.error('[GG Lottery Cron] Draw failed:', err));
  } catch (err) {
    console.error('[GG Lottery Cron] schedule error:', err);
  }
}, { timezone: 'Asia/Seoul' });
console.log('[GG Lottery Cron] scheduled: 20:00 Asia/Seoul daily');

// 19:50 응모 유도 푸시 — 오늘 미응모 유저 대상
cron.schedule('50 19 * * *', async () => {
  try {
    const tid = ggLotteryRemindTemplateId;
    if (!tid) { console.log('[GG Lottery Push] 19:50 skipped — no remind template id'); return; }
    const drawDate = ggLotteryTodayDate();
    const agg = db.prepare('SELECT COALESCE(SUM(tickets),0) as rt FROM gg_lottery_entries WHERE draw_date = ?').get(drawDate);
    const { prize } = ggLotteryTier(agg.rt);
    const recipients = db.prepare(`
      SELECT user_hash FROM gg_users
      WHERE user_hash NOT IN (SELECT user_hash FROM gg_lottery_entries WHERE draw_date = ?)
    `).all(drawDate);
    console.log(`[GG Lottery Push] 19:50 reminder to ${recipients.length} users, prize=${prize}`);
    let success = 0, fail = 0;
    for (const { user_hash } of recipients) {
      try {
        const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-toss-user-key': user_hash },
          body: JSON.stringify({ templateSetCode: tid, context: { prize: String(prize) } }),
        });
        const data = await resp.json();
        if (data.resultType === 'SUCCESS') success++; else fail++;
      } catch { fail++; }
    }
    console.log(`[GG Lottery Push] 19:50 완료 — 성공: ${success}, 실패: ${fail}`);
  } catch (err) { console.error('[GG Lottery Push] 19:50 error:', err); }
}, { timezone: 'Asia/Seoul' });

// 20:01 당첨자 알림 푸시 (draw 끝난 직후) — 실제 당첨자만 (virtual 제외)
cron.schedule('1 20 * * *', async () => {
  try {
    const tid = ggLotteryWinnerTemplateId;
    if (!tid) { console.log('[GG Lottery Push] 20:01 skipped — no winner template id'); return; }
    const drawDate = ggLotteryTodayDate();
    const winners = db.prepare(`
      SELECT user_hash, rank, prize FROM gg_lottery_winners
      WHERE draw_date = ? AND is_virtual = 0 AND user_hash IS NOT NULL
    `).all(drawDate);
    console.log(`[GG Lottery Push] 20:01 winner notice to ${winners.length} users`);
    let success = 0, fail = 0;
    for (const { user_hash, rank, prize } of winners) {
      try {
        const resp = await ggTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-toss-user-key': user_hash },
          body: JSON.stringify({ templateSetCode: tid, context: { rank: String(rank), prize: String(prize) } }),
        });
        const data = await resp.json();
        if (data.resultType === 'SUCCESS') success++; else fail++;
      } catch { fail++; }
    }
    console.log(`[GG Lottery Push] 20:01 완료 — 성공: ${success}, 실패: ${fail}`);
  } catch (err) { console.error('[GG Lottery Push] 20:01 error:', err); }
}, { timezone: 'Asia/Seoul' });
console.log('[GG Lottery Cron] scheduled: 19:50 reminder + 20:01 winner notice');

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
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Score API running on port ${PORT}`);
  });
}

module.exports = { app };
