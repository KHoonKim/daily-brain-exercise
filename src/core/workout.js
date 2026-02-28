// ===== DAILY WORKOUT (ORIGINAL DESIGN RESTORED) =====
const WK_SIZE=3;
let wkActive=false,wkGames=[],wkIdx=0,wkScores=[];

function getTodayWorkout(){
  const today=getDayKey();
  let wk=LS.getJSON('workout-'+today,null);
  if(!wk){
    const xp=getXP();
    const unlocked=GAMES.filter(g=>xp>=g.unlockXp);
    const picked=[...unlocked].sort(()=>Math.random()-.5).slice(0,WK_SIZE);
    wk={games:picked.map(g=>g.id),done:[],scores:{},completed:false};
    LS.setJSON('workout-'+today,wk);
  }
  return wk;
}

function saveWorkout(wk){
  const today=getDayKey();
  LS.setJSON('workout-'+today,wk);
}

function renderWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);addPoints(1);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  const el=document.getElementById('dailyWorkout');
  if(!el) return;
  const allDone=wk.completed;
  const doneCount=wk.done.length;
  const pct=allDone?100:Math.round(doneCount/WK_SIZE*100);
  const nextIdx=wk.games.findIndex(id=>!wk.done.includes(id));
  const nextGame=nextIdx>=0?GAMES.find(x=>x.id===wk.games[nextIdx]):null;

  el.innerHTML=allDone?`
    <div class="workout-card done tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
      <div style="text-align:center;padding:8px 0">
        <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
        <div class="tds-st9 tds-fw-extrabold" style="margin-bottom:4px">오늘의 두뇌운동 완료!</div>
        <div class="tds-t7 tds-color-sub">내일도 잊지 말고 운동하러 오세요!</div>
      </div>
      <div class="wk-games" style="margin:14px 0 0;display:flex;gap:8px">
        ${wk.games.map(id=>{const g=GAMES.find(x=>x.id===id);return`<div class="wk-game done" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:var(--r12);background:rgba(49,130,246,.04);position:relative"><div class="wk-check" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;display:flex;align-items:center;justify-content:center"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon" style="width:24px;height:24px;color:var(--p)">${GI[g.id]||''}</div><div class="wk-name tds-st13 tds-fw-semibold" style="text-align:center">${g.name}</div><div class="tds-st13 tds-fw-bold" style="color:var(--p)">${wk.scores[id]||0}점</div></div>`}).join('')}
      </div>
    </div>`:`
    <div class="workout-card tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
      <div style="text-align:center;padding:4px 0 12px">
        <div class="tds-t7 tds-color-sub" style="margin-bottom:4px">${doneCount===0?'오늘의 뇌를 깨워볼까요?':'좋아요! 계속 가볼까요?'}</div>
        <div class="tds-t4 tds-fw-extrabold">오늘의 두뇌 운동</div>
      </div>
      <div class="wk-games" style="display:flex;gap:8px;margin-bottom:14px">
        ${wk.games.map((id,i)=>{
          const g=GAMES.find(x=>x.id===id);
          const done=wk.done.includes(id);
          const current=i===nextIdx;
          return`<div class="wk-game${done?' done':''}${current?' current':''}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:var(--r12);background:${current?'rgba(49,130,246,.06)':done?'rgba(49,130,246,.04)':'var(--bg)'};position:relative;${current?'box-shadow:0 0 0 1.5px var(--p)':''}">
            ${done?'<div class="wk-check" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;display:flex;align-items:center;justify-content:center"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div>':''}
            <div class="wk-icon" style="width:24px;height:24px;color:var(--p)">${GI[g.id]||''}</div>
            <div class="wk-name tds-st13 tds-fw-semibold" style="text-align:center">${g.name}</div>
            ${done?`<div class="tds-st13 tds-fw-bold" style="color:var(--ok)">${wk.scores[id]||0}점</div>`:''}
          </div>`}).join('')}
      </div>
      <div class="wk-progress" style="height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin:12px 0"><div class="wk-progress-fill" style="width:${pct}%;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--p),var(--purple));transition:width .5s ease"></div></div>
      <button class="wk-start tds-btn tds-btn-xl tds-btn-block tds-btn-primary" onclick="startWorkout()">
        ${doneCount===0?'지금 바로 시작하기':nextGame?'다음: '+nextGame.name:'운동 시작하기'}
      </button>
      <div class="wk-bonus tds-st12 tds-color-sub" style="text-align:center;margin-top:10px">완료 보너스 <span class="tds-badge tds-badge-xs tds-badge-fill-yellow">+50 XP</span> <span class="tds-badge tds-badge-xs tds-badge-fill-blue">+1점</span></div>
    </div>`;
}

function startWorkout(){
  const wk=getTodayWorkout();
  wkActive=true;
  wkGames=wk.games.filter(id=>!wk.done.includes(id));
  wkIdx=0;wkScores=[];
  showWkTransition();
}

function showWkTransition(){
  if(wkIdx>=wkGames.length){finishWorkout();return}
  const g=GAMES.find(x=>x.id===wkGames[wkIdx]);
  const wk=getTodayWorkout();
  const totalDone=wk.done.length+wkIdx+1;
  document.getElementById('wkt-progress').textContent=totalDone+' / '+WK_SIZE;
  document.getElementById('wkt-icon').innerHTML=GI[g.id]||'';document.getElementById('wkt-icon').style.color=g.color;
  document.getElementById('wkt-name').textContent=g.name;
  const best=LS.get(g.id+'-best',0);
  const target=best>0?Math.ceil(best*0.9):10;
  document.getElementById('wkt-desc').textContent=`목표 ${target}점 · 최고 ${best}점`;
  document.getElementById('wkTransition').classList.add('active');
}

function wkStartNext(){
  document.getElementById('wkTransition').classList.remove('active');
  startGame(wkGames[wkIdx]);
}

function wkOnGameEnd(gameId,score){
  const wk=getTodayWorkout();
  if(!wk.done.includes(gameId))wk.done.push(gameId);
  wk.scores[gameId]=score;
  saveWorkout(wk);
  wkIdx++;
}

function wkContinue(){
  if(wkIdx<wkGames.length){
    if(window.AIT && AIT.showAd){
      AIT.showAd('interstitial').then(()=>showWkTransition());
    } else {
      showWkTransition();
    }
  }else{
    finishWorkout();
  }
}

function finishWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);addPoints(1);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
    toast('오늘의 운동 완료! +50 XP +1점');
  }
  wkActive=false;
  goHome();
}
