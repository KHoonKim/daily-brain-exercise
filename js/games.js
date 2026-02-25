// ================================================================
// ===== GAME IMPLEMENTATIONS =====
// ================================================================

// ===== TIMER GAME REGISTRATIONS =====
// Each timer game registers itself so core.js can manage resume/extend centrally
registerTimerGame('math', { getTime: () => mathTime, setTime: v => { mathTime = v }, timerId: 'math-timer', getScore: () => mathScore, name: '암산 챌린지', getStats: () => [{ val: mathTotal, label: '문제 수' }, { val: mathMaxCombo + 'x', label: '최대 콤보' }], getExtra: () => ({ combo: mathMaxCombo }), onTick: () => mathUpdateT(), genFn: () => mathGen() });
registerTimerGame('stroop', { getTime: () => stroopTime, setTime: v => { stroopTime = v }, timerId: 'stroop-timer', getScore: () => stroopScore, name: '색깔 맞추기', getStats: () => [{ val: stroopTotal, label: '문제 수' }, { val: stroopCombo + 'x', label: '최대 콤보' }], genFn: () => stroopGen() });
registerTimerGame('pattern', { getTime: () => patTime, setTime: v => { patTime = v }, timerId: 'pat-round', getScore: () => patScore, name: '패턴 완성', getStats: () => [{ val: patMaxCombo + 'x', label: '최대 콤보' }], genFn: () => patGen() });
registerTimerGame('focus', { getTime: () => focusTime, setTime: v => { focusTime = v }, timerId: 'focus-timer', getScore: () => focusScore, name: '집중력 탭', getStats: () => [{ val: focusHit, label: '명중' }, { val: focusMiss, label: '실수' }] });
registerTimerGame('rotate', { getTime: () => rotTime, setTime: v => { rotTime = v }, timerId: 'rot-round', getScore: () => rotScore, name: '도형 회전', genFn: () => rotNext() });
registerTimerGame('rps', { getTime: () => rpsTime, setTime: v => { rpsTime = v }, timerId: 'rps-timer', getScore: () => rpsScore, name: '두뇌 가위바위보', getStats: () => [{ val: rpsTotal, label: '문제 수' }], genFn: () => rpsGen() });
registerTimerGame('compare', { getTime: () => cmpTime, setTime: v => { cmpTime = v }, timerId: 'cmp-timer', getScore: () => cmpScore, name: '크다작다', getStats: () => [{ val: cmpTotal, label: '문제 수' }], genFn: () => cmpGen(), extraTimers: () => [cmpQTimer] });
registerTimerGame('colormix', { getTime: () => cmxTime, setTime: v => { cmxTime = v }, timerId: 'cmx-round', getScore: () => cmxScore, name: '색깔 조합', genFn: () => cmxNext(), extraTimers: () => [cmxQTimer] });
registerTimerGame('wordcomp', { getTime: () => wcTime, setTime: v => { wcTime = v }, timerId: 'wc-timer', getScore: () => wcScore, name: '단어 완성', getStats: () => [{ val: wcTotal, label: '문제 수' }], genFn: () => wcGen(), extraTimers: () => [wcQTimer] });
registerTimerGame('leftright', { getTime: () => lrTime, setTime: v => { lrTime = v }, timerId: 'lr-timer', getScore: () => lrScore, name: '좌우 판단', genFn: () => lrGen() });
registerTimerGame('oddone', { getTime: () => oddTime, setTime: v => { oddTime = v }, timerId: 'odd-timer', getScore: () => oddScore, name: '다른 그림 찾기', getStats: () => [{ val: oddLv - 1, label: '클리어 수' }], genFn: () => oddGen(), extraTimers: () => [oddQTimer] });
registerTimerGame('signfind', { getTime: () => sfTime, setTime: v => { sfTime = v }, timerId: 'sf-timer', getScore: () => sfScore, name: '부호 찾기', getStats: () => [{ val: sfTotal, label: '문제 수' }], genFn: () => sfGen(), extraTimers: () => [sfQTimer] });
registerTimerGame('coincount', { getTime: () => ccTime, setTime: v => { ccTime = v }, timerId: 'cc-timer', getScore: () => ccScore, name: '동전 세기', getStats: () => [{ val: ccTotal, label: '문제 수' }], genFn: () => ccGen() });
registerTimerGame('headcount', { getTime: () => hcTime, setTime: v => { hcTime = v }, timerId: 'hc-round', getScore: () => hcScore, name: '인원 세기', genFn: () => hcNext() });
registerTimerGame('pyramid', { getTime: () => pyrTime, setTime: v => { pyrTime = v }, timerId: 'pyr-round', getScore: () => pyrScore, name: '피라미드 연산', genFn: () => pyrGen() });
registerTimerGame('maxnum', { getTime: () => mxTime, setTime: v => { mxTime = v }, timerId: 'mx-timer', getScore: () => mxScore, name: '수 찾기', getStats: () => [{ val: mxLv - 1, label: '클리어' }], genFn: () => mxGen(), extraTimers: () => [mxQTimer] });
registerTimerGame('blockcount', { getTime: () => bcTime, setTime: v => { bcTime = v }, timerId: 'bc-round', getScore: () => bcScore, name: '블록 세기', genFn: () => bcGen() });
registerTimerGame('flanker', { getTime: () => flTime, setTime: v => { flTime = v }, timerId: 'fl-timer', getScore: () => flScore, name: '플랭커', genFn: () => flGen() });
registerTimerGame('nback', { getTime: () => nbTime, setTime: v => { nbTime = v }, timerId: 'nb-timer', getScore: () => nbScore, name: '같거나 다르거나' });
registerTimerGame('sort', { getTime: () => stTime, setTime: v => { stTime = v }, timerId: 'st-timer', getScore: () => stScore, name: '정렬', genFn: () => sortGen() });
registerTimerGame('calccomp', { getTime: () => cc2Time, setTime: v => { cc2Time = v }, timerId: 'cc2-timer', getScore: () => cc2Score, name: '계산 비교', genFn: () => cc2Gen(), extraTimers: () => [cc2QTimer] });
registerTimerGame('serial', { getTime: () => serTime, setTime: v => { serTime = v }, timerId: 'ser-timer', getScore: () => serScore, name: '연속 계산' });
registerTimerGame('matchpair', { getTime: () => mpTime, setTime: v => { mpTime = v }, timerId: 'mp-timer', getScore: () => mpScore, name: '짝 맞추기', getStats: () => [{ val: mpMatched.length, label: '맞춘 수' }] });
registerTimerGame('mirror', { getTime: () => mrTime, setTime: v => { mrTime = v }, timerId: 'mr-timer', getScore: () => mrScore, name: '거울 문자', genFn: () => mrGen() });
registerTimerGame('clock', { getTime: () => clkTime, setTime: v => { clkTime = v }, timerId: 'clk-round', getScore: () => clkScore, name: '시계 읽기', genFn: () => clkNext(), extraTimers: () => [clkQTimer] });
registerTimerGame('scramble', { getTime: () => scTime, setTime: v => { scTime = v }, timerId: 'sc-timer', getScore: () => scScore, name: '글자 섞기', genFn: () => scGen(), extraTimers: () => [scQTimer] });

// ===== GAME 1: MATH =====
let mathScore, mathCombo, mathTime, mathAnswer, mathInput, mathTotal, mathMaxCombo;
function initMath() {
  mathScore = 0; mathCombo = 0; mathTime = 30; mathInput = ''; mathTotal = 0; mathMaxCombo = 0;
  document.getElementById('math-score').textContent = '0점'; document.getElementById('math-combo').textContent = '';
  initHearts('math'); mathGen(); clearInterval(curTimer); mathUpdateT();
  curTimer = setInterval(() => { mathTime--; mathUpdateT(); if (mathTime <= 0) { clearInterval(curTimer); showResult(mathScore, '암산 챌린지', [{ val: mathTotal, label: '문제 수' }, { val: mathMaxCombo + 'x', label: '최대 콤보' }], { combo: mathMaxCombo }) } }, 1000);
}
function mathUpdateT() { const el = document.getElementById('math-timer'); el.textContent = mathTime + 's'; el.className = mathTime <= 10 ? 'g-timer urgent' : 'g-timer' }
function mathGen() {
  const mx = Math.min(10 + Math.floor(mathScore / 3) * 5, 99);
  const ops = mathScore < 5 ? ['+', '-'] : ['+', '-', '×'];
  const op = ops[~~(Math.random() * ops.length)]; let a, b;
  if (op === '×') { a = ~~(Math.random() * 12) + 2; b = ~~(Math.random() * 12) + 2; mathAnswer = a * b }
  else if (op === '-') { a = ~~(Math.random() * mx) + 1; b = ~~(Math.random() * a) + 1; mathAnswer = a - b }
  else { a = ~~(Math.random() * mx) + 1; b = ~~(Math.random() * mx) + 1; mathAnswer = a + b }
  document.getElementById('math-a').textContent = a; document.getElementById('math-b').textContent = b;
  document.getElementById('math-op').textContent = op; mathInput = ''; document.getElementById('math-ans').textContent = '?';
}
function mathPress(n) { mathInput += n; document.getElementById('math-ans').textContent = mathInput }
function mathDel() { mathInput = mathInput.slice(0, -1); document.getElementById('math-ans').textContent = mathInput || '?' }
function mathSubmit() {
  if (!mathInput) return; mathTotal++; const p = document.getElementById('math-problem');
  if (parseInt(mathInput) === mathAnswer) { mathScore += (mathCombo >= 5 ? 30 : mathCombo >= 3 ? 20 : 10); mathCombo++; mathMaxCombo = Math.max(mathMaxCombo, mathCombo); p.classList.add('ok'); if (mathCombo % 5 === 0) { mathTime = Math.min(mathTime + 3, 99); const te = document.getElementById('math-timer'); te.textContent = '+3초!'; te.style.cssText = 'color:#10B981;font-size:22px;font-weight:900;transform:scale(1.3)'; setTimeout(() => { te.style.cssText = ''; mathUpdateT() }, 800) } }
  else { mathCombo = 0; p.classList.add('no'); curScore = mathScore; if (loseHeart('math')) return }
  setScore('math-score', mathScore);
  const mc = document.getElementById('math-combo');
  if (mathCombo >= 2) { mc.textContent = mathCombo + '콤보!' + (mathCombo >= 5 ? ' ×3' : mathCombo >= 3 ? ' ×2' : ''); mc.style.cssText = 'transform:scale(1.4);transition:transform .15s'; setTimeout(() => mc.style.cssText = 'transition:transform .2s', 150) }
  else { mc.textContent = ''; mc.style.cssText = '' }
  if (mathCombo > 0 && mathCombo % 5 === 0) { mc.textContent = mathCombo + '콤보! +3초 보너스!'; mc.style.cssText = 'transform:scale(1.5);color:#10B981;font-size:18px;transition:transform .15s'; setTimeout(() => mc.style.cssText = 'transition:transform .3s', 300) }
  setTimeout(() => p.classList.remove('ok', 'no'), 200); mathGen();
}

// ===== GAME 2: MEMORY =====
let memScore, memTime, memCards, memFlipped, memMatched, memLocked, memPairs;
const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🐦', '🦋'];
function initMemory() {
  memScore = 0; memTime = 30; memFlipped = []; memMatched = []; memLocked = false; memPairs = 0;
  document.getElementById('mem-score').textContent = '0점';
  const picked = EMOJIS.sort(() => Math.random() - .5).slice(0, 6); memCards = [...picked, ...picked].sort(() => Math.random() - .5);
  document.getElementById('mem-grid').innerHTML = memCards.map((e, i) => `<div class="mem-card" data-i="${i}" onclick="memFlip(${i})"><span class="cf">${e}</span></div>`).join('');
  clearInterval(curTimer); document.getElementById('mem-timer').textContent = '30s'; document.getElementById('mem-timer').className = 'g-timer';
  curTimer = setInterval(() => { memTime--; document.getElementById('mem-timer').textContent = memTime + 's'; if (memTime <= 10) document.getElementById('mem-timer').className = 'g-timer urgent'; if (memTime <= 0) { clearInterval(curTimer); showResult(memScore, '기억력 카드', [{ val: memPairs, label: '찾은 쌍' }]) } }, 1000);
}
function memFlip(i) {
  if (memLocked || memFlipped.includes(i) || memMatched.includes(i)) return;
  document.querySelector(`.mem-card[data-i="${i}"]`).classList.add('flipped'); memFlipped.push(i);
  if (memFlipped.length === 2) {
    memLocked = true; const [a, b] = memFlipped;
    if (memCards[a] === memCards[b]) {
      memMatched.push(a, b); memPairs++; document.querySelector(`.mem-card[data-i="${a}"]`).classList.add('matched'); document.querySelector(`.mem-card[data-i="${b}"]`).classList.add('matched'); memScore += 10; setScore('mem-score', memScore); memFlipped = []; memLocked = false;
      if (memMatched.length === memCards.length) { clearInterval(curTimer); const bonus = Math.max(0, memTime * 5); memScore += bonus; setScore('mem-score', memScore); setTimeout(() => showResult(memScore, '기억력 카드', [{ val: memPairs, label: '찾은 쌍' }], { timeBonus: bonus, timeLeft: memTime }), 800) }
    } else { setTimeout(() => { document.querySelector(`.mem-card[data-i="${a}"]`).classList.remove('flipped'); document.querySelector(`.mem-card[data-i="${b}"]`).classList.remove('flipped'); memFlipped = []; memLocked = false }, 600) }
  }
}

// ===== GAME 3: SEQUENCE =====
let seqLv, seqSeq, seqIdx, seqShowing, seqScore;
function initSequence() { seqLv = 1; seqScore = 0; document.getElementById('seq-score').textContent = '0점'; document.getElementById('seq-level').textContent = 'Lv.1'; initHearts('seq'); const g = document.getElementById('seq-grid'); g.innerHTML = ''; for (let i = 1; i <= 9; i++) { const d = document.createElement('div'); d.className = 'seq-cell'; d.textContent = i; d.dataset.n = i; d.onclick = () => seqTap(i); g.appendChild(d) } seqNewRound() }
function seqNewRound() { seqShowing = true; seqIdx = 0; const len = seqLv + 2; seqSeq = []; while (seqSeq.length < len) { const n = ~~(Math.random() * 9) + 1; if (seqSeq[seqSeq.length - 1] !== n) seqSeq.push(n) } document.getElementById('seq-msg').textContent = '순서를 기억하세요!'; let i = 0; const iv = setInterval(() => { document.querySelectorAll('.seq-cell').forEach(c => c.classList.remove('hl')); if (i < seqSeq.length) { document.querySelector(`.seq-cell[data-n="${seqSeq[i]}"]`).classList.add('hl'); i++ } else { clearInterval(iv); document.querySelectorAll('.seq-cell').forEach(c => c.classList.remove('hl')); seqShowing = false; document.getElementById('seq-msg').textContent = '같은 순서로 눌러주세요!' } }, 600) }
function seqTap(n) { if (seqShowing) return; const c = document.querySelector(`.seq-cell[data-n="${n}"]`); if (n === seqSeq[seqIdx]) { c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 300); seqIdx++; if (seqIdx === seqSeq.length) { seqLv++; seqScore += seqLv * 5; setScore('seq-score', seqScore); document.getElementById('seq-level').textContent = 'Lv.' + seqLv; setTimeout(seqNewRound, 500) } } else { c.classList.add('no'); setTimeout(() => c.classList.remove('no'), 300); curScore = seqScore; if (loseHeart('seq')) return; setTimeout(seqNewRound, 800) } }

