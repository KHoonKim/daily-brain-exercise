// ===== 29. FLANKER - 방향 맞추기 =====
let fkScore,fkTime,fkAns,fkLevel=0;
function initFlanker(){fkScore=0;fkTime=30;document.getElementById('fk-score').textContent='0점';initHearts('fk');
document.getElementById('fk-timer').textContent='30s';document.getElementById('fk-timer').className='g-timer';
clearInterval(curTimer);setTickFn(fkTick);curTimer=setInterval(fkTick,1000);fkGen()}
function fkTick(){fkTime--;document.getElementById('fk-timer').textContent=fkTime+'s';if(fkTime<=10)document.getElementById('fk-timer').className='g-timer urgent';if(fkTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{fkTime=s;document.getElementById('fk-timer').textContent=fkTime+'s';document.getElementById('fk-timer').className='g-timer';curTimer=setInterval(fkTick,1000);fkGen()});showResult(fkScore,'방향 맞추기',[], {_isTimerEnd:true})}}
function fkGen(){const dirs=['←','→','↑','↓'];
const useDirs=fkLevel<5?['←','→']:fkLevel<10?['←','→','↑']:dirs;
const dir=useDirs[~~(Math.random()*useDirs.length)];
let distract;do{distract=useDirs[~~(Math.random()*useDirs.length)]}while(distract===dir);
const sideCount=fkLevel<3?2:fkLevel<7?3:4;
const birdSvg=(d)=>{const rot=d==='→'?0:d==='←'?180:d==='↑'?-90:90;
return `<svg viewBox="0 0 50 30" style="width:50px;height:30px;transform:rotate(${rot}deg)" fill="var(--text)" stroke="none">
<polygon points="50,15 40,12 40,0 35,10 5,10 0,0 5,15 0,30 5,20 35,20 40,30 40,18"/>
</svg>`};
const sides=Array(sideCount).fill(birdSvg(distract)).join('');
document.getElementById('fk-display').innerHTML=sides+birdSvg(dir)+sides;
fkAns=dir==='←'?'left':dir==='→'?'right':dir==='↑'?'up':'down';fkLevel++}
function fkPick(d){if(d===fkAns){fkScore+=10;setScore('fk-score',fkScore);toast('정답!')}
else{curScore=fkScore;setHeartResumeCallback(fkGen);if(loseHeart('fk'))return}
scheduleNextQuestion(fkGen,300)}
