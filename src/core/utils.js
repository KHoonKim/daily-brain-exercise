// ===== STATE =====
let curGame=null,curTimer=null,curScore=0,replayCount=0;
let curGameContext='free'; // 'workout' | 'challenge' | 'free'
let _lastRenderedPoints=null;
let _exchangeLock=false;
let pendingCoins=0; // 게임 완료 시 적립 대기 코인

// 오전 9시(KST) 기준 날짜 키 반환
function getDayKey(){
  const now=new Date();
  const kst=new Date(now.getTime()+9*60*60*1000);
  if(kst.getUTCHours()<9) kst.setUTCDate(kst.getUTCDate()-1);
  return kst.toISOString().slice(0,10);
}

const LS={
  get:(k,d=0)=>{const v=localStorage.getItem('bf-'+k);return v!==null?(isNaN(+v)?v:+v):d},
  set:(k,v)=>localStorage.setItem('bf-'+k,String(v)),
  getJSON:(k,d)=>{try{return JSON.parse(localStorage.getItem('bf-'+k))||d}catch{return d}},
  setJSON:(k,v)=>localStorage.setItem('bf-'+k,JSON.stringify(v)),
};

function getXP(){return LS.get('xp',0)}
function addXP(n){
  const xp=getXP()+n;
  LS.set('xp',xp);
  if(window.AIT){
    AIT.submitScore(xp);
  }
  return xp;
}
function getRank(xp){let r=RANKS[0];for(const rank of RANKS)if(xp>=rank.minXp)r=rank;return r}
function getNextRank(xp){for(const r of RANKS)if(xp<r.minXp)return r;return null}

function getCoins(){return LS.get('coins',0)}
function addCoins(n){const c=getCoins()+n;LS.set('coins',c);return c}

// ===== POINT SYSTEM (토스포인트 교환용) =====
function getPoints(){return LS.get('points',0)}
let _pendingPointsTotal=0,_pendingPointsTimer=null;
function addPoints(n){
  const p=getPoints()+n;LS.set('points',p);
  _pendingPointsTotal+=n;
  clearTimeout(_pendingPointsTimer);
  _pendingPointsTimer=setTimeout(()=>{
    snackbar(`두뇌점수 <span class="tds-badge tds-badge-sm tds-badge-fill-blue" style="vertical-align:middle;margin-left:2px">🧠 ${_pendingPointsTotal}점</span>`,2500);
    _pendingPointsTotal=0;
  },50);
  // 서버 동기화 (best-effort, non-blocking)
  if(window.AIT){
    AIT.getUserHash().then(uh=>{
      if(!uh) return;
      fetch(`${API_BASE}/api/score/points/add`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userHash:uh,amount:n})
      }).catch(()=>{});
    }).catch(()=>{});
  }
  return p;
}

function renderPoints(animate=false){
  const p=getPoints();
  const el=document.getElementById('pointDisplay');
  if(el) el.textContent=p+'점';
  const el2=document.getElementById('pointExchangeVal');
  if(el2) el2.textContent=p+'점';
  const prog=document.getElementById('pointProgress');
  const bar=document.getElementById('pointBar');
  const btn=document.getElementById('exchangeBtn');

  if(animate&&_lastRenderedPoints!==null&&p>_lastRenderedPoints){
    animatePointsFrom(_lastRenderedPoints);
  } else {
    if(prog) prog.textContent='🧠 '+p+' / 100점';
    if(bar) bar.style.width=Math.min(100,p)+'%';
  }
  _lastRenderedPoints=p;
  if(btn) btn.disabled=p<100;
}

async function exchangePoints(){
  if(getPoints()<100){toast('100점 이상부터 교환 가능합니다');return}
  if(!AIT.isToss){toast('토스 앱에서만 교환 가능합니다');return}
  if(_exchangeLock){return}
  _exchangeLock=true;
  const btn=document.getElementById('exchangeBtn');
  if(btn){btn.disabled=true;btn.textContent='교환 중...'}
  let exchangeId=null;
  try {
    const uh=await AIT.getUserHash();
    // 1. 서버 잔액 검증 + 차감 (pending 상태)
    const serverRes=await fetch(`${API_BASE}/api/score/promo/exchange`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userHash:uh})
    }).then(r=>r.json());
    if(serverRes.error){throw new Error(serverRes.error)}
    exchangeId=serverRes.exchangeId;
    // 2. Toss SDK로 실제 100원 지급
    const ok=await AIT.triggerPromo('POINT_100',AIT.CONFIG.PROMO_POINT_100,100);
    if(!ok){
      // SDK 실패 → 서버 포인트 복원
      await fetch(`${API_BASE}/api/score/promo/exchange/${exchangeId}/restore`,{method:'POST'}).catch(()=>{});
      throw new Error('SDK 지급 실패');
    }
    // 3. 성공 확정
    fetch(`${API_BASE}/api/score/promo/exchange/${exchangeId}/confirm`,{method:'POST'}).catch(()=>{});
    LS.set('points',0);renderPoints();
    toast('100원 교환 완료!');
    AIT.log('point_exchange',{amount:100,userHash:uh});
  } catch(e) {
    console.error('Exchange failed:',e);
    toast('교환에 실패했습니다. 다시 시도해주세요.');
  } finally {
    _exchangeLock=false;
    if(btn){btn.disabled=getPoints()<100;btn.textContent='100원 받기'}
  }
}

