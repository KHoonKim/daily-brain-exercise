// ===== STATE =====
let curGame=null,curTimer=null,curScore=0,replayCount=0;

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
function addXP(n){const xp=getXP()+n;LS.set('xp',xp);if(window.AIT && AIT.checkPromoBrainAge50)AIT.checkPromoBrainAge50(xp);return xp}
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

// ===== TOAST & SNACKBAR =====
let toastT;
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2000)}
let snackT;function snackbar(html,dur=2500){const el=document.getElementById('snackbar');document.getElementById('snackbar-inner').innerHTML=html;el.classList.add('show');clearTimeout(snackT);snackT=setTimeout(()=>el.classList.remove('show'),dur)}

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
    // Float coins animation
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
      const defaults={math:80,memory:60,reaction:200,stroop:80,sequence:50,word:60,pattern:60,focus:80,rotate:60,reverse:50,numtouch:200,rhythm:40,rps:80,oddone:80,compare:80,bulb:50,colormix:60,wordcomp:60,timing:60,matchpair:100,headcount:60,pyramid:60,maxnum:80,signfind:80,coincount:60,clock:60,wordmem:60,blockcount:60,flanker:80,memgrid:50,nback:80,scramble:60,serial:80,leftright:80,calccomp:60,flash:40,sort:60,mirror:50};
      const target=best>0?Math.round(best*1.05):(defaults[g.id]||50);
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
