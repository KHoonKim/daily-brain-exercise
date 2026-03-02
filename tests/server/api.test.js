// Integration tests for server/server.js
// Uses supertest with an in-memory SQLite database.
// server.js is CommonJS; we load it via createRequire from an ESM Vitest context.

import { createRequire } from 'module';

// Must set TEST_DB before requiring the server so the DB is created in-memory.
process.env.TEST_DB = ':memory:';

const require = createRequire(import.meta.url);
const supertest = require('supertest');

// Lazy-load app once per test file (module cache means it stays the same instance).
let request;

beforeAll(() => {
  // Delete cached module so each test file gets a fresh in-memory DB.
  // (Vitest runs each test file in isolation, so this is a safety measure.)
  delete require.cache[require.resolve('../../server/server.js')];
  const { app } = require('../../server/server.js');
  request = supertest.agent(app);
});

afterAll((done) => {
  request.app?.close ? request.app.close(done) : done();
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
describe('GET /api/score/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/api/score/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.totalScores).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Score submission
// ---------------------------------------------------------------------------
describe('POST /api/score', () => {
  it('accepts a valid score and returns percentile', async () => {
    const res = await request
      .post('/api/score')
      .send({ game: 'math', score: 100, userHash: 'test-user-001' });
    expect(res.status).toBe(200);
    expect(typeof res.body.percentile).toBe('number');
    expect(res.body.percentile).toBeGreaterThanOrEqual(1);
    expect(res.body.percentile).toBeLessThanOrEqual(99);
    expect(typeof res.body.totalPlayers).toBe('number');
  });

  it('returns high percentile for a very high score', async () => {
    // math uses log-normal: median=120, SIGMA=ln(5)/1.28≈1.257
    // score=700: z=(ln700-ln120)/1.257≈1.40 → normalCDF(1.40)≈0.919 → ~92nd percentile
    const res = await request
      .post('/api/score')
      .send({ game: 'math', score: 700, userHash: 'test-user-high' });
    expect(res.status).toBe(200);
    expect(res.body.percentile).toBeGreaterThanOrEqual(88);
  });

  it('returns low percentile for a score of 0', async () => {
    // math mean=120; score 0 → well below mean
    const res = await request
      .post('/api/score')
      .send({ game: 'math', score: 0, userHash: 'test-user-low' });
    expect(res.status).toBe(200);
    expect(res.body.percentile).toBeLessThanOrEqual(50);
  });

  it('returns 400 when score is missing', async () => {
    const res = await request
      .post('/api/score')
      .send({ game: 'math', userHash: 'test-user-001' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when game is missing', async () => {
    const res = await request
      .post('/api/score')
      .send({ score: 100, userHash: 'test-user-001' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when score is negative', async () => {
    const res = await request
      .post('/api/score')
      .send({ game: 'math', score: -1, userHash: 'test-user-001' });
    expect(res.status).toBe(400);
  });

  it('accepts a score without userHash (anonymous)', async () => {
    const res = await request
      .post('/api/score')
      .send({ game: 'memory', score: 60 });
    expect(res.status).toBe(200);
    expect(typeof res.body.percentile).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Game stats
// ---------------------------------------------------------------------------
describe('GET /api/score/stats/:game', () => {
  it('returns stats object with count/avg/max/min', async () => {
    // Submit a score first so we have data
    await request.post('/api/score').send({ game: 'stroop', score: 55, userHash: 'test-stats-user' });

    const res = await request.get('/api/score/stats/stroop');
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.avg).toBe('number');
    expect(typeof res.body.max).toBe('number');
    expect(typeof res.body.min).toBe('number');
  });

  it('returns zero count for a game with no scores', async () => {
    const res = await request.get('/api/score/stats/mirror');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// User personal stats
// ---------------------------------------------------------------------------
describe('GET /api/score/me/:userHash', () => {
  it('returns an object with games array and totals after submitting a score', async () => {
    await request.post('/api/score').send({ game: 'word', score: 180, userHash: 'test-me-user' });

    const res = await request.get('/api/score/me/test-me-user');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.games)).toBe(true);
    expect(res.body.games.length).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.plays).toBe('number');
  });

  it('returns empty games array for unknown user', async () => {
    const res = await request.get('/api/score/me/nonexistent-user-xyz');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.games)).toBe(true);
    expect(res.body.games.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Leaderboard (game-specific)
// ---------------------------------------------------------------------------
describe('GET /api/score/leaderboard/:game', () => {
  it('returns an array (possibly empty on fresh DB)', async () => {
    const res = await request.get('/api/score/leaderboard/math');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns ranked entries after a user with profile submits a score', async () => {
    // Create user profile first (leaderboard joins on users table)
    await request.post('/api/score/user').send({
      user_hash: 'leaderboard-test-user',
      user_name: '리더보드 유저',
    });
    await request.post('/api/score').send({
      game: 'pattern',
      score: 40,
      userHash: 'leaderboard-test-user',
    });

    const res = await request.get('/api/score/leaderboard/pattern');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const entry = res.body[0];
    expect(entry).toHaveProperty('user_name');
    expect(entry).toHaveProperty('best');
  });
});

// ---------------------------------------------------------------------------
// Overall leaderboard
// ---------------------------------------------------------------------------
describe('GET /api/score/overall-leaderboard', () => {
  it('returns an array', async () => {
    const res = await request.get('/api/score/overall-leaderboard');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// User profile save and retrieve
// ---------------------------------------------------------------------------
describe('User profile endpoints', () => {
  it('POST /api/score/user saves a user profile', async () => {
    const res = await request.post('/api/score/user').send({
      user_hash: 'test-user-002',
      user_name: 'Test User',
      user_gender: 'M',
      user_birthday: '1990-01-01',
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/score/user/:userHash retrieves a saved user', async () => {
    await request.post('/api/score/user').send({
      user_hash: 'test-user-003',
      user_name: '홍길동',
      user_gender: 'M',
      user_birthday: '1985-06-15',
    });

    const res = await request.get('/api/score/user/test-user-003');
    expect(res.status).toBe(200);
    expect(res.body.user_name).toBe('홍길동');
    expect(res.body.user_gender).toBe('M');
  });

  it('GET /api/score/user/:userHash returns error for unknown user', async () => {
    const res = await request.get('/api/score/user/does-not-exist-xyz');
    expect(res.status).toBe(200);
    expect(res.body.error).toBe('not found');
  });

  it('POST /api/score/user returns 400 when user_hash is missing', async () => {
    const res = await request.post('/api/score/user').send({ user_name: 'No Hash' });
    expect(res.status).toBe(400);
  });

  it('POST /api/score/user updates an existing user on conflict', async () => {
    await request.post('/api/score/user').send({
      user_hash: 'update-user',
      user_name: 'Original Name',
    });
    await request.post('/api/score/user').send({
      user_hash: 'update-user',
      user_name: 'Updated Name',
    });
    const res = await request.get('/api/score/user/update-user');
    expect(res.body.user_name).toBe('Updated Name');
  });
});

// ---------------------------------------------------------------------------
// User rank
// ---------------------------------------------------------------------------
describe('GET /api/score/rank/:game/:userHash', () => {
  it('returns rank info after submitting a score', async () => {
    await request.post('/api/score').send({
      game: 'focus',
      score: 150,
      userHash: 'rank-test-user',
    });

    const res = await request.get('/api/score/rank/focus/rank-test-user');
    expect(res.status).toBe(200);
    expect(typeof res.body.rank).toBe('number');
    expect(typeof res.body.best).toBe('number');
    expect(res.body.best).toBe(150);
  });

  it('returns null rank for a user with no scores', async () => {
    const res = await request.get('/api/score/rank/focus/no-scores-user-xyz');
    expect(res.status).toBe(200);
    expect(res.body.rank).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Promo check
// ---------------------------------------------------------------------------
describe('GET /api/score/promo/check/:userHash/:promoType', () => {
  it('returns granted=false initially', async () => {
    const res = await request.get('/api/score/promo/check/test-user-001/firstWorkout');
    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(false);
    expect(res.body.detail).toBeNull();
  });

  it('returns granted=true after recording a promo', async () => {
    await request.post('/api/score/promo/record').send({
      userHash: 'promo-test-user',
      promoType: 'firstWorkout',
    });

    const res = await request.get('/api/score/promo/check/promo-test-user/firstWorkout');
    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Promo record
// ---------------------------------------------------------------------------
describe('POST /api/score/promo/record', () => {
  it('records a promo grant', async () => {
    const res = await request.post('/api/score/promo/record').send({
      userHash: 'promo-record-user',
      promoType: 'firstLogin',
      amount: 500,
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('silently ignores a duplicate record (INSERT OR IGNORE)', async () => {
    await request.post('/api/score/promo/record').send({
      userHash: 'dup-promo-user',
      promoType: 'firstLogin',
    });
    // Server uses INSERT OR IGNORE, so duplicate returns ok (not an error)
    const res = await request.post('/api/score/promo/record').send({
      userHash: 'dup-promo-user',
      promoType: 'firstLogin',
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 400 when userHash is missing', async () => {
    const res = await request.post('/api/score/promo/record').send({ promoType: 'firstLogin' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Promo list
// ---------------------------------------------------------------------------
describe('GET /api/score/promo/list/:userHash', () => {
  it('returns an array of grants', async () => {
    await request.post('/api/score/promo/record').send({
      userHash: 'list-promo-user',
      promoType: 'firstLogin',
    });
    const res = await request.get('/api/score/promo/list/list-promo-user');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Point exchange
// The exchange endpoint checks server-side points (users.points), not client-provided.
// We must create the user and credit points before testing the exchange.
// ---------------------------------------------------------------------------
describe('POST /api/score/promo/exchange', () => {
  beforeAll(async () => {
    // Create exchange-user with 200 points so exchange succeeds
    await request.post('/api/score/user').send({ user_hash: 'exchange-user', user_name: 'Exchanger' });
    await request.post('/api/score/points/add').send({ userHash: 'exchange-user', amount: 200 });

    // Create exchange-user2 with only 50 points so exchange fails with 400
    await request.post('/api/score/user').send({ user_hash: 'exchange-user2', user_name: 'Exchanger2' });
    await request.post('/api/score/points/add').send({ userHash: 'exchange-user2', amount: 50 });

    // Create history-user with 200 points for the history test
    await request.post('/api/score/user').send({ user_hash: 'history-user', user_name: 'HistoryUser' });
    await request.post('/api/score/points/add').send({ userHash: 'history-user', amount: 200 });
  });

  it('records a point exchange', async () => {
    const res = await request.post('/api/score/promo/exchange').send({
      userHash: 'exchange-user',
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.exchangeId).toBe('number');
  });

  it('returns 400 for insufficient points (less than 100)', async () => {
    const res = await request.post('/api/score/promo/exchange').send({
      userHash: 'exchange-user2',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('insufficient_points');
  });

  it('returns 400 when userHash is missing', async () => {
    const res = await request.post('/api/score/promo/exchange').send({});
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Exchange history
// ---------------------------------------------------------------------------
describe('GET /api/score/promo/exchanges/:userHash', () => {
  it('returns an array of exchanges', async () => {
    // history-user was created with 200 points in the beforeAll above;
    // perform the exchange here so the history has at least one record.
    await request.post('/api/score/promo/exchange').send({ userHash: 'history-user' });
    const res = await request.get('/api/score/promo/exchanges/history-user');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Disconnect (requires Basic auth)
// ---------------------------------------------------------------------------
describe('Disconnect endpoints', () => {
  it('GET /api/score/disconnect returns 401 without auth', async () => {
    const res = await request.get('/api/score/disconnect').query({ userKey: '12345' });
    expect(res.status).toBe(401);
  });

  it('POST /api/score/disconnect returns 401 without auth', async () => {
    const res = await request.post('/api/score/disconnect').send({ userKey: '12345' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------
describe('Admin endpoints', () => {
  it('POST /api/admin/recalibrate returns 503 when ADMIN_SECRET is not set', async () => {
    const savedSecret = process.env.ADMIN_SECRET;
    delete process.env.ADMIN_SECRET;

    const res = await request
      .post('/api/admin/recalibrate')
      .set('x-admin-secret', 'anything');
    expect(res.status).toBe(503);

    process.env.ADMIN_SECRET = savedSecret;
  });

  it('POST /api/admin/recalibrate returns 403 with wrong secret', async () => {
    process.env.ADMIN_SECRET = 'correct-secret';

    const res = await request
      .post('/api/admin/recalibrate')
      .set('x-admin-secret', 'wrong-secret');
    expect(res.status).toBe(403);

    delete process.env.ADMIN_SECRET;
  });

  it('POST /api/admin/recalibrate returns 200 with correct secret', async () => {
    process.env.ADMIN_SECRET = 'correct-secret';

    const res = await request
      .post('/api/admin/recalibrate')
      .set('x-admin-secret', 'correct-secret');
    expect(res.status).toBe(200);
    expect(typeof res.body.updated).toBe('number');

    delete process.env.ADMIN_SECRET;
  });

  it('POST /api/admin/reset-db returns 403 without correct debug token', async () => {
    const res = await request.post('/api/admin/reset-db').set('x-debug-token', 'wrong');
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/reset-db returns 200 with correct debug token', async () => {
    const res = await request
      .post('/api/admin/reset-db')
      .set('x-debug-token', 'brain-debug-reset-2026');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Overall rank
// ---------------------------------------------------------------------------
describe('GET /api/score/overall-rank/:userHash', () => {
  it('returns rank info after submitting a score', async () => {
    await request.post('/api/score/user').send({
      user_hash: 'overall-rank-user',
      user_name: '전체랭킹유저',
    });
    await request.post('/api/score').send({
      game: 'math',
      score: 200,
      userHash: 'overall-rank-user',
    });

    const res = await request.get('/api/score/overall-rank/overall-rank-user');
    expect(res.status).toBe(200);
    expect(typeof res.body.rank).toBe('number');
    expect(typeof res.body.total).toBe('number');
  });

  it('returns null rank for unknown user', async () => {
    const res = await request.get('/api/score/overall-rank/nobody-xyz');
    expect(res.status).toBe(200);
    expect(res.body.rank).toBeNull();
  });
});
