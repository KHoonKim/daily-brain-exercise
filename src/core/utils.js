// ===== STATE =====
let curGame=null,curTimer=null,curScore=0,replayCount=0;
let curGameContext='free'; // 'workout' | 'challenge' | 'free'
let _lastRenderedPoints=null;
let _exchangeLock=false;

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
function addPoints(n){
  const p=getPoints()+n;LS.set('points',p);
  toast('+'+n+'점 적립!');
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
    if(prog) prog.textContent=p+' / 100점';
    if(bar) bar.style.width=Math.min(100,p)+'%';
  }
  _lastRenderedPoints=p;
  if(btn) btn.disabled=p<100;
}

async function exchangePoints(){
  const p=getPoints();
  if(p<100){toast('100점 이상부터 교환 가능합니다');return}
  if(!AIT.isToss){toast('토스 앱에서만 교환 가능합니다');return}
  if(_exchangeLock){return}
  _exchangeLock=true;
  const btn=document.getElementById('exchangeBtn');
  if(btn){btn.disabled=true;btn.textContent='교환 중...'}
  try {
    const uh=await AIT.getUserHash();
    const serverRes=await fetch(`${API_BASE}/api/score/promo/exchange`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({userHash:uh,points:p})
    }).then(r=>r.json());
    if(serverRes.error){throw new Error(serverRes.error)}
    await AIT.triggerPromo('POINT_100',AIT.CONFIG.PROMO_POINT_100,100);
    LS.set('points',0);renderPoints();
    toast('100원 교환 완료!');
    AIT.log('point_exchange',{amount:p,userHash:uh});
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
        if(p2)p2.textContent=cur+' / 100점';if(b2)b2.style.width=Math.min(100,cur)+'%';if(t<1)requestAnimationFrame(tick);
        else{const btn=document.getElementById('exchangeBtn');if(btn)btn.disabled=to<100}}
      requestAnimationFrame(tick);
    },1200);
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
function getTodayMissions(){
  const today=getDayKey();
  let missions=LS.getJSON('missions-'+today,null);
  if(missions&&(missions.length!==5||missions.every(m=>m.target<=10)||!missions[0].gameId||missions[0].type)){missions=null;localStorage.removeItem('bf-missions-'+today)}
  if(!missions){
    const gameMissions=GAMES.map(g=>{
      const best=LS.get(g.id+'-best',0);
      const target=best>0?Math.round(best*1.05):(g.missionDefault||50);
      return {id:'goal-'+g.id,gameId:g.id,name:g.name,desc:`${target}점 이상 달성`,target,best,xp:20,icon:'●',bg:g.color,progress:0,done:false};
    });
    const shuffled=[...gameMissions].sort(()=>Math.random()-.5);
    missions=shuffled.slice(0,5);
    LS.setJSON('missions-'+today,missions);
  }
  return missions;
}
function updateMission(gameId,score,extra={}){
  const today=getDayKey();
  const missions=LS.getJSON('missions-'+today,[]);
  let completed=[];
  missions.forEach(m=>{
    if(m.done)return;
    if(m.gameId===gameId&&score>=m.target){m.progress=score;m.done=true;completed.push(m);addPoints(1)}
  });
  LS.setJSON('missions-'+today,missions);
  const allDone=missions.every(m=>m.done);
  const bonusKey='mission-bonus-'+today;
  if(allDone&&!LS.get(bonusKey)){LS.set(bonusKey,1);addPoints(2);toast('챌린지 올클리어 보너스 +2점!')}
  return completed;
}
function recordDailyScore(score){
  const today=getDayKey();
  const hist=LS.getJSON('scoreHist',{});
  hist[today]=Math.max(hist[today]||0,score);
  LS.setJSON('scoreHist',hist);
}
