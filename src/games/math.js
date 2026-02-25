// ===== GAME 1: MATH =====
let mathScore,mathCombo,mathTime,mathAnswer,mathInput,mathTotal,mathMaxCombo;
function initMath(){
  mathScore=0;mathCombo=0;mathTime=30;mathInput='';mathTotal=0;mathMaxCombo=0;
  document.getElementById('math-score').textContent='0점';document.getElementById('math-combo').textContent='';
  initHearts('math');mathGen();clearInterval(curTimer);mathUpdateT();
  curTimer=setInterval(()=>{mathTime--;mathUpdateT();if(mathTime<=0){clearInterval(curTimer);showResult(mathScore,'암산 챌린지',[{val:mathTotal,label:'문제 수'},{val:mathMaxCombo+'x',label:'최대 콤보'}],{combo:mathMaxCombo, _isTimerEnd:true})}},1000);
}
function mathUpdateT(){const el=document.getElementById('math-timer');el.textContent=mathTime+'s';el.className=mathTime<=10?'g-timer urgent':'g-timer'}
function mathGen(){
  const mx=Math.min(10+Math.floor(mathScore/3)*5,99);
  const ops=mathScore<5?['+','-']:['+','-','×'];
  const op=ops[~~(Math.random()*ops.length)];let a,b;
  if(op==='×'){a=~~(Math.random()*12)+2;b=~~(Math.random()*12)+2;mathAnswer=a*b}
  else if(op==='-'){a=~~(Math.random()*mx)+1;b=~~(Math.random()*a)+1;mathAnswer=a-b}
  else{a=~~(Math.random()*mx)+1;b=~~(Math.random()*mx)+1;mathAnswer=a+b}
  document.getElementById('math-a').textContent=a;document.getElementById('math-b').textContent=b;
  document.getElementById('math-op').textContent=op;mathInput='';document.getElementById('math-ans').textContent='?';
}
function mathPress(n){mathInput+=n;document.getElementById('math-ans').textContent=mathInput}
function mathDel(){mathInput=mathInput.slice(0,-1);document.getElementById('math-ans').textContent=mathInput||'?'}
function mathSubmit(){
  if(!mathInput)return;mathTotal++;const p=document.getElementById('math-problem');
  if(parseInt(mathInput)===mathAnswer){mathScore+=(mathCombo>=5?30:mathCombo>=3?20:10);mathCombo++;mathMaxCombo=Math.max(mathMaxCombo,mathCombo);p.classList.add('ok');if(mathCombo%5===0){mathTime=Math.min(mathTime+3,99);const te=document.getElementById('math-timer');te.textContent='+3초!';te.style.cssText='color:#10B981;font-size:22px;font-weight:900;transform:scale(1.3)';setTimeout(()=>{te.style.cssText='';mathUpdateT()},800)}}
  else{mathCombo=0;p.classList.add('no');curScore=mathScore;if(loseHeart('math'))return}
  setScore('math-score',mathScore);
  const mc=document.getElementById('math-combo');
  if(mathCombo>=2){mc.textContent=mathCombo+'콤보!'+(mathCombo>=5?' ×3':mathCombo>=3?' ×2':'');mc.style.cssText='transform:scale(1.4);transition:transform .15s';setTimeout(()=>mc.style.cssText='transition:transform .2s',150)}
  else{mc.textContent='';mc.style.cssText=''}
  if(mathCombo>0&&mathCombo%5===0){mc.textContent=mathCombo+'콤보! +3초 보너스!';mc.style.cssText='transform:scale(1.5);color:#10B981;font-size:18px;transition:transform .15s';setTimeout(()=>mc.style.cssText='transition:transform .3s',300)}
  setTimeout(()=>p.classList.remove('ok','no'),200);mathGen();
}
