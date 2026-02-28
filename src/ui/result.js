// ===== RESULT UI =====
const RANK_SVG = `<img src="https://static.toss.im/2d-emojis/svg/u2B50.svg" style="width:1em;height:1em;vertical-align:-2px">`;

function getRetryMotivation(gameId, score, best, isNew) {
  const isLevel = GAMES.find(g => g.id === gameId)?.isLevel ?? false;
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
function showResult(score, name, stats, extra = {}) {
  const isTimerEnd = extra._isTimerEnd || false;
  const curGameMeta = GAMES.find(g => g.id === curGame);

  if (!timeExtendUsed && curGameMeta?.isTimer && !extra._fromTimeExtend && isTimerEnd) {
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

  let xpGain = 10 + Math.floor(score / 5);
  if (isNew && score > 0) xpGain += 15;
  const oldXP = getXP();
  const oldRank = getRank(oldXP);
  const newXP = addXP(xpGain);
  const newRank = getRank(newXP);

  const completed = updateMission(curGame, score, extra);
  completed.forEach(m => addXP(m.xp));

  // Update UI elements
  document.getElementById('r-title').textContent = name + ' 완료!';
  document.getElementById('r-score').textContent = score;

  const catEl = document.getElementById('r-cat');
  if (isNew && score > 0) { catEl.textContent = '새로운 최고기록!'; catEl.style.color = 'var(--ok)' }
  else if (best > 0) {
    const pct = Math.round(score / best * 100);
    catEl.textContent = `최고기록 ${best}점 대비 ${pct}%`;
    catEl.style.color = 'var(--sub-text)';
  } else {
    catEl.textContent = '첫 기록을 세웠어요!';
    catEl.style.color = 'var(--p)';
  }

  document.getElementById('r-xp').textContent = `+${xpGain} XP`;
  let ptGain = completed.length;
  const ptEl = document.getElementById('r-pt');
  if (ptGain > 0) {
    ptEl.textContent = `+${ptGain} 두뇌점수`;
    ptEl.style.display = 'inline-flex';
  } else {
    ptEl.style.display = 'none';
  }

  const statsEl = document.getElementById('r-stats');
  if (stats?.length) {
    statsEl.innerHTML = stats.map(s => `<div class="r-stat"><span class="rs-val">${s.val}</span><span class="rs-label">${s.label}</span></div>`).join('');
    statsEl.style.display = 'flex';
  } else {
    statsEl.style.display = 'none';
  }

  // Science Tip
  const SCIENCE = {
    math: { t: '암산과 전두엽 활성화', d: '계산 훈련은 전두엽의 작업 기억과 처리 속도를 높입니다. 도호쿠 대학 연구에 따르면 빠른 계산이 전두전피질 혈류를 증가시켜 인지 기능 저하를 예방합니다.' },
    memory: { t: '작업 기억과 해마의 협력', d: '카드 매칭은 시각적 작업 기억을 훈련합니다. 해마와 전두엽이 협력하여 단기 정보를 저장하고 비교하는 능력이 향상됩니다.' },
    reaction: { t: '신경 전달 속도 개선', d: '반응속도 훈련은 뇌의 운동 피질과 시각 정보 처리 속도를 높입니다. 규칙적인 훈련은 돌발 상황 대처 능력을 강화합니다.' },
    stroop: { t: '억제 제어와 전두엽', d: '글자 색상과 의미가 충돌할 때 뇌는 억제 제어 능력을 사용합니다. 이 능력은 감정 조절과 의사결정의 핵심입니다.' },
    sequence: { t: '작업 기억 용량 확장', d: '숫자 순서 기억은 정보의 일시적 저장 공간인 작업 기억 용량을 측정합니다. 훈련을 통해 정보를 한 번에 처리하는 양을 늘릴 수 있습니다.' },
    word: { t: '언어 인출과 측두엽', d: '단어 찾기는 좌측 측두엽의 언어 네트워크를 활성화합니다. 어휘를 빠르게 떠올리는 유창성(Fluency) 강화에 효과적입니다.' },
    pattern: { t: '유동 지능과 논리 추론', d: '패턴 추론은 새로운 문제를 해결하는 유동 지능의 핵심입니다. 규칙을 파악하는 능력은 학습 속도와 직결됩니다.' },
    focus: { t: '선택적 주의력 훈련', d: '타겟만 골라내는 과제는 불필요한 정보를 차단하고 필요한 것에만 집중하는 능력을 길러 일상의 몰입도를 높여줍니다.' },
    rotate: { t: '공간 지각과 심적 회전', d: '도형 회전은 두정엽의 심적 회전 능력을 사용합니다. 이는 길 찾기나 물체 배치를 판단하는 실생활 공간 지각력의 기초입니다.' },
    reverse: { t: '정보 조작 능력 강화', d: '숫자를 거꾸로 처리하는 것은 정보를 저장할 뿐만 아니라 재구성하는 고도의 실행 기능을 요구하여 두뇌 유연성을 높입니다.' },
    numtouch: { t: '시각 탐색 속도', d: '순서대로 숫자를 찾는 과제는 시각적 탐색 속도와 주의 전환을 훈련합니다. 정보 처리의 기민함을 높이는 데 탁월합니다.' },
    rhythm: { t: '절차적 기억과 청각 작업 기억', d: '리듬 패턴 기억은 소리 정보를 순서대로 저장하고 재현하는 능력을 길러주며, 이는 언어 학습 및 조절 능력과 관련이 깊습니다.' },
    rps: { t: '인지적 전환 능력', d: '조건에 따라 매번 다른 판단을 내리는 훈련은 뇌의 유연성을 극대화하며 상황 변화에 빠르게 적응하는 힘을 키워줍니다.' },
    oddone: { t: '미세 변별력과 주의력', d: '미세한 차이를 잡아내는 훈련은 시각적 분석 능력을 예리하게 다듬어 줍니다. 두정엽과 시각 피질의 협응력이 강화됩니다.' },
    compare: { t: '수 감각(Number Sense)', d: '두 수의 크기를 0.1초 만에 비교하는 능력은 두정엽 내측 고랑(IPS)에서 처리되며, 수치에 대한 직관력을 높여줍니다.' },
    bulb: { t: '시공간적 작업 기억', d: '전구의 위치와 순서를 기억하는 것은 공간적 맥락을 저장하는 능력을 키워주어 공간 기억력을 향상시킵니다.' },
    colormix: { t: '논리적 결합 사고', d: '색 혼합의 결과를 추론하는 과정은 시각적 상상력과 논리적 조합 능력을 동시에 요구하는 고도화된 지적 활동입니다.' },
    wordcomp: { t: '연상 기억과 언어 지능', d: '단어의 일부분을 보고 전체를 유추하는 과정은 뇌의 저장된 기억을 인출하는 연상 경로를 더 빠르고 단단하게 만듭니다.' },
    timing: { t: '운동 제어와 타이밍', d: '정확한 순간에 반응을 멈추는 것은 소뇌와 기저핵의 협응 능력을 키워주어 실생활에서의 정밀한 움직임을 돕습니다.' },
    matchpair: { t: '어휘 네트워크 확장', d: '서로 다른 개념을 연결하는 훈련은 뇌의 연합 피질을 자극하여 지식 체계를 더 촘촘하고 견고하게 만들어줍니다.' },
    headcount: { t: '동적 작업 기억 훈련', d: '움직이는 대상을 실시간으로 계산하는 것은 뇌의 용량을 끝까지 활용하는 고난도 훈련으로 집중력 유지에 큰 도움을 줍니다.' },
    pyramid: { t: '연속 계산과 집행 기능', d: '단계별로 계산 결과를 쌓아 올리는 피라미드 연산은 논리적 사고의 흐름을 유지하는 집행 능력을 강화합니다.' },
    maxnum: { t: '비교 검색 알고리즘', d: '여러 정보 중 최적의 정보를 빠르게 골라내는 과정은 일상에서 중요한 것을 먼저 선택하는 우선순위 판단력을 높여줍니다.' },
    signfind: { t: '수학적 가설 검증', d: '결과를 보고 연산자를 찾는 것은 거꾸로 추론하는 귀납적 사고를 자극하여 문제 해결의 시야를 넓혀줍니다.' },
    coincount: { t: '실무 인지 능력', d: '화폐의 가치를 더하는 훈련은 실생활에 가장 직결되는 연산 능력을 유지하여 뇌의 노화를 예방하는 데 실질적인 도움을 줍니다.' },
    clock: { t: '시간 인지와 공간 해독', d: '바늘의 각도를 숫자로 읽는 과정은 추상적 기호를 구체적 정보로 바꾸는 뇌의 해독 능력을 민첩하게 유지해줍니다.' },
    wordmem: { t: '범주화 기억 전략', d: '여러 단어를 외우는 과정에서 뇌는 스스로 의미를 묶어 저장하는 전략을 사용하며, 이는 장기 기억력 보존에 핵심적입니다.' },
    blockcount: { t: '3차원 공간 구성력', d: '가려진 블록을 유추하는 훈련은 공간 지능을 입체적으로 확장하여 사물을 다각도로 이해하는 힘을 길러줍니다.' },
    flanker: { t: '자극 간섭 억제', d: '주변의 방해를 무시하고 타겟에만 반응하는 훈련은 복잡한 환경에서도 목표를 잃지 않는 강력한 집중력을 만들어줍니다.' },
    memgrid: { t: '공간 스케치패드', d: '격자판의 위치를 기억하는 것은 뇌 속의 공간 도표를 활성화하여 위치 정보에 대한 기억력을 비약적으로 높여줍니다.' },
    nback: { t: '순간 인지 갱신', d: '이전 정보를 유지하며 새로운 정보를 계속 업데이트하는 N-Back 과제는 작업 기억을 단련하는 전 세계적으로 입증된 최강의 훈련입니다.' },
    scramble: { t: '재조합 창의성', d: '흩어진 조각을 모아 의미 있는 단어를 만드는 훈련은 전두엽의 유연성을 키워 창의적 문제 해결 능력을 자극합니다.' },
    serial: { t: '연속 처리 인내심', d: '일정한 수치를 반복해서 빼는 훈련은 주의력을 잃지 않고 사고를 지속하는 인지적 인내심을 길러줍니다.' },
    leftright: { t: '신체 도식 인지', d: '좌우를 순간적으로 판단하는 것은 뇌의 자기 신체 인식을 정교하게 만들어주어 신체 조절력과 방향 감각을 높입니다.' },
    calccomp: { t: '비교 분석적 사고', d: '두 식의 값을 동시에 추산하여 비교하는 훈련은 멀티태스킹과 분석적 판단력을 동시에 강화합니다.' },
    flash: { t: '순간 포착 능력', d: '찰나의 정보를 잡아내는 훈련은 뇌의 입력 속도를 높여주어 중요한 정보를 놓치지 않는 예리한 관찰력을 만들어줍니다.' },
    sort: { t: '범주 분류 속도', d: '사물을 기준에 따라 빠르게 분류하는 과제는 복잡한 데이터 속에서 본질을 파악하는 정보 처리 능력을 강화합니다.' },
    mirror: { t: '상징 해독과 유연성', d: '뒤집힌 문자를 읽는 고난도 인지 작업은 시각 피질의 새로운 신경 회로를 자극하여 사고의 틀을 깨는 데 도움을 줍니다.' },
  };
  const tip = SCIENCE[curGame] || { t: '꾸준한 두뇌 훈련의 중요성', d: '매일 10분 내외의 두뇌 훈련은 인지 예비능(Cognitive Reserve)을 높여 뇌 건강을 유지하는 데 큰 도움이 됩니다.' };
  document.getElementById('r-sci-title').textContent = tip.t;
  document.getElementById('r-sci-desc').textContent = tip.d;

  if (window.AIT) {
    AIT.log('game_complete', { game: curGame, score, best: LS.get(curGame + '-best', 0), isNew, xp: xpGain });
    if (score > 0 && AIT.isToss) AIT.submitScore(score).catch(() => { });
  }

  // 서버에 점수 저장 & 백분위 표시
  const pctEl = document.getElementById('r-percentile');
  if (pctEl) pctEl.classList.add('hide');
  if (score > 0) {
    AIT.getUserHash()
      .then(uh => fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: curGame, score, userHash: uh })
      }))
      .then(r => r.json())
      .then(d => {
        const top = 100 - d.percentile;
        document.getElementById('r-pct-val').textContent = top <= 1 ? '상위 1%' : `상위 ${top}%`;
        document.getElementById('r-pct-val').style.color = top <= 10 ? 'var(--ok)' : top <= 30 ? 'var(--purple)' : 'var(--p)';
        document.getElementById('r-pct-players').textContent = d.totalPlayers >= 100 ? `${d.totalPlayers.toLocaleString()}명 참여` : '';
        if (pctEl) pctEl.classList.remove('hide');
      })
      .catch(() => { });
  }

  const motivation = getRetryMotivation(curGame, score, best, isNew);
  document.getElementById('r-main-btn').textContent = motivation.btn;

  if (wkActive) {
    wkOnGameEnd(curGame, score);
    const wkBtn = document.getElementById('r-main-btn');
    const doneCount = getTodayWorkout().done.length;
    wkBtn.onclick = () => wkContinue();
    wkBtn.textContent = doneCount < WK_SIZE ? `다음 운동 (${doneCount}/${WK_SIZE})` : '운동 완료하기';
  } else {
    document.getElementById('r-main-btn').onclick = () => replayGame();
  }

  document.getElementById('overlay').classList.add('active');
  if (window.AIT?.loadBannerAd) AIT.loadBannerAd('r-banner');

  if (newRank !== oldRank) {
    setTimeout(() => showLevelUp(newRank, newXP), 600);
  }
}