function animatePointsFrom(from){
  const to=getPoints(),diff=to-from,dur=600,prog=document.getElementById('pointProgress'),bar=document.getElementById('pointBar');
  if(!prog||diff<=0)return;
  const card=prog.closest('.point-section');
  if(card){
    const origHTML=card.innerHTML;
    card.style.transition='background .3s, box-shadow .3s';
    card.style.background='var(--p)';card.style.boxShadow='0 4px 16px rgba(49,130,246,.3)';
    card.innerHTML=`<div style="text-align:center;padding:20px 0;color:#fff;font-size:28px;font-weight:800">+${diff}점</div>`;
    setTimeout(()=>{
      card.style.background='var(--card)';card.style.boxShadow='var(--shadow)';
      card.innerHTML=origHTML;
      const p2=document.getElementById('pointProgress'),b2=document.getElementById('pointBar');
      const start=performance.now();
      function tick(now){const t=Math.min(1,(now-start)/dur);const ease=1-Math.pow(1-t,3);const cur=Math.round(from+(to-from)*ease);
        if(p2)p2.textContent='🧠 '+cur+' / 100점';if(b2)b2.style.width=Math.min(100,cur)+'%';if(t<1)requestAnimationFrame(tick);
        else{const btn=document.getElementById('exchangeBtn');if(btn)btn.disabled=to<100}}
      requestAnimationFrame(tick);
    },1200);
  }
}

// ===== COIN SYSTEM (코인 10개 = 토스포인트 1원, 프로모션 검토중) =====
function renderCoins() {
  const c = getCoins();
  const prog = document.getElementById('coinProgress');
  if (prog) prog.textContent = '🪙 ' + c + ' / 10개';
  const bar = document.getElementById('coinBar');
  if (bar) bar.style.width = Math.min(100, (c % 10) / 10 * 100) + '%';
  const btn = document.getElementById('coinExchangeBtn');
  if (btn) btn.disabled = c < 10;
  const disp = document.getElementById('coinDisplay');
  if (disp) disp.textContent = c + '개';
}

