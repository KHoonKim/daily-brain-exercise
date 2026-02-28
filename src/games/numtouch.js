// ===== 11. NUMTOUCH - 넘버 터치 =====
let ntNext,ntStart,ntTimer;
function initNumtouch(){ntNext=1;ntStart=null;ntTimer=null;document.getElementById('nt-score').textContent='0점';document.getElementById('nt-timer').textContent='0.0s';document.getElementById('nt-msg').textContent='1부터 순서대로 터치!';
const nums=Array.from({length:25},(_,i)=>i+1).sort(()=>Math.random()-.5);
document.getElementById('nt-grid').innerHTML=nums.map(n=>`<div class="nt-cell" onclick="ntTap(this,${n})">${n}</div>`).join('')}
function ntTap(el,n){if(n!==ntNext)return;if(!ntStart){ntStart=Date.now();ntTimer=setInterval(()=>{document.getElementById('nt-timer').textContent=((Date.now()-ntStart)/1000).toFixed(1)+'s'},100)}
el.classList.add('done');el.textContent='✓';ntNext++;
if(ntNext>25){clearInterval(ntTimer);const t=((Date.now()-ntStart)/1000).toFixed(1);const score=Math.max(0,Math.round(500-parseFloat(t)*8));setScore('nt-score',score);
showResult(score,'넘버 터치',[{val:t+'초',label:'소요 시간'}])}}