function showLevelUp(rank, xp) {
  document.getElementById('lu-badge').innerHTML = RANK_SVG; document.getElementById('lu-badge').style.color = rank.color;
  document.getElementById('lu-title').textContent = '두뇌 나이 ' + rank.name + '로 젊어졌어요!';
  document.getElementById('lu-desc').textContent = '꾸준한 훈련으로 두뇌가 젊어지고 있어요!';
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
  if (window.AIT) AIT.log('ad_retry', { game: curGame, replayCount });
  showAd(() => startGame(curGame, true))
}
function goHomeFromResult() { document.getElementById('overlay').classList.remove('active'); if (window.AIT) AIT.setScreenAwake(false); goHome() }

function shareScore() {
  const gName = GAMES.find(g => g.id === curGame)?.name || curGame;
  const best = LS.get(curGame + '-best', 0);
  const msg = `매일매일 두뇌운동에서 ${gName} ${curScore}점 달성! (최고기록 ${best}점) 나와 두뇌 대결하자!`;
  if (window.AIT) AIT.shareMessage(msg);
  if (window.AIT) AIT.log('share_score', { game: curGame, score: curScore });
}

function inviteFriend() {
  if (window.AIT) AIT.shareInvite();
  if (window.AIT) AIT.log('invite_friend', { game: curGame });
}

function showAd(cb, type = 'interstitial') {
  if (window.AIT && AIT.isToss) {
    AIT.showAd(type).then(r => { cb?.() }).catch(() => { cb?.() });
    return;
  }
  const o = document.createElement('div');
  o.className = 'tds-ad-overlay';
  o.innerHTML = '<div class="tds-color-sub"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div>광고 로딩 중...</div>';
  document.body.appendChild(o); setTimeout(() => { o.remove(); cb?.() }, 1500);
}
