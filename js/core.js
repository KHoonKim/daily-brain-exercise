// ===== GAME DATA =====
const GI = {
  math: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  memory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" rx="2" width="7" height="7"/><rect x="14" y="3" rx="2" width="7" height="7"/><rect x="3" y="14" rx="2" width="7" height="7"/><rect x="14" y="14" rx="2" width="7" height="7"/></svg>`,
  reaction: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  stroop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  sequence: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="4" y2="6.01"/><line x1="4" y1="12" x2="4" y2="12.01"/><line x1="4" y1="18" x2="4" y2="18.01"/><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/></svg>`,
  word: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  pattern: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  focus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>`,
  reverse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>`,
  numtouch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" rx="2" width="18" height="18"/><text x="7" y="11" font-size="6" font-weight="bold" fill="currentColor" stroke="none">1</text><text x="13" y="11" font-size="6" font-weight="bold" fill="currentColor" stroke="none">2</text><text x="7" y="18" font-size="6" font-weight="bold" fill="currentColor" stroke="none">3</text><text x="13" y="18" font-size="6" font-weight="bold" fill="currentColor" stroke="none">4</text></svg>`,
  rhythm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="18" cy="16" r="3" fill="currentColor"/></svg>`,
  rps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="4"/><circle cx="18" cy="18" r="4"/><line x1="6" y1="14" x2="6" y2="4"/><line x1="18" y1="14" x2="18" y2="4"/><path d="M6 4l6 4 6-4"/></svg>`,
  oddone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3" stroke-dasharray="3 2"/></svg>`,
  compare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 4 2 12 7 20"/><polyline points="17 4 22 12 17 20"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21h6"/><path d="M10 17h4"/><path d="M12 3a6 6 0 014 10.5V17H8v-3.5A6 6 0 0112 3z"/></svg>`,
  colormix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5" opacity=".7"/><circle cx="15" cy="9" r="5" opacity=".7"/><circle cx="12" cy="14" r="5" opacity=".7"/></svg>`,
  wordcomp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="12" y2="17"/><rect x="14" y="14" width="6" height="6" rx="1" stroke-dasharray="3 2"/></svg>`,
  timing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="13" x2="15" y2="15"/><line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="2" x2="12" y2="5"/></svg>`,
  matchpair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  headcount: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 21V7l9-4 9 4v14"/><rect x="9" y="13" width="6" height="8"/><line x1="12" y1="7" x2="12" y2="7.01" stroke-width="3"/></svg>`,
  pyramid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 3 22 21 2 21"/><line x1="7" y1="21" x2="12" y2="12"/><line x1="17" y1="21" x2="12" y2="12"/></svg>`,
  maxnum: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16V8l4 4 4-4v8"/></svg>`,
  signfind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/><circle cx="12" cy="12" r="10" stroke-width="2"/></svg>`,
  coincount: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><text x="12" y="14" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor" stroke="none">₩</text></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="16"/></svg>`,
  wordmem: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="14" y2="10"/></svg>`,
  blockcount: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z"/><path d="M12 22V11"/><path d="M20 6.5L12 11 4 6.5"/><path d="M12 2v4.5"/></svg>`,
  flanker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/><polyline points="20 18 14 12 20 6"/><polyline points="10 18 4 12 10 6"/></svg>`,
  memgrid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity=".3"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity=".3"/></svg>`,
  nback: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="8" height="14" rx="2"/><rect x="13" y="5" width="8" height="14" rx="2"/><path d="M7 15V9" stroke-width="2.5"/><path d="M17 15V9" stroke-width="2.5"/><line x1="7" y1="12" x2="17" y2="12" stroke-dasharray="2 2"/></svg>`,
  scramble: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="8" width="6" height="8" rx="1"/><rect x="9" y="8" width="6" height="8" rx="1"/><rect x="16" y="8" width="6" height="8" rx="1"/><path d="M5 5l3 3M19 5l-3 3" stroke-dasharray="2 1"/></svg>`,
  serial: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="8" x2="12" y2="8"/><line x1="4" y1="12" x2="10" y2="12"/><line x1="4" y1="16" x2="8" y2="16"/><polyline points="17 7 17 17"/><polyline points="14 14 17 17 20 14"/></svg>`,
  leftright: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 11V6a2 2 0 00-4 0v5"/><path d="M14 11V4a2 2 0 00-4 0v7"/><path d="M10 10V6a2 2 0 00-4 0v8c0 4.4 3.6 8 8 8h1a5 5 0 005-5v-4a2 2 0 00-4 0"/></svg>`,
  calccomp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="9" height="16" rx="2"/><line x1="4" y1="10" x2="9" y2="10"/><line x1="6.5" y1="7.5" x2="6.5" y2="12.5"/><rect x="13" y="4" width="9" height="16" rx="2"/><line x1="15" y1="10" x2="20" y2="10"/><polyline points="9 18 12 21 15 18" stroke-width="1.5"/></svg>`,
  flash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><path d="M12 16v4m-3-2h6"/><polyline points="7 20 7 16"/><polyline points="17 20 17 16"/></svg>`,
  mirror: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="3 2"/><text x="6" y="15" font-size="12" font-weight="bold" fill="currentColor" stroke="none" transform="scale(-1,1) translate(-12,0)">R</text><text x="16" y="15" font-size="12" font-weight="bold" fill="currentColor" stroke="none">R</text></svg>`,
};
const GAMES = [
  { id: 'math', name: '암산 챌린지', cat: '연산', desc: '빠른 사칙연산', color: '#3182F6', unlockXp: 0 },
  { id: 'memory', name: '기억력 카드', cat: '기억력', desc: '같은 카드 쌍 찾기', color: '#8B5CF6', unlockXp: 0 },
  { id: 'reaction', name: '반응속도', cat: '반응', desc: '빨리 터치!', color: '#10B981', unlockXp: 0 },
  { id: 'stroop', name: '색깔 맞추기', cat: '유연성', desc: '스트룹 테스트', color: '#F59E0B', unlockXp: 0 },
  { id: 'sequence', name: '순서 기억', cat: '기억력', desc: '순서 따라하기', color: '#EC4899', unlockXp: 0 },
  { id: 'word', name: '단어 찾기', cat: '언어', desc: '숨은 단어 찾기', color: '#6366F1', unlockXp: 0 },
  { id: 'pattern', name: '패턴 완성', cat: '논리', desc: '규칙을 찾으세요', color: '#EF4444', unlockXp: 0 },
  { id: 'focus', name: '집중력 탭', cat: '반응', desc: '타겟만 빠르게', color: '#14B8A6', unlockXp: 0 },
  { id: 'rotate', name: '도형 회전', cat: '공간', desc: '같은 도형 찾기', color: '#8B5CF6', unlockXp: 0 },
  { id: 'reverse', name: '순서 뒤집기', cat: '유연성', desc: '거꾸로 기억하기', color: '#F97316', unlockXp: 0 },
  { id: 'numtouch', name: '넘버 터치', cat: '반응', desc: '1~25 순서대로 터치', color: '#0EA5E9', unlockXp: 0 },
  { id: 'rhythm', name: '리듬 기억', cat: '기억력', desc: '박자 패턴 따라하기', color: '#D946EF', unlockXp: 0 },
  { id: 'rps', name: '두뇌 가위바위보', cat: '유연성', desc: '조건에 맞게 선택', color: '#F43F5E', unlockXp: 0 },
  { id: 'oddone', name: '다른 글자 찾기', cat: '반응', desc: '다른 글자 하나를 찾으세요', color: '#06B6D4', unlockXp: 0 },
  { id: 'compare', name: '크다작다', cat: '연산', desc: '빠른 수 비교 판단', color: '#84CC16', unlockXp: 0 },
  { id: 'bulb', name: '전구 기억', cat: '기억력', desc: '켜지는 순서 기억', color: '#FBBF24', unlockXp: 0 },
  { id: 'colormix', name: '색깔 조합', cat: '논리', desc: '색 혼합 결과 맞추기', color: '#A855F7', unlockXp: 0 },
  { id: 'wordcomp', name: '단어 완성', cat: '언어', desc: '빈칸 글자 맞추기', color: '#22D3EE', unlockXp: 0 },
  { id: 'timing', name: '타이밍', cat: '반응', desc: '정확한 타이밍에 멈추기', color: '#FB923C', unlockXp: 0 },
  { id: 'matchpair', name: '짝 맞추기', cat: '언어', desc: '한자어와 뜻 연결', color: '#4ADE80', unlockXp: 0 },
  { id: 'headcount', name: '인원 세기', cat: '집중', desc: '몇 명이 남았을까?', color: '#F87171', unlockXp: 0 },
  { id: 'pyramid', name: '피라미드 연산', cat: '연산', desc: '합으로 피라미드 완성', color: '#FB923C', unlockXp: 0 },
  { id: 'maxnum', name: '수 찾기', cat: '집중', desc: '가장 큰/작은 수를 터치', color: '#38BDF8', unlockXp: 0 },
  { id: 'signfind', name: '부호 찾기', cat: '연산', desc: '빠진 연산자 맞추기', color: '#A78BFA', unlockXp: 0 },
  { id: 'coincount', name: '동전 세기', cat: '연산', desc: '동전 총액 빠르게 계산', color: '#FCD34D', unlockXp: 0 },
  { id: 'clock', name: '시계 읽기', cat: '반응', desc: '아날로그 시계 읽기', color: '#2DD4BF', unlockXp: 0 },
  { id: 'wordmem', name: '단어 암기', cat: '기억력', desc: '단어 외우고 기억하기', color: '#C084FC', unlockXp: 0 },
  { id: 'blockcount', name: '블록 세기', cat: '공간', desc: '쌓인 블록 개수 세기', color: '#64748B', unlockXp: 0 },
  { id: 'flanker', name: '방향 맞추기', cat: '반응', desc: '가운데 화살표 방향은?', color: '#6366F1', unlockXp: 0 },
  { id: 'memgrid', name: '격자 기억', cat: '기억력', desc: '켜진 칸을 기억하세요', color: '#F472B6', unlockXp: 0 },
  { id: 'nback', name: '같거나 다르거나', cat: '집중', desc: '이전과 같은지 순간 판단', color: '#34D399', unlockXp: 0 },
  { id: 'scramble', name: '글자 섞기', cat: '언어', desc: '섞인 글자로 단어 만들기', color: '#FB7185', unlockXp: 0 },
  { id: 'serial', name: '연속 빼기', cat: '연산', desc: '계속 빼 나가세요', color: '#818CF8', unlockXp: 0 },
  { id: 'leftright', name: '좌우 판단', cat: '유연성', desc: '왼손? 오른손?', color: '#F9A8D4', unlockXp: 0 },
  { id: 'calccomp', name: '계산 비교', cat: '연산', desc: '어느 식이 더 큰가', color: '#FBBF24', unlockXp: 0 },
  { id: 'flash', name: '순간 포착', cat: '기억력', desc: '잠깐 보고 기억하기', color: '#F59E0B', unlockXp: 0 },
  { id: 'sort', name: '카테고리 분류', cat: '반응', desc: '빠르게 분류하세요', color: '#2DD4BF', unlockXp: 0 },
  { id: 'mirror', name: '거울 문자', cat: '공간', desc: '뒤집힌 글자 읽기', color: '#A78BFA', unlockXp: 0 },
];

// ===== RANK SYSTEM =====
const RANK_SVG = `<img src="https://static.toss.im/2d-emojis/svg/u2B50.svg" style="width:1em;height:1em;vertical-align:-2px">`;
const RANKS = [
  { name: '100세', minXp: 0, color: '#CD7F32', label: '100', age: 100 },
  { name: '90세', minXp: 500, color: '#C0C0C0', label: '90', age: 90 },
  { name: '80세', minXp: 2000, color: '#9E9E9E', label: '80', age: 80 },
  { name: '70세', minXp: 5000, color: '#FFD700', label: '70', age: 70 },
  { name: '60세', minXp: 10000, color: '#FFA726', label: '60', age: 60 },
  { name: '50세', minXp: 18000, color: '#66BB6A', label: '50', age: 50 },
  { name: '40세', minXp: 30000, color: '#4DD0E1', label: '40', age: 40 },
  { name: '30세', minXp: 50000, color: '#42A5F5', label: '30', age: 30 },
  { name: '20세', minXp: 80000, color: '#E040FB', label: '20', age: 20 },
];

// ===== STATE =====
let curGame = null, curTimer = null, curScore = 0, replayCount = 0;

// ===== GAME TIMER REGISTRY =====
const GAME_TIMER_CONFIG = {};
function registerTimerGame(id, cfg) { GAME_TIMER_CONFIG[id] = cfg; }
function _startGameTimer(cfg) {
  curTimer = setInterval(() => {
    cfg.setTime(cfg.getTime() - 1);
    const t = cfg.getTime();
    if (cfg.onTick) { cfg.onTick(); }
    else { const el = document.getElementById(cfg.timerId); el.textContent = t + 's'; if (t <= 10) el.className = 'g-timer urgent'; }
    if (t <= 0) {
      clearInterval(curTimer);
      if (cfg.extraTimers) cfg.extraTimers().forEach(et => et && clearInterval(et));
      showResult(cfg.getScore(), cfg.name, cfg.getStats ? cfg.getStats() : [], cfg.getExtra ? cfg.getExtra() : {});
    }
  }, 1000);
}
// 오전 9시(KST) 기준 날짜 키 반환
function getDayKey() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) kst.setUTCDate(kst.getUTCDate() - 1);
  return kst.toISOString().slice(0, 10);
}
const LS = {
  get: (k, d = 0) => { const v = localStorage.getItem('bf-' + k); return v !== null ? (isNaN(+v) ? v : +v) : d },
  set: (k, v) => localStorage.setItem('bf-' + k, String(v)),
  getJSON: (k, d) => { try { return JSON.parse(localStorage.getItem('bf-' + k)) || d } catch { return d } },
  setJSON: (k, v) => localStorage.setItem('bf-' + k, JSON.stringify(v)),
};

function getXP() { return LS.get('xp', 0) }
function addXP(n) { const xp = getXP() + n; LS.set('xp', xp); if (AIT.checkPromoBrainAge50) AIT.checkPromoBrainAge50(xp); return xp }
function getRank(xp) { let r = RANKS[0]; for (const rank of RANKS) if (xp >= rank.minXp) r = rank; return r }
function getNextRank(xp) { for (const r of RANKS) if (xp < r.minXp) return r; return null }

// ===== DAILY WORKOUT =====
const WK_SIZE = 3;
let wkActive = false, wkGames = [], wkIdx = 0, wkScores = [];

function getTodayWorkout() {
  const today = getDayKey();
  let wk = LS.getJSON('workout-' + today, null);
  if (!wk) {
    // Pick 3 random unlocked games
    const xp = getXP();
    const unlocked = GAMES.filter(g => xp >= g.unlockXp);
    const picked = [...unlocked].sort(() => Math.random() - .5).slice(0, WK_SIZE);
    wk = { games: picked.map(g => g.id), done: [], scores: {}, completed: false };
    LS.setJSON('workout-' + today, wk);
  }
  return wk;
}

function saveWorkout(wk) {
  const today = getDayKey();
  LS.setJSON('workout-' + today, wk);
}

function renderWorkout() {
  const wk = getTodayWorkout();
  // Auto-complete if all games done but flag missing
  if (!wk.completed && wk.done.length >= WK_SIZE) {
    wk.completed = true; saveWorkout(wk);
    addCoins(30); addXP(50); addPoints(1); if (AIT.checkPromoFirstWorkout) AIT.checkPromoFirstWorkout();
  }
  const el = document.getElementById('dailyWorkout');
  const allDone = wk.completed;
  const doneCount = wk.done.length;
  const pct = allDone ? 100 : Math.round(doneCount / WK_SIZE * 100);
  const nextIdx = wk.games.findIndex(id => !wk.done.includes(id));
  const nextGame = nextIdx >= 0 ? GAMES.find(x => x.id === wk.games[nextIdx]) : null;

  el.innerHTML = allDone ? `
    <div class="workout-card done">
      <div style="text-align:center;padding:8px 0">
        <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
        <div style="font-size:18px;font-weight:800;margin-bottom:4px">오늘의 두뇌운동 완료!</div>
        <div style="font-size:13px;color:var(--sub)">내일도 잊지 말고 운동하러 오세요!</div>
      </div>
      <div class="wk-games" style="margin:14px 0 0">
        ${wk.games.map(id => { const g = GAMES.find(x => x.id === id); return `<div class="wk-game done"><div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon">${GI[g.id] || ''}</div><div class="wk-name">${g.name}</div><div style="font-size:10px;color:var(--p);font-weight:700">${wk.scores[id] || 0}점</div></div>` }).join('')}
      </div>
    </div>`: `
    <div class="workout-card">
      <div style="text-align:center;padding:4px 0 12px">
        <div style="font-size:13px;color:var(--sub);margin-bottom:4px">${doneCount === 0 ? '오늘의 뇌를 깨워볼까요?' : '좋아요! 계속 가볼까요?'}</div>
        <div style="font-size:20px;font-weight:800">오늘의 두뇌 운동</div>
      </div>
      <div class="wk-games">
        ${wk.games.map((id, i) => {
    const g = GAMES.find(x => x.id === id);
    const done = wk.done.includes(id);
    const current = i === nextIdx;
    return `<div class="wk-game${done ? ' done' : ''}${current ? ' current' : ''}">
            ${done ? '<div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div>' : ''}
            <div class="wk-icon">${GI[g.id] || ''}</div>
            <div class="wk-name">${g.name}</div>
            ${done ? `<div style="font-size:10px;color:var(--ok);font-weight:700">${wk.scores[id] || 0}점</div>` : ''}
          </div>`}).join('')}
      </div>
      <div class="wk-progress" style="margin:12px 0"><div class="wk-progress-fill" style="width:${pct}%"></div></div>
      <button class="wk-start" onclick="startWorkout()" style="margin-top:4px">
        ${doneCount === 0 ? '지금 바로 시작하기' : nextGame ? '다음: ' + nextGame.name : '운동 시작하기'}
      </button>
      <div class="wk-bonus">완료 보너스 <span class="tds-badge tds-badge-xs tds-badge-fill-yellow">+50 XP</span> <span class="tds-badge tds-badge-xs tds-badge-fill-blue">+1점</span></div>
    </div>`;
}

function startWorkout() {
  const wk = getTodayWorkout();
  wkActive = true;
  wkGames = wk.games.filter(id => !wk.done.includes(id));
  wkIdx = 0; wkScores = [];
  showWkTransition();
}

function showWkTransition() {
  if (wkIdx >= wkGames.length) { finishWorkout(); return }
  const g = GAMES.find(x => x.id === wkGames[wkIdx]);
  const wk = getTodayWorkout();
  const totalDone = wk.done.length + wkIdx + 1;
  document.getElementById('wkt-progress').textContent = totalDone + ' / ' + WK_SIZE;
  document.getElementById('wkt-icon').innerHTML = GI[g.id] || ''; document.getElementById('wkt-icon').style.color = g.color;
  document.getElementById('wkt-name').textContent = g.name;
  const best = LS.get(g.id + '-best', 0);
  const target = best > 0 ? Math.ceil(best * 0.9) : 10;
  document.getElementById('wkt-desc').textContent = `목표 ${target}점 · 최고 ${best}점`;
  document.getElementById('wkTransition').classList.add('active');
}

function wkStartNext() {
  document.getElementById('wkTransition').classList.remove('active');
  startGame(wkGames[wkIdx]);
}

function wkOnGameEnd(gameId, score) {
  // Called from showResult when workout is active
  const wk = getTodayWorkout();
  if (!wk.done.includes(gameId)) wk.done.push(gameId);
  wk.scores[gameId] = score;
  saveWorkout(wk);
  wkIdx++;
}

function wkContinue() {
  // Called when user clicks "다음 운동" or closes result during workout
  if (wkIdx < wkGames.length) {
    // Ad between games
    showAd(() => showWkTransition());
  } else {
    finishWorkout();
  }
}

function finishWorkout() {
  const wk = getTodayWorkout();
  if (!wk.completed && wk.done.length >= WK_SIZE) {
    wk.completed = true; saveWorkout(wk);
    addCoins(30); addXP(50); addPoints(1); if (AIT.checkPromoFirstWorkout) AIT.checkPromoFirstWorkout();
    addXP(50); toast('오늘의 운동 완료! +50 XP +1점');
  }
  wkActive = false;
  goHome();
}

// ===== HEART SYSTEM =====
const MAX_HEARTS = 3;
let hearts = MAX_HEARTS;
let heartRefillUsed = false;
let heartGameId = null; // which game's hearts

function initHearts(gameId) {
  hearts = MAX_HEARTS; heartRefillUsed = false; heartGameId = gameId;
  renderHearts(gameId);
}
function renderHearts(gameId) {
  const el = document.getElementById(gameId + '-hearts');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const h = document.createElement('span');
    h.className = 'heart' + (i >= hearts ? ' lost' : '');
    h.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'; h.id = gameId + '-heart-' + i;
    el.appendChild(h);
  }
}
function loseHeart(gameId) {
  hearts--;
  const el = document.getElementById(gameId + '-heart-' + hearts);
  if (el) { el.classList.add('heart-break'); setTimeout(() => el.classList.add('lost'), 500) }
  // Shake remaining hearts
  const container = document.getElementById(gameId + '-hearts');
  if (container) { container.classList.add('heart-shake'); setTimeout(() => container.classList.remove('heart-shake'), 400) }
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  if (hearts <= 0) {
    // Pause all timers
    clearInterval(curTimer);
    [typeof cmpQTimer != 'undefined' && cmpQTimer, typeof scQTimer != 'undefined' && scQTimer, typeof clkQTimer != 'undefined' && clkQTimer, typeof sfQTimer != 'undefined' && sfQTimer, typeof oddQTimer != 'undefined' && oddQTimer, typeof mxQTimer != 'undefined' && mxQTimer, typeof cmxQTimer != 'undefined' && cmxQTimer, typeof wcQTimer != 'undefined' && wcQTimer, typeof lrQTimer != 'undefined' && lrQTimer, typeof cc2QTimer != 'undefined' && cc2QTimer].forEach(t => t && clearInterval(t));
    setTimeout(() => {
      if (heartRefillUsed) {
        // 이미 1회 사용 → 바로 결과
        const gameName = GAMES.find(g => g.id === curGame)?.name || '';
        showResult(curScore, gameName);
        return;
      }
      document.getElementById('heartOverlay').classList.add('active');
    }, 600);
    return true; // game should stop
  }
  return false;
}
function refillHearts() {
  showAd(() => {
    heartRefillUsed = true;
    hearts = 1;
    document.getElementById('heartOverlay').classList.remove('active');
    renderHearts(heartGameId);
    toast('마지막 기회!');
    resumeAfterHeart();
  });
}
function heartQuit() {
  document.getElementById('heartOverlay').classList.remove('active');
  const gameName = GAMES.find(g => g.id === curGame)?.name || '';
  showResult(curScore, gameName);
}
// ===== TIME EXTEND (타이머 게임 +5초) =====
let timeExtendUsed = false;
let _timeExtendCallback = null;
function showTimeExtend(callback) {
  if (timeExtendUsed) { callback(); return }
  _timeExtendCallback = callback;
  document.getElementById('timeExtendOverlay').classList.add('active');
}
function timeExtendQuit() {
  document.getElementById('timeExtendOverlay').classList.remove('active');
  if (_timeExtendCallback) _timeExtendCallback();
}
function timeExtendAccept() {
  document.getElementById('timeExtendOverlay').classList.remove('active');
  showAd(() => {
    timeExtendUsed = true;
    toast('+5초!');
    // 현재 게임의 시간 변수에 5초 추가하고 타이머 재개
    resumeWithExtraTime(5);
  });
}
function resumeWithExtraTime(sec) {
  const cfg = GAME_TIMER_CONFIG[curGame];
  if (!cfg) return;
  cfg.setTime(cfg.getTime() + sec);
  if (cfg.onTick) cfg.onTick();
  else document.getElementById(cfg.timerId).textContent = cfg.getTime() + 's';
  _startGameTimer(cfg);
  if (cfg.genFn) cfg.genFn();
}

function resumeAfterHeart() {
  const cfg = GAME_TIMER_CONFIG[curGame];
  if (!cfg) return;
  _startGameTimer(cfg);
  if (cfg.genFn) cfg.genFn();
}

// ===== COIN SYSTEM =====
const MILESTONES = [
  { id: 'first', name: '첫 걸음', desc: '첫 번째 게임 완료', coins: 10, icon: '●', bg: '#3182F6', check: () => LS.get('totalPlays', 0) >= 1 },
  { id: 'record3', name: '기록 파괴자', desc: '3가지 게임에서 신기록', coins: 30, icon: '★', bg: '#FFD700', check: () => { let c = 0; GAMES.forEach(g => { if (LS.get(g.id + '-best', 0) > 0) c++ }); return c >= 3 } },
  { id: 'coin100', name: '코인 수집가', desc: '100 코인 달성', coins: 20, icon: '+', bg: '#FFA000', check: () => getCoins() >= 100 },
  { id: 'streak7', name: '일주일 연속', desc: '7일 연속 출석', coins: 50, icon: '◆', bg: '#FF8A00', check: () => getStreak().streak >= 7 },
  { id: 'master1', name: '장인의 길', desc: '아무 게임 40점 이상', coins: 40, icon: '◆', bg: '#E040FB', check: () => GAMES.some(g => LS.get(g.id + '-best', 0) >= 40) },
  { id: 'allplay', name: '올라운더', desc: '10개 게임 모두 플레이', coins: 80, icon: '★', bg: '#10B981', check: () => { let c = 0; GAMES.forEach(g => { if (LS.get(g.id + '-best', 0) > 0) c++ }); return c >= 10 } },
  { id: 'coin500', name: '부자 두뇌', desc: '500 코인 달성', coins: 100, icon: '◇', bg: '#00BCD4', check: () => getCoins() >= 500 },
];

function getCoins() { return LS.get('coins', 0) }
function addCoins(n) { const c = getCoins() + n; LS.set('coins', c); return c }

// ===== POINT SYSTEM (토스포인트 교환용) =====
function getPoints() { return LS.get('points', 0) }
function addPoints(n) {
  const p = getPoints() + n; LS.set('points', p);
  toast('+' + n + '점 적립!');
  return p;
}
let _lastRenderedPoints = null;
function renderPoints(animate = false) {
  const p = getPoints();
  const el = document.getElementById('pointDisplay');
  if (el) el.textContent = p + '점';
  const el2 = document.getElementById('pointExchangeVal');
  if (el2) el2.textContent = p + '점';
  const prog = document.getElementById('pointProgress');
  const bar = document.getElementById('pointBar');
  const btn = document.getElementById('exchangeBtn');

  if (animate && _lastRenderedPoints !== null && p > _lastRenderedPoints) {
    animatePointsFrom(_lastRenderedPoints);
  } else {
    if (prog) prog.textContent = p + ' / 100점';
    if (bar) bar.style.width = Math.min(100, p) + '%';
  }
  _lastRenderedPoints = p;
  if (btn) btn.disabled = p < 100;
}
let _exchangeLock = false;
async function exchangePoints() {
  const p = getPoints();
  if (p < 100) { toast('100점 이상부터 교환 가능합니다'); return }
  if (!AIT.isToss) { toast('토스 앱에서만 교환 가능합니다'); return }
  // 동시 클릭 방지
  if (_exchangeLock) { return }
  _exchangeLock = true;
  const btn = document.getElementById('exchangeBtn');
  if (btn) { btn.disabled = true; btn.textContent = '교환 중...' }
  try {
    // 1단계: 서버에 교환 요청 (포인트 차감 기록)
    const uh = await AIT.getUserHash();
    const serverRes = await fetch('/api/score/promo/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userHash: uh, points: p })
    }).then(r => r.json());
    if (serverRes.error) { throw new Error(serverRes.error) }
    // 2단계: SDK로 토스포인트 지급
    await AIT.triggerPromo('POINT_100', AIT.CONFIG.PROMO_POINT_100, 100);
    // 3단계: 성공 → 로컬 포인트 초기화
    LS.set('points', 0); renderPoints();
    toast('100원 교환 완료!');
    AIT.log('point_exchange', { amount: p, userHash: uh });
  } catch (e) {
    console.error('Exchange failed:', e);
    toast('교환에 실패했습니다. 다시 시도해주세요.');
  } finally {
    _exchangeLock = false;
    if (btn) { btn.disabled = getPoints() < 100; btn.textContent = '100원 받기' }
  }
}

// Calculate coins earned from a game result
function calcCoins(score, isNewRecord) {
  let coins = 0;
  // Base: 1 coin per 5 points
  coins += Math.floor(score / 5);
  // New record bonus
  if (isNewRecord && score > 0) coins += 10;
  // Score milestones
  if (score >= 40) coins += 5;
  if (score >= 25) coins += 3;
  return Math.max(coins, 1); // minimum 1 coin
}

let pendingCoins = 0; // for double coins ad
function checkMilestones() {
  const claimed = LS.getJSON('claimedMilestones', []);
  let newClaimed = [];
  MILESTONES.forEach(m => {
    if (!claimed.includes(m.id) && m.check()) {
      claimed.push(m.id);
      addCoins(m.coins);
      newClaimed.push(m);
    }
  });
  LS.setJSON('claimedMilestones', claimed);
  return newClaimed;
}

function renderMilestones() {
  const claimed = LS.getJSON('claimedMilestones', []);
  const coins = getCoins();
  document.getElementById('coinBadge').textContent = '' + coins.toLocaleString();
  document.getElementById('coinTotal').textContent = coins.toLocaleString() + ' 코인';
  document.getElementById('coinMilestones').innerHTML = MILESTONES.map(m => {
    const done = claimed.includes(m.id);
    const progress = m.check();
    return `<div class="cm-item">
      <div class="cm-icon" style="background:${m.bg}18">${m.icon}</div>
      <div class="cm-info">
        <div class="cm-name">${m.name}</div>
        <div class="cm-desc">${m.desc}</div>
      </div>
      <div class="cm-status ${done ? 'done' : 'locked'}">${done ? '✓ +' + m.coins : '' + m.coins}</div>
    </div>`}).join('');
}

function floatCoin(x, y) {
  const el = document.createElement('div'); el.className = 'coin-float'; el.textContent = '+';
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}

// brain age = rank age (removed separate calc)

function doubleCoins() {
  if (!pendingCoins) return;
  showAd(() => {
    addCoins(pendingCoins); // add same amount again = 2x
    document.getElementById('r-coin-new').textContent = '+' + pendingCoins * 2 + ' (2배!)';
    toast('코인 2배! +' + pendingCoins * 2);
    // Float coins animation
    for (let i = 0; i < 5; i++) { setTimeout(() => floatCoin(window.innerWidth / 2 - 12 + Math.random() * 40 - 20, window.innerHeight / 2), i * 100) }
    pendingCoins = 0;
  });
}

// ===== TOAST =====
let toastT;
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2000) }
let snackT; function snackbar(html, dur = 2500) { const el = document.getElementById('snackbar'); document.getElementById('snackbar-inner').innerHTML = html; el.classList.add('show'); clearTimeout(snackT); snackT = setTimeout(() => el.classList.remove('show'), dur) }

// ===== STREAK =====
function getStreak() {
  const hist = LS.getJSON('playDates', []);
  const today = getDayKey();
  if (!hist.length) return { streak: 0, playedToday: false };
  let streak = 0;
  const now = new Date(); const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) kst.setUTCDate(kst.getUTCDate() - 1);
  for (let i = 0; i < 30; i++) {
    const ds = kst.toISOString().slice(0, 10);
    if (hist.includes(ds)) { streak++; kst.setUTCDate(kst.getUTCDate() - 1) } else break;
  }
  return { streak, playedToday: hist.includes(today) };
}
function recordPlay() {
  const today = getDayKey();
  const hist = LS.getJSON('playDates', []);
  if (!hist.includes(today)) { hist.push(today); LS.setJSON('playDates', hist) }
}

// ===== DAILY MISSIONS =====
function getTodayMissions() {
  const today = getDayKey();
  let missions = LS.getJSON('missions-' + today, null);
  // Force regen if stale targets (all 10)
  if (missions && (missions.length !== 5 || missions.every(m => m.target <= 10) || !missions[0].gameId || missions[0].type)) { missions = null; localStorage.removeItem('bf-missions-' + today) }
  if (!missions) {
    // Generate game-specific challenges based on best scores
    const gameMissions = GAMES.map(g => {
      const best = LS.get(g.id + '-best', 0);
      const defaults = { math: 80, memory: 60, reaction: 200, stroop: 80, sequence: 50, word: 60, pattern: 60, focus: 80, rotate: 60, reverse: 50, numtouch: 200, rhythm: 40, rps: 80, oddone: 80, compare: 80, bulb: 50, colormix: 60, wordcomp: 60, timing: 60, matchpair: 100, headcount: 60, pyramid: 60, maxnum: 80, signfind: 80, coincount: 60, clock: 60, wordmem: 60, blockcount: 60, flanker: 80, memgrid: 50, nback: 80, scramble: 60, serial: 80, leftright: 80, calccomp: 60, flash: 40, sort: 60, mirror: 50 };
      const target = best > 0 ? Math.round(best * 1.05) : (defaults[g.id] || 50);
      return { id: 'goal-' + g.id, gameId: g.id, name: g.name, desc: `${target}점 이상 달성`, target, best, xp: 20, icon: '●', bg: g.color, progress: 0, done: false };
    });
    // 5 game-specific score missions
    const shuffled = [...gameMissions].sort(() => Math.random() - .5);
    missions = shuffled.slice(0, 5);
    LS.setJSON('missions-' + today, missions);
  }
  return missions;
}
function updateMission(gameId, score, extra = {}) {
  const today = getDayKey();
  const missions = LS.getJSON('missions-' + today, []);
  let completed = [];
  missions.forEach(m => {
    if (m.done) return;
    if (m.gameId === gameId && score >= m.target) { m.progress = score; m.done = true; completed.push(m); addPoints(1) }
  });
  LS.setJSON('missions-' + today, missions);
  // 5개 모두 완료 시 보너스
  const allDone = missions.every(m => m.done);
  const bonusKey = 'mission-bonus-' + today;
  if (allDone && !LS.get(bonusKey)) { LS.set(bonusKey, 1); addPoints(2); toast('챌린지 올클리어 보너스 +2점!') }
  return completed;
}

// ===== DAILY SCORE HISTORY =====
function recordDailyScore(score) {
  const today = getDayKey();
  const hist = LS.getJSON('scoreHist', {});
  hist[today] = Math.max(hist[today] || 0, score);
  LS.setJSON('scoreHist', hist);
}

// ===== HOME RENDERING =====
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id)?.classList.add('active') }

function renderHome() {
  const xp = getXP(); const rank = getRank(xp); const next = getNextRank(xp);
  const { streak, playedToday } = getStreak();

  // Streak badge
  document.getElementById('streakLabel').textContent = (streak || 0) > 0 ? (streak + '일 연속 출석중') : '오늘 첫 출석을 해보세요!';

  // Rank card
  document.getElementById('rankName').textContent = rank.name;
  document.getElementById('rankName').style.color = rank.color;
  document.getElementById('rankNext').textContent = next ? `다음 목표: ${next.name}` : '최고로 젊은 두뇌!';
  document.getElementById('xpCur').textContent = xp + ' XP';
  document.getElementById('xpMax').textContent = (next?.minXp || xp) + ' XP';
  const progress = next ? ((xp - rank.minXp) / (next.minXp - rank.minXp) * 100) : 100;
  document.getElementById('xpFill').style.width = progress + '%';

  // Overall percentile (average of all game percentiles)
  function estimatedPercentile(gid, s) {
    const E = { math: [180, 80], memory: [100, 40], reaction: [350, 120], stroop: [160, 70], sequence: [100, 50], word: [80, 35], pattern: [120, 55], focus: [180, 70], rotate: [90, 40], reverse: [80, 40], numtouch: [100, 50], rhythm: [100, 55], rps: [140, 55], oddone: [200, 80], compare: [160, 60], bulb: [100, 55], colormix: [90, 40], wordcomp: [110, 45], timing: [90, 45], matchpair: [180, 70], headcount: [90, 40], pyramid: [70, 35], maxnum: [160, 65], signfind: [110, 45], coincount: [90, 40], clock: [70, 35], wordmem: [90, 45], blockcount: [90, 40], flanker: [140, 55], memgrid: [80, 40], nback: [100, 45], scramble: [90, 40], serial: [120, 50], leftright: [140, 55], calccomp: [110, 45], flash: [90, 45], sort: [140, 55], mirror: [90, 40] };
    const [m, sd] = E[gid] || [50, 20]; const z = (s - m) / sd;
    const t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989422804, p = d * t * (-.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.3302744))));
    return Math.max(1, Math.min(99, Math.round((z > 0 ? 1 - p : p) * 100)));
  }
  let total = 0, count = 0;
  const catScores = {};
  let pctSum = 0, pctCount = 0;
  GAMES.forEach(g => { const b = LS.get(g.id + '-best', 0); if (b > 0) { total += b; count++; catScores[g.cat] = (catScores[g.cat] || 0) + b; pctSum += estimatedPercentile(g.id, b); pctCount++ } });
  const avg = count > 0 ? Math.round(total / count) : 0;
  const overallPct = pctCount > 0 ? Math.round(pctSum / pctCount) : 0;
  document.getElementById('overallPct').textContent = overallPct > 0 ? ('상위 ' + (101 - overallPct) + '%') : '--';
  recordDailyScore(avg);

  // Missions
  const missions = getTodayMissions();
  const doneCount = missions.filter(m => m.done).length;
  document.getElementById('missionCount').textContent = doneCount + '/' + missions.length;
  document.getElementById('missionList').innerHTML = missions.map(m => {
    const pct = Math.min(100, m.target > 0 ? (m.progress / m.target * 100) : 0);
    const best = LS.get(m.gameId + '-best', 0);
    return `<div class="mission-card" onclick="startGame('${m.gameId}')" style="cursor:pointer">
      <div class="mission-icon" style="background:rgba(49,130,246,.08);color:var(--p)">${GI[m.gameId] ? `<div style="width:18px;height:18px">${GI[m.gameId]}</div>` : '●'}</div>
      <div class="mission-info">
        <div class="mission-name">${m.name} <span style="font-size:11px;color:var(--sub);font-weight:400">목표 ${m.target}점 · 최고 ${best}점</span></div>
        <div class="mission-desc">${m.desc}</div>
        ${m.done ? '' : `<div class="mission-prog"><div class="mission-prog-fill" style="width:${pct}%;background:var(--p)"></div></div>`}
      </div>
      ${m.done ? '<div class="mission-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:20px;height:20px"></div>' : `<div class="mission-reward" style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="tds-badge tds-badge-xs tds-badge-weak-yellow">+${m.xp}XP</span><span class="tds-badge tds-badge-xs tds-badge-weak-blue">+1점</span></div>`}
    </div>`}).join('');

  // Streak calendar (7 days)
  const playDates = LS.getJSON('playDates', []);
  const streakCount = Math.max(streak, 0);
  let calHTML = '';
  for (let i = 0; i < 7; i++) {
    const dayNum = i + 1;
    const checked = i < streakCount;
    const isNext = i === streakCount;
    const dotClass = checked ? 'done' : isNext ? 'today' : '';
    const label = dayNum + '일';
    calHTML += `<div class="streak-day"><div class="sd-label">${label}</div><div class="sd-dot ${dotClass}">${checked ? '✓' : isNext ? '·' : ''}</div></div>`;
  }
  document.getElementById('streakDays').innerHTML = calHTML;
  // Streak rewards
  const nextBonus = [3, 7, 14, 30].find(n => n > streak) || 30;
  const srEl = document.getElementById('streakReward');
  if (srEl) srEl.innerHTML = `${streak}일 연속 출석 중! <b>${nextBonus}일 보너스까지 ${nextBonus - streak}일</b>`;

  // Daily Workout (primary)
  renderWorkout();
  renderTicketCount();
  renderPoints(true);

  // (milestones removed)

  // Total plays tracking
  LS.set('totalPlays', (LS.get('totalPlays', 0)));

  // Game grid grouped by category
  const CAT_META = {
    '기억력': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M12 2a7 7 0 017 7c0 3-2 5-4 7l-3 4-3-4c-2-2-4-4-4-7a7 7 0 017-7z"/></svg>', desc: '정보를 저장하고 떠올리는 능력' },
    '집중': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>', desc: '주의를 유지하고 선택적으로 집중하는 능력' },
    '연산': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', desc: '수를 빠르고 정확하게 처리하는 능력' },
    '유연성': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>', desc: '사고를 전환하고 적응하는 능력' },
    '언어': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>', desc: '단어와 언어를 처리하는 능력' },
    '논리': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M9.5 2A2.5 2.5 0 0112 4.5V5h2.5A2.5 2.5 0 0117 7.5V10h.5a2.5 2.5 0 010 5H17v2.5a2.5 2.5 0 01-2.5 2.5H12v.5a2.5 2.5 0 01-5 0V20H4.5A2.5 2.5 0 012 17.5V15h.5a2.5 2.5 0 010-5H2V7.5A2.5 2.5 0 014.5 5H7v-.5A2.5 2.5 0 019.5 2z"/></svg>', desc: '규칙을 파악하고 논리적으로 추론하는 능력' },
    '공간': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M12 2l10 6v8l-10 6-10-6V8z"/></svg>', desc: '공간과 도형을 인식하고 조작하는 능력' },
    '반응': { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', desc: '빠르고 정확하게 반응하는 능력' }
  };
  const cats = ['기억력', '집중', '연산', '유연성', '언어', '논리', '공간', '반응'];
  let gridHtml = '';
  cats.forEach(cat => {
    const games = GAMES.filter(g => g.cat === cat); if (!games.length) return;
    const m = CAT_META[cat] || { icon: '', desc: '' };
    gridHtml += `<div style="margin-top:16px;margin-bottom:8px"><div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--sub)">${m.icon} ${cat}</div><div style="font-size:11px;color:var(--sub);margin-top:1px">${m.desc}</div></div>`;
    gridHtml += `<div class="game-grid">${games.map(g => `<div class="game-card" onclick="startGame('${g.id}')">
      <div class="gc-icon" style="width:36px;height:36px;border-radius:10px;background:${g.color}18;color:${g.color};display:flex;align-items:center;justify-content:center;padding:7px">${GI[g.id] || ''}</div>
      <div class="gc-name">${g.name}</div>
      <div class="gc-desc">${g.desc}</div>
      <div class="gc-best">${(() => { const b = LS.get(g.id + '-best', 0); if (b > 0) { const p = 101 - estimatedPercentile(g.id, b); return '<span class="tds-badge tds-badge-xs tds-badge-weak-blue">' + b + '점</span> 상위 ' + p + '%' } return '<span style="color:var(--sub)">도전해보세요!</span>' })()}</div>
    </div>`).join('')}</div>`;
  });
  document.getElementById('gameGrid').innerHTML = gridHtml;
}

