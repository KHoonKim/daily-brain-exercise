// ===== 20. MATCH PAIR - 짝 맞추기 =====
let mpScore,mpTime,mpPairs,mpSel,mpMatched;
const MP_DB=[
  ['학교:배움터','산:높은 땅','강:흐르는 물','해:바다','풍:바람'],
  ['화:불','수:물','목:나무','금:쇠','토:흙'],
  ['일:하나','이:둘','삼:셋','사:넷','오:다섯'],
  ['춘:봄','하:여름','추:가을','동:겨울','야:밤'],
  ['천:하늘','지:땅','인:사람','산:뫼','해:바다'],
  ['대:크다','소:작다','장:길다','단:짧다','고:높다'],
  ['동:동쪽','서:서쪽','남:남쪽','북:북쪽','중:가운데'],
  ['생:살다','사:죽다','래:오다','거:가다','식:먹다'],
];
function initMatchpair(){mpScore=0;mpTime=30;mpMatched=[];mpSel=null;
document.getElementById('mp-score').textContent='0점';document.getElementById('mp-timer').textContent='30s';document.getElementById('mp-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(mpTick,1000);mpGen()}
function mpTick(){mpTime--;document.getElementById('mp-timer').textContent=mpTime+'s';if(mpTime<=10)document.getElementById('mp-timer').className='g-timer urgent';if(mpTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{mpTime=s;document.getElementById('mp-timer').textContent=mpTime+'s';document.getElementById('mp-timer').className='g-timer';curTimer=setInterval(mpTick,1000);mpGen()});showResult(mpScore,'짝 맞추기',[{val:mpMatched.length,label:'맞춘 수'}], {_isTimerEnd:true})}}
function mpGen(){mpSel=null;mpMatched=[];const set=MP_DB[~~(Math.random()*MP_DB.length)];
mpPairs=set.map(s=>{const[k,v]=s.split(':');return{k,v}}).sort(()=>Math.random()-.5).slice(0,5);
const left=[...mpPairs].sort(()=>Math.random()-.5);
const right=[...mpPairs].sort(()=>Math.random()-.5);
document.getElementById('mp-left').innerHTML=left.map(p=>`<div class="mp-item" data-k="${p.k}" onclick="mpTap(this,'left','${p.k}')">${p.k}</div>`).join('');
document.getElementById('mp-right').innerHTML=right.map(p=>`<div class="mp-item" data-v="${p.k}" onclick="mpTap(this,'right','${p.k}')">${p.v}</div>`).join('')}
function mpTap(el,side,key){if(el.classList.contains('ok'))return;
document.querySelectorAll(`.mp-item.sel`).forEach(e=>{if(e.parentElement===el.parentElement)e.classList.remove('sel')});
el.classList.add('sel');
const otherSide=side==='left'?'right':'left';
const otherSel=document.querySelector(`#mp-${otherSide} .mp-item.sel`);
if(!otherSel)return;
const leftKey=side==='left'?key:otherSel.dataset.k;
const rightKey=side==='right'?key:otherSel.dataset.v;
if(leftKey===rightKey){el.classList.remove('sel');el.classList.add('ok');otherSel.classList.remove('sel');otherSel.classList.add('ok');
mpScore+=15;mpMatched.push(leftKey);setScore('mp-score',mpScore);toast('✓ 맞음!');
if(mpMatched.length>=5){mpScore+=Math.max(0,mpTime*2);setScore('mp-score',mpScore);scheduleNextQuestion(mpGen,600)}}
else{el.classList.add('no');otherSel.classList.add('no');setTimeout(()=>{el.classList.remove('sel','no');otherSel.classList.remove('sel','no')},500)}}
