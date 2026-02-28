// ===== 24. SIGN FIND - 부호 찾기 =====
let sfScore,sfTime,sfTotal,sfQTimer,sfQTime,sfQLimit;
function initSignfind(){sfScore=0;sfTime=30;sfTotal=0;document.getElementById('sf-score').textContent='0점';initHearts('sf');
document.getElementById('sf-timer').textContent='30s';document.getElementById('sf-timer').className='g-timer';
clearInterval(curTimer);setTickFn(sfTick);curTimer=setInterval(sfTick,1000);sfGen()}
function sfTick(){sfTime--;document.getElementById('sf-timer').textContent=sfTime+'s';if(sfTime<=10)document.getElementById('sf-timer').className='g-timer urgent';if(sfTime<=0){clearInterval(curTimer);clearInterval(sfQTimer);setTimeExtendResumeCallback((s)=>{sfTime=s;document.getElementById('sf-timer').textContent=sfTime+'s';document.getElementById('sf-timer').className='g-timer';curTimer=setInterval(sfTick,1000);sfGen()});showResult(sfScore,'부호 찾기',[{val:sfTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function sfGen(){const ops=['+','-','×','÷'];const op=ops[~~(Math.random()*4)];
const range=sfTotal<5?20:sfTotal<10?50:99;
let a,b,r;
if(op==='+'){a=1+~~(Math.random()*range);b=1+~~(Math.random()*range);r=a+b}
else if(op==='-'){a=2+~~(Math.random()*range);b=1+~~(Math.random()*a);r=a-b}
else if(op==='×'){const mx=sfTotal<5?9:12;a=2+~~(Math.random()*mx);b=2+~~(Math.random()*mx);r=a*b}
else{const mx=sfTotal<5?9:12;b=2+~~(Math.random()*mx);r=2+~~(Math.random()*mx);a=b*r}
document.getElementById('sf-eq').textContent=a+' ? '+b+' = '+r;
document.getElementById('sf-opts').innerHTML=ops.map(o=>`<div class="sf-opt" onclick="sfPick(this,'${o}','${op}')">${o}</div>`).join('');
sfQLimit=Math.max(1.5,3.0-sfTotal*0.06);sfQTime=sfQLimit;clearInterval(sfQTimer);
const sfbar=document.getElementById('sf-qbar');if(sfbar){sfbar.style.transition='none';sfbar.style.width='100%';sfbar.offsetWidth;sfbar.style.transition=`width ${sfQLimit}s linear`;sfbar.style.width='0%'}
sfQTimer=setInterval(()=>{sfQTime-=0.1;if(sfQTime<=0){clearInterval(sfQTimer);sfTotal++;curScore=sfScore;setHeartResumeCallback(sfGen);if(loseHeart('sf'))return;scheduleNextQuestion(sfGen,300)}},100)}
function sfPick(el,picked,answer){if(el.classList.contains('ok')||el.classList.contains('no'))return;clearInterval(sfQTimer);sfTotal++;
if(picked===answer){el.classList.add('ok');const pct=sfQTime/sfQLimit;const bonus=pct>.75?5:pct>.5?3:1;sfScore+=10+bonus;setScore('sf-score',sfScore)}
else{el.classList.add('no');document.querySelectorAll('.sf-opt').forEach(o=>{if(o.textContent===answer)o.classList.add('ok')});
curScore=sfScore;setHeartResumeCallback(sfGen);if(loseHeart('sf'))return}
scheduleNextQuestion(sfGen,500)}
