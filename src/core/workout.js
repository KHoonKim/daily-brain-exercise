// ===== DAILY WORKOUT (ORIGINAL DESIGN RESTORED) =====
const WK_SIZE=3;
let wkActive=false,wkGames=[],wkIdx=0,wkScores=[];

function getTodayWorkout(){
  const today=getDayKey();
  let wk=LS.getJSON('workout-'+today,null);
  if(!wk){
    const xp=getXP();
    const unlocked=GAMES.filter(g=>xp>=g.unlockXp);

    // 최근 30일간 추천된 게임 ID 수집
    const usedIds=new Set();
    const kst=new Date(new Date().getTime()+9*60*60*1000);
    if(kst.getUTCHours()<9)kst.setUTCDate(kst.getUTCDate()-1);
    for(let i=1;i<=7;i++){
      kst.setUTCDate(kst.getUTCDate()-1);
      const past=LS.getJSON('workout-'+kst.toISOString().slice(0,10),null);
      if(past&&past.games)past.games.forEach(id=>usedIds.add(id));
    }

    // 카테고리별 그룹핑
    const byCat={};
    unlocked.forEach(g=>{if(!byCat[g.cat])byCat[g.cat]=[];byCat[g.cat].push(g)});

    // 카테고리 랜덤 셔플 후 각 카테고리에서 1개씩 선택 (미사용 게임 우선)
    const cats=Object.keys(byCat).sort(()=>Math.random()-.5);
    const picked=[];
    for(const cat of cats){
      if(picked.length>=WK_SIZE)break;
      const games=byCat[cat];
      const unused=games.filter(g=>!usedIds.has(g.id));
      const pool=unused.length>0?unused:games;
      picked.push(pool[Math.floor(Math.random()*pool.length)]);
    }

    // 카테고리 수 부족 시 나머지 채우기 (안전장치)
    if(picked.length<WK_SIZE){
      const pickedIds=new Set(picked.map(g=>g.id));
      const remaining=unlocked.filter(g=>!pickedIds.has(g.id));
      const unused=remaining.filter(g=>!usedIds.has(g.id));
      const pool=[...(unused.length>0?unused:remaining)].sort(()=>Math.random()-.5);
      while(picked.length<WK_SIZE&&pool.length>0)picked.push(pool.shift());
    }

    picked.sort(()=>Math.random()-.5);
    const targets={};
    picked.forEach(g=>{
      if(g.goalUnit==='ms'){const bMs=LS.get(g.id+'-best-ms',0);targets[g.id]=bMs>0?Math.round(bMs*1.1):(g.goalDefault||300);}
      else{const b=LS.get(g.id+'-best',0);const sd=g.goalDefault||60;targets[g.id]=b>0?Math.max(Math.ceil(b*0.9),sd):sd;}
    });
    wk={games:picked.map(g=>g.id),done:[],scores:{},targets,completed:false,adRewarded:false};
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
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  const el=document.getElementById('dailyWorkout');
  if(!el) return;
  const allDone=wk.completed;
  const adRewarded=wk.adRewarded??false;
  const doneCount=wk.done.length;
  const pct=allDone?100:Math.round(doneCount/WK_SIZE*100);
  const nextIdx=wk.games.findIndex(id=>!wk.done.includes(id));
  const nextGame=nextIdx>=0?GAMES.find(x=>x.id===wk.games[nextIdx]):null;

  el.innerHTML=!allDone?`
    <div class="workout-card tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
      <div style="padding:4px 0 12px">
        <div style="display:flex;gap:4px;margin-bottom:4px">
          <span class="tds-badge tds-badge-xs tds-badge-weak-blue" style="font-size:12px;vertical-align:middle"><img src="https://static.toss.im/2d-emojis/svg/u1F9E0.svg" style="width:18px;height:18px;margin-right:2px"> 3점</span>
        </div>
        <div class="tds-top__title">오늘의 1분 두뇌운동</div>
      </div>
      <div class="wk-games">
        ${wk.games.map((id,i)=>{
          const g=GAMES.find(x=>x.id===id);
          const done=wk.done.includes(id);
          const current=i===nextIdx;
          return`<div class="wk-game${done?' done':''}${current?' current':''}">
            ${done?'<div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div>':''}
            <div class="wk-icon">${GI[g.id]||''}</div>
            <div class="wk-name tds-st13 tds-fw-semibold">${g.name}</div>
            ${done?`<div class="tds-st13 tds-fw-bold tds-color-success">${wk.scores[id]||0}점</div>`:''}
          </div>`}).join('')}
      </div>
      <div class="tds-progress-stepper" style="margin:12px 0">
        ${wk.games.map((id,i)=>{const done=wk.done.includes(id);const current=i===nextIdx;const isLast=i===wk.games.length-1;const cls=done?' tds-progress-stepper__item--done':current?' tds-progress-stepper__item--current':'';return`<div class="tds-progress-stepper__item${cls}"><div class="tds-progress-stepper__dot"></div>${!isLast?'<div class="tds-progress-stepper__line"></div>':''}</div>`;}).join('')}
      </div>
      <button class="wk-start tds-btn tds-btn-xl tds-btn-block tds-btn-primary" onclick="startWorkout()">
        ${doneCount===0?'지금 바로 시작하기':nextGame?'다음: '+nextGame.name:'운동 시작하기'}
      </button>
    </div>`:!adRewarded?`
    <div class="workout-card done tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
      <div style="text-align:center;padding:8px 0">
        <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
        <div class="tds-st9 tds-fw-extrabold" style="margin-bottom:4px">오늘의 1분 두뇌운동 완료!</div>
        <div class="tds-t7 tds-color-sub" style="margin-bottom:16px">광고를 보고 두뇌점수 3점을 받아가세요</div>
      </div>
      <div class="wk-games" style="margin:0 0 16px">
        ${wk.games.map(id=>{const g=GAMES.find(x=>x.id===id);return`<div class="wk-game done"><div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon">${GI[g.id]||''}</div><div class="wk-name tds-st13 tds-fw-semibold">${g.name}</div><div class="tds-st13 tds-fw-bold tds-color-primary">${wk.scores[id]||0}점</div></div>`}).join('')}
      </div>
      <button class="tds-btn tds-btn-xl tds-btn-block tds-btn-primary" onclick="wkWatchAdForReward()" style="margin-bottom:0">
        광고보고 두뇌점수 3점 받기
      </button>
    </div>`:`
    <div class="workout-card done tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
      <div style="text-align:center;padding:8px 0">
        <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
        <div class="tds-st9 tds-fw-extrabold" style="margin-bottom:4px">오늘의 1분 두뇌운동 완료!</div>
        <div class="tds-t7 tds-color-sub">내일도 잊지 말고 운동하러 오세요!</div>
      </div>
      <div class="wk-games" style="margin:14px 0 0">
        ${wk.games.map(id=>{const g=GAMES.find(x=>x.id===id);return`<div class="wk-game done"><div class="wk-check"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon">${GI[g.id]||''}</div><div class="wk-name tds-st13 tds-fw-semibold">${g.name}</div><div class="tds-st13 tds-fw-bold tds-color-primary">${wk.scores[id]||0}점</div></div>`}).join('')}
      </div>
    </div>`;
}

function startWorkout(){
  const wk=getTodayWorkout();
  wkActive=true;
  wkGames=wk.games.filter(id=>!wk.done.includes(id));
  wkIdx=0;wkScores=[];
  showWkTransition();
}

const _WKT_CAT_INFO={
  '기억력':'해마가 새 정보를 장기기억으로 전환하는 능력을 단련해요. 이름·약속·공부 내용이 더 오래, 더 선명하게 기억에 남아요.',
  '집중력':'전전두엽의 주의 필터를 강화해 방해 자극을 효과적으로 차단해요. 스마트폰이 옆에 있어도 중요한 일에 깊이 몰입할 수 있어요.',
  '수리력':'뇌의 수치 처리 회로를 활성화해 숫자를 빠르고 정확하게 다루는 능력을 키워요. 계산기 없이도 가격 비교나 할인율을 바로 파악할 수 있어요.',
  '전환력':'인지 유연성 회로를 단련해 규칙과 관점을 빠르게 전환하는 능력을 강화해요. 멀티태스킹이 쉬워지고, 예상치 못한 상황에도 유연하게 대응할 수 있어요.',
  '언어력':'브로카·베르니케 언어 네트워크를 자극해 단어 인출과 의미 처리 속도를 높여요. 말하고 싶은 단어가 바로 떠오르고, 생각을 더 설득력 있게 표현할 수 있어요.',
  '논리력':'전두엽 분석 회로를 강화해 패턴에서 결론을 도출하는 추론력을 키워요. 복잡한 문제도 체계적으로 분해해 더 빠르고 정확한 판단을 내릴 수 있어요.',
  '공간지각력':'두정엽의 시공간 처리 영역을 활성화해 3D 공간 정보를 머릿속에서 조작하는 능력을 키워요. 지도 없이도 길을 잘 찾고, 주차·짐 싸기 같은 공간 활용이 능숙해져요.',
  '반응력':'감각-운동 피질의 신경 전달 효율을 높여 자극 인식부터 반응까지의 시간을 단축해요. 운전 중 돌발 상황 대처나 스포츠에서 순간적인 판단이 빨라져요.',
};

function showWkTransition(){
  if(wkIdx>=wkGames.length){wkFinish();return}
  const g=GAMES.find(x=>x.id===wkGames[wkIdx]);
  const wk=getTodayWorkout();
  const totalDone=wk.done.length+1;
  document.getElementById('wkt-progress').textContent=totalDone+' / '+WK_SIZE;
  // 아이콘
  const iconEl=document.getElementById('wkt-icon');
  iconEl.innerHTML=GI[g.id]||'';iconEl.style.color=g.color;iconEl.style.background=g.color+'18';
  // 이름 + 게임 설명
  document.getElementById('wkt-name').textContent=g.name;
  document.getElementById('wkt-desc').textContent=g.desc||'';
  // 능력치 배지 + 설명
  document.getElementById('wkt-cat-badge').textContent=g.cat;
  document.getElementById('wkt-cat-desc').textContent=_WKT_CAT_INFO[g.cat]||'';
  // 목표 / 최고 점수
  if(g.goalUnit==='ms'){
    const bestMs=LS.get(g.id+'-best-ms',0);
    const targetMs=wk.targets?.[g.id]??(bestMs>0?Math.round(bestMs*1.1):(g.goalDefault||300));
    document.getElementById('wkt-goal').textContent=targetMs+'ms';
    document.getElementById('wkt-best').textContent=bestMs>0?bestMs+'ms':'-';
  }else{
    const best=LS.get(g.id+'-best',0);
    const target=wk.targets?.[g.id]??(best>0?Math.ceil(best*0.9):(g.goalDefault||10));
    document.getElementById('wkt-goal').textContent=target+'점';
    document.getElementById('wkt-best').textContent=best>0?best+'점':'-';
  }
  document.getElementById('wkTransition').classList.add('active');
  history.pushState({app:true},'');
  if(window.AIT) AIT.loadBannerAd('wkt-banner');
}

function wkBack(){
  document.getElementById('wkTransition').classList.remove('active');
  wkActive=false;
  goHome();
}

function wkStartNext(){
  document.getElementById('wkTransition').classList.remove('active');
  startGame(wkGames[wkIdx], false, 'workout');
}

function wkOnGameEnd(gameId,score){
  const wk=getTodayWorkout();
  if(!wk.done.includes(gameId))wk.done.push(gameId);
  wk.scores[gameId]=score;
  saveWorkout(wk);
  wkIdx++;
}

function wkContinue(){
  document.getElementById('overlay').classList.remove('active');
  if(wkIdx<wkGames.length){
    showWkTransition();
  }else{
    wkFinish();
  }
}

function wkFinish(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  wkActive=false;
  document.getElementById('overlay').classList.remove('active');
  goHome();
}

function wkFinishWithAd(){
  // 먼저 완료 처리 (XP 지급, 저장) — overlay는 닫지 않음
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  wkActive=false;

  // 광고 표시
  if(window.AIT && AIT.isToss){
    AIT.showAd('interstitial')
      .then(r=>{
        if(r && r.success!==false){
          const wk2=getTodayWorkout();
          if(!wk2.adRewarded){
            wk2.adRewarded=true;saveWorkout(wk2);
            addPoints(3);
            if(window.AIT) AIT.log('workout_ad_rewarded',{});
            toast('두뇌점수 3점 획득!');
          }
        } else {
          toast('광고를 불러오지 못했어요');
        }
        document.getElementById('overlay').classList.remove('active');
        goHome();
      })
      .catch(()=>{
        toast('광고를 불러오지 못했어요');
        document.getElementById('overlay').classList.remove('active');
        goHome();
      });
  } else {
    // 비Toss 환경(로컬 개발): 광고 없이 바로 3점 지급
    const wk2=getTodayWorkout();
    if(!wk2.adRewarded){
      wk2.adRewarded=true;saveWorkout(wk2);
      addPoints(3);
      toast('두뇌점수 3점 획득! (테스트)');
    }
    document.getElementById('overlay').classList.remove('active');
    goHome();
  }
}

function wkWatchAdForReward(){
  if(window.AIT && AIT.isToss){
    AIT.showAd('interstitial')
      .then(r=>{
        if(r && r.success!==false){
          const wk=getTodayWorkout();
          if(!wk.adRewarded){
            wk.adRewarded=true;saveWorkout(wk);
            addPoints(3);
            if(window.AIT) AIT.log('workout_ad_rewarded_home',{});
            toast('두뇌점수 3점 획득!');
            renderWorkout();
          }
        } else {
          toast('광고를 불러오지 못했어요');
        }
      })
      .catch(()=>{ toast('광고를 불러오지 못했어요'); });
  } else {
    // 비Toss 환경
    const wk=getTodayWorkout();
    if(!wk.adRewarded){
      wk.adRewarded=true;saveWorkout(wk);
      addPoints(3);
      toast('두뇌점수 3점 획득! (테스트)');
      renderWorkout();
    }
  }
}
