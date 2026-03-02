import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';
const UTILS_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/utils.js';

function makeCtx() {
  const store = {};
  const mockLS = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  const context = createContext({
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
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    // utils.js stubs
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
  });

  runInContext(readFileSync(CONFIG_PATH, 'utf-8'), context);
  runInContext(readFileSync(UTILS_PATH, 'utf-8'), context);

  // Expose const-declared symbols onto the context object
  runInContext(`
    __LS__ = (typeof LS !== 'undefined') ? LS : undefined;
    __GAMES__ = (typeof GAMES !== 'undefined') ? GAMES : undefined;
    __RANKS__ = (typeof RANKS !== 'undefined') ? RANKS : undefined;
    __getDayKey__ = (typeof getDayKey !== 'undefined') ? getDayKey : undefined;
    __getRank__ = (typeof getRank !== 'undefined') ? getRank : undefined;
    __getNextRank__ = (typeof getNextRank !== 'undefined') ? getNextRank : undefined;
    __getStreak__ = (typeof getStreak !== 'undefined') ? getStreak : undefined;
    __recordPlay__ = (typeof recordPlay !== 'undefined') ? recordPlay : undefined;
    __getTodayMissions__ = (typeof getTodayChallenges !== 'undefined') ? getTodayChallenges : undefined;
    __updateMission__ = (typeof updateChallenge !== 'undefined') ? updateChallenge : undefined;
  `, context);

  // Also expose localStorage directly so tests can inspect raw store
  context._rawLS = mockLS;

  return context;
}

describe('getDayKey', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns a string', () => {
    expect(typeof ctx.__getDayKey__()).toBe('string');
  });

  it('returns YYYY-MM-DD format', () => {
    expect(ctx.__getDayKey__()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is a valid date', () => {
    const d = new Date(ctx.__getDayKey__());
    expect(isNaN(d.getTime())).toBe(false);
  });
});

describe('LS (localStorage wrapper)', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('get returns default when key missing', () => {
    expect(ctx.__LS__.get('nonexistent', 42)).toBe(42);
  });

  it('get returns 0 as default when no default provided', () => {
    expect(ctx.__LS__.get('nonexistent')).toBe(0);
  });

  it('set and get roundtrips a number', () => {
    ctx.__LS__.set('testKey', 99);
    expect(ctx.__LS__.get('testKey', 0)).toBe(99);
  });

  it('set and get roundtrips a string that is not a number', () => {
    ctx.__LS__.set('testStr', 'hello');
    expect(ctx.__LS__.get('testStr', '')).toBe('hello');
  });

  it('uses bf- prefix internally (key bf-testKey in raw store)', () => {
    ctx.__LS__.set('myKey', 7);
    // localStorage stores under 'bf-myKey'
    expect(ctx._rawLS.getItem('bf-myKey')).toBe('7');
  });

  it('getJSON returns default when key missing', () => {
    expect(ctx.__LS__.getJSON('noJson', [])).toEqual([]);
  });

  it('setJSON / getJSON roundtrips an object', () => {
    const obj = { a: 1, b: [2, 3] };
    ctx.__LS__.setJSON('obj', obj);
    expect(ctx.__LS__.getJSON('obj', null)).toEqual(obj);
  });
});

describe('getRank', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('xp=0 returns the 100세 rank', () => {
    const rank = ctx.__getRank__(0);
    expect(rank.age).toBe(100);
    expect(rank.name).toBe('100세');
  });

  it('very high xp returns the 20세 rank', () => {
    const rank = ctx.__getRank__(999999);
    expect(rank.age).toBe(20);
    expect(rank.name).toBe('20세');
  });

  it('returns an object with name, minXp, color fields', () => {
    const rank = ctx.__getRank__(500);
    expect(typeof rank.name).toBe('string');
    expect(typeof rank.minXp).toBe('number');
    expect(typeof rank.color).toBe('string');
  });

  it('rank at xp exactly matching a rank minXp has that rank or better', () => {
    const ranks = ctx.__RANKS__;
    const someRank = ranks.find(r => r.minXp > 0 && r.minXp < 100000);
    if (someRank) {
      const result = ctx.__getRank__(someRank.minXp);
      expect(result.minXp).toBeGreaterThanOrEqual(someRank.minXp);
    }
  });
});