function goHome() { clearInterval(curTimer); clearTimeout(curTimer); show('homeScreen'); document.getElementById('overlay').classList.remove('active'); renderHome() }
function debugAddPoint() { const prev = getPoints(); addPoints(1); animatePointsFrom(prev); }
function animatePointsFrom(from) {
  const to = getPoints(), diff = to - from, dur = 600, prog = document.getElementById('pointProgress'), bar = document.getElementById('pointBar');
  if (!prog || diff <= 0) return;
  const card = prog.closest('div[style*="background:var(--card)"]');
  // Phase 1: Flash blue with "+N점" overlay
  if (card) {
    // Save original content, replace with centered "+N점"
    const origHTML = card.innerHTML;
    card.style.transition = 'background .3s, box-shadow .3s';
    card.style.background = 'var(--p)'; card.style.boxShadow = '0 4px 16px rgba(49,130,246,.3)';
    card.innerHTML = `<div style="text-align:center;padding:20px 0;color:#fff;font-size:28px;font-weight:800">+${diff}점</div>`;
    // Restore after 1.2s
    setTimeout(() => {
      card.style.background = 'var(--card)'; card.style.boxShadow = 'var(--shadow)';
      card.innerHTML = origHTML;
      // Re-grab elements after restore
      const p2 = document.getElementById('pointProgress'), b2 = document.getElementById('pointBar');
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur); const ease = 1 - Math.pow(1 - t, 3); const cur = Math.round(from + (to - from) * ease);
        if (p2) p2.textContent = cur + ' / 100점'; if (b2) b2.style.width = Math.min(100, cur) + '%'; if (t < 1) requestAnimationFrame(tick);
        else { const btn = document.getElementById('exchangeBtn'); if (btn) btn.disabled = to < 100 }
      }
      requestAnimationFrame(tick);
    }, 1200);
  }
}