// ===== GAME 4: STROOP =====
let stroopScore, stroopTime, stroopTotal, stroopCombo;
const COLORS = [{ name: '빨강', hex: '#F04452' }, { name: '파랑', hex: '#3182F6' }, { name: '초록', hex: '#1FC58E' }, { name: '노랑', hex: '#F59E0B' }, { name: '보라', hex: '#8B5CF6' }];
function initStroop() { stroopScore = 0; stroopTime = 30; stroopTotal = 0; stroopCombo = 0; document.getElementById('stroop-score').textContent = '0점'; clearInterval(curTimer); initHearts('stroop'); document.getElementById('stroop-timer').textContent = '30s'; document.getElementById('stroop-timer').className = 'g-timer'; curTimer = setInterval(() => { stroopTime--; document.getElementById('stroop-timer').textContent = stroopTime + 's'; if (stroopTime <= 10) document.getElementById('stroop-timer').className = 'g-timer urgent'; if (stroopTime <= 0) { clearInterval(curTimer); showResult(stroopScore, '색깔 맞추기', [{ val: stroopTotal, label: '문제 수' }, { val: stroopCombo + 'x', label: '최대 콤보' }]) } }, 1000); stroopGen() }
function stroopGen() { const wc = COLORS[~~(Math.random() * COLORS.length)]; let dc; do { dc = COLORS[~~(Math.random() * COLORS.length)] } while (dc === wc && Math.random() > .3); document.getElementById('stroop-word').textContent = wc.name; document.getElementById('stroop-word').style.color = dc.hex; let opts = [dc]; while (opts.length < 4) { const c = COLORS[~~(Math.random() * COLORS.length)]; if (!opts.includes(c)) opts.push(c) } opts.sort(() => Math.random() - .5); document.getElementById('stroop-opts').innerHTML = opts.map(o => `<button class="stroop-opt" style="color:${o.hex}" onclick="stroopPick('${o.name}','${dc.name}')">${o.name}</button>`).join('') }
function stroopPick(p, c) {
  stroopTotal++; if (p === c) {
    stroopCombo++; const bonus = stroopCombo >= 10 ? 3 : stroopCombo >= 5 ? 2 : 1; stroopScore += 10 * bonus;
    setScore('stroop-score', stroopScore); if (stroopCombo >= 5) { stroopTime = Math.min(stroopTime + 2, 99); toast(stroopCombo + '콤보! +2초') }
  }
  else { stroopCombo = 0; curScore = stroopScore; if (loseHeart('stroop')) return } stroopGen()
}

// ===== GAME 5: REACTION =====
let reactRound, reactTimes, reactState, reactTimeout, reactStart;
function initReaction() { reactRound = 0; reactTimes = []; reactState = 'idle'; document.getElementById('react-round').textContent = '0/5'; document.getElementById('react-score').textContent = '준비하세요'; reactNext() }
function reactNext() { reactRound++; if (reactRound > 5) { const avg = Math.round(reactTimes.reduce((a, b) => a + b, 0) / reactTimes.length); let score = 0; reactTimes.forEach(ms => { score += Math.max(5, Math.round((1000 - ms) / 10)) }); showResult(score, '반응속도', [{ val: avg + 'ms', label: '평균' }, { val: Math.min(...reactTimes) + 'ms', label: '최고' }], { avg }); return } document.getElementById('react-round').textContent = reactRound + '/5'; const area = document.getElementById('react-area'); area.className = 'react-area waiting'; document.getElementById('react-msg').innerHTML = '기다리세요...'; reactState = 'waiting'; reactTimeout = setTimeout(() => { area.className = 'react-area ready'; document.getElementById('react-msg').innerHTML = '지금! 터치!'; reactState = 'go'; reactStart = Date.now() }, 1500 + Math.random() * 3000) }
function reactTap() { if (reactState === 'waiting') { clearTimeout(reactTimeout); document.getElementById('react-msg').innerHTML = '너무 빨라요!'; reactState = 'idle'; setTimeout(reactNext, 800) } else if (reactState === 'go') { const ms = Date.now() - reactStart; reactTimes.push(ms); document.getElementById('react-area').className = 'react-area result'; document.getElementById('react-msg').innerHTML = '<div class="react-time">' + ms + 'ms</div>'; document.getElementById('react-score').textContent = '평균: ' + Math.round(reactTimes.reduce((a, b) => a + b, 0) / reactTimes.length) + 'ms'; reactState = 'idle'; setTimeout(reactNext, 1000) } }

// ===== GAME 6: WORD =====
let wordScore, wordTime, wordWords, wordFound, wordSel, wordDragging, wordGridData;
const WORD_CATS = [
  { name: '🍎 과일', words: ['사과', '포도', '수박', '딸기', '참외', '감귤', '복숭아', '자두', '앵두', '키위'] },
  { name: '🌊 자연', words: ['바다', '하늘', '구름', '태양', '달빛', '별빛', '노을', '안개', '번개', '폭풍'] },
  { name: '💖 감정', words: ['사랑', '행복', '희망', '용기', '자유', '평화', '진실', '믿음', '지혜', '열정'] },
  { name: '🐯 동물', words: ['호랑이', '토끼', '사슴', '고래', '거북', '여우', '늑대', '다람쥐', '펭귄', '독수리'] },
  { name: '🎨 예술', words: ['노래', '음악', '그림', '연극', '영화', '소설', '무용', '조각', '시인', '작곡'] },
  { name: '🏙️ 도시', words: ['서울', '부산', '대구', '인천', '광주', '대전', '제주', '울산', '수원', '춘천'] },
  { name: '👨‍⚕️ 직업', words: ['의사', '교사', '화가', '작가', '군인', '경찰', '기사', '판사', '약사', '목사'] },
  { name: '🎵 악기', words: ['피아노', '기타', '드럼', '첼로', '하프', '비올라', '오보에', '플루트', '호른', '벨'] },
  { name: '🌸 계절', words: ['여름', '가을', '겨울', '장마', '폭설', '서리', '이슬', '태풍', '벚꽃', '단풍'] },
  { name: '🐱 반려', words: ['고양이', '강아지', '햄스터', '앵무새', '금붕어', '거미', '개미', '나비', '매미', '두꺼비'] }
];
const FILLER = '가나다라마바사아자차카타파하거너더러머버서어저커터퍼허고노도로모보소오조코토포호구누두루무부수우주쿠투푸후기니디리미비시이지키티피히갈날달말발살알잘칼탈팔할감남담람밤삼암잠참탐팜함'.split('');
function genWordGrid() {
  const sz = 6, grid = Array(sz * sz).fill(''), dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0]];
  const cat = WORD_CATS[~~(Math.random() * WORD_CATS.length)];
  const pool = [...cat.words].filter(w => w.length <= sz).sort(() => Math.random() - .5), placed = [];
  for (const w of pool) {
    if (placed.length >= 5) break; const chars = w.split(''), len = chars.length;
    let ok = false; for (let t = 0; t < 60 && !ok; t++) {
      const d = dirs[~~(Math.random() * dirs.length)];
      const minR = Math.max(0, d[0] < 0 ? len - 1 : 0), maxR = Math.min(sz - 1, d[0] > 0 ? sz - len : sz - 1);
      const minC = Math.max(0, d[1] < 0 ? len - 1 : 0), maxC = Math.min(sz - 1, d[1] > 0 ? sz - len : sz - 1);
      if (minR > maxR || minC > maxC) continue;
      const r0 = minR + ~~(Math.random() * (maxR - minR + 1)), c0 = minC + ~~(Math.random() * (maxC - minC + 1));
      let fit = true; for (let i = 0; i < len; i++) { const r = r0 + d[0] * i, c = c0 + d[1] * i; if (r < 0 || r >= sz || c < 0 || c >= sz) { fit = false; break } const idx = r * sz + c; if (grid[idx] !== '' && grid[idx] !== chars[i]) { fit = false; break } }
      if (fit) { for (let i = 0; i < len; i++) { grid[(r0 + d[0] * i) * sz + (c0 + d[1] * i)] = chars[i] } placed.push(w); ok = true }
    }
  }
  for (let i = 0; i < grid.length; i++)if (grid[i] === '') grid[i] = FILLER[~~(Math.random() * FILLER.length)];
  return { words: placed, grid, catName: cat.name }
}
function initWord() { wordScore = 0; wordTime = 30; wordFound = []; wordSel = []; wordDragging = false; document.getElementById('word-score').textContent = '0점'; document.getElementById('word-timer').textContent = '30s'; document.getElementById('word-timer').className = 'g-timer'; const set = genWordGrid(); wordWords = [...set.words]; wordGridData = [...set.grid]; document.getElementById('word-cat').textContent = set.catName + ' — ' + wordWords.length + '개 숨김'; renderWordBoard(); renderWordList(); clearInterval(curTimer); curTimer = setInterval(() => { wordTime--; document.getElementById('word-timer').textContent = wordTime + 's'; if (wordTime <= 10) document.getElementById('word-timer').className = 'g-timer urgent'; if (wordTime <= 0) { clearInterval(curTimer); showResult(wordScore, '단어 찾기', [{ val: wordFound.length + '/' + wordWords.length, label: '찾은 단어' }]) } }, 1000) }
function renderWordBoard() { document.getElementById('word-board').innerHTML = wordGridData.map((ch, i) => `<div class="wc" data-i="${i}" ontouchstart="wordTS(${i},event)" ontouchmove="wordTM(event)" ontouchend="wordTE()" onmousedown="wordMD(${i})" onmouseover="wordMO(${i})" onmouseup="wordMU()">${ch}</div>`).join('') }
function renderWordList() { document.getElementById('word-list').innerHTML = wordWords.map(w => { if (wordFound.includes(w)) return `<span class="wl-item found">${w}</span>`; return `<span class="wl-item" style="color:transparent;background:var(--border);border-radius:6px">${'●'.repeat(w.length)}</span>` }).join('') }
function wordTS(i, e) { e.preventDefault(); wordDragging = true; wordSel = [i]; updWS() } function wordTM(e) { if (!wordDragging) return; e.preventDefault(); const t = e.touches[0]; const el = document.elementFromPoint(t.clientX, t.clientY); if (el?.dataset.i !== undefined) { const i = +el.dataset.i; if (!wordSel.includes(i)) { wordSel.push(i); updWS() } } } function wordTE() { wordDragging = false; chkW() } function wordMD(i) { wordDragging = true; wordSel = [i]; updWS() } function wordMO(i) { if (wordDragging && !wordSel.includes(i)) { wordSel.push(i); updWS() } } function wordMU() { wordDragging = false; chkW() }
function updWS() { document.querySelectorAll('.wc').forEach(c => c.classList.remove('selected')); wordSel.forEach(i => document.querySelector(`.wc[data-i="${i}"]`)?.classList.add('selected')) }
function chkW() { const fwd = wordSel.map(i => wordGridData[i]).join(''); const rev = wordSel.slice().reverse().map(i => wordGridData[i]).join(''); const word = wordWords.includes(fwd) ? fwd : wordWords.includes(rev) ? rev : null; if (word && !wordFound.includes(word)) { wordFound.push(word); wordScore += 20; setScore('word-score', wordScore); wordSel.forEach(i => document.querySelector(`.wc[data-i="${i}"]`)?.classList.add('found')); renderWordList(); toast('✓ ' + word); if (wordFound.length === wordWords.length) { wordScore += Math.max(0, wordTime * 2); clearInterval(curTimer); setTimeout(() => showResult(wordScore, '단어 찾기', [{ val: wordFound.length + '/' + wordWords.length, label: '찾은 단어' }]), 500) } } wordSel = []; updWS() }

// ===== GAME 7: PATTERN =====
let patScore, patRound, patMaxCombo, patCombo;
const PAT_TYPES = [() => { const s = ~~(Math.random() * 5) + 1, st = ~~(Math.random() * 3) + 1, seq = []; for (let i = 0; i < 5; i++)seq.push(s + st * i); const a = seq.pop(); return { seq: seq.map(String), answer: String(a), opts: genOpts(a, 4).map(String), explain: '등차수열: +' + st + '씩 증가' } }, () => { const e = ['A', 'B', 'C', 'D', 'E'], a = e[~~(Math.random() * 5)]; let b; do { b = e[~~(Math.random() * 5)] } while (b === a); return { seq: [a, b, a, b], answer: a, opts: [a, b, e[~~(Math.random() * 5)]].filter((v, i, ar) => ar.indexOf(v) === i).concat(e[~~(Math.random() * 5)]).slice(0, 4).sort(() => Math.random() - .5), explain: '반복 패턴: ' + a + ', ' + b + ' 교대 반복' } }, () => { const a = ~~(Math.random() * 3) + 1, b = ~~(Math.random() * 3) + 2; return { seq: [a, b, a + b, b + a + b].map(String), answer: String(a + b + b + a + b), opts: genOpts(a + b + b + a + b, 4).map(String), explain: '피보나치: 앞 두 수의 합 (' + b + '+' + (a + b) + '=' + (a + b + b) + ', ' + (a + b) + '+' + (b + a + b) + '=' + (a + b + b + a + b) + ')' } }, () => ({ seq: ['1', '4', '9', '16'], answer: '25', opts: genOpts(25, 4).map(String), explain: '제곱수: 1², 2², 3², 4², 5²=25' }), () => { const s = ~~(Math.random() * 3) + 1; return { seq: [s, s * 2, s * 4, s * 8].map(String), answer: String(s * 16), opts: genOpts(s * 16, 4).map(String), explain: '×2 패턴: 매번 2배씩 증가' } }, () => ({ seq: ['○', '●', '○', '●'], answer: '○', opts: ['○', '●', '◇', '◆'].sort(() => Math.random() - .5), explain: '교대 패턴: ○● 반복' }), () => ({ seq: ['R', 'O', 'Y', 'G'], answer: 'B', opts: ['B', 'V', 'K', 'W'].sort(() => Math.random() - .5), explain: '무지개 순서: R→O→Y→G→B(lue)' })];
function genOpts(a, c) { const o = [a]; while (o.length < c) { const v = a + ~~(Math.random() * 10) - 5; if (v !== a && v > 0 && !o.includes(v)) o.push(v) } return o.sort(() => Math.random() - .5) }
let patTime;
function initPattern() {
  patScore = 0; patRound = 0; patCombo = 0; patMaxCombo = 0; patTime = 30; document.getElementById('pat-score').textContent = '0점'; initHearts('pat');
  document.getElementById('pat-round').textContent = '30s';
  clearInterval(curTimer); curTimer = setInterval(() => {
    patTime--; document.getElementById('pat-round').textContent = patTime + 's';
    if (patTime <= 10) document.getElementById('pat-round').className = 'g-timer urgent';
    if (patTime <= 0) { clearInterval(curTimer); showResult(patScore, '패턴 완성', [{ val: patMaxCombo + 'x', label: '최대 콤보' }]) }
  }, 1000); patNext()
}
let patExplain = '';
function patNext() { patRound++; const g = PAT_TYPES[~~(Math.random() * PAT_TYPES.length)](); patExplain = g.explain || ''; document.getElementById('pat-seq').innerHTML = g.seq.map(s => `<div class="pat-item">${s}</div>`).join('') + '<div class="pat-item q">?</div>'; document.getElementById('pat-opts').innerHTML = g.opts.map(o => `<div class="pat-opt" onclick="patPick(this,'${o}','${g.answer}')">${o}</div>`).join('') }
function patPick(el, p, a) { if (el.classList.contains('ok') || el.classList.contains('no')) return; document.querySelector('.pat-item.q').textContent = a; document.querySelector('.pat-item.q').classList.remove('q'); if (p === a) { el.classList.add('ok'); patCombo++; patMaxCombo = Math.max(patMaxCombo, patCombo); patScore += 10 * (1 + ~~(patCombo / 3)); setScore('pat-score', patScore); toast(patCombo >= 3 ? '' + patCombo + '콤보! — ' + patExplain : '✓ ' + patExplain) } else { el.classList.add('no'); patCombo = 0; document.querySelectorAll('.pat-opt').forEach(o => { if (o.textContent === a) o.classList.add('ok') }); toast('→ ' + patExplain); curScore = patScore; if (loseHeart('pat')) return } setTimeout(patNext, 1200) }