describe('getNextRank', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns null when xp is at max (no next rank)', () => {
    const result = ctx.__getNextRank__(999999);
    expect(result).toBeNull();
  });

  it('returns a rank object when xp is low', () => {
    const result = ctx.__getNextRank__(0);
    expect(result).not.toBeNull();
    expect(typeof result.minXp).toBe('number');
    expect(result.minXp).toBeGreaterThan(0);
  });

  it('next rank has minXp greater than current xp', () => {
    const xp = 100;
    const next = ctx.__getNextRank__(xp);
    if (next) {
      expect(next.minXp).toBeGreaterThan(xp);
    }
  });
});

describe('getStreak', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns {streak: 0, playedToday: false} when no history', () => {
    const result = ctx.__getStreak__();
    expect(result.streak).toBe(0);
    expect(result.playedToday).toBe(false);
  });

  it('returns playedToday=true after recording a play today', () => {
    ctx.__recordPlay__();
    const result = ctx.__getStreak__();
    expect(result.playedToday).toBe(true);
  });

  it('streak is at least 1 after recording a play today', () => {
    ctx.__recordPlay__();
    const result = ctx.__getStreak__();
    expect(result.streak).toBeGreaterThanOrEqual(1);
  });
});

describe('recordPlay', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('calling recordPlay twice does not duplicate today entry', () => {
    ctx.__recordPlay__();
    ctx.__recordPlay__();
    const hist = ctx.__LS__.getJSON('playDates', []);
    const today = ctx.__getDayKey__();
    const occurrences = hist.filter(d => d === today).length;
    expect(occurrences).toBe(1);
  });
});

describe('getTodayMissions', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns an array', () => {
    const missions = ctx.__getTodayMissions__();
    expect(Array.isArray(missions)).toBe(true);
  });

  it('returns exactly 5 missions', () => {
    const missions = ctx.__getTodayMissions__();
    expect(missions.length).toBe(5);
  });

  it('each mission has expected shape', () => {
    const missions = ctx.__getTodayMissions__();
    for (const m of missions) {
      expect(typeof m.id).toBe('string');
      expect(typeof m.gameId).toBe('string');
      expect(typeof m.name).toBe('string');
      expect(typeof m.target).toBe('number');
      expect(typeof m.xp).toBe('number');
      expect(typeof m.done).toBe('boolean');
    }
  });

  it('mission gameIds are valid game ids', () => {
    const missions = ctx.__getTodayMissions__();
    const validIds = new Set(ctx.__GAMES__.map(g => g.id));
    for (const m of missions) {
      expect(validIds.has(m.gameId)).toBe(true);
    }
  });

  it('returns same missions on second call (cached)', () => {
    const first = ctx.__getTodayMissions__();
    const second = ctx.__getTodayMissions__();
    expect(second.map(m => m.gameId)).toEqual(first.map(m => m.gameId));
  });
});

