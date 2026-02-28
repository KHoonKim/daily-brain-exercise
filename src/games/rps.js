// ===== 13. RPS - 두뇌 가위바위보 =====
let rpsScore,rpsTime,rpsTotal,rpsMode,rpsCur,rpsQTimer,rpsQTime,rpsQLimit;
const RPS_HANDS=['바위','보','가위'];
function initRps(){rpsScore=0;rpsTime=30;rpsTotal=0;rpsQTimer=null;document.getElementById('rps-score').textContent='0점';initHearts('rps');
document.getElementById('rps-timer').textContent='30s';document.getElementById('rps-timer').className='g-timer';
clearInterval(curTimer);setTickFn(rpsTick);curTimer=setInterval(rpsTick,1000);rpsGen()}
function rpsTick(){rpsTime--;document.getElementById('rps-timer').textContent=rpsTime+'s';if(rpsTime<=10)document.getElementById('rps-timer').className='g-timer urgent';if(rpsTime<=0){clearInterval(curTimer);clearInterval(rpsQTimer);setTimeExtendResumeCallback((s)=>{rpsTime=s;document.getElementById('rps-timer').textContent=rpsTime+'s';document.getElementById('rps-timer').className='g-timer';curTimer=setInterval(rpsTick,1000);rpsGen()});showResult(rpsScore,'두뇌 가위바위보',[{val:rpsTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function rpsGen(){rpsCur=~~(Math.random()*3);const r=Math.random();rpsMode=r<.333?'win':r<.666?'lose':'draw';
document.getElementById('rps-enemy').textContent=RPS_HANDS[rpsCur];
const qText=rpsMode==='win'?'🏆 이기는 것을 내세요!':rpsMode==='lose'?'💀 지는 것을 내세요!':'🤝 비기는 것을 내세요!';
const qColor=rpsMode==='win'?'var(--ok)':rpsMode==='lose'?'var(--no)':'var(--tds-yellow)';
document.getElementById('rps-q').textContent=qText;
document.getElementById('rps-q').style.color=qColor;
document.querySelectorAll('.rps-btn').forEach(b=>{b.className='rps-btn';b.disabled=false});
rpsQLimit=Math.max(1.0,3.0-rpsTotal*0.1);rpsQTime=rpsQLimit;clearInterval(rpsQTimer);
const rpsbar=document.getElementById('rps-qbar');if(rpsbar){rpsbar.style.transition='none';rpsbar.style.width='100%';rpsbar.offsetWidth;rpsbar.style.transition=`width ${rpsQLimit}s linear`;rpsbar.style.width='0%'}
const rpsqt=document.getElementById('rps-q-time');if(rpsqt)rpsqt.textContent=rpsQLimit.toFixed(1)+'s';
rpsQTimer=setInterval(()=>{rpsQTime-=0.1;const qt=document.getElementById('rps-q-time');if(qt)qt.textContent=Math.max(0,rpsQTime).toFixed(1)+'s';if(rpsQTime<=0){clearInterval(rpsQTimer);curScore=rpsScore;setHeartResumeCallback(rpsGen);if(loseHeart('rps'))return;scheduleNextQuestion(rpsGen,300)}},100)}
function rpsPick(p){clearInterval(rpsQTimer);rpsTotal++;const win=(p-rpsCur+3)%3===1,lose=(p-rpsCur+3)%3===2,draw=p===rpsCur;
const correct=(rpsMode==='win'&&win)||(rpsMode==='lose'&&lose)||(rpsMode==='draw'&&draw);
const btns=document.querySelectorAll('.rps-btn');btns.forEach((b,i)=>b.disabled=true);
btns[p].classList.add(correct?'ok':'no');
if(correct){rpsScore+=10;setScore('rps-score',rpsScore);toast('✓ 정답!')}
else{curScore=rpsScore;setHeartResumeCallback(rpsGen);if(loseHeart('rps'))return}
scheduleNextQuestion(rpsGen,600)}
