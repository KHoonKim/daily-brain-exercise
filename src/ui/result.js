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
  // 타이머 게임 첫 종료 시 +5초 제안
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

  const titleEl = document.getElementById('r-title');
  if(titleEl) titleEl.textContent=name+' 완료!';
  
  const bonusEl=document.getElementById('r-bonus');
  if(bonusEl) {
    if(extra.timeBonus){
      const tb=extra.timeBonus,ts=extra.timeLeft;
      const baseScore=score-tb;
      setScore('r-score',baseScore);
      bonusEl.innerHTML=`<div style="font-size:14px;color:var(--sub);margin:2px 0">남은 시간 ${ts}초 × 5</div><div style="font-size:20px;font-weight:800;color:var(--ok)">+${tb}점</div>`;
      bonusEl.classList.remove('hide');
      setTimeout(()=>{setScore('r-score',score);bonusEl.querySelector('div:last-child').style.opacity='0.5'},1500);
    }else{
      setScore('r-score',score);
      bonusEl.classList.add('hide');
    }
  }

  const catEl = document.getElementById('r-cat');
  if(catEl) {
    const bestNow=LS.get(curGame+'-best',0);
    if(isNew&&score>0){catEl.textContent='새로운 최고기록!';catEl.style.color='var(--ok)'}
    else if(bestNow>0){const pct=Math.round(score/bestNow*100);
      if(pct>=100){catEl.textContent=`최고기록 달성!`;catEl.style.color='var(--ok)'}
      else if(pct>=90){catEl.textContent=`최고기록의 ${pct}% — 거의 다 왔어요!`;catEl.style.color='var(--p)'}
      else if(pct>=70){catEl.textContent=`최고기록의 ${pct}% — 조금만 더!`;catEl.style.color='var(--p)'}
      else{catEl.textContent=`최고기록 ${bestNow}점 대비 ${pct}%`;catEl.style.color='var(--sub)'}
    }else{catEl.textContent='첫 기록!';catEl.style.color='var(--p)'}
  }

  const xpEl=document.getElementById('r-xp');
  if(xpEl) {
    xpEl.textContent=`+${xpGain} XP`;
    xpEl.classList.remove('hide');
  }

  const ptEl=document.getElementById('r-pt');
  if(ptEl) {
    let ptGain=0;
    if(completed.length)ptGain+=completed.length;
    if(ptGain>0){ptEl.textContent=`+${ptGain} 두뇌점수`;ptEl.classList.remove('hide')}
    else{ptEl.classList.add('hide')}
  }

  const mEl=document.getElementById('r-mission');
  if(mEl) {
    if(completed.length){
      mEl.innerHTML=''+completed.map(m=>`${m.name} 완료! (+${m.xp}XP)`).join(' / ');
      mEl.classList.remove('hide');
    }else{mEl.classList.add('hide')}
  }

  const statsEl=document.getElementById('r-stats');
  if(statsEl) {
    if(stats?.length){statsEl.innerHTML=stats.map(s=>`<div class="r-stat"><div class="rs-val">${s.val}</div><div class="rs-label">${s.label}</div></div>`).join('');statsEl.classList.remove('hide')}
    else{statsEl.classList.add('hide')}
  }

  if(window.AIT) {
    AIT.log('game_complete',{game:curGame,score,best:LS.get(curGame+'-best',0),isNew,xp:xpGain});
    if(score>0 && AIT.isToss) AIT.submitScore(score).catch(()=>{});
  }

  const pctEl=document.getElementById('r-percentile');
  if(pctEl) {
    pctEl.classList.add('hide');
    if(score>0 && window.AIT){
      AIT.getUserHash().then(uh=>fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:curGame,score,userHash:uh})}))
      .then(r=>r.json())
      .then(d=>{
        const top=100-d.percentile;
        const valEl = document.getElementById('r-pct-val');
        if(valEl) {
          valEl.textContent=top<=1?'상위 1%':`상위 ${top}%`;
          valEl.style.color=top<=10?'var(--ok)':top<=30?'var(--purple)':'var(--p)';
        }
        const pEl = document.getElementById('r-pct-players');
        if(pEl) pEl.textContent=d.totalPlayers>=100?`${d.totalPlayers.toLocaleString()}명 참여`:'';
        pctEl.classList.remove('hide');
      }).catch(()=>{});
    }
  }
  
  if(wkActive) {
    wkOnGameEnd(curGame, score);
    const retryBtn = document.getElementById('r-retry-btn');
    if(retryBtn) retryBtn.classList.add('hide');
    const wkBtn = document.getElementById('r-wk-btn');
    if(wkBtn) {
      wkBtn.classList.remove('hide');
      wkBtn.textContent='다음 운동 ('+(getTodayWorkout().done.length)+'/'+WK_SIZE+')';
    }
  } else {
    const retryBtn = document.getElementById('r-retry-btn');
    if(retryBtn) retryBtn.classList.remove('hide');
    const wkBtn = document.getElementById('r-wk-btn');
    if(wkBtn) wkBtn.classList.add('hide');
  }
  
  const overlay = document.getElementById('overlay');
  if(overlay) overlay.classList.add('active');

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
  o.innerHTML='<div style="color:var(--sub)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:32px;height:32px"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><div>광고 로딩 중...</div>';
  document.body.appendChild(o);setTimeout(()=>{o.remove();cb?.()},1500);
}