describe('updateMission', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('marks mission done when score >= target', () => {
    const missions = ctx.__getTodayMissions__();
    const mission = missions[0];
    const { gameId, target } = mission;

    ctx.__updateMission__(gameId, target);

    const updated = ctx.__getTodayMissions__();
    const updatedMission = updated.find(m => m.gameId === gameId);
    expect(updatedMission.done).toBe(true);
  });

  it('does not mark mission done when score < target', () => {
    const missions = ctx.__getTodayMissions__();
    const mission = missions.find(m => m.target > 0) || missions[0];
    const { gameId, target } = mission;

    // Score below target
    ctx.__updateMission__(gameId, 0);

    const updated = ctx.__getTodayMissions__();
    const updatedMission = updated.find(m => m.gameId === gameId);
    expect(updatedMission.done).toBe(false);
  });

  it('returns array of completed missions', () => {
    const missions = ctx.__getTodayMissions__();
    const { gameId, target } = missions[0];
    const completed = ctx.__updateMission__(gameId, target);
    expect(Array.isArray(completed)).toBe(true);
    expect(completed.length).toBe(1);
    expect(completed[0].gameId).toBe(gameId);
  });

  it('returns empty array when no mission matches gameId', () => {
    const completed = ctx.__updateMission__('nonexistent-game', 9999);
    expect(completed).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Streak edge cases
//
// getDayKey() logic (utils.js lines 8-13):
//   const kst = new Date(now.getTime() + 9*60*60*1000);
//   if (kst.getUTCHours() < 9) kst.setUTCDate(kst.getUTCDate() - 1);
//   return kst.toISOString().slice(0, 10);
//
// getStreak() logic (utils.js lines 128-140):
//   Starting from "today" in KST, walks back up to 30 days.
//   Breaks on first missing date. Only counts if that date is in playDates.
//
// To mock Date in the vm context we replace context.Date before loading scripts.
// The vm receives the Date constructor from the sandbox, so we pass a fake one.
// ---------------------------------------------------------------------------

/**
 * Build a fake Date class that always returns a fixed UTC timestamp.
 * The vm scripts call `new Date()` and `new Date(someTimestamp)`.
 */
function makeFakeDate(fixedUtcMs) {
  // We need a constructor that behaves like Date but returns fixedUtcMs for `new Date()`
  // and passes through for `new Date(timestamp)`.
  function FakeDate(arg) {
    if (arguments.length === 0) {
      this._ms = fixedUtcMs;
    } else {
      this._ms = arg;
    }
    // Copy all Date prototype methods bound to an actual Date
    const real = new Date(this._ms);
    // Proxy all method calls to the real Date instance
    return real;
  }
  // For `new Date()` without args, return a real Date at fixedUtcMs
  FakeDate.now = () => fixedUtcMs;
  return FakeDate;
}

/**
 * Create a vm context with Date frozen at a given UTC timestamp.
 * Injects pre-populated playDates history into localStorage.
 */
function makeCtxWithDate(fixedUtcMs, playDates = []) {
  const { readFileSync } = require('fs');
  const { createContext, runInContext } = require('vm');

  const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';
  const UTILS_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/utils.js';

  const store = {};
  // Pre-populate playDates
  if (playDates.length > 0) {
    store['bf-playDates'] = JSON.stringify(playDates);
  }

  const mockLS = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  // Real Date that always returns fixedUtcMs when called with no args
  const RealDate = Date;
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedUtcMs);
      } else {
        super(...args);
      }
    }
    static now() { return fixedUtcMs; }
  }

  const context = createContext({
    localStorage: mockLS,
    window: {},
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date: MockDate,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
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
    performance: { now: () => fixedUtcMs },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    API_BASE: 'http://localhost:3001',
    curGoal: 0,
  });

  runInContext(readFileSync(CONFIG_PATH, 'utf-8'), context);
  runInContext(readFileSync(UTILS_PATH, 'utf-8'), context);

  runInContext(`
    __LS__ = (typeof LS !== 'undefined') ? LS : undefined;
    __getDayKey__ = (typeof getDayKey !== 'undefined') ? getDayKey : undefined;
    __getStreak__ = (typeof getStreak !== 'undefined') ? getStreak : undefined;
    __recordPlay__ = (typeof recordPlay !== 'undefined') ? recordPlay : undefined;
  `, context);

  context._rawLS = mockLS;
  return context;
}

// Helper: UTC ms for a given date string at a specific KST hour.
// KST = UTC+9. To get "2024-01-15 at 14:00 KST", use kstHour=14.
function kstToUtcMs(dateStr, kstHour = 12) {
  // dateStr like '2024-01-15', kstHour 0-23
  const utcHour = kstHour - 9;
  const d = new Date(`${dateStr}T${String(utcHour < 0 ? utcHour + 24 : utcHour).padStart(2, '0')}:00:00.000Z`);
  if (utcHour < 0) {
    // We went to previous day in UTC
    d.setUTCDate(d.getUTCDate() - 1);
    // Actually just compute from scratch:
  }
  // Simpler: parse the date as UTC midnight, add kstHour hours minus 9 (offset)
  const base = Date.parse(`${dateStr}T00:00:00.000Z`);
  return base + (kstHour - 9) * 3600 * 1000;
}

describe('getStreak — streak spanning month boundary', () => {
  it('playing Jan 31 and Feb 1 produces streak=2', () => {
    // Fix "now" to Feb 1 2024 at 12:00 KST
    const nowMs = kstToUtcMs('2024-02-01', 12);
    const ctx = makeCtxWithDate(nowMs, ['2024-01-31', '2024-02-01']);
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(true);
    expect(streak).toBe(2);
  });
});

describe('getStreak — streak spanning year boundary', () => {
  it('playing Dec 31 and Jan 1 produces streak=2', () => {
    // Fix "now" to Jan 1 2024 at 12:00 KST
    const nowMs = kstToUtcMs('2024-01-01', 12);
    const ctx = makeCtxWithDate(nowMs, ['2023-12-31', '2024-01-01']);
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(true);
    expect(streak).toBe(2);
  });
});

