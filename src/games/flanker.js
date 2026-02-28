// ===== 29. FLANKER - 방향 맞추기 =====
let fkScore,fkTime,fkAns,fkLevel,fkQInterval;
function initFlanker(){fkScore=0;fkTime=30;fkLevel=0;document.getElementById('fk-score').textContent='0점';initHearts('fk');
document.getElementById('fk-timer').textContent='30s';document.getElementById('fk-timer').className='g-timer';
clearInterval(curTimer);clearInterval(fkQInterval);setTickFn(fkTick);curTimer=setInterval(fkTick,1000);fkGen()}
function fkTick(){fkTime--;document.getElementById('fk-timer').textContent=fkTime+'s';if(fkTime<=10)document.getElementById('fk-timer').className='g-timer urgent';if(fkTime<=0){clearInterval(fkQInterval);clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{fkTime=s;document.getElementById('fk-timer').textContent=fkTime+'s';document.getElementById('fk-timer').className='g-timer';curTimer=setInterval(fkTick,1000);fkGen()});showResult(fkScore,'방향 맞추기',[],{_isTimerEnd:true})}}
function fkGen(){const dirs=['←','→','↑','↓'];
const useDirs=fkLevel<5?['←','→']:fkLevel<10?['←','→','↑']:dirs;
const dir=useDirs[~~(Math.random()*useDirs.length)];
let distract;do{distract=useDirs[~~(Math.random()*useDirs.length)]}while(distract===dir);
const sideCount=fkLevel<3?2:fkLevel<7?3:4;
const planeImg=(d)=>{const rot=d==='→'?0:d==='←'?180:d==='↑'?-90:90;return `<img src="airplane.png" style="width:44px;height:44px;object-fit:contain;transform:rotate(${rot}deg);vertical-align:middle;">`};
const randDir=()=>useDirs[~~(Math.random()*useDirs.length)];
const sides=Array.from({length:sideCount},()=>planeImg(randDir())).join('');
document.getElementById('fk-display').innerHTML=sides+planeImg(dir)+sides;
fkAns=dir==='←'?'left':dir==='→'?'right':dir==='↑'?'up':'down';fkLevel++;
const qTime=Math.max(3.0-(fkLevel-1)*0.1,0.5);let elapsed=0;
clearInterval(fkQInterval);const bar=document.getElementById('fk-qbar');if(bar)bar.style.width='100%';
fkQInterval=setInterval(()=>{elapsed+=50;const pct=Math.max(0,100-(elapsed/(qTime*1000))*100);if(bar)bar.style.width=pct+'%';if(elapsed>=qTime*1000){clearInterval(fkQInterval);curScore=fkScore;setHeartResumeCallback(fkGen);if(loseHeart('fk'))return;scheduleNextQuestion(fkGen,300)}},50)}
function fkPick(d){clearInterval(fkQInterval);if(d===fkAns){fkScore+=10;setScore('fk-score',fkScore);toast('정답!')}
else{curScore=fkScore;setHeartResumeCallback(fkGen);if(loseHeart('fk'))return}
scheduleNextQuestion(fkGen,300)}