let curGoal = 0, goalReached = false;
function initGoalBar(id) {
  const best = LS.get(id + '-best', 0);
  const defaults = {
    math: 200, memory: 120, reaction: 400, stroop: 150, sequence: 100, word: 120, pattern: 120, focus: 200,
    rotate: 120, reverse: 80, numtouch: 100, rhythm: 80, rps: 120, oddone: 150, compare: 120, bulb: 80, colormix: 100,
    wordcomp: 120, timing: 100, matchpair: 120, headcount: 120, pyramid: 120, maxnum: 150, signfind: 120, coincount: 120,
    clock: 100, wordmem: 80, blockcount: 120, flanker: 120, memgrid: 80, nback: 150, scramble: 120, serial: 150,
    leftright: 120, calccomp: 120, flash: 80, sort: 150, mirror: 120
  };
  curGoal = best > 0 ? Math.ceil(best * 0.9) : (defaults[id] || 60); goalReached = false;
  const scoreEl = document.querySelector('#game-' + id + ' .g-score');
  if (!scoreEl) return;
  let bar = scoreEl.parentElement.querySelector('.goal-bar');
  if (!bar) {
    bar = document.createElement('div'); bar.className = 'goal-bar';
    bar.innerHTML = '<div class="gb-label"><span class="gb-cur">0점</span><span class="gb-target">목표 0점</span></div><div class="gb-track"><div class="gb-fill"></div></div>';
    scoreEl.after(bar)
  }
  bar.querySelector('.gb-target').textContent = '목표 ' + curGoal + '점';
  bar.querySelector('.gb-cur').textContent = '0점';
  bar.querySelector('.gb-fill').style.width = '0';
  bar.querySelector('.gb-fill').className = 'gb-fill';
}
function setScore(elId, score) { document.getElementById(elId).textContent = score + '점'; updateGoal(score, curGame) }
function updateGoal(score, gameId) {
  const bar = document.querySelector('#game-' + gameId + ' .goal-bar'); if (!bar) return;
  const pct = Math.min(100, Math.round(score / curGoal * 100));
  bar.querySelector('.gb-cur').textContent = score + '점';
  const fill = bar.querySelector('.gb-fill'); fill.style.width = pct + '%';
  if (!goalReached && score >= curGoal) { goalReached = true; fill.className = 'gb-fill done'; toast('목표 달성!') }
  else if (pct >= 80) fill.className = 'gb-fill hot';
}
// ===== TICKET SYSTEM =====
const MAX_TICKETS = 5;
function getTickets() {
  const today = getDayKey();
  const saved = LS.getJSON('tickets', null);
  if (!saved || saved.day !== today) {
    const prev = saved ? saved.count : 0;
    const count = prev >= MAX_TICKETS ? prev : MAX_TICKETS;
    const t = { day: today, count }; LS.setJSON('tickets', t); return t;
  }
  return saved;
}
function useTicket() {
  const t = getTickets();
  t.count = Math.max(0, t.count - 1);
  LS.setJSON('tickets', t);
  return t.count;
}
function renderTicketCount() {
  const el = document.getElementById('ticketNum');
  if (el) el.textContent = getTickets().count;
}
let _pendingTicketGame = null;
function showTicketModal(gameId) {
  _pendingTicketGame = gameId;
  document.getElementById('ticketModal').style.display = 'flex';
  document.getElementById('ticketAdBtn').onclick = () => {
    closeTicketModal();
    AIT.showAd('interstitial').then(() => {
      wkActive = false;
      curGame = gameId; curScore = 0;
      LS.set('totalPlays', LS.get('totalPlays', 0) + 1);
      show('game-' + gameId); initGoalBar(gameId);
      ({
        math: initMath, memory: initMemory, sequence: initSequence, stroop: initStroop, reaction: initReaction,
        word: initWord, pattern: initPattern, focus: initFocus, rotate: initRotate, reverse: initReverse,
        numtouch: initNumtouch, rhythm: initRhythm, rps: initRps, oddone: initOddone, compare: initCompare,
        bulb: initBulb, colormix: initColormix, wordcomp: initWordcomp, timing: initTiming, matchpair: initMatchpair,
        headcount: initHeadcount, pyramid: initPyramid, maxnum: initMaxnum, signfind: initSignfind,
        coincount: initCoincount, clock: initClock, wordmem: initWordmem, blockcount: initBlockcount,
        flanker: initFlanker, memgrid: initMemgrid, nback: initNback, scramble: initScramble, serial: initSerial,
        leftright: initLeftright, calccomp: initCalccomp, flash: initFlash, sort: initSort, mirror: initMirror
      })[gameId]();
      AIT.log('game_start', { game: gameId, source: 'ticket_ad' });
    });
  };
}
function showTicketShop() {
  const t = getTickets();
  document.getElementById('ts-count').textContent = t.count + '장';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('ticketShop').classList.add('active');
}
function ticketAdRefill() {
  showAd(() => {
    const bonus = 3 + ~~(Math.random() * 3); // 3~5장
    const t = getTickets();
    t.count = Math.min(99, t.count + bonus);
    LS.setJSON('tickets', t);
    renderTickets();
    document.getElementById('ts-count').textContent = t.count + '장';
    snackbar(`<img src="https://static.toss.im/2d-emojis/svg/u1F39F.svg" style="width:16px;height:16px">티켓 ${bonus}장 충전 완료!`);
  });
}
function closeTicketModal() {
  document.getElementById('ticketModal').style.display = 'none';
  _pendingTicketGame = null;
}

