// ===== 22. PYRAMID - 피라미드 연산 =====
let pyrScore,pyrRound,pyrAnswer,pyrTime,pyrQTimer,pyrAnswered;
function initPyramid(){pyrScore=0;pyrRound=0;pyrTime=30;document.getElementById('pyr-score').textContent='0점';initHearts('pyr');
document.getElementById('pyr-round').textContent='30s';
clearInterval(curTimer);setTickFn(pyrTick);curTimer=setInterval(pyrTick,1000);pyrNext()}
function pyrTick(){pyrTime--;document.getElementById('pyr-round').textContent=pyrTime+'s';if(pyrTime<=10)document.getElementById('pyr-round').className='g-timer urgent';if(pyrTime<=0){clearInterval(curTimer);clearInterval(pyrQTimer);setTimeExtendResumeCallback((s)=>{pyrTime=s;document.getElementById('pyr-round').textContent=pyrTime+'s';document.getElementById('pyr-round').className='g-timer';curTimer=setInterval(pyrTick,1000);pyrNext()});showResult(pyrScore,'피라미드 연산',[], {_isTimerEnd:true})}}
function pyrStartQBar(){const b=document.getElementById('pyr-qbar');if(!b)return;b.style.transition='none';b.style.width='100%';b.offsetWidth;b.style.transition='width 5s linear';b.style.width='0%';document.getElementById('pyr-q-time').textContent='5.0s'}
function pyrStopQBar(){const b=document.getElementById('pyr-qbar');if(!b)return;b.style.transition='none';b.style.width='0%';document.getElementById('pyr-q-time').textContent=''}
function pyrNext(){pyrRound++;pyrAnswered=false;clearInterval(pyrQTimer);
document.getElementById('pyr-round').textContent=pyrRound+'/10';
const sz=pyrRound<=3?3:pyrRound<=7?4:5;
const base=Array.from({length:sz},()=>1+~~(Math.random()*(pyrRound<=3?9:pyrRound<=6?15:20)));
const rows=[base];for(let r=1;r<sz;r++){const prev=rows[r-1];rows.push(prev.slice(0,-1).map((v,i)=>v+prev[i+1]))}
rows.reverse();
const blankR=~~(Math.random()*(rows.length-1));const blankC=~~(Math.random()*rows[blankR].length);
pyrAnswer=rows[blankR][blankC];
const el=document.getElementById('pyr-grid');el.innerHTML='';
rows.forEach((row,r)=>{const rowEl=document.createElement('div');rowEl.className='pyr-row';
row.forEach((v,c)=>{const cell=document.createElement('div');
if(r===blankR&&c===blankC){cell.className='pyr-cell blank';cell.textContent='?';cell.id='pyr-blank'}
else{cell.className='pyr-cell fixed';cell.textContent=v}
rowEl.appendChild(cell)});el.appendChild(rowEl)});
const opts=new Set([pyrAnswer]);while(opts.size<4){opts.add(pyrAnswer+~~(Math.random()*7)-3)}
const optArr=[...opts].sort(()=>Math.random()-.5);
const inp=document.createElement('div');inp.className='pyr-input';
optArr.forEach(v=>{const b=document.createElement('button');b.className='pyr-btn';b.textContent=v;b.onclick=()=>pyrPick(v);inp.appendChild(b)});
el.appendChild(inp);
pyrStartQBar();let pyrQElapsed=0;
pyrQTimer=setInterval(()=>{pyrQElapsed+=100;document.getElementById('pyr-q-time').textContent=Math.max(0,(5000-pyrQElapsed)/1000).toFixed(1)+'s';if(pyrQElapsed>=5000){clearInterval(pyrQTimer);if(pyrAnswered)return;pyrAnswered=true;pyrStopQBar();const blank=document.getElementById('pyr-blank');if(blank){blank.textContent=pyrAnswer;blank.style.borderColor='var(--no)';blank.style.background='var(--no-bg)'}toast('시간 초과!');curScore=pyrScore;setHeartResumeCallback(pyrNext);if(loseHeart('pyr'))return;scheduleNextQuestion(pyrNext,900)}},100)}
function pyrPick(v){if(pyrAnswered)return;pyrAnswered=true;clearInterval(pyrQTimer);pyrStopQBar();
const blank=document.getElementById('pyr-blank');if(!blank)return;
blank.textContent=v;
if(v===pyrAnswer){blank.classList.remove('blank');blank.style.borderColor='var(--ok)';blank.style.background='var(--ok-bg)';
pyrScore+=10;setScore('pyr-score',pyrScore);toast('정답!')}
else{blank.style.borderColor='var(--no)';blank.style.background='var(--no-bg)';
setTimeout(()=>{blank.textContent=pyrAnswer;blank.style.borderColor='var(--ok)';blank.style.background='var(--ok-bg)'},400);
curScore=pyrScore;setHeartResumeCallback(pyrNext);if(loseHeart('pyr'))return}
scheduleNextQuestion(pyrNext,900)}
