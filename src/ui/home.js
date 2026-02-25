// ===== HOME RENDERING =====
function renderHome(){
  const xp=getXP();const rank=getRank(xp);const next=getNextRank(xp);
  const{streak,playedToday}=getStreak();

  const streakEl = document.getElementById('streakLabel');
  if(streakEl) streakEl.textContent=(streak||0)>0?(streak+'일 연속 출석중'):'오늘 첫 출석을 해보세요!';

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
  const catScores={};
  let pctSum=0,pctCount=0;
  GAMES.forEach(g=>{const b=LS.get(g.id+'-best',0);if(b>0){total+=b;count++;catScores[g.cat]=(catScores[g.cat]||0)+b;pctSum+=estimatedPercentile(g.id,b);pctCount++}});
  const avg=count>0?Math.round(total/count):0;
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
      return `<div class="mission-card" onclick="startGame('${m.gameId}')" style="cursor:pointer">
        <div class="mission-icon" style="background:rgba(49,130,246,.08);color:var(--p)">${GI[m.gameId]?`<div style="width:18px;height:18px">${GI[m.gameId]}</div>`:'●'}</div>
        <div class="mission-info">
          <div class="mission-name">${m.name} <span style="font-size:11px;color:var(--sub);font-weight:400">목표 ${m.target}점 · 최고 ${best}점</span></div>
          <div class="mission-desc">${m.desc}</div>
          ${m.done?'':`<div class="mission-prog"><div class="mission-prog-fill" style="width:${pct}%;background:var(--p)"></div></div>`}
        </div>
        ${m.done?'<div class="mission-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:20px;height:20px"></div>':`<div class="mission-reward" style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="tds-badge tds-badge-xs tds-badge-weak-yellow">+${m.xp}XP</span><span class="tds-badge tds-badge-xs tds-badge-weak-blue">+1점</span></div>`}
      </div>`}).join('');
  }

  // Streak calendar (7 days)
  const streakCount=Math.max(streak,0);
  let calHTML='';
  for(let i=0;i<7;i++){
    const dayNum=i+1;
    const checked=i<streakCount;
    const isNext=i===streakCount;
    const dotClass=checked?'done':isNext?'today':'';
    const label=dayNum+'일';
    calHTML+=`<div class="streak-day"><div class="sd-label">${label}</div><div class="sd-dot ${dotClass}">${checked?'✓':isNext?'·':''}</div></div>`;
  }
  const streakDaysEl = document.getElementById('streakDays');
  if(streakDaysEl) streakDaysEl.innerHTML=calHTML;
  
  const nextBonus=[3,7,14,30].find(n=>n>streak)||30;
  const srEl=document.getElementById('streakReward');
  if(srEl)srEl.innerHTML=`${streak}일 연속 출석 중! <b>${nextBonus}일 보너스까지 ${nextBonus-streak}일</b>`;

  renderWorkout();
  renderTicketCount();
  if(window.renderPoints) renderPoints(true);

  LS.set('totalPlays',(LS.get('totalPlays',0)));

  // Game grid
  const CAT_META={
    '기억력':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M12 2a7 7 0 017 7c0 3-2 5-4 7l-3 4-3-4c-2-2-4-4-4-7a7 7 0 017-7z"/></svg>',desc:'정보를 저장하고 떠올리는 능력'},
    '집중':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',desc:'주의를 유지하고 선택적으로 집중하는 능력'},
    '연산':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',desc:'수를 빠르고 정확하게 처리하는 능력'},
    '유연성':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',desc:'사고를 전환하고 적응하는 능력'},
    '언어':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',desc:'단어와 언어를 처리하는 능력'},
    '논리':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M9.5 2A2.5 2.5 0 0112 4.5V5h2.5A2.5 2.5 0 0117 7.5V10h.5a2.5 2.5 0 010 5H17v2.5a2.5 2.5 0 01-2.5 2.5H12v.5a2.5 2.5 0 01-5 0V20H4.5A2.5 2.5 0 012 17.5V15h.5a2.5 2.5 0 010-5H2V7.5A2.5 2.5 0 014.5 5H7v-.5A2.5 2.5 0 019.5 2z"/></svg>',desc:'규칙을 파악하고 논리적으로 추론하는 능력'},
    '공간':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px"><path d="M12 2l10 6v8l-10 6-10-6V8z"/></svg>',desc:'공간과 도형을 인식하고 조작하는 능력'},
    '반응':{icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;vertical-align:-3px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',desc:'빠르고 정확하게 반응하는 능력'}
  };
  const cats=['기억력','집중','연산','유연성','언어','논리','공간','반응'];
  let gridHtml='';
  cats.forEach(cat=>{
    const games=GAMES.filter(g=>g.cat===cat);if(!games.length)return;
    const m=CAT_META[cat]||{icon:'',desc:''};
    gridHtml+=`<div style="margin-top:16px;margin-bottom:8px"><div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;color:var(--sub)">${m.icon} ${cat}</div><div style="font-size:11px;color:var(--sub);margin-top:1px">${m.desc}</div></div>`;
    gridHtml+=`<div class="game-grid">${games.map(g=>`<div class="game-card" onclick="startGame('${g.id}')">
      <div class="gc-icon" style="width:36px;height:36px;border-radius:10px;background:${g.color}18;color:${g.color};display:flex;align-items:center;justify-content:center;padding:7px">${GI[g.id]||''}</div>
      <div class="gc-name">${g.name}</div>
      <div class="gc-desc">${g.desc}</div>
      <div class="gc-best">${(()=>{const b=LS.get(g.id+'-best',0);if(b>0){const p=101-estimatedPercentile(g.id,b);return'<span class="tds-badge tds-badge-xs tds-badge-weak-blue">'+b+'점</span> 상위 '+p+'%'}return'<span style="color:var(--sub)">도전해보세요!</span>'})()}</div>
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
