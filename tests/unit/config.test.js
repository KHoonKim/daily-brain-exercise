import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';

function makeCtx() {
  const context = createContext({
    console,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
  });

  // Wrap source in a block that exposes consts onto the context object
  const src = readFileSync(CONFIG_PATH, 'utf-8');
  runInContext(src, context);
  // config.js uses const declarations; expose them explicitly
  runInContext(`
    __GAMES__ = (typeof GAMES !== 'undefined') ? GAMES : undefined;
    __RANKS__ = (typeof RANKS !== 'undefined') ? RANKS : undefined;
    __GI__ = (typeof GI !== 'undefined') ? GI : undefined;
    __hexToRgb__ = (typeof _hexToRgb !== 'undefined') ? _hexToRgb : undefined;
    __rgbToHex__ = (typeof _rgbToHex !== 'undefined') ? _rgbToHex : undefined;
    __interpolateColor__ = (typeof _interpolateColor !== 'undefined') ? _interpolateColor : undefined;
    __generateRanks__ = (typeof generateRanks !== 'undefined') ? generateRanks : undefined;
  `, context);

  return context;
}

describe('GAMES array', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('has exactly 38 games', () => {
    expect(ctx.__GAMES__.length).toBe(38);
  });

  it('each game has required fields', () => {
    for (const g of ctx.__GAMES__) {
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
      expect(typeof g.name).toBe('string');
      expect(typeof g.cat).toBe('string');
      expect(typeof g.goalDefault).toBe('number');
      expect(typeof g.color).toBe('string');
      expect(typeof g.unlockXp).toBe('number');
      expect(typeof g.isTimer).toBe('boolean');
      expect(typeof g.isLevel).toBe('boolean');
    }
  });

  it('game ids are unique', () => {
    const ids = ctx.__GAMES__.map(g => g.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('colors are valid 7-char hex strings starting with #', () => {
    for (const g of ctx.__GAMES__) {
      expect(g.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('includes expected game ids', () => {
    const ids = ctx.__GAMES__.map(g => g.id);
    expect(ids).toContain('math');
    expect(ids).toContain('memory');
    expect(ids).toContain('reaction');
    expect(ids).toContain('mirror');
  });
});

describe('RANKS array (generateRanks)', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('has entries from age 100 down to 20 (81 entries)', () => {
    expect(ctx.__RANKS__.length).toBe(81);
  });

  it('first rank is age 100 with minXp 0', () => {
    const first = ctx.__RANKS__[0];
    expect(first.age).toBe(100);
    expect(first.minXp).toBe(0);
    expect(first.name).toBe('100세');
  });

  it('last rank is age 20', () => {
    const last = ctx.__RANKS__[ctx.__RANKS__.length - 1];
    expect(last.age).toBe(20);
    expect(last.name).toBe('20세');
  });

  it('minXp values are non-decreasing', () => {
    const ranks = ctx.__RANKS__;
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i].minXp).toBeGreaterThanOrEqual(ranks[i - 1].minXp);
    }
  });

  it('each rank has a valid hex color', () => {
    for (const r of ctx.__RANKS__) {
      expect(r.color).toMatch(/^#[0-9a-fA-F]{6}$/);
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

describe('_interpolateColor', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('is defined as a function', () => {
    expect(typeof ctx.__interpolateColor__).toBe('function');
  });

  it('returns a hex color string', () => {
    const anchors = [
      { age: 100, color: '#ff0000' },
      { age: 20, color: '#0000ff' },
    ];
    const result = ctx.__interpolateColor__(60, anchors);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('returns last anchor color when age is below all anchors', () => {
    const anchors = [
      { age: 100, color: '#ff0000' },
      { age: 50, color: '#0000ff' },
    ];
    const result = ctx.__interpolateColor__(10, anchors);
    expect(result).toBe('#0000ff');
  });

  it('at boundary age=100 with single-range anchors returns interpolated color', () => {
    const anchors = [
      { age: 100, color: '#000000' },
      { age: 0, color: '#ffffff' },
    ];
    const result = ctx.__interpolateColor__(100, anchors);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('_hexToRgb and _rgbToHex', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('_hexToRgb parses pure red', () => {
    expect(ctx.__hexToRgb__('#ff0000')).toEqual([255, 0, 0]);
  });

  it('_hexToRgb parses pure green', () => {
    expect(ctx.__hexToRgb__('#00ff00')).toEqual([0, 255, 0]);
  });

  it('_rgbToHex produces correct hex', () => {
    expect(ctx.__rgbToHex__(255, 0, 0)).toBe('#ff0000');
    expect(ctx.__rgbToHex__(0, 255, 0)).toBe('#00ff00');
  });

  it('roundtrip _hexToRgb -> _rgbToHex', () => {
    const original = '#3182f6';
    const [r, g, b] = ctx.__hexToRgb__(original);
    expect(ctx.__rgbToHex__(r, g, b)).toBe(original);
  });
});
