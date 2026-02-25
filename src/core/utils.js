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
