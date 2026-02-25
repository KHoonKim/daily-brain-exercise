const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// DB setup
const db = new Database(path.join(__dirname, 'scores.db'));
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

// Users table for Toss profile
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_hash TEXT PRIMARY KEY,
    user_name TEXT,
    user_gender TEXT,
    user_birthday TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(cors());
app.use(express.json());

// Estimated distributions per game (mean, stddev)
// Calibrated by analyzing actual scoring mechanics:
// - Timer games (30s): ~10pts/correct, ~1-2s/question → 15-20 correct → 150-200pts avg
// - Level games (hearts=3): survive ~5-8 levels, scoring = lv*5~10 → 50-150pts
// - Combo games: base 10 + combo multiplier → higher ceiling
// - Special: reaction (formula based), numtouch (300-time*10), timing (accuracy based)
const ESTIMATED = {
  // 30s timer + 10pt/correct + combo multiplier (10/20/30) + time bonus
  math: [180, 80],
  // 30s timer + 10pt/pair + time bonus (remaining*5). 8 pairs max = 80+bonus
  memory: [100, 40],
  // 7 rounds, max(5, (1000-ms)/10) per round. avg 300ms → ~70pts each → total ~490
  reaction: [350, 120],
  // 30s + combo multiplier (10/20/30) + time bonus at 5+ combo
  stroop: [160, 70],
  // Level game: lv*5 pts. Hearts=3. avg reach lv6-8 → 105-180pts
  sequence: [100, 50],
  // 30s + 20pt/word. ~3-5 words found → 60-100pts
  word: [80, 35],
  // 30s + 10pt*(1+combo/3). With combo → ~120pts avg
  pattern: [120, 55],
  // 30s, +10 good +30 bonus -5 bad. ~15-25 hits → 150-250pts
  focus: [180, 70],
  // 30s + 10pt/correct. ~8-12 correct → 80-120pts
  rotate: [90, 40],
  // Level game: lv*5 pts. Hearts=3. avg reach lv5-7 → 75-140pts
  reverse: [80, 40],
  // Speed: 300 - time*10. Fast=15s→150, slow=25s→50. avg ~20s → 100pts
  numtouch: [100, 50],
  // Level game: lv*10 pts. Hearts=3. avg reach lv4-6 → 100-210pts
  rhythm: [100, 55],
  // 30s + 10pt/correct. ~12-18 correct → 120-180pts
  rps: [140, 55],
  // 30s + (10+lv*2)/correct. Scales up. ~15-20 picks → 200-300pts
  oddone: [200, 80],
  // 30s + 10pt/correct. ~15-20 correct → 150-200pts
  compare: [160, 60],
  // Level game: lv*10 pts. Hearts=3. avg reach lv4-6 → 100-210pts
  bulb: [100, 55],
  // 30s + 10pt/correct. ~8-12 correct → 80-120pts
  colormix: [90, 40],
  // 30s + 10pt/correct. ~10-15 correct → 100-150pts
  wordcomp: [110, 45],
  // Accuracy-based. ~5-10 rounds, varying points. avg ~80-120pts
  timing: [90, 45],
  // 30s + 15pt/pair + time bonus. Multiple sets possible → 150-250pts
  matchpair: [180, 70],
  // 30s + 10pt/correct. ~8-12 correct → 80-120pts
  headcount: [90, 40],
  // 30s + 10pt/correct. ~6-10 correct → 60-100pts
  pyramid: [70, 35],
  // 30s + (10+lv)/correct, scaling. ~12-18 correct → 150-250pts
  maxnum: [160, 65],
  // 30s + 10pt/correct, difficulty scales. ~10-15 correct → 100-150pts
  signfind: [110, 45],
  // 30s + 10pt/correct, coin count scales. ~8-12 correct → 80-120pts
  coincount: [90, 40],
  // 20s total + 10pt/correct. ~6-10 correct → 60-100pts
  clock: [70, 35],
  // Level game: 10pt/word found + lv*5 bonus. All words → ~80-150pts
  wordmem: [90, 45],
  // 30s + 10pt/correct. ~8-12 correct → 80-120pts
  blockcount: [90, 40],
  // 30s + 10pt/correct. ~12-18 correct → 120-180pts
  flanker: [140, 55],
  // Level game: 10pt/cell. avg 4-7 levels → 60-120pts
  memgrid: [80, 40],
  // 30s + 10pt/correct. ~8-14 correct → 80-140pts
  nback: [100, 45],
  // 30s + 10pt/correct. ~8-12 correct → 80-120pts
  scramble: [90, 40],
  // 30s + 10pt/correct + 20pt bonus at 0. ~10-15 correct → 100-170pts
  serial: [120, 50],
  // 30s + 10pt/correct. ~12-18 correct → 120-180pts
  leftright: [140, 55],
  // 30s + 10pt/correct. ~10-15 correct → 100-150pts
  calccomp: [110, 45],
  // Level game: 10+lv*5 pts. Hearts=3. avg reach lv4-7 → 70-175pts
  flash: [90, 45],
  // 30s + 10pt + combo bonus(10). ~12-18 correct → 120-220pts
  sort: [140, 55],
  // 30s + 10pt/correct, transforms scale. ~8-12 correct → 80-120pts
  mirror: [90, 40]
};

