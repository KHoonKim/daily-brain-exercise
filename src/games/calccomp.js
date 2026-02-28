// ===== 35. CALC COMP - 계산 비교 =====
let cc2Score,cc2Time,cc2ValA,cc2ValB,cc2QTimer,cc2QTime,cc2QLimit,cc2Lv,cc2Mode;
function initCalccomp(){cc2Score=0;cc2Time=30;cc2Lv=0;document.getElementById('cc2-score').textContent='0점';initHearts('cc2');
document.getElementById('cc2-timer').textContent='30s';document.getElementById('cc2-timer').className='g-timer';
clearInterval(curTimer);setTickFn(cc2Tick);curTimer=setInterval(cc2Tick,1000);cc2Gen()}
function cc2Tick(){cc2Time--;document.getElementById('cc2-timer').textContent=cc2Time+'s';if(cc2Time<=10)document.getElementById('cc2-timer').className='g-timer urgent';if(cc2Time<=0){clearInterval(curTimer);clearInterval(cc2QTimer);setTimeExtendResumeCallback((s)=>{cc2Time=s;document.getElementById('cc2-timer').textContent=cc2Time+'s';document.getElementById('cc2-timer').className='g-timer';curTimer=setInterval(cc2Tick,1000);cc2Gen()});showResult(cc2Score,'계산 비교',[], {_isTimerEnd:true})}}
function cc2Gen(){function mkExpr(){const ops=['+','-','×'];const op=ops[~~(Math.random()*3)];
let a=2+~~(Math.random()*15),b=2+~~(Math.random()*15),val;
if(op==='×'){a=2+~~(Math.random()*9);b=2+~~(Math.random()*9);val=a*b}
else if(op==='-'){if(b>a)[a,b]=[b,a];val=a-b}else{val=a+b}
return {text:a+' '+op+' '+b,val}}
const exA=mkExpr(),exB=mkExpr();
if(exA.val===exB.val)exB.val++;
cc2ValA=exA.val;cc2ValB=exB.val;
document.getElementById('cc2-a').textContent=exA.text;document.getElementById('cc2-b').textContent=exB.text;
document.getElementById('cc2-a').style.borderColor='var(--border)';document.getElementById('cc2-b').style.borderColor='var(--border)';
cc2Mode=Math.random()<0.5?'big':'small';
const cc2msg=document.getElementById('cc2-msg');if(cc2msg)cc2msg.textContent=cc2Mode==='big'?'더 큰 쪽을 터치!':'더 작은 쪽을 터치!';
cc2QLimit=Math.max(2,6-cc2Lv*0.1);cc2QTime=cc2QLimit;clearInterval(cc2QTimer);
const cc2bar=document.getElementById('cc2-qbar');if(cc2bar){cc2bar.style.transition='none';cc2bar.style.width='100%';cc2bar.offsetWidth;cc2bar.style.transition=`width ${cc2QLimit}s linear`;cc2bar.style.width='0%'}
cc2QTimer=setInterval(()=>{cc2QTime-=0.1;if(cc2QTime<=0){clearInterval(cc2QTimer);setHeartResumeCallback(cc2Gen);curScore=cc2Score;if(loseHeart('cc2'))return;scheduleNextQuestion(cc2Gen,300)}},100)}
function cc2Pick(side){clearInterval(cc2QTimer);const bigger=cc2ValA>cc2ValB?'left':'right';const correct=cc2Mode==='big'?side===bigger:side!==bigger;
const el=document.getElementById(side==='left'?'cc2-a':'cc2-b');
if(correct){el.style.borderColor='var(--ok)';cc2Lv++;cc2Score+=10;setScore('cc2-score',cc2Score);toast('정답!')}
else{el.style.borderColor='var(--no)';setHeartResumeCallback(cc2Gen);curScore=cc2Score;if(loseHeart('cc2'))return}
scheduleNextQuestion(cc2Gen,400)}
