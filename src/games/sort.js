// ===== 37. SORT - 카테고리 분류 =====
let stScore,stTime,stCatA,stCatB,stItems,stAns,stCombo=0,stSwaps=0;
const SORT_CATS=[
{name:'과일',items:['사과','배','포도','수박','딸기','복숭아','감','귤']},
{name:'동물',items:['강아지','고양이','토끼','코끼리','사자','호랑이','곰','여우']},
{name:'색깔',items:['빨강','파랑','노랑','초록','보라','주황','분홍','하양']},
{name:'나라',items:['한국','일본','미국','영국','프랑스','중국','독일','호주']},
{name:'음식',items:['김치','불고기','피자','햄버거','라면','초밥','파스타','떡볶이']},
{name:'악기',items:['피아노','기타','바이올린','드럼','플루트','첼로','하프','트럼펫']},
{name:'스포츠',items:['축구','야구','농구','테니스','수영','골프','탁구','배구']},
{name:'탈것',items:['자동차','버스','기차','비행기','배','자전거','택시','오토바이']}];
function initSort(){stScore=0;stTime=30;stCombo=0;stSwaps=0;document.getElementById('st-score').textContent='0점';
document.getElementById('st-timer').textContent='30s';document.getElementById('st-timer').className='g-timer';
const pair=[...SORT_CATS].sort(()=>Math.random()-.5).slice(0,2);stCatA=pair[0];stCatB=pair[1];
document.getElementById('st-cat1').textContent=stCatA.name;document.getElementById('st-cat2').textContent=stCatB.name;
document.getElementById('st-btn1').textContent=stCatA.name;document.getElementById('st-btn2').textContent=stCatB.name;
clearInterval(curTimer);curTimer=setInterval(stTick,1000);stGen()}
function stTick(){stTime--;document.getElementById('st-timer').textContent=stTime+'s';if(stTime<=10)document.getElementById('st-timer').className='g-timer urgent';if(stTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{stTime=s;document.getElementById('st-timer').textContent=stTime+'s';document.getElementById('st-timer').className='g-timer';curTimer=setInterval(stTick,1000);stGen()});showResult(stScore,'카테고리 분류',[], {_isTimerEnd:true})}}
function stGen(){stAns=Math.random()<.5?0:1;
const cat=stAns===0?stCatA:stCatB;
document.getElementById('st-word').textContent=cat.items[~~(Math.random()*cat.items.length)]}
function stPick(idx){if(idx===stAns){stCombo++;stScore+=10+(stCombo>=5?10:0);setScore('st-score',stScore);
if(stCombo>=8&&stSwaps<3){stSwaps++;const pair=[...SORT_CATS].sort(()=>Math.random()-.5).slice(0,2);stCatA=pair[0];stCatB=pair[1];
document.getElementById('st-cat1').textContent=stCatA.name;document.getElementById('st-cat2').textContent=stCatB.name;
document.getElementById('st-btn1').textContent=stCatA.name;document.getElementById('st-btn2').textContent=stCatB.name;
stCombo=0;toast('카테고리 변경!')}}
else{stCombo=0;stScore=Math.max(0,stScore-5);setScore('st-score',stScore)}
scheduleNextQuestion(stGen,250)}
