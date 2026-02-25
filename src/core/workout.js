// ===== DAILY WORKOUT =====
const WK_SIZE=3;
let wkActive=false,wkGames=[],wkIdx=0,wkScores=[];

function getTodayWorkout(){
  const today=getDayKey();
  let wk=LS.getJSON('workout-'+today,null);
  if(!wk){
    // Pick 3 random unlocked games
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
  // Auto-complete if all games done but flag missing
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addCoins(30);addXP(50);addPoints(1);if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  const el=document.getElementById('dailyWorkout');
  if(!el) return;
  const allDone=wk.completed;
  const doneCount=wk.done.length;
  const pct=allDone?100:Math.round(doneCount/WK_SIZE*100);
  const nextIdx=wk.games.findIndex(id=>!wk.done.includes(id));
  const nextGame=nextIdx>=0?GAMES.find(x=>x.id===wk.games[nextIdx]):null;

  el.innerHTML=allDone?`
    <div class="workout-card done">
      <div style="text-align:center;padding:8px 0">
        <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
        <div style="font-size:18px;font-weight:800;margin-bottom:4px">오늘의 두뇌운동 완료!</div>
        <div style="font-size:13px;color:var(--sub)">내일도 잊지 말고 운동하러 오세요!</div>
      </div>
      <div class="wk-games" style="margin:14px 0 0">
        ${wk.games.map(id=>{const g=GAMES.find(x=>x.id===id);return`<div class="wk-game done"><div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon">${GI[g.id]||''}</div><div class="wk-name">${g.name}</div><div style="font-size:10px;color:var(--p);font-weight:700">${wk.scores[id]||0}점</div></div>`}).join('')}
      </div>
    </div>`:`
    <div class="workout-card">
      <div style="text-align:center;padding:4px 0 12px">
        <div style="font-size:13px;color:var(--sub);margin-bottom:4px">${doneCount===0?'오늘의 뇌를 깨워볼까요?':'좋아요! 계속 가볼까요?'}</div>
        <div style="font-size:20px;font-weight:800">오늘의 두뇌 운동</div>
      </div>
      <div class="wk-games">
        ${wk.games.map((id,i)=>{
          const g=GAMES.find(x=>x.id===id);
          const done=wk.done.includes(id);
          const current=i===nextIdx;
          return`<div class="wk-game${done?' done':''}${current?' current':''}">
            ${done?'<div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div>':''}
            <div class="wk-icon">${GI[g.id]||''}</div>
            <div class="wk-name">${g.name}</div>
            ${done?`<div style="font-size:10px;color:var(--ok);font-weight:700">${wk.scores[id]||0}점</div>`:''}
          </div>`}).join('')}
      </div>
      <div class="wk-progress" style="margin:12px 0"><div class="wk-progress-fill" style="width:${pct}%"></div></div>
      <button class="wk-start" onclick="startWorkout()" style="margin-top:4px">
        ${doneCount===0?'지금 바로 시작하기':nextGame?'다음: '+nextGame.name:'운동 시작하기'}
      </button>
      <div class="wk-bonus">완료 보너스 <span class="tds-badge tds-badge-xs tds-badge-fill-yellow">+50 XP</span> <span class="tds-badge tds-badge-xs tds-badge-fill-blue">+1점</span></div>
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
    addCoins(30);addXP(50);addPoints(1);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
    toast('오늘의 운동 완료! +50 XP +1점');
  }
  wkActive=false;
  goHome();
}
