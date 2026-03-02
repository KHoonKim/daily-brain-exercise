// Percentile math tests for server/server.js
// Tests normalCDF and estimatedPercentile behavior via the POST /api/score endpoint
// since those functions are not exported individually.

import { createRequire } from 'module';

process.env.TEST_DB = ':memory:';

const require = createRequire(import.meta.url);
const supertest = require('supertest');

let request;

beforeAll(() => {
  delete require.cache[require.resolve('../../server/server.js')];
  const { app } = require('../../server/server.js');
  // Use agent() to maintain a persistent HTTP server across all tests in this file,
  // preventing per-request server creation/teardown that causes occasional 404s.
  request = supertest.agent(app);
});

afterAll((done) => {
  request.app?.close ? request.app.close(done) : done();
});

// Helper: submit a score and return the response body
async function submitScore(game, score, userHash = 'percentile-test-user') {
  const res = await request.post('/api/score').send({ game, score, userHash });
  expect(res.status).toBe(200);
  return res.body;
}

// ---------------------------------------------------------------------------
// normalCDF behavior via score submissions
// The estimated percentile is computed as:
//   z = (score - mean) / std
//   percentile = clamp(round(normalCDF(z) * 100), 1, 99)
// ---------------------------------------------------------------------------

describe('normalCDF approximation via estimatedPercentile', () => {
  it('percentile is always between 1 and 99 (inclusive)', async () => {
    const cases = [
      { game: 'math', score: 0 },
      { game: 'math', score: 120 },   // mean
      { game: 'math', score: 1000 },  // extreme high
      { game: 'memory', score: 0 },
      { game: 'memory', score: 80 },  // mean
      { game: 'reaction', score: 999 },
    ];
    for (const { game, score } of cases) {
      const body = await submitScore(game, score, `bounds-user-${game}-${score}`);
      expect(body.percentile).toBeGreaterThanOrEqual(1);
      expect(body.percentile).toBeLessThanOrEqual(99);
    }
  });

  it('score equal to mean yields percentile near 50', async () => {
    // math mean=120 std=48; z=0 → normalCDF(0)=0.5 → percentile=50
    const body = await submitScore('math', 120, 'mean-test-user');
    // Allow ±5 due to rounding
    expect(body.percentile).toBeGreaterThanOrEqual(45);
    expect(body.percentile).toBeLessThanOrEqual(55);
  });

  it('score at 5× game median gives ~90th percentile', async () => {
    // estimatedPercentile uses log-normal: SIGMA=ln(5)/1.28≈1.257
    // colormix median=70; score=350=5×70 → z=ln(5)/SIGMA=1.28 → normalCDF(1.28)≈90
    // Use unique game 'colormix' here so count=1 (pure estimated, no blending)
    const body = await submitScore('colormix', 350, 'lognormal-high-user');
    expect(body.percentile).toBeGreaterThanOrEqual(85);
    expect(body.percentile).toBeLessThanOrEqual(95);
  });

  it('score at 1/5 of game median gives ~10th percentile', async () => {
    // wordcomp median=80; score=16=80/5 → z=-ln(5)/SIGMA=-1.28 → normalCDF(-1.28)≈10
    // Use unique game 'wordcomp' so count=1 (pure estimated, no blending)
    const body = await submitScore('wordcomp', 16, 'lognormal-low-user');
    expect(body.percentile).toBeGreaterThanOrEqual(5);
    expect(body.percentile).toBeLessThanOrEqual(15);
  });

  it('score at 10× game median gives ~97th percentile', async () => {
    // coincount median=50; score=500=10×50 → z=ln(10)/SIGMA≈1.83 → normalCDF(1.83)≈97
    // Use unique game 'coincount' so count=1 (pure estimated, no blending)
    const body = await submitScore('coincount', 500, 'lognormal-veryhigh-user');
    expect(body.percentile).toBeGreaterThanOrEqual(93);
    expect(body.percentile).toBeLessThanOrEqual(99);
  });

  it('score at 1/10 of game median gives ~3rd percentile', async () => {
    // clock median=70; score=7=70/10 → z=-ln(10)/SIGMA≈-1.83 → normalCDF(-1.83)≈3
    // Use unique game 'clock' so count=1 (pure estimated, no blending)
    const body = await submitScore('clock', 7, 'lognormal-verylow-user');
    expect(body.percentile).toBeGreaterThanOrEqual(1);
    expect(body.percentile).toBeLessThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// estimatedPercentile: game-specific mean/std values
// ---------------------------------------------------------------------------

describe('estimatedPercentile uses correct game parameters', () => {
  // memory: mean=80, std=32
  it('memory game - mean score yields ~50th percentile', async () => {
    const body = await submitScore('memory', 80, 'memory-mean-user');
    expect(body.percentile).toBeGreaterThanOrEqual(45);
    expect(body.percentile).toBeLessThanOrEqual(55);
  });

  // stroop: mean=50, std=20
  it('stroop game - mean score yields ~50th percentile', async () => {
    const body = await submitScore('stroop', 50, 'stroop-mean-user');
    expect(body.percentile).toBeGreaterThanOrEqual(45);
    expect(body.percentile).toBeLessThanOrEqual(55);
  });

  // sequence: median=150, SIGMA=ln(5)/1.28; score=750=5×150 → z=1.28 → normalCDF(1.28)≈90
  it('sequence game - score at 5× median yields ~90th percentile', async () => {
    const body = await submitScore('sequence', 750, 'sequence-high-user');
    expect(body.percentile).toBeGreaterThanOrEqual(85);
  });

  // unknown game falls back to [50, 20]
  it('unknown game falls back to default [50, 20] parameters', async () => {
    // At score=50 (fallback mean), expect ~50th percentile
    const body = await submitScore('unknowngame', 50, 'unknown-game-user');
    expect(body.percentile).toBeGreaterThanOrEqual(45);
    expect(body.percentile).toBeLessThanOrEqual(55);
  });
});

// ---------------------------------------------------------------------------
// percentile source transitions
// ---------------------------------------------------------------------------

describe('percentile source field', () => {
  it('source is "estimated" when fewer than 5 scores exist for the game', async () => {
    // Use a game name unlikely to have prior scores in this test run
    const body = await submitScore('rotate', 30, 'source-test-user-1');
    expect(body.source).toBe('estimated');
  });
});

// ---------------------------------------------------------------------------
// Score of zero is accepted (edge case)
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('score of 0 is accepted and returns a valid percentile', async () => {
    const body = await submitScore('math', 0, 'zero-score-user');
    expect(typeof body.percentile).toBe('number');
    expect(body.percentile).toBeGreaterThanOrEqual(1);
    expect(body.percentile).toBeLessThanOrEqual(99);
  });

  it('very large score is clamped to 99', async () => {
    const body = await submitScore('math', 999999, 'huge-score-user');
    expect(body.percentile).toBe(99);
  });

  it('response includes totalPlayers count', async () => {
    const body = await submitScore('math', 100, 'count-check-user');
    expect(typeof body.totalPlayers).toBe('number');
    expect(body.totalPlayers).toBeGreaterThanOrEqual(1);
  });
});
