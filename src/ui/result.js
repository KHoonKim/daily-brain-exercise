// ===== RESULT UI =====
const RANK_SVG=`<img src="https://static.toss.im/2d-emojis/svg/u2B50.svg" style="width:1em;height:1em;vertical-align:-2px">`;

function getRetryMotivation(gameId,score,best,isNew){
  const levelGames=['sequence','reverse','rhythm','bulb','flash','wordmem','memgrid','headcount'];
  const isLevel=levelGames.includes(gameId);
  const btn='광고보고 한 번 더 도전하기';
  if(isNew&&score>0){
    if(isLevel)return{msg:'새 기록 달성! 집중력이 올라왔을 때 더 높이!',btn};
    return{msg:'컨디션 최고! 이 기세로 더 높은 점수를!',btn};
  }
  if(best>0&&score>=best*0.8){
    const gap=best-score;
    return{msg:`최고기록까지 단 ${gap}점! 충분히 깰 수 있어요`,btn};
  }
  if(best>0&&score>=best*0.5){
    return{msg:`최고기록 ${best}점, 워밍업 끝! 실력 발휘할 차례`,btn};
  }
  if(best>0){
    return{msg:'한 판 더 하면 감이 올 거예요!',btn};
  }
  return{msg:'첫 기록이 세워졌어요! 더 높은 점수에 도전?',btn};
}

let _showResultArgs=null;
function showResult(score,name,stats,extra={}){
  const timerGames=['math','stroop','pattern','focus','rps','compare','oddone','maxnum','signfind','coincount','sort','flanker','nback','leftright','rotate','colormix','wordcomp','headcount','pyramid','clock','blockcount','calccomp','serial','matchpair','mirror'];
  const isTimerEnd = extra._isTimerEnd || false; 

  if(!timeExtendUsed && timerGames.includes(curGame) && !extra._fromTimeExtend && isTimerEnd){
    _showResultArgs=[score,name,stats,extra];
    showTimeExtend(()=>{
      const a=_showResultArgs;
      a[3]._fromTimeExtend=true;
      showResult(...a);
    });
    return;
  }
  curScore=score;
  const best=LS.get(curGame+'-best',0),isNew=score>best;
  if(isNew)LS.set(curGame+'-best',score);
  recordPlay();

  let xpGain=10+Math.floor(score/5);
  if(isNew&&score>0)xpGain+=15;
  const oldXP=getXP();
  const oldRank=getRank(oldXP);
  const newXP=addXP(xpGain);
  const newRank=getRank(newXP);

  const completed=updateMission(curGame,score,extra);
  completed.forEach(m=>addXP(m.xp));

  // Update UI elements
  document.getElementById('r-title').textContent=name+' 완료!';
  document.getElementById('r-score').textContent=score;
  
  const catEl = document.getElementById('r-cat');
  if(isNew&&score>0){catEl.textContent='새로운 최고기록!';catEl.style.color='var(--ok)'}
  else if(best>0){
    const pct=Math.round(score/best*100);
    catEl.textContent=`최고기록 ${best}점 대비 ${pct}%`;
    catEl.style.color='var(--sub-text)';
  }else{
    catEl.textContent='첫 기록을 세웠어요!';
    catEl.style.color='var(--p)';
  }

  document.getElementById('r-xp').textContent=`+${xpGain} XP`;
  let ptGain=completed.length;
  const ptEl = document.getElementById('r-pt');
  if(ptGain>0){
    ptEl.textContent=`+${ptGain} 두뇌점수`;
    ptEl.style.display='inline-flex';
  }else{
    ptEl.style.display='none';
  }

  const statsEl=document.getElementById('r-stats');
  if(stats?.length){
    statsEl.innerHTML=stats.map(s=>`<div class="r-stat"><span class="rs-val">${s.val}</span><span class="rs-label">${s.label}</span></div>`).join('');
    statsEl.style.display='flex';
  }else{
    statsEl.style.display='none';
  }

  // Science Tip
  const SCIENCE={
    math:{t:'암산이 두뇌에 미치는 효과',d:'암산은 전두엽의 작업 기억과 처리 속도를 활성화합니다. 도호쿠 대학 연구에 따르면 빠른 계산 훈련이 전두전피질 혈류를 증가시켜 인지 기능 저하를 예방합니다.'},
    memory:{t:'기억력 카드와 작업 기억',d:'카드 매칭은 시각적 작업 기억(Visual Working Memory)을 훈련합니다. 해마와 전두엽이 협력하여 단기 정보를 저장하고 비교하는 능력이 향상됩니다.'},
    reaction:{t:'반응속도와 신경 전달',d:'반응속도 훈련은 신경 전달 속도와 운동 피질의 효율성을 높입니다. 규칙적인 훈련으로 평균 반응시간이 10-15% 개선될 수 있습니다.'},
    stroop:{t:'스트룹 효과와 인지 억제',d:'글자 색상과 의미가 충돌할 때 전두엽의 억제 제어(Inhibitory Control)가 작동합니다. 이 능력은 충동 조절과 의사결정에 핵심적입니다.'},
    sequence:{t:'순서 기억과 작업 기억 용량',d:'숫자 순서 기억은 작업 기억 용량(Working Memory Span)을 측정하고 훈련합니다. 일반 성인의 기억 폭은 7±2개이며, 훈련으로 확장 가능합니다.'},
    word:{t:'단어 찾기와 언어 처리',d:'단어 검색은 좌측 측두엽의 언어 네트워크를 활성화합니다. 시각 탐색과 어휘 인출을 동시에 수행하여 멀티태스킹 능력을 강화합니다.'},
    pattern:{t:'패턴 인식과 유동 지능',d:'패턴 완성은 유동 지능(Fluid Intelligence)의 핵심 요소입니다. 규칙을 추론하는 능력은 새로운 문제 해결과 학습 속도에 직결됩니다.'},
    focus:{t:'선택적 주의력 훈련',d:'타겟만 빠르게 터치하는 과제는 선택적 주의력(Selective Attention)을 훈련합니다. 불필요한 자극을 걸러내는 이 능력은 일상의 집중력과 직결됩니다.'}
  };
  const tip = SCIENCE[curGame] || {t:'꾸준한 두뇌 훈련의 중요성',d:'매일 10분 내외의 두뇌 훈련은 인지 예비능(Cognitive Reserve)을 높여 뇌 건강을 유지하는 데 큰 도움이 됩니다.'};
  document.getElementById('r-sci-title').textContent=tip.t;
  document.getElementById('r-sci-desc').textContent=tip.d;

  if(window.AIT) {
    AIT.log('game_complete',{game:curGame,score,best:LS.get(curGame+'-best',0),isNew,xp:xpGain});
    if(score>0 && AIT.isToss) AIT.submitScore(score).catch(()=>{});
  }

  const motivation = getRetryMotivation(curGame, score, best, isNew);
  document.getElementById('r-main-btn').textContent = motivation.btn;
  
  if(wkActive) {
    wkOnGameEnd(curGame, score);
    const wkBtn = document.getElementById('r-main-btn');
    const doneCount = getTodayWorkout().done.length;
    wkBtn.onclick = () => wkContinue();
    wkBtn.textContent = doneCount < WK_SIZE ? `다음 운동 (${doneCount}/${WK_SIZE})` : '운동 완료하기';
  } else {
    document.getElementById('r-main-btn').onclick = () => replayGame();
  }
  
  document.getElementById('overlay').classList.add('active');

  if(newRank !== oldRank){
    setTimeout(()=>showLevelUp(newRank,newXP),600);
  }
}

