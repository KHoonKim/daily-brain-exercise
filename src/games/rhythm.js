// ===== 12. RHYTHM - 리듬 기억 =====
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
    const ON_MS = 350, OFF_MS = 250;
    let i = 0;
    function showNext() {
        document.querySelectorAll('.rhy-pad').forEach(p => p.classList.remove('lit'));
        if (i < rhySeq.length) {
            const pad = document.querySelector(`.rhy-pad[data-p="${rhySeq[i]}"]`);
            pad.classList.add('lit'); rhyBeep(rhySeq[i]); i++;
            setTimeout(() => { document.querySelectorAll('.rhy-pad').forEach(p => p.classList.remove('lit')); setTimeout(showNext, OFF_MS); }, ON_MS);
        } else { rhyShowing = false; document.getElementById('rhy-msg').textContent = '같은 순서로 터치!' }
    }
    setTimeout(showNext, 400);
}
function rhyTap(p) {
    if (rhyShowing) return; const pad = document.querySelector(`.rhy-pad[data-p="${p}"]`); pad.classList.remove('lit'); void pad.offsetWidth; pad.classList.add('lit'); rhyBeep(p); clearTimeout(pad._litTimer); pad._litTimer = setTimeout(() => pad.classList.remove('lit'), 200);
    if (p === rhySeq[rhyIdx]) {
        rhyIdx++; if (rhyIdx === rhySeq.length) { rhyLv++; rhyScore += rhyLv * 10; setScore('rhy-score', rhyScore); document.getElementById('rhy-level').textContent = 'Lv.' + rhyLv; toast('✓ 정답!'); scheduleNextQuestion(rhyNewRound, 800) }
    } else { curScore = rhyScore; setHeartResumeCallback(rhyNewRound); if (loseHeart('rhy')) return; document.querySelectorAll('.rhy-pad').forEach(p => { p.classList.remove('lit'); p.classList.add('wrong'); }); document.getElementById('rhy-msg').textContent = '틀렸어요! 다시 시작!'; setTimeout(() => document.querySelectorAll('.rhy-pad').forEach(p => p.classList.remove('wrong')), 600); scheduleNextQuestion(rhyNewRound, 800) }
}
