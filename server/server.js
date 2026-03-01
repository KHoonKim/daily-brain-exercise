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
const disconnectCors = cors({ origin: '*', credentials: false });
app.options('/api/score/disconnect', disconnectCors);
app.get('/api/score/disconnect', disconnectCors, (req, res) => {
  if (!verifyDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.query;
  if (userKey) handleDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});
app.post('/api/score/disconnect', disconnectCors, (req, res) => {
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

// 심사 승인 후 실제 templateSetCode로 교체
const DAILY_NOTIFY_TEMPLATE = 'PLACEHOLDER_TEMPLATE_SET_CODE';
const BULK_BATCH_SIZE = 2500;

async function sendDailyNotification() {
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
        body: JSON.stringify({ templateSetCode: DAILY_NOTIFY_TEMPLATE, contextList })
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

// 매일 KST 09:00 발송 (Asia/Seoul timezone 기준 "0 9 * * *")
cron.schedule('0 9 * * *', sendDailyNotification, { timezone: 'Asia/Seoul' });

// ===== CASHWORD API =====

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

// POST /api/cashword/exchange — 10코인 차감 + 교환 ID 발급
app.post('/api/cashword/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });

  const row = db.prepare('SELECT coins FROM cashword_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < 10) {
    return res.status(400).json({ error: 'insufficient_coins', coins: row?.coins || 0 });
  }
  // 동시성: 10초 내 중복 교환 차단
  const recent = db.prepare(
    "SELECT id FROM cashword_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds') AND status = 'pending'"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast' });

  const doExchange = db.transaction(() => {
    db.prepare('UPDATE cashword_coins SET coins = coins - 10, updated_at = CURRENT_TIMESTAMP WHERE user_hash = ?').run(userHash);
    return db.prepare(
      'INSERT INTO cashword_exchanges (user_hash, coins_spent, toss_points, status) VALUES (?, 10, 1, ?)'
    ).run(userHash, 'pending');
  });
  const result = doExchange();
  res.json({ exchangeId: result.lastInsertRowid });
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
    db.prepare('UPDATE cashword_coins SET coins = coins + 10 WHERE user_hash = ?').run(row.user_hash);
    db.prepare("UPDATE cashword_exchanges SET status = 'cancelled' WHERE id = ?").run(id);
  })();
  res.json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Score API running on port ${PORT}`);
  });
}

module.exports = { app };
