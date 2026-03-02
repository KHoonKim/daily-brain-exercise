import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';

function makeConfigCtx() {
  const context = createContext({
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    console,
  });

  runInContext(readFileSync(CONFIG_PATH, 'utf-8'), context);

  runInContext(`
    __GAMES__ = (typeof GAMES !== 'undefined') ? GAMES : undefined;
    __RANKS__ = (typeof RANKS !== 'undefined') ? RANKS : undefined;
    __GI__    = (typeof GI !== 'undefined') ? GI : undefined;
  `, context);

  return context;
}

// ---------------------------------------------------------------------------
// GAMES array validation
// ---------------------------------------------------------------------------

describe('GAMES — required fields', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('GAMES is defined and is an array', () => {
    expect(Array.isArray(ctx.__GAMES__)).toBe(true);
  });

  it('every game has an id field (string)', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
    }
  });

  it('every game has a name field (string)', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.name).toBe('string');
      expect(g.name.length).toBeGreaterThan(0);
    }
  });

  it('every game has a cat field (string) — not category', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.cat).toBe('string');
      expect(g.cat.length).toBeGreaterThan(0);
    }
  });

  it('every game has a goalDefault field', () => {
    for (const g of ctx.__GAMES__) {
      expect(g).toHaveProperty('goalDefault');
    }
  });

  it('goalDefault is a positive number for all games', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.goalDefault).toBe('number');
      expect(g.goalDefault).toBeGreaterThan(0);
    }
  });

  it('every game has a color field (hex string)', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.color).toBe('string');
      expect(g.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('every game has isTimer boolean field', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.isTimer).toBe('boolean');
    }
  });

  it('every game has isLevel boolean field', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.isLevel).toBe('boolean');
    }
  });

  it('no game has a missionDefault field (correct field name is goalDefault)', () => {
    for (const g of ctx.__GAMES__) {
      expect(g).not.toHaveProperty('missionDefault');
    }
  });
});

describe('GAMES — uniqueness constraints', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('no two games have the same id', () => {
    const ids = ctx.__GAMES__.map(g => g.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('no two games have the same name', () => {
    const names = ctx.__GAMES__.map(g => g.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe('GAMES — category values', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  const EXPECTED_CATEGORIES = new Set([
    '수리력', '기억력', '반응력', '전환력',
    '언어력', '논리력', '집중력', '공간지각력',
  ]);

  it('all game cat values are from the expected category set', () => {
    for (const g of ctx.__GAMES__) {
      expect(EXPECTED_CATEGORIES.has(g.cat)).toBe(true);
    }
  });

  it('all expected categories are used by at least one game', () => {
    const usedCats = new Set(ctx.__GAMES__.map(g => g.cat));
    for (const cat of EXPECTED_CATEGORIES) {
      expect(usedCats.has(cat)).toBe(true);
    }
  });
});

describe('GAMES — count', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('has exactly 38 games', () => {
    expect(ctx.__GAMES__.length).toBe(38);
  });
});

// ---------------------------------------------------------------------------
// RANKS array validation
// ---------------------------------------------------------------------------

describe('RANKS — structure', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('RANKS is defined and is an array', () => {
    expect(Array.isArray(ctx.__RANKS__)).toBe(true);
  });

  it('spans exactly ages 20-100 inclusive (81 entries)', () => {
    // ages 100, 99, 98, ..., 20 = 81 values
    expect(ctx.__RANKS__.length).toBe(81);
  });

  it('first rank has age 100', () => {
    expect(ctx.__RANKS__[0].age).toBe(100);
  });

  it('last rank has age 20', () => {
    expect(ctx.__RANKS__[ctx.__RANKS__.length - 1].age).toBe(20);
  });

  it('ages decrease by 1 from rank to rank', () => {
    const ranks = ctx.__RANKS__;
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i].age).toBe(ranks[i - 1].age - 1);
    }
  });

  it('each rank has name, minXp, color, label, age fields', () => {
    for (const r of ctx.__RANKS__) {
      expect(typeof r.name).toBe('string');
      expect(typeof r.minXp).toBe('number');
      expect(typeof r.color).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(typeof r.age).toBe('number');
    }
  });
});

describe('RANKS — XP ordering', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('the lowest rank (age 100) has minXp = 0', () => {
    const rank100 = ctx.__RANKS__.find(r => r.age === 100);
    expect(rank100).toBeDefined();
    expect(rank100.minXp).toBe(0);
  });

  it('each rank\'s minXp is strictly less than the next rank\'s minXp', () => {
    const ranks = ctx.__RANKS__;
    // ranks go from age 100 (lowest, minXp=0) down to age 20 (highest minXp)
    // so minXp should increase as index increases
    for (let i = 0; i < ranks.length - 1; i++) {
      expect(ranks[i].minXp).toBeLessThan(ranks[i + 1].minXp);
    }
  });

  it('minXp values are non-negative integers', () => {
    for (const r of ctx.__RANKS__) {
      expect(r.minXp).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.minXp)).toBe(true);
    }
  });

  it('highest rank (age 20) has the largest minXp', () => {
    const rank20 = ctx.__RANKS__.find(r => r.age === 20);
    const maxMinXp = Math.max(...ctx.__RANKS__.map(r => r.minXp));
    expect(rank20.minXp).toBe(maxMinXp);
  });
});

describe('RANKS — name format', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('every rank name matches "{age}세" pattern', () => {
    for (const r of ctx.__RANKS__) {
      expect(r.name).toBe(`${r.age}세`);
    }
  });

  it('every rank label matches the age as a string', () => {
    for (const r of ctx.__RANKS__) {
      expect(r.label).toBe(String(r.age));
    }
  });
});

// ---------------------------------------------------------------------------
// GI (game icon) mapping validation
// ---------------------------------------------------------------------------

describe('GI — icon mapping', () => {
  let ctx;
  beforeAll(() => { ctx = makeConfigCtx(); });

  it('GI is defined', () => {
    expect(ctx.__GI__).toBeDefined();
  });

  it('every game id has a corresponding icon entry in GI', () => {
    const games = ctx.__GAMES__;
    const gi = ctx.__GI__;
    for (const g of games) {
      expect(gi).toHaveProperty(g.id);
      expect(typeof gi[g.id]).toBe('string');
      expect(gi[g.id].length).toBeGreaterThan(0);
    }
  });

  it('GI icons are SVG strings', () => {
    const gi = ctx.__GI__;
    for (const key of Object.keys(gi)) {
      expect(gi[key]).toContain('<svg');
      expect(gi[key]).toContain('</svg>');
    }
  });

  it('number of GI entries matches number of games', () => {
    const giKeys = Object.keys(ctx.__GI__);
    expect(giKeys.length).toBe(ctx.__GAMES__.length);
  });
});
