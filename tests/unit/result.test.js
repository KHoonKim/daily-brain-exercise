import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';
const UTILS_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/utils.js';
const RESULT_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/ui/result.js';

function makeCtx() {
  const store = {};
  const mockLS = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  // result.js reads from DOM on module execution; provide a stable getElementById stub
  const makeEl = () => ({
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    disabled: false,
    onclick: null,
  });

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
      getElementById: () => makeEl(),
      createElement: () => ({ style: {}, className: '', textContent: '' }),
      body: { appendChild: () => {} },
      title: '',
    },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    API_BASE: 'http://localhost:3001',
    curGoal: 0,
    // result.js globals
    curGame: 'math',
    curScore: 0,
    curGameContext: 'free',
    replayCount: 0,
    timeExtendUsed: false,
    cancelNextQuestion: () => {},
    showTimeExtend: (cb) => { if (cb) cb(); },
    showAd: (cb) => { if (cb) cb(); },
    goHome: () => {},
    wkOnGameEnd: () => {},
    wkContinue: () => {},
    getTodayWorkout: () => ({ done: [] }),
    WK_SIZE: 3,
    AIT: {
      isToss: false,
      log: () => {},
      submitScore: () => Promise.resolve(),
      getUserHash: () => Promise.resolve('testhash'),
      loadBannerAd: () => {},
      shareMessage: () => {},
      shareInvite: () => {},
      setScreenAwake: () => {},
    },
  });

  runInContext(readFileSync(CONFIG_PATH, 'utf-8'), context);
  runInContext(readFileSync(UTILS_PATH, 'utf-8'), context);
  runInContext(readFileSync(RESULT_PATH, 'utf-8'), context);

  // Expose const-declared symbols
  runInContext(`
    __getRetryMotivation__ = (typeof getRetryMotivation !== 'undefined') ? getRetryMotivation : undefined;
    __GAMES__ = (typeof GAMES !== 'undefined') ? GAMES : undefined;
  `, context);

  return context;
}

describe('getRetryMotivation', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('is a function', () => {
    expect(typeof ctx.__getRetryMotivation__).toBe('function');
  });

  it('returns an object with msg and btn fields', () => {
    const result = ctx.__getRetryMotivation__('math', 100, 80, false);
    expect(typeof result.msg).toBe('string');
    expect(typeof result.btn).toBe('string');
  });

  describe('when isNew=true and score > 0', () => {
    it('returns a new record message for a non-level game (math)', () => {
      // math has isLevel=false -> '컨디션 최고! 이 기세로 더 높은 점수를!'
      const result = ctx.__getRetryMotivation__('math', 100, 80, true);
      expect(result.msg).toBe('컨디션 최고! 이 기세로 더 높은 점수를!');
    });

    it('returns a new record message for a level-based game (sequence)', () => {
      // sequence has isLevel=true -> '새 기록 달성! 집중력이 올라왔을 때 더 높이!'
      const result = ctx.__getRetryMotivation__('sequence', 5, 4, true);
      expect(result.msg).toBe('새 기록 달성! 집중력이 올라왔을 때 더 높이!');
    });

    it('level game message differs from non-level game message', () => {
      const levelResult = ctx.__getRetryMotivation__('sequence', 5, 4, true);
      const nonLevelResult = ctx.__getRetryMotivation__('math', 100, 80, true);
      expect(levelResult.msg).not.toBe(nonLevelResult.msg);
    });

    it('isNew=true with score=0 falls through to best=0 branch', () => {
      // score=0 so isNew && score>0 is false; best=0 -> first record message
      const result = ctx.__getRetryMotivation__('math', 0, 0, true);
      expect(result.msg).toContain('첫 기록');
    });
  });

  describe('when score >= best * 0.8 (within 20% of best)', () => {
    it('returns encouraging message mentioning gap to best', () => {
      const best = 100;
      const score = 85; // 85 >= 80
      const result = ctx.__getRetryMotivation__('math', score, best, false);
      // gap = 100 - 85 = 15
      expect(result.msg).toContain('15');
    });

    it('btn is set to retry text', () => {
      const result = ctx.__getRetryMotivation__('math', 85, 100, false);
      expect(result.btn.length).toBeGreaterThan(0);
    });

    it('exact 80% boundary is caught by this branch', () => {
      const best = 100;
      const score = 80; // exactly 80% of 100
      const result = ctx.__getRetryMotivation__('math', score, best, false);
      expect(result.msg).toContain('20'); // gap = 100 - 80 = 20
    });
  });

  describe('when score >= best * 0.5 but < best * 0.8 (warming up)', () => {
    it('returns warming-up message containing best score', () => {
      const best = 100;
      const score = 60; // 60 >= 50, 60 < 80
      const result = ctx.__getRetryMotivation__('math', score, best, false);
      expect(result.msg).toContain('100');
    });

    it('message contains warming-up language', () => {
      const result = ctx.__getRetryMotivation__('math', 60, 100, false);
      expect(result.msg).toContain('워밍업');
    });
  });

  describe('when score < best * 0.5 (far below best)', () => {
    it('returns the generic try-again message', () => {
      const result = ctx.__getRetryMotivation__('math', 30, 100, false);
      expect(result.msg).toBe('한 판 더 하면 감이 올 거예요!');
    });

    it('message differs from the high-score message', () => {
      const highResult = ctx.__getRetryMotivation__('math', 90, 100, false);
      const lowResult = ctx.__getRetryMotivation__('math', 30, 100, false);
      expect(lowResult.msg).not.toBe(highResult.msg);
    });
  });

  describe('when best=0 (no prior record)', () => {
    it('returns the first-record message', () => {
      const result = ctx.__getRetryMotivation__('math', 50, 0, false);
      expect(result.msg).toBe('첫 기록이 세워졌어요! 더 높은 점수에 도전?');
    });

    it('isNew=false with best=0 and score=0 returns first-record message', () => {
      const result = ctx.__getRetryMotivation__('math', 0, 0, false);
      expect(result.msg).toBe('첫 기록이 세워졌어요! 더 높은 점수에 도전?');
    });
  });

  describe('with unknown gameId', () => {
    it('still returns a result (isLevel defaults to false)', () => {
      // unknown game: isLevel=false, isNew=true, score>0 -> '컨디션 최고!' branch
      const result = ctx.__getRetryMotivation__('unknown-game', 100, 80, true);
      expect(result.msg).toBe('컨디션 최고! 이 기세로 더 높은 점수를!');
      expect(typeof result.btn).toBe('string');
    });
  });
});