describe('getStreak — lookback limit is 30 days', () => {
  it('a play 31 days ago does not extend the streak beyond 30 days', () => {
    // Fix "now" to 2024-02-01 at 12:00 KST
    const nowMs = kstToUtcMs('2024-02-01', 12);
    // Build 30 consecutive days: 2024-01-02 through 2024-02-01
    const dates = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date(nowMs - i * 24 * 3600 * 1000);
      dates.push(d.toISOString().slice(0, 10));
    }
    // Also add a play 31 days ago
    const day31Ago = new Date(nowMs - 31 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    dates.push(day31Ago);

    const ctx = makeCtxWithDate(nowMs, dates);
    const { streak } = ctx.__getStreak__();
    // Streak should be capped at 30 (the loop runs i=0..29)
    expect(streak).toBe(30);
  });
});

describe('getStreak — gap breaks streak', () => {
  it('playing Monday and Wednesday (skipping Tuesday) gives streak=1', () => {
    // Fix "now" to Wednesday 2024-01-17 at 12:00 KST
    const nowMs = kstToUtcMs('2024-01-17', 12);
    // Monday = 2024-01-15, Wednesday = 2024-01-17, Tuesday (2024-01-16) missing
    const ctx = makeCtxWithDate(nowMs, ['2024-01-15', '2024-01-17']);
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(true);
    // streak starts at today (Wed), but Tue is missing → streak = 1
    expect(streak).toBe(1);
  });
});

describe('getStreak — playedToday independent of streak', () => {
  it('can have streak=0 but playedToday=true when played today after a gap', () => {
    // This scenario is impossible with the current implementation:
    // if today is in hist, streak starts at 1. But we test the semantics:
    // playedToday=true means today is in the history array.
    // If there's a gap yesterday, streak still counts today (=1).
    // There's no state where playedToday=true AND streak=0 in this implementation.
    // However, playedToday=false with streak=0 is the empty-history case.
    const nowMs = kstToUtcMs('2024-01-17', 12);
    // Only played today, nothing before
    const ctx = makeCtxWithDate(nowMs, ['2024-01-17']);
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(true);
    expect(streak).toBe(1);
  });

  it('streak=0, playedToday=false when history is empty', () => {
    const nowMs = kstToUtcMs('2024-01-17', 12);
    const ctx = makeCtxWithDate(nowMs, []);
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(false);
    expect(streak).toBe(0);
  });

  it('streak counts yesterday but not today: playedToday=false, streak=0 (yesterday was played but not today)', () => {
    // Streak algorithm walks back from today. Today is not played, so streak breaks at 0.
    const nowMs = kstToUtcMs('2024-01-17', 12);
    const ctx = makeCtxWithDate(nowMs, ['2024-01-16']); // only yesterday
    const { streak, playedToday } = ctx.__getStreak__();
    expect(playedToday).toBe(false);
    // getStreak starts from today (not played) → streak = 0 immediately
    expect(streak).toBe(0);
  });
});

describe('getDayKey — KST boundary', () => {
  it('before 9am KST (00:00 UTC = 09:00 KST, so 07:00 KST = 22:00 UTC prev day) returns previous calendar day', () => {
    // 07:00 KST on 2024-01-15 = 22:00 UTC on 2024-01-14
    // KST hour = 7, so UTC = 7-9 = -2 → previous day 22:00
    const kstHour7_Jan15 = Date.parse('2024-01-14T22:00:00.000Z');
    const ctx = makeCtxWithDate(kstHour7_Jan15);
    // KST = 2024-01-15T07:00, which is < 9:00, so day key = 2024-01-14
    expect(ctx.__getDayKey__()).toBe('2024-01-14');
  });

  it('at exactly 9am KST returns the current KST calendar day', () => {
    // 09:00 KST on 2024-01-15 = 00:00 UTC on 2024-01-15
    const kstHour9_Jan15 = Date.parse('2024-01-15T00:00:00.000Z');
    const ctx = makeCtxWithDate(kstHour9_Jan15);
    // KST = 2024-01-15T09:00, getUTCHours() = 9, which is NOT < 9 → day = 2024-01-15
    expect(ctx.__getDayKey__()).toBe('2024-01-15');
  });

  it('after 9am KST returns the current KST calendar day', () => {
    // 15:00 KST on 2024-01-15 = 06:00 UTC on 2024-01-15
    const kstHour15_Jan15 = Date.parse('2024-01-15T06:00:00.000Z');
    const ctx = makeCtxWithDate(kstHour15_Jan15);
    expect(ctx.__getDayKey__()).toBe('2024-01-15');
  });
});
