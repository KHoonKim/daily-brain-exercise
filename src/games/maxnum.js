// ===== 23. MAX NUM - 수 찾기 =====
let mxScore,mxTime,mxLv,mxQTimer,mxQTime,mxQLimit;
function initMaxnum(){mxScore=0;mxTime=30;mxLv=1;document.getElementById('mx-score').textContent='0점';initHearts('mn');
document.getElementById('mx-timer').textContent='30s';document.getElementById('mx-timer').className='g-timer';
clearInterval(curTimer);setTickFn(mxTick);curTimer=setInterval(mxTick,1000);mxGen()}
function mxTick(){mxTime--;document.getElementById('mx-timer').textContent=mxTime+'s';if(mxTime<=10)document.getElementById('mx-timer').className='g-timer urgent';if(mxTime<=0){clearInterval(curTimer);clearInterval(mxQTimer);setTimeExtendResumeCallback((s)=>{mxTime=s;document.getElementById('mx-timer').textContent=mxTime+'s';document.getElementById('mx-timer').className='g-timer';curTimer=setInterval(mxTick,1000);mxGen()});showResult(mxScore,'수 찾기',[{val:mxLv-1,label:'클리어'}], {_isTimerEnd:true})}}
function mxGen(){const range=mxLv<=3?50:mxLv<=6?200:999;
const nums=Array.from({length:16},()=>~~(Math.random()*range)+1);
const max=Math.max(...nums);const mode=Math.random()<.5?'max':'min';const target=mode==='max'?max:Math.min(...nums);
document.getElementById('mx-msg').textContent=mode==='max'?'가장 큰 수를 터치!':'가장 작은 수를 터치!';
document.getElementById('mx-grid').innerHTML=nums.map((n,i)=>`<div class="mx-cell" onclick="mxPick(this,${n},${target})">${n}</div>`).join('');
mxQLimit=Math.max(1.5,3.5-mxLv*0.1);mxQTime=mxQLimit;clearInterval(mxQTimer);
const mxbar=document.getElementById('mn-qbar');if(mxbar){mxbar.style.transition='none';mxbar.style.width='100%';mxbar.offsetWidth;mxbar.style.transition=`width ${mxQLimit}s linear`;mxbar.style.width='0%'}
mxQTimer=setInterval(()=>{mxQTime-=0.1;if(mxQTime<=0){clearInterval(mxQTimer);curScore=mxScore;setHeartResumeCallback(mxGen);if(loseHeart('mn'))return;scheduleNextQuestion(mxGen,300)}},100)}
function mxPick(el,n,target){if(n===target){clearInterval(mxQTimer);el.classList.add('ok');const pct=mxQTime/mxQLimit;const bonus=pct>.75?5:pct>.5?3:1;mxScore+=10+mxLv+bonus;mxLv++;
setScore('mx-score',mxScore);scheduleNextQuestion(mxGen,400)}
else{el.classList.add('no');mxScore=Math.max(0,mxScore-3);setScore('mx-score',mxScore)}}