// ===== GAME 8: FOCUS =====
let focusScore, focusTime, focusHit, focusMiss, focusSpawnTimer;
function initFocus() { focusScore = 0; focusTime = 30; focusHit = 0; focusMiss = 0; document.getElementById('focus-score').textContent = '0점'; document.getElementById('focus-timer').textContent = '30s'; document.getElementById('focus-timer').className = 'g-timer'; document.getElementById('focus-field').innerHTML = ''; clearInterval(curTimer); clearInterval(focusSpawnTimer); curTimer = setInterval(() => { focusTime--; document.getElementById('focus-timer').textContent = focusTime + 's'; if (focusTime <= 10) document.getElementById('focus-timer').className = 'g-timer urgent'; if (focusTime <= 0) { clearInterval(curTimer); clearInterval(focusSpawnTimer); showResult(focusScore, '집중력 탭', [{ val: focusHit, label: '명중' }, { val: focusMiss, label: '실수' }]) } }, 1000); focusSpawnTimer = setInterval(spawnTarget, 800); spawnTarget(); spawnTarget() }
function spawnTarget() {
  const f = document.getElementById('focus-field'), r = f.getBoundingClientRect(); if (!r.width) return;
  const elapsed = 30 - focusTime; const difficulty = Math.min(elapsed / 30, 1);
  const el = document.createElement('div'); const rnd = Math.random(), type = rnd < .55 ? 'good' : rnd < (.55 + .3 + difficulty * .1) ? 'bad' : 'bonus';
  el.className = 'focus-target ' + type;
  // Same color, different symbols - harder to distinguish
  const symbols = { good: '○', bad: '×', bonus: '◎' };
  el.textContent = symbols[type]; el.style.color = '#fff'; el.style.fontSize = '20px';
  // Shrink size as difficulty increases
  const size = 48 - ~~(difficulty * 12); el.style.width = size + 'px'; el.style.height = size + 'px';
  el.style.left = ~~(Math.random() * (r.width - size - 8)) + 'px'; el.style.top = ~~(Math.random() * (r.height - size - 8)) + 'px';
  el.onclick = () => { if (type === 'good') { focusScore += 10; focusHit++ } else if (type === 'bonus') { focusScore += 30; focusHit++; toast('◎ 보너스!') } else { focusScore = Math.max(0, focusScore - 5); focusMiss++ } el.style.transform = 'scale(0)'; setTimeout(() => el.remove(), 150); setScore('focus-score', focusScore) };
  f.appendChild(el);
  // Disappear faster as time progresses
  const lifespan = type === 'bonus' ? 1200 : (2200 - ~~(difficulty * 1000));
  setTimeout(() => { if (el.parentNode) { if (type === 'good') focusMiss++; el.style.opacity = '0'; setTimeout(() => el.remove(), 200) } }, lifespan);
  // Speed up spawn rate
  clearInterval(focusSpawnTimer); focusSpawnTimer = setInterval(spawnTarget, Math.max(400, 750 - ~~(difficulty * 350)))
}

// ===== GAME 9: ROTATE =====
let rotScore, rotRound;
let rotTime;
function initRotate() {
  rotScore = 0; rotRound = 0; rotTime = 30; initHearts('rot');
  document.getElementById('rot-round').textContent = '30s';
  clearInterval(curTimer); curTimer = setInterval(() => {
    rotTime--; document.getElementById('rot-round').textContent = rotTime + 's';
    if (rotTime <= 10) document.getElementById('rot-round').className = 'g-timer urgent';
    if (rotTime <= 0) { clearInterval(curTimer); showResult(rotScore, '도형 회전', []) }
  }, 1000); rotNext()
}
function rotNext() { rotRound++; setScore('rot-score', rotScore); const shape = [], bc = ~~(Math.random() * 3) + 3; while (shape.length < bc) { const x = ~~(Math.random() * 4), y = ~~(Math.random() * 4); if (!shape.some(b => b.x === x && b.y === y)) shape.push({ x, y }) } const colors = ['#3182F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'], color = colors[~~(Math.random() * colors.length)]; document.getElementById('rot-original').innerHTML = ''; document.getElementById('rot-original').appendChild(drawShape(shape, color, 100)); const rots = [0, 90, 180, 270], cr = rots[~~(Math.random() * 3) + 1], cs = rotShape(shape, cr), ms = shape.map(b => ({ x: 3 - b.x, y: b.y })); let opts = [{ shape: cs, correct: true }, { shape: rotShape(ms, cr), correct: false }]; const or = rots.filter(r => r !== cr && r !== 0)[0] || 90; opts.push({ shape: rotShape(shape, or === cr ? 180 : or), correct: false }, { shape: rotShape(ms, or), correct: false }); opts = opts.slice(0, 4).sort(() => Math.random() - .5); const od = document.getElementById('rot-opts'); od.innerHTML = ''; opts.forEach(o => { const w = document.createElement('div'); w.className = 'rotate-opt'; w.appendChild(drawShape(o.shape, color, 70)); w.onclick = () => { if (w.classList.contains('ok') || w.classList.contains('no')) return; if (o.correct) { w.classList.add('ok'); rotScore += 10; setScore('rot-score', rotScore) } else { w.classList.add('no'); od.querySelectorAll('.rotate-opt').forEach((el, j) => { if (opts[j].correct) el.classList.add('ok') }); curScore = rotScore; if (loseHeart('rot')) return } setTimeout(rotNext, 800) }; od.appendChild(w) }); document.getElementById('rot-q').textContent = `이 도형을 ${cr}° 회전하면?` }
function drawShape(bl, c, s) { const cv = document.createElement('canvas'); cv.width = s; cv.height = s; const ctx = cv.getContext('2d'), bs = s / 4; bl.forEach(b => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(b.x * bs + 2, b.y * bs + 2, bs - 4, bs - 4, 4); ctx.fill() }); return cv }
function rotShape(bl, d) { const t = ((d % 360) + 360) % 360 / 90; let b = bl.map(x => ({ ...x })); for (let i = 0; i < t; i++)b = b.map(x => ({ x: 3 - x.y, y: x.x })); return b }

// ===== GAME 10: REVERSE =====
let revLv, revScore, revSeq, revInput, revShowing;
function initReverse() { revLv = 1; revScore = 0; revShowing = false; document.getElementById('rev-score').textContent = '0점'; document.getElementById('rev-level').textContent = 'Lv.1'; initHearts('rev'); revNew() }
function revNew() { revShowing = true; revInput = []; const len = revLv + 2; revSeq = []; for (let i = 0; i < len; i++)revSeq.push(~~(Math.random() * 10)); document.getElementById('rev-msg').textContent = '숫자를 기억하세요!'; document.getElementById('rev-input').innerHTML = ''; const d = document.getElementById('rev-display'); d.innerHTML = revSeq.map(() => '<div class="rev-num hidden">?</div>').join(''); let i = 0; const iv = setInterval(() => { if (i > 0 && d.children[i - 1]) { d.children[i - 1].classList.add('hidden'); d.children[i - 1].textContent = '?' } if (i < revSeq.length) { d.children[i].classList.remove('hidden'); d.children[i].textContent = revSeq[i]; i++ } else { clearInterval(iv); d.querySelectorAll('.rev-num').forEach(n => { n.classList.add('hidden'); n.textContent = '?' }); revShowing = false; document.getElementById('rev-msg').textContent = '거꾸로 입력하세요!'; document.getElementById('rev-input').innerHTML = revSeq.map(() => '<div class="rev-slot"></div>').join('') } }, 800) }
function revPress(n) { if (revShowing) return; const s = document.querySelectorAll('.rev-slot:not(.filled)'); if (!s.length) return; s[0].textContent = n; s[0].classList.add('filled'); revInput.push(n) }
function revDel() { if (revShowing || !revInput.length) return; revInput.pop(); const f = document.querySelectorAll('.rev-slot.filled'); if (f.length) { const l = f[f.length - 1]; l.textContent = ''; l.classList.remove('filled') } }
function revSubmit() { if (revShowing || revInput.length !== revSeq.length) return; const rev = [...revSeq].reverse(), ok = revInput.every((n, i) => n === rev[i]); document.querySelectorAll('.rev-slot').forEach((s, i) => { s.classList.add(revInput[i] === rev[i] ? 'ok' : 'no') }); if (ok) { revLv++; revScore += revLv * 5; setScore('rev-score', revScore); document.getElementById('rev-level').textContent = 'Lv.' + revLv; toast('✓ 정답!'); setTimeout(revNew, 800) } else { curScore = revScore; if (loseHeart('rev')) return; setTimeout(revNew, 800) } }

// ===== 11. NUMBER TOUCH =====
let ntNext, ntStart, ntTimer;
function initNumtouch() {
  ntNext = 1; ntStart = null; ntTimer = null; document.getElementById('nt-score').textContent = '0점'; document.getElementById('nt-timer').textContent = '0.0s'; document.getElementById('nt-msg').textContent = '1부터 순서대로 터치!';
  const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - .5);
  document.getElementById('nt-grid').innerHTML = nums.map(n => `<div class="nt-cell" onclick="ntTap(this,${n})">${n}</div>`).join('')
}
function ntTap(el, n) {
  if (n !== ntNext) return; if (!ntStart) { ntStart = Date.now(); ntTimer = setInterval(() => { document.getElementById('nt-timer').textContent = ((Date.now() - ntStart) / 1000).toFixed(1) + 's' }, 100) }
  el.classList.add('done'); el.textContent = '✓'; ntNext++;
  if (ntNext > 25) {
    clearInterval(ntTimer); const t = ((Date.now() - ntStart) / 1000).toFixed(1); const score = Math.max(0, Math.round(500 - parseFloat(t) * 8)); setScore('nt-score', score);
    showResult(score, '넘버 터치', [{ val: t + '초', label: '소요 시간' }])
  }
}

// ===== 12. RHYTHM MEMORY =====
let rhySeq, rhyIdx, rhyLv, rhyScore, rhyShowing;
let rhyCtx;
const RHY_FREQ = [262, 330, 392, 523];// C4,E4,G4,C5
function rhyBeep(padIdx) {
  if (!rhyCtx) rhyCtx = new (window.AudioContext || window.webkitAudioContext)();
  const o = rhyCtx.createOscillator(), g = rhyCtx.createGain();
  o.type = 'sine'; o.frequency.value = RHY_FREQ[padIdx];
  g.gain.setValueAtTime(.3, rhyCtx.currentTime); g.gain.exponentialRampToValueAtTime(.01, rhyCtx.currentTime + .3);
  o.connect(g); g.connect(rhyCtx.destination); o.start(); o.stop(rhyCtx.currentTime + .3)
}
function initRhythm() { rhyLv = 1; rhyScore = 0; rhyShowing = false; document.getElementById('rhy-score').textContent = '0점'; document.getElementById('rhy-level').textContent = 'Lv.1'; initHearts('rhy'); rhyNewRound() }
function rhyNewRound() {
  rhyShowing = true; rhyIdx = 0; const len = rhyLv + 2; rhySeq = Array.from({ length: len }, () => ~~(Math.random() * 4));
  document.getElementById('rhy-msg').textContent = '패턴을 기억하세요!';
  let i = 0; const iv = setInterval(() => {
    document.querySelectorAll('.rhy-pad').forEach(p => p.classList.remove('lit'));
    if (i < rhySeq.length) { const pad = document.querySelector(`.rhy-pad[data-p="${rhySeq[i]}"]`); void pad.offsetWidth; pad.classList.add('lit'); rhyBeep(rhySeq[i]); i++ } else { clearInterval(iv); rhyShowing = false; document.getElementById('rhy-msg').textContent = '같은 순서로 터치!' }
  }, 600)
}
function rhyTap(p) {
  if (rhyShowing) return; const pad = document.querySelector(`.rhy-pad[data-p="${p}"]`); pad.classList.remove('lit'); void pad.offsetWidth; pad.classList.add('lit'); rhyBeep(p); clearTimeout(pad._litTimer); pad._litTimer = setTimeout(() => pad.classList.remove('lit'), 200);
  if (p === rhySeq[rhyIdx]) {
    rhyIdx++; if (rhyIdx === rhySeq.length) { rhyLv++; rhyScore += rhyLv * 10; setScore('rhy-score', rhyScore); document.getElementById('rhy-level').textContent = 'Lv.' + rhyLv; toast('✓ 정답!'); setTimeout(rhyNewRound, 800) }
  } else { curScore = rhyScore; if (loseHeart('rhy')) return; setTimeout(rhyNewRound, 800) }
}

