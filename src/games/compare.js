// ===== 15. COMPARE - 크다작다 =====
let cmpScore,cmpTime,cmpTotal,cmpA,cmpB,cmpMode,cmpQTimer,cmpQTime,cmpLastMode,cmpQLimit;
function initCompare(){cmpScore=0;cmpTime=30;cmpTotal=0;cmpLastMode=null;document.getElementById('cmp-score').textContent='0점';initHearts('cmp');
document.getElementById('cmp-timer').textContent='30s';document.getElementById('cmp-timer').className='g-timer';
clearInterval(curTimer);setTickFn(cmpTick);curTimer=setInterval(cmpTick,1000);cmpGen()}
function cmpTick(){cmpTime--;document.getElementById('cmp-timer').textContent=cmpTime+'s';if(cmpTime<=10)document.getElementById('cmp-timer').className='g-timer urgent';if(cmpTime<=0){clearInterval(curTimer);clearInterval(cmpQTimer);setTimeExtendResumeCallback((s)=>{cmpTime=s;document.getElementById('cmp-timer').textContent=cmpTime+'s';document.getElementById('cmp-timer').className='g-timer';curTimer=setInterval(cmpTick,1000);cmpGen()});showResult(cmpScore,'크다작다',[{val:cmpTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function cmpGen(){const d=cmpTotal<5?10:cmpTotal<10?50:cmpTotal<20?200:500;
do{cmpA=~~(Math.random()*d)+1;cmpB=~~(Math.random()*d)+1}while(cmpA===cmpB);
cmpMode=(cmpLastMode&&Math.random()<.7)?(cmpLastMode==='big'?'small':'big'):(Math.random()<.5?'big':'small');
cmpLastMode=cmpMode;
const qEl = document.getElementById('cmp-q');
if(qEl) {
  qEl.textContent=cmpMode==='big'?'큰 수를 터치!':'작은 수를 터치!';
  qEl.style.color=cmpMode==='big'?'var(--p)':'var(--no)';
}
const aEl = document.getElementById('cmp-a');
const bEl = document.getElementById('cmp-b');
if(aEl) { aEl.textContent=cmpA; aEl.style.opacity='1'; }
if(bEl) { bEl.textContent=cmpB; bEl.style.opacity='1'; }
cmpQLimit=Math.max(1.0, 2.0 - cmpTotal*0.05);
cmpQTime=cmpQLimit;clearInterval(cmpQTimer);
const bar=document.getElementById('cmp-qbar');if(bar){bar.style.transition='none';bar.style.width='100%';bar.offsetWidth;bar.style.transition=`width ${cmpQLimit}s linear`;bar.style.width='0%'}
cmpQTimer=setInterval(()=>{cmpQTime-=0.1;if(cmpQTime<=0){clearInterval(cmpQTimer);cmpTotal++;curScore=cmpScore;setHeartResumeCallback(cmpGen);if(loseHeart('cmp'))return;scheduleNextQuestion(cmpGen,300)}},100)}
function cmpPick(choice){clearInterval(cmpQTimer);cmpTotal++;
const pickedBig=(choice==='left'&&cmpA>cmpB)||(choice==='right'&&cmpB>cmpA);
const correct=(cmpMode==='big'&&pickedBig)||(cmpMode==='small'&&!pickedBig);
const picked=choice==='left'?'cmp-a':'cmp-b',other=choice==='left'?'cmp-b':'cmp-a';
if(correct){document.getElementById(other).style.opacity='.3';const pct=cmpQTime/cmpQLimit;const bonus=pct>.75?5:pct>.5?3:1;cmpScore+=10+bonus;setScore('cmp-score',cmpScore)}
else{document.getElementById(picked).style.opacity='.3';curScore=cmpScore;setHeartResumeCallback(cmpGen);if(loseHeart('cmp'))return}
scheduleNextQuestion(cmpGen,400)}
