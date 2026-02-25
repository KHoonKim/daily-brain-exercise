// ===== HOME RENDERING =====
function renderHome(){
  const xp=getXP();const rank=getRank(xp);const next=getNextRank(xp);
  const{streak,playedToday}=getStreak();

  const rankNameEl = document.getElementById('rankName');
  if(rankNameEl) {
    rankNameEl.textContent=rank.name;
    rankNameEl.style.color=rank.color;
  }
  const rankNextEl = document.getElementById('rankNext');
  if(rankNextEl) rankNextEl.textContent=next?`다음 목표: ${next.name}`:'최고로 젊은 두뇌!';
  
  const xpCurEl = document.getElementById('xpCur');
  if(xpCurEl) xpCurEl.textContent=xp+' XP';
  
  const xpMaxEl = document.getElementById('xpMax');
  if(xpMaxEl) xpMaxEl.textContent=(next?.minXp||xp)+' XP';
  
  const xpFillEl = document.getElementById('xpFill');
  if(xpFillEl) {
    const progress=next?((xp-rank.minXp)/(next.minXp-rank.minXp)*100):100;
    xpFillEl.style.width=progress+'%';
  }

  function estimatedPercentile(gid,s){
    const E={math:[180,80],memory:[100,40],reaction:[350,120],stroop:[160,70],sequence:[100,50],word:[80,35],pattern:[120,55],focus:[180,70],rotate:[90,40],reverse:[80,40],numtouch:[100,50],rhythm:[100,55],rps:[140,55],oddone:[200,80],compare:[160,60],bulb:[100,55],colormix:[90,40],wordcomp:[110,45],timing:[90,45],matchpair:[180,70],headcount:[90,40],pyramid:[70,35],maxnum:[160,65],signfind:[110,45],coincount:[90,40],clock:[70,35],wordmem:[90,45],blockcount:[90,40],flanker:[140,55],memgrid:[80,40],nback:[100,45],scramble:[90,40],serial:[120,50],leftright:[140,55],calccomp:[110,45],flash:[90,45],sort:[140,55],mirror:[90,40]};
    const[m,sd]=E[gid]||[50,20];const z=(s-m)/sd;
    const t=1/(1+.2316419*Math.abs(z)),d=.3989422804,p=d*t*(-.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.3302744))));
    return Math.max(1,Math.min(99,Math.round((z>0?1-p:p)*100)));
  }
  let total=0,count=0;
  GAMES.forEach(g=>{const b=LS.get(g.id+'-best',0);if(b>0){total+=b;count++}});
  const avg=count>0?Math.round(total/count):0;
  
  // PCT calculation
  let pctSum=0,pctCount=0;
  GAMES.forEach(g=>{const b=LS.get(g.id+'-best',0);if(b>0){pctSum+=estimatedPercentile(g.id,b);pctCount++}});
  const overallPct=pctCount>0?Math.round(pctSum/pctCount):0;
  const overallPctEl = document.getElementById('overallPct');
  if(overallPctEl) overallPctEl.textContent=overallPct>0?('상위 '+(101-overallPct)+'%'):'--';
  recordDailyScore(avg);

  // Missions
  const missions=getTodayMissions();
  const doneCount=missions.filter(m=>m.done).length;
  const missionCountEl = document.getElementById('missionCount');
  if(missionCountEl) missionCountEl.textContent=doneCount+'/'+missions.length;
  
  const missionListEl = document.getElementById('missionList');
  if(missionListEl) {
    missionListEl.innerHTML=missions.map(m=>{
      const pct=Math.min(100,m.target>0?(m.progress/m.target*100):0);
      const best=LS.get(m.gameId+'-best',0);
      const g = GAMES.find(x => x.id === m.gameId) || { color: 'var(--p)' };
      return `<div class="mission-card" onclick="startGame('${m.gameId}')">
        <div class="mission-icon" style="background:${g.color}15;color:${g.color}">
          <div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center">${GI[m.gameId]||'●'}</div>
        </div>
        <div class="mission-info">
          <div class="mission-name">${m.name}</div>
          <div class="mission-desc">목표 ${m.target}점 · 최고 ${best}점</div>
          ${m.done?'':`<div class="mission-prog"><div class="mission-prog-fill" style="width:${pct}%;background:${g.color}"></div></div>`}
        </div>
        ${m.done?'<div class="mission-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:24px;height:24px"></div>':`<div class="mission-reward" style="display:flex;flex-direction:column;gap:2px;align-items:flex-end"><span class="tds-badge-xs tds-badge-weak-blue">+20 XP</span><span class="tds-badge-xs tds-badge-weak-blue">+1 두뇌점수</span></div>`}
      </div>`}).join('');
  }

  renderWorkout();
  renderTicketCount();
  if(window.renderPoints) renderPoints(true);

  // Game grid
  const cats=['기억력','집중','연산','유연성','언어','논리','공간','반응'];
  let gridHtml='';
  cats.forEach(cat=>{
    const games=GAMES.filter(g=>g.cat===cat);if(!games.length)return;
    gridHtml+=`<div class="grid-category-title">${cat}</div>`;
    gridHtml+=`<div class="game-grid">${games.map(g=>`<div class="game-card" onclick="startGame('${g.id}')">
      <div class="gc-icon" style="background:${g.color}15;color:${g.color}">${GI[g.id]||''}</div>
      <div class="gc-info">
        <div class="gc-name">${g.name}</div>
        <div class="gc-best">${(()=>{const b=LS.get(g.id+'-best',0);return b>0?`최고 ${b}점`:'도전하기'})()}</div>
      </div>
    </div>`).join('')}</div>`;
  });
  const gameGridEl = document.getElementById('gameGrid');
  if(gameGridEl) gameGridEl.innerHTML=gridHtml;
}

function goHome(){
  clearInterval(curTimer);
  clearTimeout(curTimer);
  show('homeScreen');
  const overlay = document.getElementById('overlay');
  if(overlay) overlay.classList.remove('active');
  renderHome();
}
