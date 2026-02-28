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
  const modal = document.getElementById('ticketModal');
  if (modal) modal.classList.add('active');
  const adBtn = document.getElementById('ticketAdBtn');
  if (adBtn) {
    adBtn.onclick = () => {
      closeTicketModal();
      showAd(() => {
        wkActive = false;
        curGame = gameId; curScore = 0;
        LS.set('totalPlays', LS.get('totalPlays', 0) + 1);
        show('game-' + gameId); initGoalBar(gameId);
        initGameById(gameId);
        if (typeof AIT !== 'undefined') AIT.log('game_start', { game: gameId, source: 'ticket_ad' });
      });
    };
  }
}
function showTicketShop() {
  const t = getTickets();
  const tsCount = document.getElementById('ts-count');
  if (tsCount) tsCount.textContent = t.count + '장';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const tsScreen = document.getElementById('ticketShop');
  if (tsScreen) tsScreen.classList.add('active');
}
function ticketAdRefill() {
  if (typeof AIT !== 'undefined' && AIT.showAd) {
    AIT.showAd('rewarded').then(res => {
      if (res.success) {
        const bonus = 3 + ~~(Math.random() * 3); // 3~5장
        const t = getTickets();
        t.count = Math.min(99, t.count + bonus);
        LS.setJSON('tickets', t);
        renderTicketCount();
        const tsCount = document.getElementById('ts-count');
        if (tsCount) tsCount.textContent = t.count + '장';
        snackbar(`<img src="https://static.toss.im/2d-emojis/svg/u1F39F.svg" style="width:16px;height:16px">티켓 ${bonus}장 충전 완료!`);
      }
    });
  }
}
function closeTicketModal() {
  const modal = document.getElementById('ticketModal');
  if (modal) modal.classList.remove('active');
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
  initGameById(id);
  if (typeof AIT !== 'undefined' && AIT.log) AIT.log('game_start', { game: id, totalPlays: LS.get('totalPlays', 0) });
}

function initGameById(gameId) {
  const fnMap = {
    math: initMath, memory: initMemory, sequence: initSequence, stroop: initStroop, reaction: initReaction,
    word: initWord, pattern: initPattern, focus: initFocus, rotate: initRotate, reverse: initReverse,
    numtouch: initNumtouch, rhythm: initRhythm, rps: initRps, oddone: initOddone, compare: initCompare,
    bulb: initBulb, colormix: initColormix, wordcomp: initWordcomp, timing: initTiming, matchpair: initMatchpair,
    headcount: initHeadcount, pyramid: initPyramid, maxnum: initMaxnum, signfind: initSignfind,
    coincount: initCoincount, clock: initClock, wordmem: initWordmem, blockcount: initBlockcount,
    flanker: initFlanker, memgrid: initMemgrid, nback: initNback, scramble: initScramble, serial: initSerial,
    leftright: initLeftright, calccomp: initCalccomp, flash: initFlash, sort: initSort, mirror: initMirror
  };
  if (fnMap[gameId]) fnMap[gameId]();
}