function startGame(id, skipTicket = false) {
  // 운동 모드가 아닌 자유 훈련일 때 티켓 체크
  if (!wkActive && !skipTicket) {
    const t = getTickets();
    if (t.count <= 0) {
      showTicketModal(id);
      return;
    }
    const remaining = useTicket();
    snackbar(`<img src="https://static.toss.im/2d-emojis/svg/u1F39F.svg" style="width:16px;height:16px">티켓 사용 · 남은 티켓 ${remaining}장`);
    renderTicketCount();
  }
  curGame = id; curScore = 0; timeExtendUsed = false;
  LS.set('totalPlays', LS.get('totalPlays', 0) + 1);
  show('game-' + id); initGoalBar(id);
  ({
    math: initMath, memory: initMemory, sequence: initSequence, stroop: initStroop, reaction: initReaction,
    word: initWord, pattern: initPattern, focus: initFocus, rotate: initRotate, reverse: initReverse,
    numtouch: initNumtouch, rhythm: initRhythm, rps: initRps, oddone: initOddone, compare: initCompare,
    bulb: initBulb, colormix: initColormix, wordcomp: initWordcomp, timing: initTiming, matchpair: initMatchpair,
    headcount: initHeadcount, pyramid: initPyramid, maxnum: initMaxnum, signfind: initSignfind,
    coincount: initCoincount, clock: initClock, wordmem: initWordmem, blockcount: initBlockcount,
    flanker: initFlanker, memgrid: initMemgrid, nback: initNback, scramble: initScramble, serial: initSerial,
    leftright: initLeftright, calccomp: initCalccomp, flash: initFlash, sort: initSort, mirror: initMirror
  })[id]();
  AIT.log('game_start', { game: id, totalPlays: LS.get('totalPlays', 0) });
}

