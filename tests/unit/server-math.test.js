/**
 * Tests for pure math functions from server/server.js.
 *
 * We extract normalCDF using a vm context so we don't trigger the side-effects
 * in server.js (Express setup, SQLite db.open, etc.).
 */
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const SERVER_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/server/server.js';

/**
 * Extract just the normalCDF and estimatedPercentile functions from server.js
 * by locating them in the source and running only those lines in a clean vm context.
 */
function loadServerMathFunctions() {
  const src = readFileSync(SERVER_PATH, 'utf-8');

  // Extract the normalCDF function definition (it's a standalone function declaration)
  const normalCDFMatch = src.match(/\/\/ Normal CDF approximation\s*(function normalCDF[\s\S]*?\})/);
  if (!normalCDFMatch) throw new Error('Could not locate normalCDF in server.js');
  const normalCDFSrc = normalCDFMatch[1];

  // Extract estimatedPercentile (depends on normalCDF and ESTIMATED map)
  const estimatedMatch = src.match(/(function estimatedPercentile[\s\S]*?\})/);
  if (!estimatedMatch) throw new Error('Could not locate estimatedPercentile in server.js');
  const estimatedSrc = estimatedMatch[1];

  const ctx = createContext({ Math, Object, console });

  // Provide a minimal ESTIMATED map (same default as server.js: [50, 20])
  runInContext(`const ESTIMATED = {};`, ctx);
  runInContext(normalCDFSrc, ctx);
  runInContext(estimatedSrc, ctx);

  // Expose functions
  runInContext(`
    __normalCDF__ = normalCDF;
    __estimatedPercentile__ = estimatedPercentile;
  `, ctx);

  return ctx;
}

let ctx;

beforeAll(() => {
  ctx = loadServerMathFunctions();
});

// ---------------------------------------------------------------------------
// normalCDF — Abramowitz & Stegun approximation
// Maximum absolute error ~7.5e-8 for this polynomial variant.
// ---------------------------------------------------------------------------

describe('normalCDF', () => {
  const cdf = (x) => ctx.__normalCDF__(x);

  it('normalCDF(0) ≈ 0.5', () => {
    expect(cdf(0)).toBeCloseTo(0.5, 5);
  });

  it('normalCDF(1.96) ≈ 0.975 (standard 95th percentile)', () => {
    expect(cdf(1.96)).toBeCloseTo(0.975, 2);
  });

  it('normalCDF(-1.96) ≈ 0.025 (lower tail)', () => {
    expect(cdf(-1.96)).toBeCloseTo(0.025, 2);
  });

  it('normalCDF(1) ≈ 0.8413', () => {
    expect(cdf(1)).toBeCloseTo(0.8413, 3);
  });

  it('normalCDF(-1) ≈ 0.1587', () => {
    expect(cdf(-1)).toBeCloseTo(0.1587, 3);
  });

  it('normalCDF(2) ≈ 0.9772', () => {
    expect(cdf(2)).toBeCloseTo(0.9772, 3);
  });

  it('normalCDF(-2) ≈ 0.0228', () => {
    expect(cdf(-2)).toBeCloseTo(0.0228, 3);
  });

  it('symmetry: normalCDF(-x) + normalCDF(x) ≈ 1 for x=1', () => {
    expect(cdf(-1) + cdf(1)).toBeCloseTo(1, 5);
  });

  it('symmetry: normalCDF(-x) + normalCDF(x) ≈ 1 for x=2.5', () => {
    expect(cdf(-2.5) + cdf(2.5)).toBeCloseTo(1, 5);
  });

  it('symmetry: normalCDF(-x) + normalCDF(x) ≈ 1 for x=0.3', () => {
    expect(cdf(-0.3) + cdf(0.3)).toBeCloseTo(1, 5);
  });

  it('monotonically increasing: cdf(-1) < cdf(0) < cdf(1)', () => {
    expect(cdf(-1)).toBeLessThan(cdf(0));
    expect(cdf(0)).toBeLessThan(cdf(1));
  });

  it('output is always in (0, 1)', () => {
    for (const x of [-5, -3, -1, 0, 1, 3, 5]) {
      const v = cdf(x);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('large positive x gives value close to 1', () => {
    expect(cdf(5)).toBeGreaterThan(0.999);
  });

  it('large negative x gives value close to 0', () => {
    expect(cdf(-5)).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------
// estimatedPercentile — uses normalCDF + ESTIMATED defaults
// From server.js:
//   function estimatedPercentile(game, score) {
//     const [mean, std] = ESTIMATED[game] || [50, 20];
//     const z = (score - mean) / std;
//     return Math.max(1, Math.min(99, Math.round(normalCDF(z) * 100)));
//   }
// Default: mean=50, std=20
// ---------------------------------------------------------------------------

describe('estimatedPercentile', () => {
  const ep = (game, score) => ctx.__estimatedPercentile__(game, score);

  it('score at the mean (50) gives ~50th percentile', () => {
    // z=0, normalCDF(0)=0.5, round(50)=50
    expect(ep('math', 50)).toBe(50);
  });

  it('score at 5× median gives ~90th percentile', () => {
    // Log-normal distribution: SIGMA = ln(5)/1.28 ≈ 1.257
    // score=250, median=50 (empty ESTIMATED → default [50,20], only median used)
    // z = ln(250/50) / SIGMA = ln(5) / (ln(5)/1.28) = 1.28 → normalCDF(1.28) ≈ 0.8997 → 90
    expect(ep('math', 250)).toBeCloseTo(90, 0);
  });

  it('score at 1/5 of median gives ~10th percentile', () => {
    // z = ln(10/50) / SIGMA = ln(0.2) / (ln(5)/1.28) = -1.28 → normalCDF(-1.28) ≈ 0.1003 → 10
    expect(ep('math', 10)).toBeCloseTo(10, 0);
  });

  it('very high score is capped at 99', () => {
    // z is very large → CDF ≈ 1 → would be 100, capped at 99
    expect(ep('math', 10000)).toBe(99);
  });

  it('very low score (or 0) is capped at 1', () => {
    // z is very negative → CDF ≈ 0 → would be 0, capped at 1
    expect(ep('math', 0)).toBe(1);
    expect(ep('math', -9999)).toBe(1);
  });

  it('returns integer (result of Math.round)', () => {
    const result = ep('math', 55);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('result is always between 1 and 99 inclusive', () => {
    for (const score of [0, 10, 50, 90, 200, 1000]) {
      const result = ep('math', score);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(99);
    }
  });

  it('unknown game uses default [50, 20] distribution', () => {
    // Same as 'math' since both use the default
    expect(ep('unknown-game', 50)).toBe(ep('math', 50));
  });
});