async function exchangeCoins() {
  if (getCoins() < 10) { toast('코인 10개 이상부터 교환 가능합니다'); return; }
  // 플레이스홀더: 프로모션 미승인 상태면 안내 메시지만 표시
  if (window.AIT && AIT.CONFIG.PROMO_COIN_EXCHANGE.startsWith('PLACEHOLDER_')) {
    toast('포인트 교환 프로모션을 준비 중이에요. 코인을 모아두세요! 🪙');
    if (window.AIT) AIT.log('coin_exchange_placeholder', { coins: getCoins() });
    return;
  }
  if (window.AIT && !AIT.isToss) { toast('토스 앱에서만 교환 가능합니다'); return; }
  if (_exchangeLock) return;
  _exchangeLock = true;
  const btn = document.getElementById('coinExchangeBtn');
  if (btn) { btn.disabled = true; btn.textContent = '교환 중...'; }
  let exchangeId = null;
  try {
    const uh = await AIT.getUserHash();
    const serverRes = await fetch(`${API_BASE}/api/cashword/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userHash: uh })
    }).then(r => r.json());
    if (serverRes.error) throw new Error(serverRes.error);
    exchangeId = serverRes.exchangeId;
    // 프로모션 지급 (코드 승인 후 자동 활성화)
    const ok = await AIT.checkPromoCoinExchange();
    if (ok) {
      await fetch(`${API_BASE}/api/cashword/exchange/${exchangeId}/confirm`, { method: 'POST' }).catch(() => {});
      const newCoins = Math.max(0, getCoins() - 10);
      LS.set('coins', newCoins);
      renderCoins();
      toast('교환 완료! 토스포인트 1원이 지급됐어요 🎉');
      AIT.log('coin_exchange_success', { coins: 10, points: 1, userHash: uh });
    } else {
      await fetch(`${API_BASE}/api/cashword/exchange/${exchangeId}/restore`, { method: 'POST' }).catch(() => {});
      toast('교환에 실패했습니다. 다시 시도해주세요.');
    }
  } catch (e) {
    if (exchangeId) {
      await fetch(`${API_BASE}/api/cashword/exchange/${exchangeId}/restore`, { method: 'POST' }).catch(() => {});
    }
    console.error('Coin exchange failed:', e);
    const msg = e.message === 'insufficient_coins' ? '코인이 부족합니다' : '교환에 실패했습니다. 다시 시도해주세요.';
    toast(msg);
  } finally {
    _exchangeLock = false;
    if (btn) { btn.disabled = getCoins() < 10; btn.textContent = '교환하기'; }
  }
}

// ===== TOAST & SNACKBAR =====
let toastT;
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),500)}
let snackT;function snackbar(html,dur=500){const el=document.getElementById('snackbar');document.getElementById('snackbar-inner').innerHTML=html;el.classList.add('show');clearTimeout(snackT);snackT=setTimeout(()=>el.classList.remove('show'),dur)}

// ===== STREAK =====
function getStreak(){
  const hist=LS.getJSON('playDates',[]);
  const today=getDayKey();
  if(!hist.length)return{streak:0,playedToday:false};
  let streak=0;
  const now=new Date();const kst=new Date(now.getTime()+9*60*60*1000);
  if(kst.getUTCHours()<9)kst.setUTCDate(kst.getUTCDate()-1);
  for(let i=0;i<30;i++){
    const ds=kst.toISOString().slice(0,10);
    if(hist.includes(ds)){streak++;kst.setUTCDate(kst.getUTCDate()-1)}else break;
  }
  return{streak,playedToday:hist.includes(today)};
}
function recordPlay(){
  const today=getDayKey();
  const hist=LS.getJSON('playDates',[]);
  if(!hist.includes(today)){hist.push(today);LS.setJSON('playDates',hist)}
}

function floatCoin(x,y){
  const el=document.createElement('div');el.className='coin-float';el.textContent='+';
  el.style.left=x+'px';el.style.top=y+'px';
  document.body.appendChild(el);setTimeout(()=>el.remove(),1000);
}

function doubleCoins(){
  if(!pendingCoins)return;
  showAd(()=>{
    addCoins(pendingCoins); // add same amount again = 2x
    document.getElementById('r-coin-new').textContent='+'+pendingCoins*2+' (2배!)';
    toast('코인 2배! +'+pendingCoins*2);
    for(let i=0;i<5;i++){setTimeout(()=>floatCoin(window.innerWidth/2-12+Math.random()*40-20,window.innerHeight/2),i*100)}
    pendingCoins=0;
  });
}

// ===== MISSIONS & HISTORY =====
function getTodayChallenges(){
  const today=getDayKey();
  let challenges=LS.getJSON('challenges-'+today,null);
  if(challenges&&(challenges.length!==5||challenges.every(m=>m.target<=10)||!challenges[0].gameId||challenges[0].type)){challenges=null;localStorage.removeItem('bf-challenges-'+today)}
  if(!challenges){
    // 오늘의 운동 게임 하드 제외
    const todayWorkout=LS.getJSON('workout-'+today,null);
    const workoutIds=new Set(todayWorkout?.games||[]);

    // 최근 3일간 챌린지 게임 소프트 제외
    const recentIds=new Set();
    const kst=new Date(new Date().getTime()+9*60*60*1000);
    if(kst.getUTCHours()<9)kst.setUTCDate(kst.getUTCDate()-1);
    for(let i=1;i<=3;i++){
      kst.setUTCDate(kst.getUTCDate()-1);
      const past=LS.getJSON('challenges-'+kst.toISOString().slice(0,10),null);
      if(past)past.forEach(m=>{if(m.gameId)recentIds.add(m.gameId)});
    }

    const gameChallenges=GAMES.map(g=>{
      const best=LS.get(g.id+'-best',0);
      const target=best>0?Math.ceil(best*1.03):(g.goalDefault||50);
      return {id:'goal-'+g.id,gameId:g.id,name:g.name,desc:`${target}점 이상 달성`,target,best,xp:20,icon:'●',bg:g.color,progress:0,done:false};
    });

    // 운동 게임 제외 후 최근 챌린지 게임도 제외한 것 우선, 부족하면 최근 챌린지 게임 보충
    const noWorkout=gameChallenges.filter(m=>!workoutIds.has(m.gameId));
    const preferred=noWorkout.filter(m=>!recentIds.has(m.gameId));
    const pool=preferred.length>=5?preferred:[...preferred,...noWorkout.filter(m=>recentIds.has(m.gameId))];

    const shuffled=[...pool].sort(()=>Math.random()-.5);
    challenges=shuffled.slice(0,5);
    LS.setJSON('challenges-'+today,challenges);
  }
  return challenges;
}
function updateChallenge(gameId,score,extra={}){
  const today=getDayKey();
  const challenges=LS.getJSON('challenges-'+today,[]);
  let completed=[];
  challenges.forEach(m=>{
    if(m.done)return;
    if(m.gameId===gameId&&score>=m.target){m.progress=score;m.done=true;completed.push(m);addPoints(1)}
  });
  LS.setJSON('challenges-'+today,challenges);
  const allDone=challenges.every(m=>m.done);
  const bonusKey='challenge-bonus-'+today;
  if(allDone&&!LS.get(bonusKey)){LS.set(bonusKey,1);addPoints(2)}
  return completed;
}
function recordDailyScore(score){
  const today=getDayKey();
  const hist=LS.getJSON('scoreHist',{});
  hist[today]=Math.max(hist[today]||0,score);
  LS.setJSON('scoreHist',hist);
}