// ===== 13. RPS =====
let rpsScore, rpsTime, rpsTotal, rpsMode, rpsCur;
const RPS_HANDS = ['바위', '보', '가위'], RPS_NAMES = ['바위', '보', '가위'];
function initRps() {
  rpsScore = 0; rpsTime = 30; rpsTotal = 0; document.getElementById('rps-score').textContent = '0점'; initHearts('rps');
  document.getElementById('rps-timer').textContent = '30s'; document.getElementById('rps-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => { rpsTime--; document.getElementById('rps-timer').textContent = rpsTime + 's'; if (rpsTime <= 10) document.getElementById('rps-timer').className = 'g-timer urgent'; if (rpsTime <= 0) { clearInterval(curTimer); showResult(rpsScore, '두뇌 가위바위보', [{ val: rpsTotal, label: '문제 수' }]) } }, 1000); rpsGen()
}
function rpsGen() {
  rpsCur = ~~(Math.random() * 3); rpsMode = Math.random() < .5 ? 'win' : 'lose';
  document.getElementById('rps-enemy').textContent = RPS_HANDS[rpsCur];
  document.getElementById('rps-q').textContent = rpsMode === 'win' ? '◆ 이기는 것을 내세요!' : '💀 지는 것을 내세요!';
  document.getElementById('rps-q').style.color = rpsMode === 'win' ? 'var(--ok)' : 'var(--no)';
  document.querySelectorAll('.rps-btn').forEach(b => { b.className = 'rps-btn'; b.disabled = false })
}
function rpsPick(p) {
  rpsTotal++; const win = (p - rpsCur + 3) % 3 === 1, lose = (p - rpsCur + 3) % 3 === 2;
  const correct = (rpsMode === 'win' && win) || (rpsMode === 'lose' && lose);
  const btns = document.querySelectorAll('.rps-btn'); btns.forEach((b, i) => b.disabled = true);
  btns[p].classList.add(correct ? 'ok' : 'no');
  if (correct) { rpsScore += 10; setScore('rps-score', rpsScore); toast('✓ 정답!') }
  else { curScore = rpsScore; if (loseHeart('rps')) return }
  setTimeout(rpsGen, 600)
}

// ===== 14. ODD ONE =====
let oddScore, oddTime, oddLv, oddSpawnTimer2, oddQTimer, oddQTime, oddQLimit;
const ODD_PAIRS = [['뎡', '경'], ['곰', '공'], ['달', '닭'], ['봄', '볼'], ['갈', '잘'], ['물', '뭄'], ['눈', '논'], ['밤', '밥'], ['손', '존'], ['말', '맘'], ['불', '붉'], ['곧', '곤'], ['답', '닫'], ['살', '삼'], ['풀', '품'], ['날', '낫'], ['굽', '굿'], ['집', '짓'], ['감', '같'], ['힘', '험'], ['돈', '든'], ['별', '벌'], ['꿈', '꿀'], ['삶', '삼'], ['빛', '빗'], ['숲', '술'], ['맛', '맞'], ['꽃', '꼿'], ['잎', '잊'], ['값', '갑']];
function initOddone() {
  oddScore = 0; oddTime = 30; oddLv = 1; document.getElementById('odd-score').textContent = '0점'; document.getElementById('odd-timer').textContent = '30s'; document.getElementById('odd-timer').className = 'g-timer'; initHearts('odd');
  clearInterval(curTimer); curTimer = setInterval(() => { oddTime--; document.getElementById('odd-timer').textContent = oddTime + 's'; if (oddTime <= 10) document.getElementById('odd-timer').className = 'g-timer urgent'; if (oddTime <= 0) { clearInterval(curTimer); clearInterval(oddQTimer); showResult(oddScore, '다른 그림 찾기', [{ val: oddLv - 1, label: '클리어 수' }]) } }, 1000); oddGen()
}
function oddGen() {
  const sz = oddLv <= 2 ? 4 : oddLv <= 5 ? 5 : 6;
  document.getElementById('odd-grid').style.gridTemplateColumns = `repeat(${sz},1fr)`;
  const pair = ODD_PAIRS[~~(Math.random() * ODD_PAIRS.length)];
  const main = pair[0], diff = pair[1];
  const total = sz * sz, pos = ~~(Math.random() * total);
  const fs = sz <= 4 ? 24 : sz <= 5 ? 20 : 17;
  document.getElementById('odd-grid').innerHTML = Array.from({ length: total }, (_, i) => {
    return `<div class="odd-cell" onclick="oddPick(this,${i},${pos})" style="font-size:${fs}px;color:var(--text)">${i === pos ? diff : main}</div>`
  }).join('');
  oddQLimit = Math.max(2.0, 4.0 - oddLv * 0.12); oddQTime = oddQLimit; clearInterval(oddQTimer);
  const oddbar = document.getElementById('odd-qbar'); if (oddbar) { oddbar.style.transition = 'none'; oddbar.style.width = '100%'; requestAnimationFrame(() => { oddbar.style.transition = `width ${oddQLimit}s linear`; oddbar.style.width = '0%' }) }
  oddQTimer = setInterval(() => { oddQTime -= 0.1; if (oddQTime <= 0) { clearInterval(oddQTimer); curScore = oddScore; if (loseHeart('odd')) return; setTimeout(oddGen, 300) } }, 100)
}
function oddPick(el, i, ans) { if (i === ans) { clearInterval(oddQTimer); el.classList.add('ok'); const pct = oddQTime / oddQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; oddScore += 10 + oddLv * 2 + bonus; oddLv++; setScore('odd-score', oddScore); setTimeout(oddGen, 400) } else { el.classList.add('no'); oddScore = Math.max(0, oddScore - 5); setScore('odd-score', oddScore) } }

// ===== 15. COMPARE =====
let cmpScore, cmpTime, cmpTotal, cmpA, cmpB, cmpMode, cmpQTimer, cmpQTime, cmpLastMode, cmpQLimit;
function initCompare() {
  cmpScore = 0; cmpTime = 30; cmpTotal = 0; cmpLastMode = null; document.getElementById('cmp-score').textContent = '0점'; initHearts('cmp');
  document.getElementById('cmp-timer').textContent = '30s'; document.getElementById('cmp-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => { cmpTime--; document.getElementById('cmp-timer').textContent = cmpTime + 's'; if (cmpTime <= 10) document.getElementById('cmp-timer').className = 'g-timer urgent'; if (cmpTime <= 0) { clearInterval(curTimer); clearInterval(cmpQTimer); showResult(cmpScore, '크다작다', [{ val: cmpTotal, label: '문제 수' }]) } }, 1000); cmpGen()
}
function cmpGen() {
  const d = cmpTotal < 5 ? 10 : cmpTotal < 10 ? 50 : cmpTotal < 20 ? 200 : 500;
  do { cmpA = ~~(Math.random() * d) + 1; cmpB = ~~(Math.random() * d) + 1 } while (cmpA === cmpB);
  // 70% chance to flip mode from last (more switching)
  cmpMode = (cmpLastMode && Math.random() < .7) ? (cmpLastMode === 'big' ? 'small' : 'big') : (Math.random() < .5 ? 'big' : 'small');
  cmpLastMode = cmpMode;
  document.getElementById('cmp-q').textContent = cmpMode === 'big' ? '큰 수를 터치!' : '작은 수를 터치!';
  document.getElementById('cmp-q').style.color = cmpMode === 'big' ? 'var(--p)' : 'var(--no)';
  document.getElementById('cmp-a').textContent = cmpA; document.getElementById('cmp-b').textContent = cmpB;
  document.getElementById('cmp-a').style.opacity = '1'; document.getElementById('cmp-b').style.opacity = '1';
  // Per-question countdown: 2s → 1s gradually
  cmpQLimit = Math.max(1.0, 2.0 - cmpTotal * 0.05);
  cmpQTime = cmpQLimit; clearInterval(cmpQTimer);
  const bar = document.getElementById('cmp-qbar'); if (bar) { bar.style.transition = 'none'; bar.style.width = '100%'; requestAnimationFrame(() => { bar.style.transition = `width ${cmpQLimit}s linear`; bar.style.width = '0%' }) }
  cmpQTimer = setInterval(() => { cmpQTime -= 0.1; if (cmpQTime <= 0) { clearInterval(cmpQTimer); cmpTotal++; curScore = cmpScore; if (loseHeart('cmp')) return; setTimeout(cmpGen, 300) } }, 100)
}
function cmpPick(choice) {
  clearInterval(cmpQTimer); cmpTotal++;
  const pickedBig = (choice === 'left' && cmpA > cmpB) || (choice === 'right' && cmpB > cmpA);
  const correct = (cmpMode === 'big' && pickedBig) || (cmpMode === 'small' && !pickedBig);
  const picked = choice === 'left' ? 'cmp-a' : 'cmp-b', other = choice === 'left' ? 'cmp-b' : 'cmp-a';
  if (correct) { document.getElementById(other).style.opacity = '.3'; const pct = cmpQTime / cmpQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; cmpScore += 10 + bonus; setScore('cmp-score', cmpScore) }
  else { document.getElementById(picked).style.opacity = '.3'; curScore = cmpScore; if (loseHeart('cmp')) return }
  setTimeout(cmpGen, 400)
}

// ===== 16. BULB MEMORY =====
let bulbSeq, bulbIdx, bulbLv, bulbScore, bulbShowing;
function initBulb() {
  bulbLv = 1; bulbScore = 0; bulbShowing = false; document.getElementById('bulb-score').textContent = '0점'; document.getElementById('bulb-level').textContent = 'Lv.1'; initHearts('bulb');
  document.getElementById('bulb-grid').innerHTML = Array.from({ length: 9 }, (_, i) => `<div class="bulb-item" onclick="bulbTap(${i})"></div>`).join(''); bulbNewRound()
}
function bulbNewRound() {
  bulbShowing = true; bulbIdx = 0; const len = bulbLv + 2; bulbSeq = Array.from({ length: len }, () => ~~(Math.random() * 9));
  document.getElementById('bulb-msg').textContent = '전구 순서를 기억하세요!';
  const items = document.querySelectorAll('.bulb-item'); items.forEach(it => it.classList.remove('on'));
  let i = 0; const iv = setInterval(() => {
    items.forEach(it => it.classList.remove('on'));
    if (i < bulbSeq.length) { items[bulbSeq[i]].classList.add('on'); i++ } else { clearInterval(iv); bulbShowing = false; document.getElementById('bulb-msg').textContent = '같은 순서로 터치!' }
  }, 700)
}
function bulbTap(n) {
  if (bulbShowing) return; const items = document.querySelectorAll('.bulb-item');
  items[n].classList.add('on'); setTimeout(() => items[n].classList.remove('on'), 300);
  if (n === bulbSeq[bulbIdx]) {
    bulbIdx++; if (bulbIdx === bulbSeq.length) { bulbLv++; bulbScore += bulbLv * 10; setScore('bulb-score', bulbScore); document.getElementById('bulb-level').textContent = 'Lv.' + bulbLv; toast('✓ 정답!'); setTimeout(bulbNewRound, 800) }
  } else { curScore = bulbScore; if (loseHeart('bulb')) return; setTimeout(bulbNewRound, 800) }
}

// ===== 17. COLOR MIX =====
let cmxScore, cmxRound, cmxQTimer, cmxQTime, cmxQLimit;
const CMIX = [
  { a: { name: '빨강', hex: '#F04452' }, b: { name: '파랑', hex: '#3182F6' }, result: { name: '보라', hex: '#8B5CF6' }, wrong: [{ name: '초록', hex: '#1FC58E' }, { name: '주황', hex: '#F97316' }, { name: '갈색', hex: '#92400E' }] },
  { a: { name: '빨강', hex: '#F04452' }, b: { name: '노랑', hex: '#FBBF24' }, result: { name: '주황', hex: '#F97316' }, wrong: [{ name: '초록', hex: '#1FC58E' }, { name: '보라', hex: '#8B5CF6' }, { name: '갈색', hex: '#92400E' }] },
  { a: { name: '파랑', hex: '#3182F6' }, b: { name: '노랑', hex: '#FBBF24' }, result: { name: '초록', hex: '#1FC58E' }, wrong: [{ name: '보라', hex: '#8B5CF6' }, { name: '주황', hex: '#F97316' }, { name: '갈색', hex: '#92400E' }] },
  { a: { name: '빨강', hex: '#F04452' }, b: { name: '초록', hex: '#1FC58E' }, result: { name: '갈색', hex: '#92400E' }, wrong: [{ name: '보라', hex: '#8B5CF6' }, { name: '주황', hex: '#F97316' }, { name: '노랑', hex: '#FBBF24' }] },
  { a: { name: '빨강', hex: '#F04452' }, b: { name: '흰색', hex: '#E5E5E5' }, result: { name: '분홍', hex: '#FB7185' }, wrong: [{ name: '보라', hex: '#8B5CF6' }, { name: '주황', hex: '#F97316' }, { name: '갈색', hex: '#92400E' }] },
  { a: { name: '파랑', hex: '#3182F6' }, b: { name: '흰색', hex: '#E5E5E5' }, result: { name: '하늘', hex: '#7DD3FC' }, wrong: [{ name: '초록', hex: '#1FC58E' }, { name: '보라', hex: '#8B5CF6' }, { name: '분홍', hex: '#FB7185' }] },
  { a: { name: '검정', hex: '#333' }, b: { name: '흰색', hex: '#E5E5E5' }, result: { name: '회색', hex: '#9CA3AF' }, wrong: [{ name: '갈색', hex: '#92400E' }, { name: '보라', hex: '#8B5CF6' }, { name: '하늘', hex: '#7DD3FC' }] },
];
let cmxTime;
function initColormix() {
  cmxScore = 0; cmxRound = 0; cmxTime = 30; document.getElementById('cmx-score').textContent = '0점'; initHearts('cmx');
  document.getElementById('cmx-round').textContent = '30s';
  clearInterval(curTimer); curTimer = setInterval(() => {
    cmxTime--; document.getElementById('cmx-round').textContent = cmxTime + 's';
    if (cmxTime <= 10) document.getElementById('cmx-round').className = 'g-timer urgent';
    if (cmxTime <= 0) { clearInterval(curTimer); clearInterval(cmxQTimer); showResult(cmxScore, '색깔 조합', []) }
  }, 1000); cmxNext()
}
function cmxNext() {
  cmxRound++;
  document.getElementById('cmx-round').textContent = cmxRound + '/10';
  const q = CMIX[~~(Math.random() * CMIX.length)];
  const chip = (c, sz = 40) => `<span style="display:inline-block;width:${sz}px;height:${sz}px;border-radius:50%;background:${c.hex};vertical-align:middle;box-shadow:0 2px 6px ${c.hex}44"></span>`;
  document.getElementById('cmx-q').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px">${chip(q.a, 48)}<span style="font-size:28px;font-weight:800;color:var(--sub)">+</span>${chip(q.b, 48)}</div><div style="font-size:15px;color:var(--sub)">${q.a.name} + ${q.b.name} = ?</div>`;
  const opts = [q.result, ...q.wrong.sort(() => Math.random() - .5).slice(0, 3)].sort(() => Math.random() - .5);
  document.getElementById('cmx-opts').innerHTML = opts.map(o => `<div class="cmx-opt" data-name="${o.name}" onclick="cmxPick(this,'${o.name}','${q.result.name}')" style="background:var(--card)"><div>${chip(o, 36)}</div><div style="font-size:13px;margin-top:6px;font-weight:600">${o.name}</div></div>`).join('');
  cmxQLimit = Math.max(2.0, 4.0 - cmxRound * 0.12); cmxQTime = cmxQLimit; clearInterval(cmxQTimer);
  const cmxbar = document.getElementById('cmx-qbar'); if (cmxbar) { cmxbar.style.transition = 'none'; cmxbar.style.width = '100%'; requestAnimationFrame(() => { cmxbar.style.transition = `width ${cmxQLimit}s linear`; cmxbar.style.width = '0%' }) }
  cmxQTimer = setInterval(() => { cmxQTime -= 0.1; if (cmxQTime <= 0) { clearInterval(cmxQTimer); curScore = cmxScore; if (loseHeart('cmx')) return; setTimeout(cmxNext, 300) } }, 100)
}
function cmxPick(el, picked, answer) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return; clearInterval(cmxQTimer);
  if (picked === answer) { el.classList.add('ok'); const pct = cmxQTime / cmxQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; cmxScore += 10 + bonus; setScore('cmx-score', cmxScore) }
  else { el.classList.add('no'); document.querySelectorAll('.cmx-opt').forEach(o => { if (o.dataset.name === answer) o.classList.add('ok') }); curScore = cmxScore; if (loseHeart('cmx')) return }
  setTimeout(cmxNext, 800)
}

// ===== 18. WORD COMPLETE =====
let wcScore, wcTime, wcTotal, wcQTimer, wcQTime, wcQLimit;
const WC_DB = [
  { word: '사__', full: '사과', hint: '빨간 과일', opts: ['과', '랑', '람', '울'] },
  { word: '행_', full: '행복', hint: '기쁜 감정', opts: ['복', '운', '사', '동'] },
  { word: '_늘', full: '하늘', hint: '머리 위에', opts: ['하', '바', '그', '저'] },
  { word: '_다', full: '바다', hint: '넓고 푸른', opts: ['바', '나', '아', '가'] },
  { word: '사_', full: '사랑', hint: '♥ 감정', opts: ['랑', '과', '람', '진'] },
  { word: '_교', full: '학교', hint: '배우는 곳', opts: ['학', '교', '성', '사'] },
  { word: '_화', full: '영화', hint: '극장에서 보는', opts: ['영', '전', '문', '동'] },
  { word: '음_', full: '음악', hint: '🎵 소리 예술', opts: ['악', '식', '료', '산'] },
  { word: '_구', full: '친구', hint: '함께 노는 사이', opts: ['친', '야', '축', '한'] },
  { word: '_물', full: '동물', hint: '🐾 생명체', opts: ['동', '식', '음', '건'] },
  { word: '_험', full: '모험', hint: '새로운 도전', opts: ['모', '위', '경', '시'] },
  { word: '_장', full: '시장', hint: '물건 사는 곳', opts: ['시', '공', '광', '미'] },
  { word: '_방', full: '부방', hint: '잠자는 곳', opts: ['침', '주', '부', '목'] },
  { word: '_기', full: '용기', hint: '두려움을 이기는', opts: ['용', '전', '공', '운'] },
  { word: '자_', full: '자유', hint: '구속 없는 상태', opts: ['유', '연', '동', '리'] },
  { word: '_식', full: '지식', hint: '배워서 아는 것', opts: ['지', '음', '의', '상'] },
  { word: '_실', full: '진실', hint: '거짓의 반대', opts: ['진', '현', '교', '빈'] },
  { word: '평_', full: '평화', hint: '☮ 전쟁 없는', opts: ['화', '야', '일', '소'] },
  { word: '_상', full: '이상', hint: '꿈꾸는 모습', opts: ['이', '사', '현', '비'] },
  { word: '_래', full: '미래', hint: '앞으로 올 시간', opts: ['미', '노', '거', '과'] },
];
function initWordcomp() {
  wcScore = 0; wcTime = 30; wcTotal = 0; document.getElementById('wc-score').textContent = '0점'; initHearts('wc');
  document.getElementById('wc-timer').textContent = '30s'; document.getElementById('wc-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => { wcTime--; document.getElementById('wc-timer').textContent = wcTime + 's'; if (wcTime <= 10) document.getElementById('wc-timer').className = 'g-timer urgent'; if (wcTime <= 0) { clearInterval(curTimer); clearInterval(wcQTimer); showResult(wcScore, '단어 완성', [{ val: wcTotal, label: '문제 수' }]) } }, 1000); wcGen()
}
function wcGen() {
  const q = WC_DB[~~(Math.random() * WC_DB.length)];
  document.getElementById('wc-word').textContent = q.word;
  document.getElementById('wc-hint').textContent = '힌트: ' + q.hint;
  const ans = q.opts[0]; const opts = [...q.opts].sort(() => Math.random() - .5);
  document.getElementById('wc-opts').innerHTML = opts.map(o => `<div class="wc-opt" onclick="wcPick(this,'${o}','${ans}','${q.full}')">${o}</div>`).join('');
  wcQLimit = Math.max(1.5, 3.0 - wcTotal * 0.06); wcQTime = wcQLimit; clearInterval(wcQTimer);
  const wcbar = document.getElementById('wc-qbar'); if (wcbar) { wcbar.style.transition = 'none'; wcbar.style.width = '100%'; requestAnimationFrame(() => { wcbar.style.transition = `width ${wcQLimit}s linear`; wcbar.style.width = '0%' }) }
  wcQTimer = setInterval(() => { wcQTime -= 0.1; if (wcQTime <= 0) { clearInterval(wcQTimer); wcTotal++; curScore = wcScore; if (loseHeart('wc')) return; setTimeout(wcGen, 300) } }, 100)
}
function wcPick(el, picked, answer, full) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return; clearInterval(wcQTimer); wcTotal++;
  if (picked === answer) { el.classList.add('ok'); const pct = wcQTime / wcQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; wcScore += 10 + bonus; setScore('wc-score', wcScore); document.getElementById('wc-word').textContent = full }
  else { el.classList.add('no'); document.querySelectorAll('.wc-opt').forEach(o => { if (o.textContent === answer) o.classList.add('ok') }); document.getElementById('wc-word').textContent = full; curScore = wcScore; if (loseHeart('wc')) return }
  setTimeout(wcGen, 700)
}

// ===== 19. TIMING =====
let tmScore, tmRound, tmAnim, tmPos, tmTarget, tmDir;
function initTiming() { tmScore = 0; tmRound = 0; document.getElementById('tm-score').textContent = '0점'; tmNext() }
function tmNext() {
  tmRound++; if (tmRound > 10) { showResult(tmScore, '타이밍', []); return }
  document.getElementById('tm-round').textContent = tmRound + '/10';
  const barW = document.getElementById('tm-btn').parentElement.querySelector('.tm-bar')?.offsetWidth || 280;
  const tgtW = Math.max(30, 80 - tmRound * 5); const tgtL = ~~(Math.random() * (barW - tgtW));
  tmTarget = { l: tgtL, r: tgtL + tgtW };
  document.getElementById('tm-target').style.cssText = `left:${tgtL}px;width:${tgtW}px`;
  tmPos = 0; tmDir = 1; const speed = 2 + tmRound * 0.5;
  document.getElementById('tm-cursor').style.left = '0px';
  document.getElementById('tm-msg').textContent = `${tmRound}/10 — 목표에 멈추세요!`;
  cancelAnimationFrame(tmAnim);
  function tick() {
    const bar = document.querySelector('.tm-bar'); if (!bar) return; const bw = bar.offsetWidth;
    tmPos += tmDir * speed; if (tmPos >= bw || tmPos <= 0) tmDir *= -1; tmPos = Math.max(0, Math.min(bw, tmPos));
    document.getElementById('tm-cursor').style.left = tmPos + 'px'; tmAnim = requestAnimationFrame(tick)
  }
  tmAnim = requestAnimationFrame(tick)
}
function tmStop() {
  cancelAnimationFrame(tmAnim);
  const hit = tmPos >= tmTarget.l && tmPos <= tmTarget.r;
  const dist = hit ? 0 : Math.min(Math.abs(tmPos - tmTarget.l), Math.abs(tmPos - tmTarget.r));
  const pts = hit ? 15 : Math.max(0, 10 - ~~(dist / 10));
  tmScore += pts; setScore('tm-score', tmScore);
  toast(hit ? '정확!' : pts > 5 ? '근접!' : '아깝!');
  setTimeout(tmNext, 800)
}

// ===== 20. MATCH PAIR =====
let mpScore, mpTime, mpPairs, mpSel, mpMatched;
const MP_DB = [
  ['학교:배움터', '산:높은 땅', '강:흐르는 물', '해:바다', '풍:바람'],
  ['화:불', '수:물', '목:나무', '금:쇠', '토:흙'],
  ['일:하나', '이:둘', '삼:셋', '사:넷', '오:다섯'],
  ['춘:봄', '하:여름', '추:가을', '동:겨울', '야:밤'],
  ['천:하늘', '지:땅', '인:사람', '산:뫼', '해:바다'],
  ['대:크다', '소:작다', '장:길다', '단:짧다', '고:높다'],
  ['동:동쪽', '서:서쪽', '남:남쪽', '북:북쪽', '중:가운데'],
  ['생:살다', '사:죽다', '래:오다', '거:가다', '식:먹다'],
];
function initMatchpair() {
  mpScore = 0; mpTime = 30; mpMatched = []; mpSel = null;
  document.getElementById('mp-score').textContent = '0점'; document.getElementById('mp-timer').textContent = '30s'; document.getElementById('mp-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => { mpTime--; document.getElementById('mp-timer').textContent = mpTime + 's'; if (mpTime <= 10) document.getElementById('mp-timer').className = 'g-timer urgent'; if (mpTime <= 0) { clearInterval(curTimer); showResult(mpScore, '짝 맞추기', [{ val: mpMatched.length, label: '맞춘 수' }]) } }, 1000); mpGen()
}
function mpGen() {
  mpSel = null; mpMatched = []; const set = MP_DB[~~(Math.random() * MP_DB.length)];
  mpPairs = set.map(s => { const [k, v] = s.split(':'); return { k, v } }).sort(() => Math.random() - .5).slice(0, 5);
  const left = [...mpPairs].sort(() => Math.random() - .5);
  const right = [...mpPairs].sort(() => Math.random() - .5);
  document.getElementById('mp-left').innerHTML = left.map(p => `<div class="mp-item" data-k="${p.k}" onclick="mpTap(this,'left','${p.k}')">${p.k}</div>`).join('');
  document.getElementById('mp-right').innerHTML = right.map(p => `<div class="mp-item" data-v="${p.k}" onclick="mpTap(this,'right','${p.k}')">${p.v}</div>`).join('')
}
function mpTap(el, side, key) {
  if (el.classList.contains('ok')) return;
  document.querySelectorAll(`.mp-item.sel`).forEach(e => { if (e.parentElement === el.parentElement) e.classList.remove('sel') });
  el.classList.add('sel');
  const otherSide = side === 'left' ? 'right' : 'left';
  const otherSel = document.querySelector(`#mp-${otherSide} .mp-item.sel`);
  if (!otherSel) return;
  const leftKey = side === 'left' ? key : otherSel.dataset.k;
  const rightKey = side === 'right' ? key : otherSel.dataset.v;
  if (leftKey === rightKey) {
    el.classList.remove('sel'); el.classList.add('ok'); otherSel.classList.remove('sel'); otherSel.classList.add('ok');
    mpScore += 15; mpMatched.push(leftKey); setScore('mp-score', mpScore); toast('✓ 맞음!');
    if (mpMatched.length >= 5) { mpScore += Math.max(0, mpTime * 2); setScore('mp-score', mpScore); setTimeout(mpGen, 600) }
  }
  else { el.classList.add('no'); otherSel.classList.add('no'); setTimeout(() => { el.classList.remove('sel', 'no'); otherSel.classList.remove('sel', 'no') }, 500) }
}

// ===== 21. HEAD COUNT =====
let hcScore, hcRound, hcCount, hcAnim;
let hcTime;
function initHeadcount() {
  hcScore = 0; hcRound = 0; document.getElementById('hc-score').textContent = '0점';
  document.getElementById('hc-round').textContent = 'Lv.1'; document.getElementById('hc-round').className = 'g-timer';
  initHearts('hc'); hcNext()
}
const HC_CHAR = '<img src="char-40.png" style="width:100%;height:100%">';
function hcNext() {
  hcRound++;
  document.getElementById('hc-round').textContent = 'Lv.' + hcRound;
  hcCount = 0; const steps = 3 + Math.min(hcRound, 7); const events = [];
  for (let i = 0; i < steps; i++) {
    const canExit = hcCount > 0 && Math.random() < .4;
    if (canExit) { events.push(-1); hcCount-- } else { events.push(1); hcCount++ }
  }
  document.getElementById('hc-log').textContent = ''; document.getElementById('hc-opts').innerHTML = '';
  document.getElementById('hc-msg').textContent = '지켜보세요...';
  document.getElementById('hc-counter').textContent = '';
  const stage = document.getElementById('hc-stage');
  stage.querySelectorAll('.hc-person').forEach(p => p.remove());
  let i = 0; hcAnim = setInterval(() => {
    if (i < events.length) {
      const e = events[i]; const p = document.createElement('div');
      p.className = 'hc-person'; p.innerHTML = HC_CHAR;
      stage.appendChild(p);
      if (e > 0) { p.classList.add('enter'); document.getElementById('hc-log').textContent = '입장'; document.getElementById('hc-log').style.color = 'var(--ok)' }
      else { p.classList.add('exit'); document.getElementById('hc-log').textContent = '퇴장'; document.getElementById('hc-log').style.color = 'var(--no)' }
      setTimeout(() => p.remove(), 750);
      i++
    } else {
      clearInterval(hcAnim);
      document.getElementById('hc-log').textContent = ''; document.getElementById('hc-msg').textContent = '건물 안에 몇 명?';
      document.getElementById('hc-counter').textContent = '?';
      const opts = []; for (let n = Math.max(0, hcCount - 2); opts.length < 5; n++)opts.push(n);
      if (!opts.includes(hcCount)) opts[~~(Math.random() * 5)] = hcCount;
      document.getElementById('hc-opts').innerHTML = opts.map(n => `<div class="hc-opt" onclick="hcPick(this,${n},${hcCount})">${n}</div>`).join('')
    }
  }, 900)
}
function hcPick(el, n, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  document.querySelectorAll('.hc-opt').forEach(o => o.style.pointerEvents = 'none');
  if (n === ans) { el.classList.add('ok'); hcScore += 10 + hcRound * 2; setScore('hc-score', hcScore); toast('정답!'); setTimeout(hcNext, 800) }
  else {
    el.classList.add('no'); document.querySelectorAll('.hc-opt').forEach(o => { if (+o.textContent === ans) o.classList.add('ok') });
    curScore = hcScore; if (loseHeart('hc')) return; setTimeout(hcNext, 800)
  }
}

// ===== 22. PYRAMID =====
let pyrScore, pyrRound, pyrAnswer, pyrGrid;
let pyrTime;
function initPyramid() {
  pyrScore = 0; pyrRound = 0; pyrTime = 30; document.getElementById('pyr-score').textContent = '0점'; initHearts('pyr');
  document.getElementById('pyr-round').textContent = '30s';
  clearInterval(curTimer); curTimer = setInterval(() => {
    pyrTime--; document.getElementById('pyr-round').textContent = pyrTime + 's';
    if (pyrTime <= 10) document.getElementById('pyr-round').className = 'g-timer urgent';
    if (pyrTime <= 0) { clearInterval(curTimer); showResult(pyrScore, '피라미드 연산', []) }
  }, 1000); pyrNext()
}
function pyrNext() {
  pyrRound++;
  document.getElementById('pyr-round').textContent = pyrRound + '/10';
  const sz = pyrRound <= 3 ? 3 : pyrRound <= 7 ? 4 : 5;
  const base = Array.from({ length: sz }, () => 1 + ~~(Math.random() * (pyrRound <= 3 ? 9 : pyrRound <= 6 ? 15 : 20)));
  const rows = [base]; for (let r = 1; r < sz; r++) { const prev = rows[r - 1]; rows.push(prev.slice(0, -1).map((v, i) => v + prev[i + 1])) }
  rows.reverse();
  const blankR = ~~(Math.random() * (rows.length - 1)); const blankC = ~~(Math.random() * rows[blankR].length);
  pyrAnswer = rows[blankR][blankC];
  const el = document.getElementById('pyr-grid'); el.innerHTML = '';
  rows.forEach((row, r) => {
    const rowEl = document.createElement('div'); rowEl.className = 'pyr-row';
    row.forEach((v, c) => {
      const cell = document.createElement('div');
      if (r === blankR && c === blankC) { cell.className = 'pyr-cell blank'; cell.textContent = '?'; cell.id = 'pyr-blank' }
      else { cell.className = 'pyr-cell fixed'; cell.textContent = v }
      rowEl.appendChild(cell)
    }); el.appendChild(rowEl)
  });
  const opts = new Set([pyrAnswer]); while (opts.size < 4) { opts.add(pyrAnswer + ~~(Math.random() * 7) - 3) }
  const optArr = [...opts].sort(() => Math.random() - .5);
  const inp = document.createElement('div'); inp.className = 'pyr-input';
  optArr.forEach(v => { const b = document.createElement('button'); b.className = 'pyr-btn'; b.textContent = v; b.onclick = () => pyrPick(v); inp.appendChild(b) });
  el.appendChild(inp)
}
function pyrPick(v) {
  const blank = document.getElementById('pyr-blank'); if (!blank) return;
  blank.textContent = v;
  if (v === pyrAnswer) {
    blank.classList.remove('blank'); blank.style.borderColor = 'var(--ok)'; blank.style.background = 'var(--ok-bg)';
    pyrScore += 10; setScore('pyr-score', pyrScore); toast('정답!')
  }
  else {
    blank.style.borderColor = 'var(--no)'; blank.style.background = 'var(--no-bg)';
    setTimeout(() => { blank.textContent = pyrAnswer; blank.style.borderColor = 'var(--ok)'; blank.style.background = 'var(--ok-bg)' }, 400);
    curScore = pyrScore; if (loseHeart('pyr')) return
  }
  setTimeout(pyrNext, 900)
}

// ===== 23. MAX NUMBER =====
let mxScore, mxTime, mxLv, mxQTimer, mxQTime, mxQLimit;
function initMaxnum() {
  mxScore = 0; mxTime = 30; mxLv = 1; document.getElementById('mx-score').textContent = '0점'; initHearts('mn');
  document.getElementById('mx-timer').textContent = '30s'; document.getElementById('mx-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    mxTime--; document.getElementById('mx-timer').textContent = mxTime + 's';
    if (mxTime <= 10) document.getElementById('mx-timer').className = 'g-timer urgent';
    if (mxTime <= 0) { clearInterval(curTimer); clearInterval(mxQTimer); showResult(mxScore, '수 찾기', [{ val: mxLv - 1, label: '클리어' }]) }
  }, 1000); mxGen()
}
function mxGen() {
  const range = mxLv <= 3 ? 50 : mxLv <= 6 ? 200 : 999;
  const nums = Array.from({ length: 16 }, () => ~~(Math.random() * range) + 1);
  const max = Math.max(...nums); const mode = Math.random() < .5 ? 'max' : 'min'; const target = mode === 'max' ? max : Math.min(...nums);
  document.getElementById('mx-msg').textContent = mode === 'max' ? '가장 큰 수를 터치!' : '가장 작은 수를 터치!';
  document.getElementById('mx-grid').innerHTML = nums.map((n, i) => `<div class="mx-cell" onclick="mxPick(this,${n},${target})">${n}</div>`).join('');
  mxQLimit = Math.max(1.5, 3.5 - mxLv * 0.1); mxQTime = mxQLimit; clearInterval(mxQTimer);
  const mxbar = document.getElementById('mn-qbar'); if (mxbar) { mxbar.style.transition = 'none'; mxbar.style.width = '100%'; requestAnimationFrame(() => { mxbar.style.transition = `width ${mxQLimit}s linear`; mxbar.style.width = '0%' }) }
  mxQTimer = setInterval(() => { mxQTime -= 0.1; if (mxQTime <= 0) { clearInterval(mxQTimer); curScore = mxScore; if (loseHeart('mn')) return; setTimeout(mxGen, 300) } }, 100)
}
function mxPick(el, n, target) {
  if (n === target) {
    clearInterval(mxQTimer); el.classList.add('ok'); const pct = mxQTime / mxQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; mxScore += 10 + mxLv + bonus; mxLv++;
    setScore('mx-score', mxScore); setTimeout(mxGen, 400)
  }
  else { el.classList.add('no'); curScore = mxScore; if (loseHeart('mn')) return; setTimeout(mxGen, 400) }
}

// ===== 24. SIGN FINDER =====
let sfScore, sfTime, sfTotal, sfQTimer, sfQTime, sfQLimit;
function initSignfind() {
  sfScore = 0; sfTime = 30; sfTotal = 0; document.getElementById('sf-score').textContent = '0점'; initHearts('sf');
  document.getElementById('sf-timer').textContent = '30s'; document.getElementById('sf-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    sfTime--; document.getElementById('sf-timer').textContent = sfTime + 's';
    if (sfTime <= 10) document.getElementById('sf-timer').className = 'g-timer urgent';
    if (sfTime <= 0) { clearInterval(curTimer); clearInterval(sfQTimer); showResult(sfScore, '부호 찾기', [{ val: sfTotal, label: '문제 수' }]) }
  }, 1000); sfGen()
}
function sfGen() {
  const ops = ['+', '-', '×', '÷']; const op = ops[~~(Math.random() * 4)];
  const range = sfTotal < 5 ? 20 : sfTotal < 10 ? 50 : 99;
  let a, b, r;
  if (op === '+') { a = 1 + ~~(Math.random() * range); b = 1 + ~~(Math.random() * range); r = a + b }
  else if (op === '-') { a = 2 + ~~(Math.random() * range); b = 1 + ~~(Math.random() * a); r = a - b }
  else if (op === '×') { const mx = sfTotal < 5 ? 9 : 12; a = 2 + ~~(Math.random() * mx); b = 2 + ~~(Math.random() * mx); r = a * b }
  else { const mx = sfTotal < 5 ? 9 : 12; b = 2 + ~~(Math.random() * mx); r = 2 + ~~(Math.random() * mx); a = b * r }
  document.getElementById('sf-eq').textContent = a + ' ? ' + b + ' = ' + r;
  document.getElementById('sf-opts').innerHTML = ops.map(o => `<div class="sf-opt" onclick="sfPick(this,'${o}','${op}')">${o}</div>`).join('');
  sfQLimit = Math.max(1.5, 3.0 - sfTotal * 0.06); sfQTime = sfQLimit; clearInterval(sfQTimer);
  const sfbar = document.getElementById('sf-qbar'); if (sfbar) { sfbar.style.transition = 'none'; sfbar.style.width = '100%'; requestAnimationFrame(() => { sfbar.style.transition = `width ${sfQLimit}s linear`; sfbar.style.width = '0%' }) }
  sfQTimer = setInterval(() => { sfQTime -= 0.1; if (sfQTime <= 0) { clearInterval(sfQTimer); sfTotal++; curScore = sfScore; if (loseHeart('sf')) return; setTimeout(sfGen, 300) } }, 100)
}
function sfPick(el, picked, answer) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return; clearInterval(sfQTimer); sfTotal++;
  if (picked === answer) { el.classList.add('ok'); const pct = sfQTime / sfQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; sfScore += 10 + bonus; setScore('sf-score', sfScore) }
  else {
    el.classList.add('no'); document.querySelectorAll('.sf-opt').forEach(o => { if (o.textContent === answer) o.classList.add('ok') });
    curScore = sfScore; if (loseHeart('sf')) return
  }
  setTimeout(sfGen, 500)
}

