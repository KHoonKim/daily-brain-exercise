// ===== 30. MEMGRID =====
let mgScore,mgLv,mgCells,mgPhase;
function initMemgrid(){mgScore=0;mgLv=1;document.getElementById('mg-score').textContent='0점';document.getElementById('mg-level').textContent='Lv.1';initHearts('mg');mgRound()}
function mgRound(){mgPhase='show';const size=mgLv<=2?3:mgLv<=5?4:5;const count=mgLv+2;
document.getElementById('mg-msg').textContent='칸을 기억하세요!';
const total=size*size;mgCells=[];while(mgCells.length<count){const r=~~(Math.random()*total);if(!mgCells.includes(r))mgCells.push(r)}
const g=document.getElementById('mg-grid');g.style.gridTemplateColumns=`repeat(${size},50px)`;
g.innerHTML=Array.from({length:total},(_,i)=>`<div class="mg-cell" data-i="${i}" style="width:50px;height:50px;border-radius:8px;background:${mgCells.includes(i)?'var(--p)':'var(--border)'};cursor:pointer;transition:background .2s"></div>`).join('');
setTimeout(()=>{if(mgPhase!=='show')return;mgPhase='input';document.getElementById('mg-msg').textContent='기억한 칸을 터치하세요!';
g.querySelectorAll('.mg-cell').forEach(c=>{c.style.background='var(--border)';c.onclick=()=>mgTap(c)})},1200+count*200)}
function mgTap(c){if(mgPhase!=='input')return;const i=+c.dataset.i;
if(mgCells.includes(i)){c.style.background='var(--ok)';c.onclick=null;mgCells=mgCells.filter(x=>x!==i);mgScore+=10;
setScore('mg-score',mgScore);
if(mgCells.length===0){mgLv++;document.getElementById('mg-level').textContent='Lv.'+mgLv;toast('레벨 업!');setTimeout(mgRound,500)}}
else{c.style.background='var(--no)';curScore=mgScore;if(loseHeart('mg'))return;setTimeout(mgRound,800)}}
