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
