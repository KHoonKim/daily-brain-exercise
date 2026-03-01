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
  const _lsCache={};GAMES.forEach(g=>{_lsCache[g.id+'-pct']=LS.get(g.id+'-pct',0);_lsCache[g.id+'-best']=LS.get(g.id+'-best',0);if(g.goalUnit==='ms')_lsCache[g.id+'-best-ms']=LS.get(g.id+'-best-ms',0)});
  let total=0,count=0;
  GAMES.forEach(g=>{const b=_lsCache[g.id+'-best'];if(b>0){total+=b;count++}});
  const avg=count>0?Math.round(total/count):0;
  recordDailyScore(avg);

  // Real overall rank from server
  if (window.AIT) {
    AIT.getUserHash().then(uh => {
      fetch(`${API_BASE}/api/score/overall-rank/${uh}`)
        .then(r => r.json())
        .then(d => {
          const el = document.getElementById('overallPct');
          if (!el) return;
          if (d.total < 100) {
            el.textContent = `상위 ${Math.round(rank.age / 5) * 5}%`;
          } else if (d.percentile !== undefined) {
            el.textContent = `상위 ${101 - d.percentile}%`;
          }
        }).catch(() => {});
    });
  }

  // Challenges
  const challenges=getTodayChallenges();
  const doneCount=challenges.filter(m=>m.done).length;
  document.getElementById('challengeCount').textContent=doneCount+'/'+challenges.length;

  const challengeListEl = document.getElementById('challengeList');
  if(challengeListEl) {
    challengeListEl.innerHTML=challenges.map(m=>{
      const pct=Math.min(100,m.target>0?(m.progress/m.target*100):0);
      const best=LS.get(m.gameId+'-best',0);
      const g = GAMES.find(x => x.id === m.gameId) || { color: 'var(--p)' };
      // TDS ListRow — Challenge Card
      return `<div class="tds-list-row tds-list-row--card" onclick="startGame('${m.gameId}', false, 'challenge')">
        <div class="tds-list-row__left">
          <div class="tds-asset-icon tds-asset-icon--sm" style="background:${g.color}18;color:${g.color};padding:7px">${GI[m.gameId]||''}</div>
        </div>
        <div class="tds-list-row__contents">
          <div class="tds-list-row__title">${m.name} <span class="tds-st13 tds-fw-regular tds-color-sub">목표 ${m.target}점 · 최고 ${best}점</span></div>
          <div class="tds-list-row__desc">${m.desc}</div>
          ${m.done?'':`<div class="challenge-prog" style="margin-top:6px"><div class="challenge-prog-fill" style="width:${pct}%;background:${g.color}"></div></div>`}
        </div>
        <div class="tds-list-row__right">
          ${m.done
            ? '<img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:20px;height:20px">'
            : `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="tds-badge tds-badge-xs tds-badge-fill-yellow" style="font-size:12px">+${m.xp}XP</span><span class="tds-badge tds-badge-xs tds-badge-fill-blue" style="font-size:12px">🧠 1점</span></div>`}
        </div>
      </div>`}).join('');
  }

  renderWorkout();
  renderTicketCount();
  if(window.renderPoints) renderPoints(true);

  // Game grid grouped by category
  const CAT_INFO={
    '기억력':{desc:'해마와 전전두엽의 협응을 강화해 정보를 부호화·저장·인출하는 능력을 키워요.'},
    '집중력':{desc:'전전두엽의 억제 제어 시스템을 단련해 방해 요소를 차단하고 목표에 주의를 유지하는 능력을 키워요.'},
    '수리력':{desc:'전두엽·두정엽의 수리 네트워크를 활성화해 수치 정보를 빠르고 정확하게 처리하는 능력을 키워요.'},
    '전환력':{desc:'전전두엽의 인지 제어 회로를 단련해 규칙과 관점 사이를 유연하게 전환하는 인지적 유연성을 키워요.'},
    '언어력':{desc:'브로카·베르니케 언어 네트워크를 자극해 단어 인출, 의미 처리, 언어적 추론 능력을 높여요.'},
    '논리력':{desc:'전두엽 연합 피질의 분석 회로를 강화해 패턴과 규칙에서 결론을 도출하는 추론 능력을 키워요.'},
    '공간지각력':{desc:'두정-후두 피질의 시공간 처리 영역을 활성화해 3차원 공간 정보를 머릿속에서 조작하는 능력을 키워요.'},
    '반응력':{desc:'감각-운동 피질의 신경 전달 효율을 높여 자극을 인식하고 신속·정확하게 반응하는 처리 속도를 키워요.'},
  };
  const cats=['기억력','집중력','수리력','전환력','언어력','논리력','공간지각력','반응력'];
  let gridHtml='';
  cats.forEach(cat=>{
    const games=GAMES.filter(g=>g.cat===cat);if(!games.length)return;
    const info=CAT_INFO[cat]||{desc:''};
    gridHtml+=`<div style="margin-top:20px;margin-bottom:4px"><div class="tds-t6 tds-fw-bold">${cat}</div><div class="tds-st12 tds-color-sub" style="margin-top:3px;margin-bottom:10px;line-height:1.5">${info.desc}</div></div>`;
    gridHtml+=`<div class="game-grid">${games.map(g=>`<div class="game-card" onclick="startGame('${g.id}', false, 'free')">
      <div class="gc-icon" style="width:36px;height:36px;border-radius:10px;background:${g.color}18;color:${g.color};display:flex;align-items:center;justify-content:center;padding:7px">${GI[g.id]||''}</div>
      <div class="gc-name">${g.name}</div>
      <div class="gc-best">${(()=>{const pct=_lsCache[g.id+'-pct']||0;const pctHtml=pct>0?`<span style="font-size:10px;color:#8B95A1"> · 상위 ${pct}%</span>`:'';if(g.goalUnit==='ms'){const b=_lsCache[g.id+'-best-ms']||0;return b>0?`<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start"><span style="font-size:11px;color:#3182F6;font-weight:600">최고 ${b}ms${pctHtml}</span><span style="font-size:11px;color:#00b84c">목표 ${Math.round(b*0.99)}ms</span></div>`:`<span style="font-size:11px;color:#00b84c">목표 ${g.goalDefault}ms</span>`}const b=_lsCache[g.id+'-best']||0;return b>0?`<div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start"><span style="font-size:11px;color:#3182F6;font-weight:600">최고 ${b}점${pctHtml}</span><span style="font-size:11px;color:#00b84c">목표 ${Math.round(b*1.05)}점</span></div>`:`<span style="font-size:11px;color:#00b84c">목표 ${g.goalDefault}점</span>`})()}</div>
    </div>`).join('')}</div>`;
    if(cat==='언어력'){
      gridHtml+=`<div id="home-banner-4" style="margin:8px 0;width:100%;background:var(--border);border-radius:var(--r12);display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:12px">광고 영역</div>`;
    }
  });
  const gameGridEl = document.getElementById('gameGrid');
  if(gameGridEl) gameGridEl.innerHTML=gridHtml;

  if(window.AIT) {
    setTimeout(()=>{
      AIT.loadBannerAd('home-banner-1');
      AIT.loadBannerAd('home-banner-2');
      AIT.loadBannerAd('home-banner-4');
    }, 200);
  }

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

