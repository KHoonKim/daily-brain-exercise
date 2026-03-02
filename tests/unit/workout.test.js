import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const BASE = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise';

function makeCtx() {
  const store = {};
  const mockLS = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  const ctx = createContext({
    localStorage: mockLS,
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Array, Object, String, Number, Boolean, Promise,
    // Stubs required by utils.js
    snackbar: () => {},
    toast: () => {},
    pendingCoins: 0,
    wkActive: false,
    document: {
      getElementById: () => null,
      createElement: () => ({ style: {}, className: '', textContent: '' }),
      body: { appendChild: () => {} },
      title: '',
    },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    API_BASE: 'http://localhost:3001',
    curGoal: 0,
    // Stubs needed by workout.js but not under test
    GI: {},
    goHome: () => {},
    startGame: () => {},
    showWkTransition: () => {},
  });

  // Load config first (defines GAMES, RANKS, GI)
  runInContext(readFileSync(`${BASE}/src/core/config.js`, 'utf-8'), ctx);
  // Load utils (defines LS, getDayKey, getXP, addXP, addPoints, etc.)
  runInContext(readFileSync(`${BASE}/src/core/utils.js`, 'utf-8'), ctx);
  // Load workout (defines getTodayWorkout, saveWorkout, etc.)
  runInContext(readFileSync(`${BASE}/src/core/workout.js`, 'utf-8'), ctx);

  // Expose key symbols for tests
  runInContext(`
    __getTodayWorkout__ = getTodayWorkout;
    __saveWorkout__ = saveWorkout;
    __wkOnGameEnd__ = wkOnGameEnd;
    __GAMES__ = GAMES;
    __LS__ = LS;
    __getDayKey__ = getDayKey;
    __getXP__ = getXP;
  `, ctx);

  ctx._rawLS = mockLS;
  return ctx;
}

describe('getTodayWorkout', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns an object with a games array', () => {
    const wk = ctx.__getTodayWorkout__();
    expect(typeof wk).toBe('object');
    expect(Array.isArray(wk.games)).toBe(true);
  });

  it('games array contains exactly 3 game IDs', () => {
    const wk = ctx.__getTodayWorkout__();
    expect(wk.games.length).toBe(3);
  });

  it('all 3 game IDs are valid entries in the GAMES config', () => {
    const wk = ctx.__getTodayWorkout__();
    const validIds = new Set(ctx.__GAMES__.map(g => g.id));
    for (const id of wk.games) {
      expect(validIds.has(id)).toBe(true);
    }
  });

  it('has done array initially empty', () => {
    const wk = ctx.__getTodayWorkout__();
    expect(Array.isArray(wk.done)).toBe(true);
    expect(wk.done.length).toBe(0);
  });

  it('has completed flag initially false', () => {
    const wk = ctx.__getTodayWorkout__();
    expect(wk.completed).toBe(false);
  });

  it('calling twice on the same day returns the same 3 games (deterministic cache)', () => {
    const first = ctx.__getTodayWorkout__();
    const second = ctx.__getTodayWorkout__();
    expect(second.games).toEqual(first.games);
  });

  it('games array has no duplicate IDs', () => {
    const wk = ctx.__getTodayWorkout__();
    const unique = new Set(wk.games);
    expect(unique.size).toBe(3);
  });

  it('has a scores object initially', () => {
    const wk = ctx.__getTodayWorkout__();
    expect(typeof wk.scores).toBe('object');
    expect(wk.scores).not.toBeNull();
  });
});

describe('saveWorkout', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('persists changes to localStorage', () => {
    const wk = ctx.__getTodayWorkout__();
    wk.done.push(wk.games[0]);
    ctx.__saveWorkout__(wk);

    // Re-read from localStorage by calling getTodayWorkout again
    const reloaded = ctx.__getTodayWorkout__();
    expect(reloaded.done).toContain(wk.games[0]);
  });

  it('persists the completed flag', () => {
    const wk = ctx.__getTodayWorkout__();
    wk.completed = true;
    ctx.__saveWorkout__(wk);

    const reloaded = ctx.__getTodayWorkout__();
    expect(reloaded.completed).toBe(true);
  });

  it('persists scores', () => {
    const wk = ctx.__getTodayWorkout__();
    const gameId = wk.games[0];
    wk.scores[gameId] = 42;
    ctx.__saveWorkout__(wk);

    const reloaded = ctx.__getTodayWorkout__();
    expect(reloaded.scores[gameId]).toBe(42);
  });
});

describe('wkOnGameEnd', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('adds gameId to done array', () => {
    const wk = ctx.__getTodayWorkout__();
    const gameId = wk.games[0];
    ctx.__wkOnGameEnd__(gameId, 100);

    const updated = ctx.__getTodayWorkout__();
    expect(updated.done).toContain(gameId);
  });

  it('records the score for the game', () => {
    const wk = ctx.__getTodayWorkout__();
    const gameId = wk.games[0];
    ctx.__wkOnGameEnd__(gameId, 77);

    const updated = ctx.__getTodayWorkout__();
    expect(updated.scores[gameId]).toBe(77);
  });

  it('does not add duplicate entries to done when called twice', () => {
    const wk = ctx.__getTodayWorkout__();
    const gameId = wk.games[0];
    ctx.__wkOnGameEnd__(gameId, 50);
    ctx.__wkOnGameEnd__(gameId, 60);

    const updated = ctx.__getTodayWorkout__();
    const occurrences = updated.done.filter(id => id === gameId).length;
    expect(occurrences).toBe(1);
  });
});

describe('workout completion detection in renderWorkout / finishWorkout logic', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('workout is not completed after 2 of 3 games done', () => {
    const wk = ctx.__getTodayWorkout__();
    ctx.__wkOnGameEnd__(wk.games[0], 10);
    ctx.__wkOnGameEnd__(wk.games[1], 20);

    const updated = ctx.__getTodayWorkout__();
    expect(updated.done.length).toBe(2);
    expect(updated.completed).toBe(false);
  });

  it('done array length reaches 3 after all games completed via wkOnGameEnd', () => {
    const wk = ctx.__getTodayWorkout__();
    ctx.__wkOnGameEnd__(wk.games[0], 10);
    ctx.__wkOnGameEnd__(wk.games[1], 20);
    ctx.__wkOnGameEnd__(wk.games[2], 30);

    const updated = ctx.__getTodayWorkout__();
    expect(updated.done.length).toBe(3);
  });
});