// ===== 25. COIN COUNT =====
let ccScore, ccTime, ccTotal;
const COINS = [{ val: 10, color: '#B87333', label: '10' }, { val: 50, color: '#C0C0C0', label: '50' }, { val: 100, color: '#FFD700', label: '100' }, { val: 500, color: '#E8E8E8', label: '500' }];
function initCoincount() {
  ccScore = 0; ccTime = 30; ccTotal = 0; document.getElementById('cc-score').textContent = '0점'; initHearts('cc');
  document.getElementById('cc-timer').textContent = '30s'; document.getElementById('cc-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    ccTime--; document.getElementById('cc-timer').textContent = ccTime + 's';
    if (ccTime <= 10) document.getElementById('cc-timer').className = 'g-timer urgent';
    if (ccTime <= 0) { clearInterval(curTimer); showResult(ccScore, '동전 세기', [{ val: ccTotal, label: '문제 수' }]) }
  }, 1000); ccGen()
}
function ccGen() {
  const count = Math.min(10, 3 + ~~(ccTotal / 3) + ~~(Math.random() * 2)); const coins = Array.from({ length: count }, () => COINS[~~(Math.random() * 4)]);
  const total = coins.reduce((s, c) => s + c.val, 0);
  document.getElementById('cc-coins').innerHTML = coins.map(c => `<div class="cc-coin" style="background:${c.color}">${c.label}원</div>`).join('');
  const opts = new Set([total]); while (opts.size < 4) { opts.add(total + ~~(Math.random() * 201) - 100) }
  opts.delete(total - total); if (opts.size < 4) opts.add(total + 50);
  const optArr = [...opts].filter(v => v > 0).slice(0, 4).sort(() => Math.random() - .5);
  if (!optArr.includes(total)) { optArr[0] = total; optArr.sort(() => Math.random() - .5) }
  document.getElementById('cc-opts').innerHTML = optArr.map(v => `<div class="cc-opt" onclick="ccPick(this,${v},${total})">${v}원</div>`).join('')
}
function ccPick(el, v, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return; ccTotal++;
  if (v === ans) { el.classList.add('ok'); ccScore += 10; setScore('cc-score', ccScore); toast('정답!') }
  else {
    el.classList.add('no'); document.querySelectorAll('.cc-opt').forEach(o => { if (o.textContent === ans + '원') o.classList.add('ok') });
    curScore = ccScore; if (loseHeart('cc')) return
  }
  setTimeout(ccGen, 700)
}

