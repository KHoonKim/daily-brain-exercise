// ===== 13. RPS - 두뇌 가위바위보 =====
let rpsScore,rpsTime,rpsTotal,rpsMode,rpsCur;
const RPS_HANDS=['바위','보','가위'];
function initRps(){rpsScore=0;rpsTime=30;rpsTotal=0;document.getElementById('rps-score').textContent='0점';initHearts('rps');
document.getElementById('rps-timer').textContent='30s';document.getElementById('rps-timer').className='g-timer';
clearInterval(curTimer);setTickFn(rpsTick);curTimer=setInterval(rpsTick,1000);rpsGen()}
function rpsTick(){rpsTime--;document.getElementById('rps-timer').textContent=rpsTime+'s';if(rpsTime<=10)document.getElementById('rps-timer').className='g-timer urgent';if(rpsTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{rpsTime=s;document.getElementById('rps-timer').textContent=rpsTime+'s';document.getElementById('rps-timer').className='g-timer';curTimer=setInterval(rpsTick,1000);rpsGen()});showResult(rpsScore,'두뇌 가위바위보',[{val:rpsTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function rpsGen(){rpsCur=~~(Math.random()*3);rpsMode=Math.random()<.5?'win':'lose';
document.getElementById('rps-enemy').textContent=RPS_HANDS[rpsCur];
document.getElementById('rps-q').textContent=rpsMode==='win'?'◆ 이기는 것을 내세요!':'💀 지는 것을 내세요!';
document.getElementById('rps-q').style.color=rpsMode==='win'?'var(--ok)':'var(--no)';
document.querySelectorAll('.rps-btn').forEach(b=>{b.className='rps-btn';b.disabled=false})}
function rpsPick(p){rpsTotal++;const win=(p-rpsCur+3)%3===1,lose=(p-rpsCur+3)%3===2;
const correct=(rpsMode==='win'&&win)||(rpsMode==='lose'&&lose);
const btns=document.querySelectorAll('.rps-btn');btns.forEach((b,i)=>b.disabled=true);
btns[p].classList.add(correct?'ok':'no');
if(correct){rpsScore+=10;setScore('rps-score',rpsScore);toast('✓ 정답!')}
else{curScore=rpsScore;setHeartResumeCallback(rpsGen);if(loseHeart('rps'))return}
scheduleNextQuestion(rpsGen,600)}
