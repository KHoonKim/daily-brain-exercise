// ===== 22. PYRAMID =====
let pyrScore,pyrRound,pyrAnswer,pyrTime;
function initPyramid(){pyrScore=0;pyrRound=0;pyrTime=30;document.getElementById('pyr-score').textContent='0점';initHearts('pyr');
document.getElementById('pyr-round').textContent='30s';
clearInterval(curTimer);curTimer=setInterval(()=>{pyrTime--;document.getElementById('pyr-round').textContent=pyrTime+'s';
if(pyrTime<=10)document.getElementById('pyr-round').className='g-timer urgent';
if(pyrTime<=0){clearInterval(curTimer);showResult(pyrScore,'피라미드 연산',[], {_isTimerEnd:true})}},1000);pyrNext()}
function pyrNext(){pyrRound++;
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
el.appendChild(inp)}
function pyrPick(v){const blank=document.getElementById('pyr-blank');if(!blank)return;
blank.textContent=v;
if(v===pyrAnswer){blank.classList.remove('blank');blank.style.borderColor='var(--ok)';blank.style.background='var(--ok-bg)';
pyrScore+=10;setScore('pyr-score',pyrScore);toast('정답!')}
else{blank.style.borderColor='var(--no)';blank.style.background='var(--no-bg)';
setTimeout(()=>{blank.textContent=pyrAnswer;blank.style.borderColor='var(--ok)';blank.style.background='var(--ok-bg)'},400);
curScore=pyrScore;if(loseHeart('pyr'))return}
setTimeout(pyrNext,900)}
