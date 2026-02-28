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
  ['육:여섯','칠:일곱','팔:여덟','구:아홉','십:열'],
  ['부:아버지','모:어머니','형:형','제:동생','자:아들'],
  ['두:머리','수:손','족:발','목:눈','이:귀'],
  ['백:흰색','흑:검은색','청:푸른색','적:붉은색','황:노란색'],
  ['조:아침','주:낮','석:저녁','야:밤','시:때'],
  ['왕:임금','민:백성','신:신하','국:나라','가:집'],
  ['문:문','창:창문','실:방','옥:집','교:다리'],
  ['명:밝다','암:어둡다','강:강하다','약:약하다','고:괴롭다'],
  ['전:앞','후:뒤','좌:왼쪽','우:오른쪽','내:안'],
  ['외:밖','상:위','하:아래','중:가운데','간:사이'],
  ['천:천','만:만','억:억','조:조','경:경'],
  ['남:남자','녀:여자','노:늙다','소:젊다','아:아이'],
  ['우:비','설:눈','운:구름','로:이슬','상:서리'],
  ['신:새롭다','구:옛날','유:있다','무:없다','정:바르다'],
  ['심:마음','성:성품','기:기운','혈:피','골:뼈'],
  ['금:금','은:은','동:구리','석:돌','옥:구슬'],
  ['화:꽃','엽:잎','과:열매','종:씨앗','근:뿌리'],
  ['우:소','마:말','양:양','견:개','조:새'],
  ['언:말씀','어:말','독:읽다','서:쓰다','문:글'],
  ['시:시장','농:농사','공:장인','상:장사','병:병사'],
];
function initMatchpair(){mpScore=0;mpTime=30;mpMatched=[];mpSel=null;
document.getElementById('mp-score').textContent='0점';document.getElementById('mp-timer').textContent='30s';document.getElementById('mp-timer').className='g-timer';
initHearts('mp');clearInterval(curTimer);curTimer=setInterval(mpTick,1000);mpGen()}
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
else{el.classList.add('no');otherSel.classList.add('no');setTimeout(()=>{el.classList.remove('sel','no');otherSel.classList.remove('sel','no')},500);curScore=mpScore;setHeartResumeCallback(()=>mpGen());if(loseHeart('mp'))return;}}