function showLevelUp(rank,xp){
  document.getElementById('lu-badge').innerHTML=RANK_SVG;document.getElementById('lu-badge').style.color=rank.color;
  document.getElementById('lu-title').textContent='두뇌 나이 '+rank.name+'로 젊어졌어요!';
  document.getElementById('lu-desc').textContent='꾸준한 훈련으로 두뇌가 젊어지고 있어요!';
  const newGames=GAMES.filter(g=>g.unlockXp<=xp&&g.unlockXp>0).filter(g=>{
    const prevRank=RANKS.filter(r=>r.minXp<rank.minXp).pop();
    return prevRank?g.unlockXp>prevRank.minXp:true;
  });
  const ulEl=document.getElementById('lu-unlock');
  if(newGames.length){
    ulEl.innerHTML='⊕ 새 게임 해금: '+newGames.map(g=>g.name).join(', ');
    ulEl.classList.remove('hide');
  }else{ulEl.classList.add('hide')}
  document.getElementById('levelupOverlay').classList.add('active');
}
function closeLevelUp(){document.getElementById('levelupOverlay').classList.remove('active')}

function replayGame(){
  replayCount++;document.getElementById('overlay').classList.remove('active');
  if(window.AIT) AIT.log('ad_retry',{game:curGame,replayCount});
  _skipTicket=true;showAd(()=>startGame(curGame))
}
function goHomeFromResult(){document.getElementById('overlay').classList.remove('active');if(window.AIT)AIT.setScreenAwake(false);goHome()}

function shareScore(){
  const gName=GAMES.find(g=>g.id===curGame)?.name||curGame;
  const best=LS.get(curGame+'-best',0);
  const msg=`매일매일 두뇌운동에서 ${gName} ${curScore}점 달성! (최고기록 ${best}점) 나와 두뇌 대결하자!`;
  if(window.AIT) AIT.shareMessage(msg);
  if(window.AIT) AIT.log('share_score',{game:curGame,score:curScore});
}

function inviteFriend(){
  if(window.AIT) AIT.shareInvite();
  if(window.AIT) AIT.log('invite_friend',{game:curGame});
}

function showAd(cb, type='interstitial'){
  if(window.AIT && AIT.isToss){
    AIT.showAd(type).then(r=>{cb?.()}).catch(()=>{cb?.()});
    return;
  }
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font:600 17px var(--font);flex-direction:column;gap:12px';
  o.innerHTML='<div style="color:var(--sub-text)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div>광고 로딩 중...</div>';
  document.body.appendChild(o);setTimeout(()=>{o.remove();cb?.()},1500);
}
