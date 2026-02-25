// ===== 35. CALCCOMP =====
let cc2Score,cc2Time,cc2ValA,cc2ValB;
function initCalccomp(){cc2Score=0;cc2Time=30;document.getElementById('cc2-score').textContent='0점';initHearts('cc2');
document.getElementById('cc2-timer').textContent='30s';document.getElementById('cc2-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{cc2Time--;document.getElementById('cc2-timer').textContent=cc2Time+'s';
if(cc2Time<=10)document.getElementById('cc2-timer').className='g-timer urgent';
if(cc2Time<=0){clearInterval(curTimer);showResult(cc2Score,'계산 비교',[], {_isTimerEnd:true})}},1000);cc2Gen()}
function cc2Gen(){function mkExpr(){const ops=['+','-','×'];const op=ops[~~(Math.random()*3)];
let a=2+~~(Math.random()*15),b=2+~~(Math.random()*15),val;
if(op==='×'){a=2+~~(Math.random()*9);b=2+~~(Math.random()*9);val=a*b}
else if(op==='-'){if(b>a)[a,b]=[b,a];val=a-b}else{val=a+b}
return {text:a+' '+op+' '+b,val}}
const exA=mkExpr(),exB=mkExpr();
if(exA.val===exB.val)exB.val++;
cc2ValA=exA.val;cc2ValB=exB.val;
document.getElementById('cc2-a').textContent=exA.text;document.getElementById('cc2-b').textContent=exB.text;
document.getElementById('cc2-a').style.borderColor='var(--border)';document.getElementById('cc2-b').style.borderColor='var(--border)'}
function cc2Pick(side){const correct=(side==='left'&&cc2ValA>cc2ValB)||(side==='right'&&cc2ValB>cc2ValA);
const el=document.getElementById(side==='left'?'cc2-a':'cc2-b');
if(correct){el.style.borderColor='var(--ok)';cc2Score+=10;setScore('cc2-score',cc2Score);toast('정답!')}
else{el.style.borderColor='var(--no)';curScore=cc2Score;if(loseHeart('cc2'))return}
setTimeout(cc2Gen,400)}
