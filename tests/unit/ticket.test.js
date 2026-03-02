import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';

const CONFIG_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/config.js';
const UTILS_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/utils.js';
const TICKET_PATH = '/Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise/src/core/ticket.js';

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
    // stubs for utils.js
    snackbar: () => {},
    toast: () => {},
    pendingCoins: 0,
    wkActive: false,
    document: {
      getElementById: () => null,
      querySelectorAll: () => ({ forEach: () => {} }),
      createElement: () => ({ style: {}, className: '', textContent: '' }),
      body: { appendChild: () => {} },
      title: '',
    },
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    API_BASE: 'http://localhost:3001',
    curGoal: 0,
    // stubs for ticket.js functions that reference game-flow globals
    show: () => {},
    initGoalBar: () => {},
    timeExtendUsed: false,
    curGame: null,
    curScore: 0,
    curGameContext: 'free',
    showAd: (cb) => { if (cb) cb(); },
    AIT: undefined,
  });

  runInContext(readFileSync(CONFIG_PATH, 'utf-8'), context);
  runInContext(readFileSync(UTILS_PATH, 'utf-8'), context);
  runInContext(readFileSync(TICKET_PATH, 'utf-8'), context);

  // Expose const-declared symbols
  runInContext(`
    __MAX_TICKETS__ = (typeof MAX_TICKETS !== 'undefined') ? MAX_TICKETS : undefined;
    __getTickets__ = (typeof getTickets !== 'undefined') ? getTickets : undefined;
    __useTicket__ = (typeof useTicket !== 'undefined') ? useTicket : undefined;
    __LS__ = (typeof LS !== 'undefined') ? LS : undefined;
    __getDayKey__ = (typeof getDayKey !== 'undefined') ? getDayKey : undefined;
  `, context);

  context._rawLS = mockLS;

  return context;
}

describe('MAX_TICKETS constant', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('is 3', () => {
    expect(ctx.__MAX_TICKETS__).toBe(3);
  });
});

describe('getTickets', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('returns an object with count and day', () => {
    const t = ctx.__getTickets__();
    expect(typeof t.count).toBe('number');
    expect(typeof t.day).toBe('string');
  });

  it('on a fresh context returns MAX_TICKETS (3) count', () => {
    const t = ctx.__getTickets__();
    expect(t.count).toBe(3);
  });

  it('day matches current day key', () => {
    const t = ctx.__getTickets__();
    expect(t.day).toBe(ctx.__getDayKey__());
  });

  it('calling getTickets twice returns same count', () => {
    const first = ctx.__getTickets__();
    const second = ctx.__getTickets__();
    expect(second.count).toBe(first.count);
  });

  it('if saved count exceeds MAX_TICKETS, preserves higher count on new day', () => {
    // Store tickets for a past day with count > MAX_TICKETS
    const yesterday = '2000-01-01';
    ctx._rawLS.setItem('bf-tickets', JSON.stringify({ day: yesterday, count: 10 }));
    // getTickets for today should carry over 10 (since 10 >= MAX_TICKETS=3)
    const t = ctx.__getTickets__();
    expect(t.count).toBe(10);
  });

  it('if saved count is below MAX_TICKETS on new day, resets to MAX_TICKETS', () => {
    const yesterday = '2000-01-01';
    ctx._rawLS.setItem('bf-tickets', JSON.stringify({ day: yesterday, count: 1 }));
    const t = ctx.__getTickets__();
    // count=1 < MAX_TICKETS=3 so resets to 3
    expect(t.count).toBe(3);
  });
});

describe('useTicket', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('decrements ticket count by 1 and returns remaining count', () => {
    const before = ctx.__getTickets__().count; // 3
    const remaining = ctx.__useTicket__();
    expect(remaining).toBe(before - 1);
  });

  it('ticket count is persisted after useTicket', () => {
    ctx.__useTicket__();
    const t = ctx.__getTickets__();
    expect(t.count).toBe(2);
  });

  it('multiple useTicket calls decrement correctly', () => {
    ctx.__useTicket__();
    ctx.__useTicket__();
    ctx.__useTicket__();
    expect(ctx.__getTickets__().count).toBe(0);
  });

  it('count does not go below 0', () => {
    // Exhaust all tickets then try once more
    ctx.__useTicket__();
    ctx.__useTicket__();
    ctx.__useTicket__();
    const remaining = ctx.__useTicket__();
    expect(remaining).toBe(0);
    expect(ctx.__getTickets__().count).toBe(0);
  });

  it('useTicket when count=0 returns 0', () => {
    const today = ctx.__getDayKey__();
    ctx._rawLS.setItem('bf-tickets', JSON.stringify({ day: today, count: 0 }));
    const remaining = ctx.__useTicket__();
    expect(remaining).toBe(0);
  });
});