// ===== RESULT =====
function getRetryMotivation(gameId, score, best, isNew) {
  const g = GAMES.find(x => x.id === gameId);
  // Level-based games (hearts + no timer = survival games)
  const levelGames = ['sequence', 'reverse', 'rhythm', 'bulb', 'flash', 'wordmem', 'memgrid', 'headcount'];
  const isLevel = levelGames.includes(gameId);

  const btn = '광고보고 한 번 더 도전하기';
  if (isNew && score > 0) {
    if (isLevel) return { msg: '새 기록 달성! 집중력이 올라왔을 때 더 높이!', btn };
    return { msg: '컨디션 최고! 이 기세로 더 높은 점수를!', btn };
  }
  if (best > 0 && score >= best * 0.8) {
    const gap = best - score;
    return { msg: `최고기록까지 단 ${gap}점! 충분히 깰 수 있어요`, btn };
  }
  if (best > 0 && score >= best * 0.5) {
    return { msg: `최고기록 ${best}점, 워밍업 끝! 실력 발휘할 차례`, btn };
  }
  if (best > 0) {
    return { msg: '한 판 더 하면 감이 올 거예요!', btn };
  }
  return { msg: '첫 기록이 세워졌어요! 더 높은 점수에 도전?', btn };
}
let _showResultArgs = null;
function showResult(score, name, stats = [], extra = {}) {
  // 타이머 게임 첫 종료 시 +5초 제안 (레지스트리 기반)
  const cfg = GAME_TIMER_CONFIG[curGame];
  const isTimerGame = !!cfg;
  const isTimerEnd = cfg ? cfg.getTime() <= 0 : false;
  if (!timeExtendUsed && isTimerGame && !extra._fromTimeExtend && isTimerEnd) {
    _showResultArgs = [score, name, stats, extra];
    showTimeExtend(() => {
      const a = _showResultArgs;
      a[3]._fromTimeExtend = true;
      showResult(...a);
    });
    return;
  }
  curScore = score;
  const best = LS.get(curGame + '-best', 0), isNew = score > best;
  if (isNew) LS.set(curGame + '-best', score);
  recordPlay();

  // XP calculation: base + score bonus + new record bonus
  let xpGain = 10 + Math.floor(score / 5);
  if (isNew && score > 0) xpGain += 15;
  const oldXP = getXP(); const oldRank = getRank(oldXP);
  const newXP = addXP(xpGain); const newRank = getRank(newXP);

  // Mission check
  const completed = updateMission(curGame, score, extra);
  completed.forEach(m => addXP(m.xp));

  // UI
  // emoji removed
  document.getElementById('r-title').textContent = name + ' 완료!';
  const bonusEl = document.getElementById('r-bonus');
  if (extra.timeBonus) {
    const tb = extra.timeBonus, ts = extra.timeLeft;
    const baseScore = score - tb;
    setScore('r-score', baseScore);
    bonusEl.innerHTML = `<div style="font-size:14px;color:var(--sub);margin:2px 0">남은 시간 ${ts}초 × 5</div><div style="font-size:20px;font-weight:800;color:var(--ok)">+${tb}점</div>`;
    bonusEl.classList.remove('hide');
    setTimeout(() => { setScore('r-score', score); bonusEl.querySelector('div:last-child').style.opacity = '0.5' }, 1500);
  } else {
    setScore('r-score', score);
    bonusEl.classList.add('hide');
  }
  const bestNow = LS.get(curGame + '-best', 0);
  if (isNew && score > 0) { document.getElementById('r-cat').textContent = '새로운 최고기록!'; document.getElementById('r-cat').style.color = 'var(--ok)' }
  else if (bestNow > 0) {
    const pct = Math.round(score / bestNow * 100);
    if (pct >= 100) { document.getElementById('r-cat').textContent = `최고기록 달성!`; document.getElementById('r-cat').style.color = 'var(--ok)' }
    else if (pct >= 90) { document.getElementById('r-cat').textContent = `최고기록의 ${pct}% — 거의 다 왔어요!`; document.getElementById('r-cat').style.color = 'var(--p)' }
    else if (pct >= 70) { document.getElementById('r-cat').textContent = `최고기록의 ${pct}% — 조금만 더!`; document.getElementById('r-cat').style.color = 'var(--p)' }
    else { document.getElementById('r-cat').textContent = `최고기록 ${bestNow}점 대비 ${pct}%`; document.getElementById('r-cat').style.color = 'var(--sub)' }
  } else { document.getElementById('r-cat').textContent = '첫 기록!'; document.getElementById('r-cat').style.color = 'var(--p)' }

  // XP display
  const xpEl = document.getElementById('r-xp');
  xpEl.textContent = `+${xpGain} XP`;
  xpEl.classList.remove('hide');

  // Point display
  let ptGain = 0;
  if (completed.length) ptGain += completed.length; // +1 per mission
  const ptEl = document.getElementById('r-pt');
  if (ptGain > 0) { ptEl.textContent = `+${ptGain} 두뇌점수`; ptEl.classList.remove('hide') }
  else { ptEl.classList.add('hide') }

  // Mission display
  const mEl = document.getElementById('r-mission');
  if (completed.length) {
    mEl.innerHTML = '' + completed.map(m => `${m.name} 완료! (+${m.xp}XP)`).join(' / ');
    mEl.classList.remove('hide');
  } else { mEl.classList.add('hide') }

  // Stats
  const statsEl = document.getElementById('r-stats');
  if (stats?.length) { statsEl.innerHTML = stats.map(s => `<div class="r-stat"><div class="rs-val">${s.val}</div><div class="rs-label">${s.label}</div></div>`).join(''); statsEl.classList.remove('hide') }
  else { statsEl.classList.add('hide') }

  // Event logging & Game Center
  AIT.log('game_complete', { game: curGame, score, best: LS.get(curGame + '-best', 0), isNew, xp: xpGain });
  if (score > 0 && AIT.isToss) AIT.submitScore(score).catch(() => { });

  // Percentile (async)
  const pctEl = document.getElementById('r-percentile');
  pctEl.classList.add('hide');
  if (score > 0) {
    AIT.getUserHash().then(uh => fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: curGame, score, userHash: uh }) })).then(r => r.json()).then(d => {
      const top = 100 - d.percentile;
      document.getElementById('r-pct-val').textContent = top <= 1 ? '상위 1%' : `상위 ${top}%`;
      document.getElementById('r-pct-val').style.color = top <= 10 ? 'var(--ok)' : top <= 30 ? 'var(--purple)' : 'var(--p)';
      document.getElementById('r-pct-players').textContent = d.totalPlayers >= 100 ? `${d.totalPlayers.toLocaleString()}명 참여` : '';
      pctEl.classList.remove('hide');
    }).catch(() => { })
  }

  // Science card
  const SCIENCE = {
    math: { t: '암산이 두뇌에 미치는 효과', d: '암산은 전두엽의 작업 기억과 처리 속도를 활성화합니다. 도호쿠 대학 연구에 따르면 빠른 계산 훈련이 전두전피질 혈류를 증가시켜 인지 기능 저하를 예방합니다.' },
    memory: { t: '기억력 카드와 작업 기억', d: '카드 매칭은 시각적 작업 기억(Visual Working Memory)을 훈련합니다. 해마와 전두엽이 협력하여 단기 정보를 저장하고 비교하는 능력이 향상됩니다.' },
    reaction: { t: '반응속도와 신경 전달', d: '반응속도 훈련은 신경 전달 속도와 운동 피질의 효율성을 높입니다. 규칙적인 훈련으로 평균 반응시간이 10-15% 개선될 수 있습니다.' },
    stroop: { t: '스트룹 효과와 인지 억제', d: '글자 색상과 의미가 충돌할 때 전두엽의 억제 제어(Inhibitory Control)가 작동합니다. 이 능력은 충동 조절과 의사결정에 핵심적입니다.' },
    sequence: { t: '순서 기억과 작업 기억 용량', d: '숫자 순서 기억은 작업 기억 용량(Working Memory Span)을 측정하고 훈련합니다. 일반 성인의 기억 폭은 7±2개이며, 훈련으로 확장 가능합니다.' },
    word: { t: '단어 찾기와 언어 처리', d: '단어 검색은 좌측 측두엽의 언어 네트워크를 활성화합니다. 시각 탐색과 어휘 인출을 동시에 수행하여 멀티태스킹 능력을 강화합니다.' },
    pattern: { t: '패턴 인식과 유동 지능', d: '패턴 완성은 유동 지능(Fluid Intelligence)의 핵심 요소입니다. 규칙을 추론하는 능력은 새로운 문제 해결과 학습 속도에 직결됩니다.' },
    focus: { t: '선택적 주의력 훈련', d: '타겟만 빠르게 터치하는 과제는 선택적 주의력(Selective Attention)을 훈련합니다. 불필요한 자극을 걸러내는 이 능력은 일상의 집중력과 직결됩니다.' },
    rotate: { t: '심적 회전과 공간 인지', d: '도형 회전은 두정엽의 심적 회전(Mental Rotation) 능력을 사용합니다. 이 능력은 길 찾기, 주차, 물건 조립 등 실생활 공간 능력의 기반입니다.' },
    reverse: { t: '역순 기억과 실행 기능', d: '숫자를 거꾸로 기억하는 과제는 작업 기억의 조작 능력을 훈련합니다. 단순 저장이 아닌 정보 변환이 필요하여 전두엽 실행 기능을 강화합니다.' },
    numtouch: { t: '시각 탐색과 처리 속도', d: '1부터 25까지 순서대로 찾는 과제는 시각 탐색 속도와 주의 전환을 훈련합니다. TMT(Trail Making Test)와 유사한 신경심리검사 원리입니다.' },
    rhythm: { t: '리듬 기억과 절차적 기억', d: '리듬 패턴 기억은 절차적 기억(Procedural Memory)과 청각 작업 기억을 활용합니다. 음악적 패턴 인식 능력은 언어 학습과도 관련됩니다.' },
    rps: { t: '인지 유연성과 반응 억제', d: '조건에 맞게 선택하는 과제는 자동 반응을 억제하고 규칙을 전환하는 인지 유연성을 훈련합니다. 전두엽의 실행 제어 네트워크가 핵심입니다.' },
    oddone: { t: '시각 변별력과 주의력', d: '다른 글자를 찾는 과제는 시각 변별력(Visual Discrimination)을 훈련합니다. 미세한 차이를 빠르게 감지하는 능력은 두정엽과 시각 피질의 협력으로 이루어집니다.' },
    compare: { t: '수 감각과 비교 판단', d: '두 수의 크기를 빠르게 비교하는 능력은 두정엽 내측 고랑(IPS)에서 처리됩니다. 수 감각(Number Sense)은 수학적 사고의 기초 능력입니다.' },
    bulb: { t: '시각적 순서 기억', d: '전구 순서 기억은 시공간 작업 기억(Visuospatial Sketchpad)을 훈련합니다. Corsi 블록 과제와 동일한 원리로 공간적 순서 기억 용량을 확장합니다.' },
    colormix: { t: '색채 인지와 논리 추론', d: '색 혼합 결과를 추론하는 과제는 시각 처리와 논리적 추론을 결합합니다. 색채 정보 처리는 V4 영역에서, 추론은 전두엽에서 담당합니다.' },
    wordcomp: { t: '어휘 인출과 언어 지식', d: '빈칸에 맞는 글자를 찾는 과제는 장기 기억에서 어휘를 인출하는 능력을 훈련합니다. 브로카 영역과 측두엽의 의미 네트워크가 활성화됩니다.' },
    timing: { t: '시간 지각과 운동 제어', d: '정확한 타이밍에 멈추는 과제는 소뇌와 기저핵의 시간 지각(Time Perception) 능력을 훈련합니다. 이 능력은 운동 조절과 리듬감의 기초입니다.' },
    matchpair: { t: '의미 연결과 연상 기억', d: '한자어와 뜻을 연결하는 과제는 연상 기억(Associative Memory)을 훈련합니다. 해마의 관계 결합(Relational Binding) 기능이 핵심입니다.' },
    headcount: { t: '추적 주의력과 수 세기', d: '인원 세기는 다중 물체 추적(MOT) 능력을 활용합니다. 여러 대상을 동시에 주시하는 이 능력은 운전, 스포츠 등 실생활에서 중요합니다.' },
    pyramid: { t: '역산과 문제 해결', d: '피라미드 연산은 역방향 추론(Backward Reasoning)을 훈련합니다. 결과에서 원인을 역추적하는 이 능력은 수학적 사고력의 핵심입니다.' },
    maxnum: { t: '시각 탐색과 수 비교', d: '숫자 배열에서 최대/최소를 찾는 과제는 병렬 시각 탐색(Parallel Visual Search)과 수 비교를 동시에 훈련합니다.' },
    signfind: { t: '연산 추론과 역사고', d: '빠진 연산자를 찾는 과제는 역방향 수학적 추론을 필요로 합니다. 결과를 보고 과정을 추론하는 이 능력은 문제 해결의 핵심입니다.' },
    coincount: { t: '수량 감각과 암산', d: '동전 합산은 실생활 수량 감각(Numeracy)을 훈련합니다. 여러 단위를 빠르게 합산하는 능력은 두정엽의 수 처리 네트워크를 강화합니다.' },
    clock: { t: '시각적 해석과 각도 인지', d: '아날로그 시계 읽기는 시각적 각도 해석과 수 변환을 결합합니다. 시계 읽기 능력은 신경심리 검사에서 시공간 인지의 지표로 사용됩니다.' },
    wordmem: { t: '부호화와 인출 전략', d: '단어 암기는 기억의 3단계(부호화-저장-인출)를 모두 훈련합니다. 효과적인 기억 전략(청킹, 연상)을 사용할수록 성적이 향상됩니다.' },
    blockcount: { t: '공간 추론과 시각화', d: '블록 세기는 3차원 공간 추론 능력을 훈련합니다. 보이지 않는 블록을 상상하는 시각화(Visualization) 능력은 공학적 사고의 기반입니다.' },
    flanker: { t: '플랭커 과제와 주의 집중', d: '방향 맞추기는 에릭슨 플랭커 과제(Eriksen Flanker Task)에 기반합니다. 방해 자극을 무시하고 목표에 집중하는 간섭 제어(Interference Control) 능력을 훈련합니다.' },
    memgrid: { t: '공간 작업 기억', d: '격자 기억은 시공간 잡기장(Visuospatial Sketchpad)의 용량을 훈련합니다. Corsi 블록 과제의 2D 버전으로, 공간적 단기 기억의 핵심 지표입니다.' },
    nback: { t: 'N-back과 작업 기억 갱신', d: '이전과 현재를 비교하는 N-back 과제는 작업 기억의 갱신(Updating) 능력을 훈련합니다. 연구에 따르면 N-back 훈련이 유동 지능 향상과 관련됩니다.' },
    scramble: { t: '철자 재배열과 어휘 접근', d: '섞인 글자에서 단어를 찾는 과제는 심성 어휘집(Mental Lexicon) 접근 속도를 훈련합니다. 글자 패턴 인식과 어휘 인출의 협력이 필요합니다.' },
    serial: { t: '연속 빼기와 집중 지속', d: '연속 빼기(Serial Subtraction)는 신경심리 검사에서 주의력과 작업 기억을 평가하는 표준 도구입니다. 연속적인 계산은 지속적 주의력을 요구합니다.' },
    leftright: { t: '좌우 판별과 신체 도식', d: '손의 좌우를 판별하는 과제는 두정엽의 신체 도식(Body Schema) 처리를 훈련합니다. 심적 회전을 통한 좌우 판단은 공간 인지의 기초 능력입니다.' },
    calccomp: { t: '수식 비교와 추정 능력', d: '두 수식의 크기를 비교하는 과제는 근사 수 체계(ANS)와 정확한 계산을 동시에 사용합니다. 빠른 추정 능력은 일상의 수학적 판단에 핵심적입니다.' },
    flash: { t: '순간 기억과 아이코닉 메모리', d: '짧게 보여주는 숫자를 기억하는 과제는 아이코닉 메모리(Iconic Memory)에서 작업 기억으로의 전이를 훈련합니다. 정보 처리의 첫 단계를 강화합니다.' },
    sort: { t: '범주화와 인지 전환', d: '카테고리 분류는 개념의 범주화(Categorization)와 빠른 인지 전환을 훈련합니다. 위스콘신 카드 분류 검사(WCST)와 유사한 원리로 전두엽 기능을 활성화합니다.' },
    mirror: { t: '거울 읽기와 시각 변환', d: '뒤집힌 글자를 읽는 과제는 시각적 변환(Visual Transformation) 능력을 훈련합니다. 익숙한 패턴을 다른 관점에서 인식하는 이 능력은 인지적 유연성의 지표입니다.' }
  };
  const sci = SCIENCE[curGame];
  if (sci) { document.getElementById('r-sci-title').textContent = sci.t; document.getElementById('r-sci-desc').textContent = sci.d; document.getElementById('r-science').classList.remove('hide') }
  else { document.getElementById('r-science').classList.add('hide') }

  // Workout mode
  if (wkActive) {
    document.getElementById('r-retry-msg').classList.add('hide');
    wkOnGameEnd(curGame, score);
    const btn = document.getElementById('r-main-btn');
    if (wkIdx < wkGames.length) {
      btn.textContent = '다음 운동 (' + (getTodayWorkout().done.length) + '/' + WK_SIZE + ')';
      btn.onclick = () => { document.getElementById('overlay').classList.remove('active'); wkContinue() };
    } else {
      btn.textContent = '운동 완료! 보상 받기';
      btn.onclick = () => { document.getElementById('overlay').classList.remove('active'); finishWorkout() };
    }
  } else {
    const btn = document.getElementById('r-main-btn');
    const retryMsg = getRetryMotivation(curGame, score, best, isNew);
    document.getElementById('r-retry-msg').textContent = retryMsg.msg;
    document.getElementById('r-retry-msg').classList.remove('hide');
    btn.textContent = retryMsg.btn;
    btn.onclick = replayGame;
  }

  // challenge btn removed

  // Reset brain age card
  // brain age section removed

  document.getElementById('overlay').classList.add('active');

  // Level up check (delayed)
  if (newRank !== oldRank) {
    setTimeout(() => showLevelUp(newRank, newXP), 600);
  }
}

