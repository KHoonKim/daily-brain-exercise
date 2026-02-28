// ===== 31. N-BACK - 같거나 다르거나 =====
let nbScore,nbRound,nbPrev,nbCur,nbAnswered,nbTime,nbQTimer;
const NB_ITEMS=['A','B','C','D','E','1','2','3','4','5'];
function initNback(){nbScore=0;nbRound=0;nbPrev=null;nbAnswered=false;nbTime=30;
document.getElementById('nb-score').textContent='0점';document.getElementById('nb-round').textContent='30s';
clearInterval(curTimer);curTimer=setInterval(nbTick,1000);nbNext()}
function nbTick(){nbTime--;document.getElementById('nb-round').textContent=nbTime+'s';if(nbTime<=10)document.getElementById('nb-round').className='g-timer urgent';if(nbTime<=0){clearInterval(curTimer);clearInterval(nbQTimer);setTimeExtendResumeCallback((s)=>{nbTime=s;document.getElementById('nb-round').textContent=nbTime+'s';document.getElementById('nb-round').className='g-timer';curTimer=setInterval(nbTick,1000);nbNext()});showResult(nbScore,'같거나 다르거나',[], {_isTimerEnd:true})}}
function nbStartQBar(){const b=document.getElementById('nb-qbar');if(!b)return;b.style.transition='none';b.style.width='100%';b.offsetWidth;b.style.transition='width 3s linear';b.style.width='0%';document.getElementById('nb-q-time').textContent='3.0s'}
function nbStopQBar(){const b=document.getElementById('nb-qbar');if(!b)return;b.style.transition='none';b.style.width='0%';document.getElementById('nb-q-time').textContent=''}
function nbNext(){nbRound++;nbAnswered=false;clearInterval(nbQTimer);
const same=nbPrev!==null&&Math.random()<.35;
nbCur=same?nbPrev:NB_ITEMS.filter(x=>x!==nbPrev)[~~(Math.random()*(NB_ITEMS.length-1))];
document.getElementById('nb-card').textContent=nbCur;
document.getElementById('nb-card').style.borderColor='var(--border)';
if(nbPrev===null){nbStopQBar();document.getElementById('nb-msg').textContent='첫 번째 카드를 기억하세요!';setTimeout(()=>{nbAnswered=true;nbPrev=nbCur;scheduleNextQuestion(nbNext,400)},1000);return}
document.getElementById('nb-msg').textContent='이전 카드와 같으면 O, 다르면 X';
nbStartQBar();let nbQElapsed=0;
nbQTimer=setInterval(()=>{nbQElapsed+=100;document.getElementById('nb-q-time').textContent=Math.max(0,(3000-nbQElapsed)/1000).toFixed(1)+'s';if(nbQElapsed>=3000){clearInterval(nbQTimer);if(nbAnswered)return;nbAnswered=true;nbStopQBar();nbScore=Math.max(0,nbScore-5);setScore('nb-score',nbScore);document.getElementById('nb-card').style.borderColor='var(--no)';toast('시간 초과! -5점');nbPrev=nbCur;scheduleNextQuestion(nbNext,600)}},100)}
function nbPick(isSame){if(nbAnswered)return;nbAnswered=true;clearInterval(nbQTimer);nbStopQBar();
const correct=(nbPrev!==null&&isSame&&nbCur===nbPrev)||(!isSame&&(nbPrev===null||nbCur!==nbPrev));
if(correct){nbScore+=10;setScore('nb-score',nbScore);
document.getElementById('nb-card').style.borderColor='var(--ok)';toast('정답!')}
else{nbScore=Math.max(0,nbScore-5);setScore('nb-score',nbScore);document.getElementById('nb-card').style.borderColor='var(--no)';toast('-5점')}
nbPrev=nbCur;scheduleNextQuestion(nbNext,600)}