// ===== 26. CLOCK =====
let clkScore, clkRound, clkTime, clkQTimer, clkQTime, clkQLimit;
function initClock() {
  clkScore = 0; clkRound = 0; clkTime = 30; document.getElementById('clk-score').textContent = '0점'; initHearts('clk');
  document.getElementById('clk-round').textContent = '30s'; document.getElementById('clk-round').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    clkTime--; document.getElementById('clk-round').textContent = clkTime + 's';
    if (clkTime <= 10) document.getElementById('clk-round').className = 'g-timer urgent';
    if (clkTime <= 0) { clearInterval(curTimer); clearInterval(clkQTimer); showResult(clkScore, '시계 읽기', []) }
  }, 1000); clkNext()
}
function clkNext() {
  clkRound++;
  const h = ~~(Math.random() * 12) + 1, m = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][~~(Math.random() * 12)];
  const cv = document.getElementById('clk-canvas'), ctx = cv.getContext('2d'), cx = 120, cy = 120, r = 95;
  ctx.clearRect(0, 0, 240, 240);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff'; ctx.fill(); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#ddd'; ctx.lineWidth = 3; ctx.stroke();
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#333'; ctx.font = 'bold 16px Pretendard,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i, cx + Math.cos(a) * 75, cy + Math.sin(a) * 75) }
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; const inner = i % 5 === 0 ? 82 : 87; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90); ctx.strokeStyle = i % 5 === 0 ? 'var(--text,#333)' : 'var(--border,#ccc)'; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke() }
  const ha = (h % 12 + m / 60) / 12 * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * 50, cy + Math.sin(ha) * 50); ctx.strokeStyle = 'var(--text,#333)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
  const ma = m / 60 * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * 70, cy + Math.sin(ma) * 70); ctx.strokeStyle = 'var(--p,#3182F6)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = 'var(--text,#333)'; ctx.fill();
  const answer = h + ':' + (m < 10 ? '0' : '') + m; const opts = new Set([answer]);
  while (opts.size < 4) { const rh = ~~(Math.random() * 12) + 1, rm = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][~~(Math.random() * 12)]; opts.add(rh + ':' + (rm < 10 ? '0' : '') + rm) }
  document.getElementById('clk-opts').innerHTML = [...opts].sort(() => Math.random() - .5).map(o => `<div class="clk-opt" onclick="clkPick(this,'${o}','${answer}')">${o}</div>`).join('');
  // Per-round timer: 5s → 2.5s
  clkQLimit = Math.max(2.5, 5.0 - clkRound * 0.15);
  clkQTime = clkQLimit; clearInterval(clkQTimer);
  const qbar = document.getElementById('clk-qbar'); if (qbar) { qbar.style.transition = 'none'; qbar.style.width = '100%'; requestAnimationFrame(() => { qbar.style.transition = `width ${clkQLimit}s linear`; qbar.style.width = '0%' }) }
  clkQTimer = setInterval(() => { clkQTime -= 0.1; if (clkQTime <= 0) { clearInterval(clkQTimer); curScore = clkScore; if (loseHeart('clk')) return; setTimeout(clkNext, 300) } }, 100)
}
function clkPick(el, v, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  clearInterval(clkQTimer);
  if (v === ans) { el.classList.add('ok'); const pct = clkQTime / clkQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; clkScore += 10 + bonus; setScore('clk-score', clkScore) }
  else {
    el.classList.add('no'); document.querySelectorAll('.clk-opt').forEach(o => { if (o.textContent === ans) o.classList.add('ok') });
    curScore = clkScore; if (loseHeart('clk')) return
  }
  setTimeout(clkNext, 800)
}

// ===== 27. WORD MEMORY =====
let wmScore, wmLv, wmWords, wmShowing;
const WM_POOL = ['사과', '바나나', '포도', '수박', '딸기', '오렌지', '복숭아', '키위', '멜론', '체리', '자두', '감', '귤', '배', '밤', '호두', '잣', '살구', '망고', '파인애플',
  '강아지', '고양이', '토끼', '거북이', '사자', '호랑이', '코끼리', '기린', '펭귄', '독수리', '돌고래', '나비', '잠자리', '벌', '개미', '다람쥐', '여우', '늑대', '곰', '원숭이',
  '학교', '병원', '공원', '시장', '도서관', '미술관', '극장', '식당', '카페', '서점', '은행', '약국', '우체국', '경찰서', '소방서', '공항', '기차역', '항구', '놀이터', '수영장'];
function initWordmem() { wmScore = 0; wmLv = 1; wmShowing = false; document.getElementById('wm-score').textContent = '0점'; document.getElementById('wm-level').textContent = 'Lv.1'; initHearts('wm'); wmNewRound() }
function wmNewRound() {
  wmShowing = true; const count = wmLv + 2;
  wmWords = []; const pool = [...WM_POOL].sort(() => Math.random() - .5);
  for (let i = 0; i < count && i < pool.length; i++)wmWords.push(pool[i]);
  document.getElementById('wm-msg').textContent = '단어를 기억하세요!';
  document.getElementById('wm-opts').innerHTML = '';
  let i = 0; const display = document.getElementById('wm-display');
  display.innerHTML = `<div class="wm-word">${wmWords[0]}</div>`;
  const iv = setInterval(() => {
    i++; if (i < wmWords.length) { display.innerHTML = `<div class="wm-word">${wmWords[i]}</div>` }
    else { clearInterval(iv); wmShowing = false; wmAsk() }
  }, 1200)
}
let wmFound, wmTarget;
function wmAsk() {
  document.getElementById('wm-display').innerHTML = '';
  const count = wmWords.length;
  const decoyCount = Math.min(count + 1, WM_POOL.length - count);
  const decoy = WM_POOL.filter(w => !wmWords.includes(w)).sort(() => Math.random() - .5).slice(0, decoyCount);
  const opts = [...wmWords, ...decoy].sort(() => Math.random() - .5);
  wmFound = 0; wmTarget = wmWords.length;
  document.getElementById('wm-msg').textContent = `있었던 단어를 모두 고르세요 (${wmFound}/${wmTarget})`;
  document.getElementById('wm-opts').innerHTML = opts.map(w => `<div class="wm-opt" onclick="wmPick(this,'${w}',${wmWords.includes(w)})">${w}</div>`).join('')
}
function wmPick(el, w, correct) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  if (correct) {
    el.classList.add('ok'); wmFound++; wmScore += 10; setScore('wm-score', wmScore);
    document.getElementById('wm-msg').textContent = `있었던 단어를 모두 고르세요 (${wmFound}/${wmTarget})`;
    if (wmFound >= wmTarget) {
      wmLv++; wmScore += wmLv * 5; setScore('wm-score', wmScore);
      document.getElementById('wm-level').textContent = 'Lv.' + wmLv; toast('완벽!'); setTimeout(wmNewRound, 800)
    }
  }
  else { el.classList.add('no'); curScore = wmScore; if (loseHeart('wm')) return }
}

// ===== 28. BLOCK COUNT =====
let bcScore, bcRound;
let bcTime, bcTick;
function initBlockcount() {
  bcScore = 0; bcRound = 0; bcTime = 30; document.getElementById('bc-score').textContent = '0점'; initHearts('bc');
  document.getElementById('bc-round').textContent = '30s';
  clearInterval(bcTick); bcTick = setInterval(() => {
    bcTime--; document.getElementById('bc-round').textContent = bcTime + 's';
    if (bcTime <= 0) { clearInterval(bcTick); showResult(bcScore, '블록 세기', []); }
  }, 1000); bcNext()
}
function bcNext() {
  bcRound++; if (bcTime <= 0) return;
  const maxH = bcRound <= 3 ? 4 : bcRound <= 6 ? 5 : 6; const cols = bcRound <= 3 ? 3 : bcRound <= 6 ? 4 : 5;
  const grid = [[]]; let total = 0;
  for (let c = 0; c < cols; c++) { const h = 1 + ~~(Math.random() * maxH); grid[0][c] = h; total += h }
  const cv = document.getElementById('bc-canvas'), ctx = cv.getContext('2d');
  cv.width = 280; cv.height = 220; ctx.clearRect(0, 0, 280, 220);
  const bw = Math.min(50, Math.floor((260 - cols * 6) / cols)), gap = 6;
  const totalW = cols * bw + (cols - 1) * gap; const startX = (280 - totalW) / 2; const baseY = 210; const bh = 32;
  const hues = [210, 150, 35, 340, 270, 100];
  for (let c = 0; c < cols; c++) {
    const h = grid[0][c]; const hue = hues[c % 6];
    for (let k = 0; k < h; k++) {
      const x = startX + c * (bw + gap), y = baseY - (k + 1) * bh;
      ctx.fillStyle = `hsl(${hue},55%,62%)`; ctx.beginPath(); ctx.roundRect(x, y, bw, bh - 2, 4); ctx.fill();
      ctx.fillStyle = `hsl(${hue},55%,72%)`; ctx.fillRect(x + 2, y + 2, bw - 4, 6);
      ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x, y, bw, bh - 2, 4); ctx.stroke()
    }
  }
  const opts = new Set([total]); while (opts.size < 5) { opts.add(total + ~~(Math.random() * 7) - 3) }
  const optArr = [...opts].filter(v => v > 0).slice(0, 5).sort((a, b) => a - b);
  if (!optArr.includes(total)) { optArr[0] = total; optArr.sort((a, b) => a - b) }
  document.getElementById('bc-opts').innerHTML = optArr.map(n => `<div class="bc-opt" onclick="bcPick(this,${n},${total})">${n}</div>`).join('')
}
function bcPick(el, n, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  document.querySelectorAll('.bc-opt').forEach(o => o.style.pointerEvents = 'none');
  if (n === ans) { el.classList.add('ok'); bcScore += 10; setScore('bc-score', bcScore); toast('정답!') }
  else { el.classList.add('no'); document.querySelectorAll('.bc-opt').forEach(o => { if (+o.textContent === ans) o.classList.add('ok') }) }
  setTimeout(bcNext, 600)
}