// Normal CDF approximation
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p = d * t * (-0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.8212560 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}

function estimatedPercentile(game, score) {
  const [mean, std] = ESTIMATED[game] || [50, 20];
  const z = (score - mean) / std;
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
    if (count >= 10) {
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
    const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
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
    const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/refresh-token`, {
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
    const tokenResp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer })
    });
    const tokenData = await tokenResp.json();
    if (tokenData.resultType !== 'SUCCESS') return res.status(400).json({ error: 'token_failed', detail: tokenData });
    const { accessToken, refreshToken } = tokenData.success;

    // 2. 유저 정보 조회
    const meResp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/user/oauth2/login-me`, {
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
  FIRST_LOGIN: 'PLACEHOLDER_PROMO_FIRST_LOGIN',
  BRAIN_AGE_50: 'PLACEHOLDER_PROMO_BRAIN_AGE_50',
  POINT_100: 'PLACEHOLDER_PROMO_POINT_100',
  FIRST_WORKOUT: 'PLACEHOLDER_PROMO_FIRST_WORKOUT'
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

app.post('/api/score/promo/exchange', (req, res) => {
  const { userHash, points } = req.body;
  if (!userHash || !points) return res.status(400).json({ error: 'userHash and points required' });
  if (points < 100) return res.status(400).json({ error: 'minimum 100 points' });

  // 최근 10초 내 동일 유저 교환 요청 방지 (동시성)
  const recent = db.prepare(
    "SELECT * FROM point_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds')"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast', message: '잠시 후 다시 시도해주세요' });

  // 교환 기록
  const result = db.prepare(
    'INSERT INTO point_exchanges (user_hash, points, amount, status) VALUES (?, ?, 100, ?)'
  ).run(userHash, points, 'granted');

  console.log(`[Exchange] user=${userHash} points=${points} → 100원 (id=${result.lastInsertRowid})`);
  res.json({ status: 'ok', exchangeId: result.lastInsertRowid });
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
    const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
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
    const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-test-message`, {
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
        const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
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
        const resp = await fetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-message`, {
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
const DISCONNECT_AUTH = 'brainfit2026:xK9mP3vR7wQ2';
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
  console.log(`[Disconnect] ${referrer || 'UNKNOWN'} — deleted data for userKey: ${userKey}`);
}
app.get('/api/score/disconnect', (req, res) => {
  if (!verifyDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.query;
  if (userKey) handleDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});
app.post('/api/score/disconnect', (req, res) => {
  if (!verifyDisconnectAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { userKey, referrer } = req.body;
  if (userKey) handleDisconnect(userKey, referrer);
  res.json({ status: 'ok' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Score API running on port ${PORT}`);
});