function showLevelUp(rank, xp) {
  document.getElementById('lu-badge').innerHTML = RANK_SVG; document.getElementById('lu-badge').style.color = rank.color;
  document.getElementById('lu-title').textContent = '두뇌 나이 ' + rank.name + '로 젊어졌어요!';
  document.getElementById('lu-desc').textContent = '꾸준한 훈련으로 두뇌가 젊어지고 있어요!';
  // Check if new games unlocked
  const newGames = GAMES.filter(g => g.unlockXp <= xp && g.unlockXp > 0).filter(g => {
    const prevRank = RANKS.filter(r => r.minXp < rank.minXp).pop();
    return prevRank ? g.unlockXp > prevRank.minXp : true;
  });
  const ulEl = document.getElementById('lu-unlock');
  if (newGames.length) {
    ulEl.innerHTML = '⊕ 새 게임 해금: ' + newGames.map(g => g.name).join(', ');
    ulEl.classList.remove('hide');
  } else { ulEl.classList.add('hide') }
  document.getElementById('levelupOverlay').classList.add('active');
}
function closeLevelUp() { document.getElementById('levelupOverlay').classList.remove('active') }

function replayGame() {
  replayCount++; document.getElementById('overlay').classList.remove('active');
  AIT.log('ad_retry', { game: curGame, replayCount });
  showAd(() => startGame(curGame, true))
}
function goHomeFromResult() { document.getElementById('overlay').classList.remove('active'); AIT.setScreenAwake(false); goHome() }

function shareScore() {
  const gName = GAMES.find(g => g.id === curGame)?.name || curGame;
  const best = LS.get(curGame + '-best', 0);
  const msg = `매일매일 두뇌운동에서 ${gName} ${curScore}점 달성! (최고기록 ${best}점) 나와 두뇌 대결하자!`;
  AIT.shareMessage(msg);
  AIT.log('share_score', { game: curGame, score: curScore });
}

function inviteFriend() {
  const cleanup = AIT.shareInvite();
  AIT.log('invite_friend', { game: curGame });
  // cleanup은 토스 내에서 자동 처리
}

function showAd(cb, type = 'interstitial') {
  if (AIT.isToss) {
    // Real Toss ad
    AIT.showAd(type).then(r => { cb?.() }).catch(() => { cb?.() });
    return;
  }
  // Web fallback: mock ad overlay
  const o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font:600 17px var(--font);flex-direction:column;gap:12px';
  o.innerHTML = '<div style="color:var(--sub)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div>광고 로딩 중...</div>';
  document.body.appendChild(o); setTimeout(() => { o.remove(); cb?.() }, 1500);
}