// ===== 29. FLANKER =====
let fkScore, fkTime, fkAns;
function initFlanker() {
  fkScore = 0; fkTime = 30; document.getElementById('fk-score').textContent = '0점'; initHearts('fk');
  document.getElementById('fk-timer').textContent = '30s'; document.getElementById('fk-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    fkTime--; document.getElementById('fk-timer').textContent = fkTime + 's';
    if (fkTime <= 10) document.getElementById('fk-timer').className = 'g-timer urgent';
    if (fkTime <= 0) { clearInterval(curTimer); showResult(fkScore, '방향 맞추기', []) }
  }, 1000); fkGen()
}
let fkLevel = 0;
function fkGen() {
  const dirs = ['←', '→', '↑', '↓'];
  const useDirs = fkLevel < 5 ? ['←', '→'] : fkLevel < 10 ? ['←', '→', '↑'] : dirs;
  const dir = useDirs[~~(Math.random() * useDirs.length)];
  let distract; do { distract = useDirs[~~(Math.random() * useDirs.length)] } while (distract === dir);
  const sideCount = fkLevel < 3 ? 2 : fkLevel < 7 ? 3 : 4;
  const birdSvg = (d) => {
    const rot = d === '→' ? 0 : d === '←' ? 180 : d === '↑' ? -90 : 90;
    return `<svg viewBox="0 0 50 30" style="width:50px;height:30px;transform:rotate(${rot}deg)" fill="var(--text)" stroke="none">
<polygon points="50,15 40,12 40,0 35,10 5,10 0,0 5,15 0,30 5,20 35,20 40,30 40,18"/>
</svg>`};
  const sides = Array(sideCount).fill(birdSvg(distract)).join('');
  document.getElementById('fk-display').innerHTML = sides + birdSvg(dir) + sides;
  fkAns = dir === '←' ? 'left' : dir === '→' ? 'right' : dir === '↑' ? 'up' : 'down'; fkLevel++
}
function fkPick(d) {
  if (d === fkAns) { fkScore += 10; setScore('fk-score', fkScore); toast('정답!') }
  else { curScore = fkScore; if (loseHeart('fk')) return }
  setTimeout(fkGen, 300)
}

// ===== 30. MEMGRID =====
let mgScore, mgLv, mgCells, mgPhase;
function initMemgrid() { mgScore = 0; mgLv = 1; document.getElementById('mg-score').textContent = '0점'; document.getElementById('mg-level').textContent = 'Lv.1'; initHearts('mg'); mgRound() }
function mgRound() {
  mgPhase = 'show'; const size = mgLv <= 2 ? 3 : mgLv <= 5 ? 4 : 5; const count = mgLv + 2;
  document.getElementById('mg-msg').textContent = '칸을 기억하세요!';
  const total = size * size; mgCells = []; while (mgCells.length < count) { const r = ~~(Math.random() * total); if (!mgCells.includes(r)) mgCells.push(r) }
  const g = document.getElementById('mg-grid'); g.style.gridTemplateColumns = `repeat(${size},50px)`;
  g.innerHTML = Array.from({ length: total }, (_, i) => `<div class="mg-cell" data-i="${i}" style="width:50px;height:50px;border-radius:8px;background:${mgCells.includes(i) ? 'var(--p)' : 'var(--border)'};cursor:pointer;transition:background .2s"></div>`).join('');
  setTimeout(() => {
    if (mgPhase !== 'show') return; mgPhase = 'input'; document.getElementById('mg-msg').textContent = '기억한 칸을 터치하세요!';
    g.querySelectorAll('.mg-cell').forEach(c => { c.style.background = 'var(--border)'; c.onclick = () => mgTap(c) })
  }, 1200 + count * 200)
}
function mgTap(c) {
  if (mgPhase !== 'input') return; const i = +c.dataset.i;
  if (mgCells.includes(i)) {
    c.style.background = 'var(--ok)'; c.onclick = null; mgCells = mgCells.filter(x => x !== i); mgScore += 10;
    setScore('mg-score', mgScore);
    if (mgCells.length === 0) { mgLv++; document.getElementById('mg-level').textContent = 'Lv.' + mgLv; toast('레벨 업!'); setTimeout(mgRound, 500) }
  }
  else { c.style.background = 'var(--no)'; curScore = mgScore; if (loseHeart('mg')) return; setTimeout(mgRound, 800) }
}

// ===== 31. NBACK =====
let nbScore, nbRound, nbPrev, nbCur, nbAnswered;
const NB_ITEMS = ['A', 'B', 'C', 'D', 'E', '1', '2', '3', '4', '5'];
let nbTime;
function initNback() {
  nbScore = 0; nbRound = 0; nbPrev = null; nbAnswered = false; nbTime = 30;
  document.getElementById('nb-score').textContent = '0점'; document.getElementById('nb-round').textContent = '30s';
  clearInterval(curTimer); curTimer = setInterval(() => {
    nbTime--; document.getElementById('nb-round').textContent = nbTime + 's';
    if (nbTime <= 10) document.getElementById('nb-round').className = 'g-timer urgent';
    if (nbTime <= 0) { clearInterval(curTimer); showResult(nbScore, '같거나 다르거나', []) }
  }, 1000); nbNext()
}
function nbNext() {
  nbRound++; nbAnswered = false;
  const same = nbPrev !== null && Math.random() < .35;
  nbCur = same ? nbPrev : NB_ITEMS.filter(x => x !== nbPrev)[~~(Math.random() * (NB_ITEMS.length - 1))];
  document.getElementById('nb-card').textContent = nbCur;
  document.getElementById('nb-card').style.borderColor = 'var(--border)';
  if (nbPrev === null) { document.getElementById('nb-msg').textContent = '첫 번째 카드를 기억하세요!'; setTimeout(() => { nbAnswered = true; nbPrev = nbCur; setTimeout(nbNext, 400) }, 1000); return }
  document.getElementById('nb-msg').textContent = '이전 카드와 같으면 O, 다르면 X'
}
function nbPick(isSame) {
  if (nbAnswered) return; nbAnswered = true;
  const correct = (nbPrev !== null && isSame && nbCur === nbPrev) || (!isSame && (nbPrev === null || nbCur !== nbPrev));
  if (correct) {
    nbScore += 10; setScore('nb-score', nbScore);
    document.getElementById('nb-card').style.borderColor = 'var(--ok)'; toast('정답!')
  }
  else { nbScore = Math.max(0, nbScore - 5); setScore('nb-score', nbScore); document.getElementById('nb-card').style.borderColor = 'var(--no)'; toast('-5점') }
  nbPrev = nbCur; setTimeout(nbNext, 600)
}

// ===== 32. SCRAMBLE =====
let scScore, scTime;
const SC_WORDS = [
  // 2글자 (80)
  '사과', '포도', '수박', '딸기', '기차', '버스', '학교', '병원', '공원', '피자', '치킨', '라면', '축구', '야구', '농구', '배구', '음악', '미술', '과학', '수학', '토끼', '바다', '여행', '안경', '모자', '구름', '나비', '시계', '우산', '거울', '창문', '의자', '연필', '지구', '우주', '가방', '신발', '양말', '장갑', '모래', '바람', '이슬', '노을', '저녁', '아침', '점심', '책상', '칠판', '분필', '공책', '가위', '풀칠', '색연', '도장', '상자', '열쇠', '자물', '편지', '봉투', '우표', '택배', '선물', '꽃병', '화분', '잔디', '나무', '숲길', '계단', '지붕', '벽돌', '타일', '기둥', '울타', '다리', '터널', '항구', '등대', '파도', '조개',
  // 3글자 (100)
  '바나나', '오렌지', '자동차', '비행기', '도서관', '우체국', '컴퓨터', '전화기', '냉장고', '세탁기', '거북이', '코끼리', '원숭이', '고양이', '강아지', '햄버거', '테니스', '선인장', '소방차', '경찰차', '구급차', '초콜릿', '운동장', '수영장', '놀이터', '호랑이', '미술관', '박물관', '수족관', '고구마', '감자탕', '해바라기', '사탕수수', '김치찌개', '된장찌개', '비빔밥', '떡볶이', '잡채밥', '삼겹살', '불고기', '갈비탕', '설렁탕', '냉면집', '칼국수', '만두국', '주먹밥', '김밥집', '라면집', '카페인', '에너지', '비타민', '단백질', '탄수화물', '지방산', '아미노산', '산소통', '이산화탄소', '헬리콥터', '잠수함', '요트선', '돛단배', '스케이트', '스키장', '볼링장', '당구장', '탁구공', '배드민턴', '마라톤', '트라이', '철인삼', '축구장', '농구장', '야구장', '테니스장', '골프장', '수영복', '운동화', '등산화', '장화신', '슬리퍼', '샌들신', '목도리', '귀마개', '손난로', '핫초코', '아메리카노', '카푸치노', '에스프레소', '라떼아트', '밀크티', '녹차라떼', '딸기쥬스', '오렌지쥬스', '포도쥬스', '망고쥬스', '레모네이드', '탄산수', '생수통', '보리차', '옥수수차',
  // 4글자 (70)
  '텔레비전', '백화점', '유치원생', '초등학생', '고등학생', '운동선수', '프로그래머', '디자이너', '피아니스트', '바이올린', '아이스크림', '미끄럼틀', '카멜레온', '크리스마스', '발렌타인', '스마트폰', '인스타그램', '에스컬레이터', '롤러코스터', '트램펄린', '회전목마', '관람차', '대관람차', '워터파크', '놀이공원', '동물원', '식물원', '천문대', '전망대', '도서관', '수영장', '체육관', '볼링장', '노래방', '영화관', '음악실', '과학실', '미술실', '컴퓨터실', '운동장', '강당', '교무실', '보건실', '급식실', '도서실', '상담실', '방송실', '주차장', '엘리베이터', '에어컨', '선풍기', '가습기', '제습기', '공기청정기', '전자레인지', '식기세척기', '건조기', '청소기', '다리미', '믹서기', '토스터', '커피머신', '정수기', '냉온수기', '안마의자', '러닝머신', '자전거', '킥보드', '오토바이',
  // 5글자+ (50)
  '할로윈파티', '올림픽경기', '월드컵축구', '블루투스', '해돋이', '무지개', '태블릿', '노트북', '헤드폰', '인터넷', '유튜브', '롤러블레이드', '스노보드', '스카이다이빙', '번지점프', '패러글라이딩', '카약타기', '서핑보드', '윈드서핑', '제트스키', '수상스키', '스쿠버다이빙', '열기구타기', '행글라이더', '경비행기', '드론촬영', '인공지능', '가상현실', '증강현실', '사물인터넷', '빅데이터', '클라우드', '블록체인', '메타버스', '자율주행', '전기자동차', '수소자동차', '태양광발전', '풍력발전', '지열발전', '원자력발전', '재활용센터', '정수처리장', '하수처리장', '기상관측소', '천문관측소', '해양연구소', '우주정거장', '인공위성', '화성탐사선'];
let scLevel, scQTimer, scQTime, scQLimit;
function initScramble() {
  scScore = 0; scTime = 30; scLevel = 0; document.getElementById('sc-score').textContent = '0점';
  document.getElementById('sc-timer').textContent = '30s'; document.getElementById('sc-timer').className = 'g-timer';
  initHearts('sc');
  clearInterval(curTimer); curTimer = setInterval(() => {
    scTime--; document.getElementById('sc-timer').textContent = scTime + 's';
    if (scTime <= 10) document.getElementById('sc-timer').className = 'g-timer urgent';
    if (scTime <= 0) { clearInterval(curTimer); clearInterval(scQTimer); showResult(scScore, '글자 섞기', []) }
  }, 1000); scGen()
}
function scGen() {
  const minLen = scLevel < 4 ? 2 : scLevel < 8 ? 3 : scLevel < 14 ? 4 : 5;
  const pool = SC_WORDS.filter(w => w.length >= minLen);
  const word = pool[~~(Math.random() * pool.length)]; scLevel++;
  const chars = [...word]; const shuffled = [...chars].sort(() => Math.random() - .5);
  if (shuffled.join('') === word) shuffled.reverse();
  document.getElementById('sc-scrambled').innerHTML = shuffled.map(c => `<span style="background:var(--card);border-radius:8px;padding:8px 14px;box-shadow:var(--shadow)">${c}</span>`).join('');
  const sameLen = SC_WORDS.filter(w => w.length === word.length && w !== word);
  const diffLen = SC_WORDS.filter(w => w !== word && w.length !== word.length);
  const decoys = [...sameLen].sort(() => Math.random() - .5).slice(0, 3);
  while (decoys.length < 3 && diffLen.length) { const idx = ~~(Math.random() * diffLen.length); decoys.push(diffLen.splice(idx, 1)[0]) }
  const opts = [word, ...decoys].sort(() => Math.random() - .5);
  document.getElementById('sc-opts').innerHTML = opts.map(o => `<div class="sf-opt" onclick="scPick(this,'${o}','${word}')">${o}</div>`).join('');
  // Per-question timer: 3s → 1.5s
  scQLimit = Math.max(1.5, 3.0 - scLevel * 0.08);
  scQTime = scQLimit; clearInterval(scQTimer);
  const bar = document.getElementById('sc-qbar'); if (bar) { bar.style.transition = 'none'; bar.style.width = '100%'; requestAnimationFrame(() => { bar.style.transition = `width ${scQLimit}s linear`; bar.style.width = '0%' }) }
  scQTimer = setInterval(() => { scQTime -= 0.1; if (scQTime <= 0) { clearInterval(scQTimer); curScore = scScore; if (loseHeart('sc')) return; setTimeout(scGen, 300) } }, 100)
}
function scPick(el, picked, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  clearInterval(scQTimer);
  if (picked === ans) { el.classList.add('ok'); const pct = scQTime / scQLimit; const bonus = pct > .75 ? 5 : pct > .5 ? 3 : 1; scScore += 10 + bonus; setScore('sc-score', scScore) }
  else { el.classList.add('no'); document.querySelectorAll('#sc-opts .sf-opt').forEach(o => { if (o.textContent === ans) o.classList.add('ok') }); curScore = scScore; if (loseHeart('sc')) return }
  setTimeout(scGen, 500)
}

