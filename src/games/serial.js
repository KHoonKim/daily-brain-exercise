// ===== 33. SERIAL - 연속 빼기 =====
let srScore,srTime,srNum,srSub;
function initSerial(){srScore=0;srTime=30;srNum=100;srSub=3+~~(Math.random()*6);
document.getElementById('sr-score').textContent='0점';document.getElementById('sr-timer').textContent='30s';document.getElementById('sr-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(srTick,1000);srGen()}
function srTick(){srTime--;document.getElementById('sr-timer').textContent=srTime+'s';if(srTime<=10)document.getElementById('sr-timer').className='g-timer urgent';if(srTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{srTime=s;document.getElementById('sr-timer').textContent=srTime+'s';document.getElementById('sr-timer').className='g-timer';curTimer=setInterval(srTick,1000);srGen()});showResult(srScore,'연속 빼기',[], {_isTimerEnd:true})}}
function srGen(){document.getElementById('sr-q').textContent=`−${srSub}을(를) 계속 빼세요`;
document.getElementById('sr-num').textContent=srNum;
const ans=srNum-srSub;const opts=new Set([ans]);
while(opts.size<6){opts.add(ans+~~(Math.random()*7)-3)}
const arr=[...opts].filter(v=>v>=0).slice(0,6);if(!arr.includes(ans)){arr[0]=ans}
arr.sort((a,b)=>a-b);
document.getElementById('sr-opts').innerHTML=arr.map(n=>`<div class="bc-opt" onclick="srPick(this,${n},${ans})">${n}</div>`).join('')}
function srPick(el,n,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;
document.querySelectorAll('#sr-opts .bc-opt').forEach(o=>o.style.pointerEvents='none');
if(n===ans){el.classList.add('ok');srScore+=10;srNum=ans;setScore('sr-score',srScore);toast('정답!');
if(srNum<=0){srNum=100;srSub=3+~~(Math.random()*6);srScore+=20;toast('+20 보너스! 새 시작')}}
else{el.classList.add('no');document.querySelectorAll('#sr-opts .bc-opt').forEach(o=>{if(+o.textContent===ans)o.classList.add('ok')})}
scheduleNextQuestion(srGen,500)}
