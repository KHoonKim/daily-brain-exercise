// ===== HOME RENDERING (ORIGINAL DESIGN RESTORED) =====
function renderHome(){
  const xp=getXP();const rank=getRank(xp);const next=getNextRank(xp);
  const{streak,playedToday}=getStreak();

  // Streak badge
  const streakEl = document.getElementById('streakLabel');
  if(streakEl) streakEl.textContent=(streak||0)>0?(streak+'일 연속 출석중'):'오늘 첫 출석을 해보세요!';

  // Rank card
  const rankNameEl = document.getElementById('rankName');
  if(rankNameEl) {
    rankNameEl.textContent=rank.name;
    rankNameEl.style.color=rank.color;
  }
  
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
  recordDailyScore(avg);

  // Real overall rank from server
  if (window.AIT) {
    AIT.getUserHash().then(uh => {
      fetch(`/api/score/overall-rank/${uh}`)
        .then(r => r.json())
        .then(d => {
          if (d.percentile !== undefined) {
            const el = document.getElementById('overallPct');
            if (el) el.textContent = `상위 ${101 - d.percentile}%`;
          }
        }).catch(() => {});
    });
  }

  // Missions
  const missions=getTodayMissions();
  const doneCount=missions.filter(m=>m.done).length;
  document.getElementById('missionCount').textContent=doneCount+'/'+missions.length;
  
  const missionListEl = document.getElementById('missionList');
  if(missionListEl) {
    missionListEl.innerHTML=missions.map(m=>{
      const pct=Math.min(100,m.target>0?(m.progress/m.target*100):0);
      const best=LS.get(m.gameId+'-best',0);
      const g = GAMES.find(x => x.id === m.gameId) || { color: 'var(--p)' };
      // TDS ListRow — Mission Card
      return `<div class="tds-list-row tds-list-row--card" onclick="startGame('${m.gameId}')">
        <div class="tds-list-row__left">
          <div class="tds-asset-icon tds-asset-icon--sm" style="background:${g.color}18;color:${g.color};padding:7px">${GI[m.gameId]||''}</div>
        </div>
        <div class="tds-list-row__contents">
          <div class="tds-list-row__title">${m.name} <span class="tds-st13 tds-fw-regular tds-color-sub">목표 ${m.target}점 · 최고 ${best}점</span></div>
          <div class="tds-list-row__desc">${m.desc}</div>
          ${m.done?'':`<div class="mission-prog" style="margin-top:6px"><div class="mission-prog-fill" style="width:${pct}%;background:${g.color}"></div></div>`}
        </div>
        <div class="tds-list-row__right">
          ${m.done
            ? '<img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:20px;height:20px">'
            : `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="tds-badge tds-badge-xs tds-badge-fill-yellow">+${m.xp}XP</span><span class="tds-badge tds-badge-xs tds-badge-fill-blue">+1점</span></div>`}
        </div>
      </div>`}).join('');
  }

  renderWorkout();
  renderTicketCount();
  if(window.renderPoints) renderPoints(true);

  // Game grid grouped by category
  const cats=['기억력','집중','연산','유연성','언어','논리','공간','반응'];
  let gridHtml='';
  cats.forEach(cat=>{
    const games=GAMES.filter(g=>g.cat===cat);if(!games.length)return;
    gridHtml+=`<div class="grid-category-title" class="tds-t7 tds-fw-bold tds-color-sub" style="margin-top:16px;margin-bottom:8px">${cat}</div>`;
    gridHtml+=`<div class="game-grid">${games.map(g=>`<div class="game-card" onclick="startGame('${g.id}')">
      <div class="gc-icon" style="width:36px;height:36px;border-radius:10px;background:${g.color}18;color:${g.color};display:flex;align-items:center;justify-content:center;padding:7px">${GI[g.id]||''}</div>
      <div class="gc-name">${g.name}</div>
      <div class="gc-best">${(()=>{const b=LS.get(g.id+'-best',0);return b>0?`<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start"><span style="font-size:11px;color:#3182F6;font-weight:600">최고 ${b}점</span><span style="font-size:11px;color:#00b84c">목표 ${Math.round(b*1.05)}점</span></div>`:'도전하기'})()}</div>
    </div>`).join('')}</div>`;
  });
  const gameGridEl = document.getElementById('gameGrid');
  if(gameGridEl) gameGridEl.innerHTML=gridHtml;
}

function goHome(){
  curGame=null;
  clearInterval(curTimer);
  clearTimeout(curTimer);
  cancelNextQuestion();
  document.getElementById('heartOverlay')?.classList.remove('active');
  document.getElementById('timeExtendOverlay')?.classList.remove('active');
  show('homeScreen');
  const overlay = document.getElementById('overlay');
  if(overlay) overlay.classList.remove('active');
  renderHome();
}