// ===== 33. SERIAL =====
let srScore, srTime, srNum, srSub;
function initSerial() {
  srScore = 0; srTime = 30; srNum = 100; srSub = 3 + ~~(Math.random() * 6);
  document.getElementById('sr-score').textContent = '0점'; document.getElementById('sr-timer').textContent = '30s'; document.getElementById('sr-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    srTime--; document.getElementById('sr-timer').textContent = srTime + 's';
    if (srTime <= 10) document.getElementById('sr-timer').className = 'g-timer urgent';
    if (srTime <= 0) { clearInterval(curTimer); showResult(srScore, '연속 빼기', []) }
  }, 1000); srGen()
}
function srGen() {
  document.getElementById('sr-q').textContent = `−${srSub}을(를) 계속 빼세요`;
  document.getElementById('sr-num').textContent = srNum;
  const ans = srNum - srSub; const opts = new Set([ans]);
  while (opts.size < 6) { opts.add(ans + ~~(Math.random() * 7) - 3) }
  const arr = [...opts].filter(v => v >= 0).slice(0, 6); if (!arr.includes(ans)) { arr[0] = ans }
  arr.sort((a, b) => a - b);
  document.getElementById('sr-opts').innerHTML = arr.map(n => `<div class="bc-opt" onclick="srPick(this,${n},${ans})">${n}</div>`).join('')
}
function srPick(el, n, ans) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  document.querySelectorAll('#sr-opts .bc-opt').forEach(o => o.style.pointerEvents = 'none');
  if (n === ans) {
    el.classList.add('ok'); srScore += 10; srNum = ans; setScore('sr-score', srScore); toast('정답!');
    if (srNum <= 0) { srNum = 100; srSub = 3 + ~~(Math.random() * 6); srScore += 20; toast('+20 보너스! 새 시작') }
  }
  else { el.classList.add('no'); document.querySelectorAll('#sr-opts .bc-opt').forEach(o => { if (+o.textContent === ans) o.classList.add('ok') }) }
  setTimeout(srGen, 500)
}

// ===== 34. LEFTRIGHT =====
let lrScore, lrTime, lrAns, lrTotal = 0, lrQTimer, lrQTime, lrQLimit;
function initLeftright() {
  lrScore = 0; lrTime = 30; document.getElementById('lr-score').textContent = '0점'; initHearts('lr');
  document.getElementById('lr-timer').textContent = '30s'; document.getElementById('lr-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    lrTime--; document.getElementById('lr-timer').textContent = lrTime + 's';
    if (lrTime <= 10) document.getElementById('lr-timer').className = 'g-timer urgent';
    if (lrTime <= 0) { clearInterval(curTimer); showResult(lrScore, '좌우 판단', []) }
  }, 1000); lrGen()
}
function lrGen() {
  const isLeft = Math.random() < .5; const rot = [0, 90, 180, 270][~~(Math.random() * 4)];
  const isPalm = Math.random() < .5;
  lrAns = isLeft ? 'left' : 'right';
  const hand = document.getElementById('lr-hand');
  // 1인칭 시점 (내 손을 내가 봄)
  // 오른손 손바닥: 엄지 오른쪽 | 오른손 손등: 엄지 왼쪽
  // 왼손 손바닥: 엄지 왼쪽   | 왼손 손등: 엄지 오른쪽
  // Base SVG: 엄지 왼쪽 → 오른손 손등 = 그대로, 오른손 손바닥 = flip
  const flipX = isPalm ? !isLeft : isLeft;
  const detail = isPalm ?
    `<path d="M30 55c10 3 20 3 30 0" stroke="var(--sub)" stroke-width="1" opacity=".5"/><path d="M28 65c12 2 22 2 32 0" stroke="var(--sub)" stroke-width="1" opacity=".5"/>` :
    `<path d="M32 22c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M42 18c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M52 20c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M62 26c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/>`;
  const thumbColor = 'var(--text)';
  hand.innerHTML = `<div style="display:inline-block;position:relative"><svg viewBox="0 0 80 100" fill="none" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:140px;height:175px;transform:rotate(${rot}deg) ${flipX ? 'scaleX(-1)' : ''}">
<path d="M25 90c-8 0-12-5-12-14V42"/><path d="M60 90c8 0 10-6 10-14V38"/><path d="M25 90h35"/>
<path d="M25 42V20c0-3 2-5 5-5s5 2 5 5v22"/><path d="M35 40V16c0-3 2-5 5-5s5 2 5 5v24"/>
<path d="M45 42V18c0-3 2-5 5-5s5 2 5 5v24"/><path d="M55 44V24c0-3 2-5 5-5s5 2 5 5v20"/>
<path d="M25 55c-4 0-10-2-15-2c-4 0-6 2-6 5s2 5 6 5c5 0 11 0 15 0" stroke-width="3" fill="${thumbColor}" fill-opacity=".2" stroke="${thumbColor}"/>
${detail}</svg>
<div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--sub);white-space:nowrap;background:var(--bg);padding:2px 10px;border-radius:var(--r-full)">${isPalm ? '손바닥' : '손등'}</div></div>`;
  document.getElementById('lr-msg').textContent = rot === 0 ? '이 손은?' : '돌아간 이 손은?'
}
function lrPick(d) {
  if (d === lrAns) { lrScore += 10; setScore('lr-score', lrScore); toast('정답!') }
  else { curScore = lrScore; if (loseHeart('lr')) return }
  setTimeout(lrGen, 300)
}

// ===== 35. CALCCOMP =====
let cc2Score, cc2Time, cc2ValA, cc2ValB;
function initCalccomp() {
  cc2Score = 0; cc2Time = 30; document.getElementById('cc2-score').textContent = '0점'; initHearts('cc2');
  document.getElementById('cc2-timer').textContent = '30s'; document.getElementById('cc2-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    cc2Time--; document.getElementById('cc2-timer').textContent = cc2Time + 's';
    if (cc2Time <= 10) document.getElementById('cc2-timer').className = 'g-timer urgent';
    if (cc2Time <= 0) { clearInterval(curTimer); showResult(cc2Score, '계산 비교', []) }
  }, 1000); cc2Gen()
}
function cc2Gen() {
  function mkExpr() {
    const ops = ['+', '-', '×']; const op = ops[~~(Math.random() * 3)];
    let a = 2 + ~~(Math.random() * 15), b = 2 + ~~(Math.random() * 15), val;
    if (op === '×') { a = 2 + ~~(Math.random() * 9); b = 2 + ~~(Math.random() * 9); val = a * b }
    else if (op === '-') { if (b > a) [a, b] = [b, a]; val = a - b } else { val = a + b }
    return { text: a + ' ' + op + ' ' + b, val }
  }
  const exA = mkExpr(), exB = mkExpr();
  if (exA.val === exB.val) exB.val++;
  cc2ValA = exA.val; cc2ValB = exB.val;
  document.getElementById('cc2-a').textContent = exA.text; document.getElementById('cc2-b').textContent = exB.text;
  document.getElementById('cc2-a').style.borderColor = 'var(--border)'; document.getElementById('cc2-b').style.borderColor = 'var(--border)'
}
function cc2Pick(side) {
  const correct = (side === 'left' && cc2ValA > cc2ValB) || (side === 'right' && cc2ValB > cc2ValA);
  const el = document.getElementById(side === 'left' ? 'cc2-a' : 'cc2-b');
  if (correct) { el.style.borderColor = 'var(--ok)'; cc2Score += 10; setScore('cc2-score', cc2Score); toast('정답!') }
  else { el.style.borderColor = 'var(--no)'; curScore = cc2Score; if (loseHeart('cc2')) return }
  setTimeout(cc2Gen, 400)
}

// ===== 36. FLASH =====
let flScore, flLv, flAnswer;
function initFlash() { flScore = 0; flLv = 1; document.getElementById('fl-score').textContent = '0점'; document.getElementById('fl-level').textContent = 'Lv.1'; initHearts('fl'); flRound() }
function flRound() {
  const len = Math.floor(flLv / 2) + 3; flAnswer = ''; for (let i = 0; i < len; i++)flAnswer += ~~(Math.random() * 10);
  document.getElementById('fl-msg').textContent = '숫자를 기억하세요!';
  const flD = document.getElementById('fl-display'); flD.textContent = flAnswer; flD.style.fontSize = (len <= 5 ? 56 : len <= 7 ? 42 : len <= 9 ? 32 : 24) + 'px'; document.getElementById('fl-input').innerHTML = '';
  const showTime = 800 + len * 150;
  setTimeout(() => {
    document.getElementById('fl-msg').textContent = '무슨 숫자였을까요?';
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0, 'OK'];
    document.getElementById('fl-input').innerHTML = `<div class="numpad" style="grid-template-columns:repeat(4,1fr)">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<button class="nbtn" onclick="flKey('${k}')">${k}</button>`).join('')}<button class="nbtn del" onclick="flKey('DEL')">⌫</button><button class="nbtn go" onclick="flKey('OK')">확인</button></div>`;
    window._flInput = ''; window._flLen = len; flUpdateDisplay()
  }, showTime)
}
function flUpdateDisplay() {
  const len = window._flLen; const inp = window._flInput;
  let txt = ''; for (let i = 0; i < len; i++) { txt += i < inp.length ? inp[i] : '_' }
  const d = document.getElementById('fl-display');
  d.innerHTML = txt.split('').map((c, i) => `<span style="display:inline-block;width:36px;text-align:center;${i < inp.length ? 'color:var(--p)' : 'color:var(--sub);opacity:.4'}">${c}</span>`).join('')
}
function flKey(k) {
  if (k === '←') { window._flInput = window._flInput.slice(0, -1); flUpdateDisplay() }
  else if (k === 'OK') {
    if (window._flInput === flAnswer) {
      flScore += 10 + flLv * 5; flLv++;
      setScore('fl-score', flScore); document.getElementById('fl-level').textContent = 'Lv.' + flLv; toast('정답!')
    }
    else { document.getElementById('fl-display').textContent = flAnswer; document.getElementById('fl-display').style.color = 'var(--no)'; curScore = flScore; if (loseHeart('fl')) { return } setTimeout(() => { document.getElementById('fl-display').style.color = ''; flRound() }, 800); return }
    setTimeout(flRound, 500); return
  }
  else if (window._flInput.length < window._flLen) {
    window._flInput += k; flUpdateDisplay();
    if (window._flInput.length === window._flLen) { setTimeout(() => flKey('OK'), 300) }
  }
}

// ===== 37. SORT =====
let stScore, stTime, stCatA, stCatB, stItems, stAns;
const SORT_CATS = [
  { name: '과일', items: ['사과', '배', '포도', '수박', '딸기', '복숭아', '감', '귤'] },
  { name: '동물', items: ['강아지', '고양이', '토끼', '코끼리', '사자', '호랑이', '곰', '여우'] },
  { name: '색깔', items: ['빨강', '파랑', '노랑', '초록', '보라', '주황', '분홍', '하양'] },
  { name: '나라', items: ['한국', '일본', '미국', '영국', '프랑스', '중국', '독일', '호주'] },
  { name: '음식', items: ['김치', '불고기', '피자', '햄버거', '라면', '초밥', '파스타', '떡볶이'] },
  { name: '악기', items: ['피아노', '기타', '바이올린', '드럼', '플루트', '첼로', '하프', '트럼펫'] },
  { name: '스포츠', items: ['축구', '야구', '농구', '테니스', '수영', '골프', '탁구', '배구'] },
  { name: '탈것', items: ['자동차', '버스', '기차', '비행기', '배', '자전거', '택시', '오토바이'] }];
function initSort() {
  stScore = 0; stTime = 30; document.getElementById('st-score').textContent = '0점';
  document.getElementById('st-timer').textContent = '30s'; document.getElementById('st-timer').className = 'g-timer';
  const pair = [...SORT_CATS].sort(() => Math.random() - .5).slice(0, 2); stCatA = pair[0]; stCatB = pair[1];
  document.getElementById('st-cat1').textContent = stCatA.name; document.getElementById('st-cat2').textContent = stCatB.name;
  document.getElementById('st-btn1').textContent = stCatA.name; document.getElementById('st-btn2').textContent = stCatB.name;
  clearInterval(curTimer); curTimer = setInterval(() => {
    stTime--; document.getElementById('st-timer').textContent = stTime + 's';
    if (stTime <= 10) document.getElementById('st-timer').className = 'g-timer urgent';
    if (stTime <= 0) { clearInterval(curTimer); showResult(stScore, '카테고리 분류', []) }
  }, 1000); stGen()
}
function stGen() {
  stAns = Math.random() < .5 ? 0 : 1;
  const cat = stAns === 0 ? stCatA : stCatB;
  document.getElementById('st-word').textContent = cat.items[~~(Math.random() * cat.items.length)]
}
let stCombo = 0, stSwaps = 0;
function stPick(idx) {
  if (idx === stAns) {
    stCombo++; stScore += 10 + (stCombo >= 5 ? 10 : 0); setScore('st-score', stScore);
    if (stCombo >= 8 && stSwaps < 3) {
      stSwaps++; const pair = [...SORT_CATS].sort(() => Math.random() - .5).slice(0, 2); stCatA = pair[0]; stCatB = pair[1];
      document.getElementById('st-cat1').textContent = stCatA.name; document.getElementById('st-cat2').textContent = stCatB.name;
      document.getElementById('st-btn1').textContent = stCatA.name; document.getElementById('st-btn2').textContent = stCatB.name;
      stCombo = 0; toast('카테고리 변경!')
    }
  }
  else { stCombo = 0; stScore = Math.max(0, stScore - 5); setScore('st-score', stScore) }
  setTimeout(stGen, 250)
}

// ===== 38. MIRROR =====
let mrScore, mrTime, mrAns;
const MR_CHARS = '가나다라마바사아자차카타파하거너더러머버서어저커터퍼허고노도로모보소오조코토포호구누두루무부수우주쿠투푸후'.split('');
function initMirror() {
  mrScore = 0; mrTime = 30; document.getElementById('mr-score').textContent = '0점'; initHearts('mr');
  document.getElementById('mr-timer').textContent = '30s'; document.getElementById('mr-timer').className = 'g-timer';
  clearInterval(curTimer); curTimer = setInterval(() => {
    mrTime--; document.getElementById('mr-timer').textContent = mrTime + 's';
    if (mrTime <= 10) document.getElementById('mr-timer').className = 'g-timer urgent';
    if (mrTime <= 0) { clearInterval(curTimer); showResult(mrScore, '거울 문자', []) }
  }, 1000); mrGen()
}
let mrLevel = 0;
function mrGen() {
  mrAns = MR_CHARS[~~(Math.random() * MR_CHARS.length)];
  const ch = document.getElementById('mr-char'); ch.textContent = mrAns;
  const transforms = ['scaleX(-1)', 'scaleY(-1)', 'scaleX(-1) scaleY(-1)', 'rotate(180deg)', 'scaleX(-1) rotate(90deg)'];
  const maxT = mrLevel < 3 ? 1 : mrLevel < 6 ? 3 : 5;
  ch.style.transform = transforms[~~(Math.random() * maxT)]; mrLevel++;
  const opts = new Set([mrAns]); while (opts.size < 4) { opts.add(MR_CHARS[~~(Math.random() * MR_CHARS.length)]) }
  document.getElementById('mr-opts').innerHTML = [...opts].sort(() => Math.random() - .5).map(c =>
    `<div class="bc-opt" onclick="mrPick(this,'${c}')" style="font-size:24px;padding:16px">${c}</div>`).join('')
}
function mrPick(el, c) {
  if (el.classList.contains('ok') || el.classList.contains('no')) return;
  if (c === mrAns) { el.classList.add('ok'); mrScore += 10; setScore('mr-score', mrScore); toast('정답!') }
  else {
    el.classList.add('no'); document.querySelectorAll('#mr-opts .bc-opt').forEach(o => { if (o.textContent === mrAns) o.classList.add('ok') });
    curScore = mrScore; if (loseHeart('mr')) return
  }
  setTimeout(mrGen, 400)
}

// ===== INIT =====
renderHome();
