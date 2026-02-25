// ===== 21. HEAD COUNT =====
let hcScore,hcRound,hcCount,hcAnim,hcTime;
const HC_CHAR='<img src="char-40.png" style="width:100%;height:100%">';
function initHeadcount(){hcScore=0;hcRound=0;document.getElementById('hc-score').textContent='0점';
document.getElementById('hc-round').textContent='Lv.1';document.getElementById('hc-round').className='g-timer';
initHearts('hc');hcNext()}
function hcNext(){hcRound++;
document.getElementById('hc-round').textContent='Lv.'+hcRound;
hcCount=0;const steps=3+Math.min(hcRound,7);const events=[];
for(let i=0;i<steps;i++){
const canExit=hcCount>0&&Math.random()<.4;
if(canExit){events.push(-1);hcCount--}else{events.push(1);hcCount++}
}
document.getElementById('hc-log').textContent='';document.getElementById('hc-opts').innerHTML='';
document.getElementById('hc-msg').textContent='지켜보세요...';
document.getElementById('hc-counter').textContent='';
const stage=document.getElementById('hc-stage');
stage.querySelectorAll('.hc-person').forEach(p=>p.remove());
let i=0;hcAnim=setInterval(()=>{
if(i<events.length){const e=events[i];const p=document.createElement('div');
p.className='hc-person';p.innerHTML=HC_CHAR;
stage.appendChild(p);
if(e>0){p.classList.add('enter');document.getElementById('hc-log').textContent='입장';document.getElementById('hc-log').style.color='var(--ok)'}
else{p.classList.add('exit');document.getElementById('hc-log').textContent='퇴장';document.getElementById('hc-log').style.color='var(--no)'}
setTimeout(()=>p.remove(),750);
i++}else{clearInterval(hcAnim);
document.getElementById('hc-log').textContent='';document.getElementById('hc-msg').textContent='건물 안에 몇 명?';
document.getElementById('hc-counter').textContent='?';
const opts=[];for(let n=Math.max(0,hcCount-2);opts.length<5;n++)opts.push(n);
if(!opts.includes(hcCount))opts[~~(Math.random()*5)]=hcCount;
document.getElementById('hc-opts').innerHTML=opts.map(n=>`<div class="hc-opt" onclick="hcPick(this,${n},${hcCount})">${n}</div>`).join('')}
},900)}
function hcPick(el,n,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;
document.querySelectorAll('.hc-opt').forEach(o=>o.style.pointerEvents='none');
if(n===ans){el.classList.add('ok');hcScore+=10+hcRound*2;setScore('hc-score',hcScore);toast('정답!');setTimeout(hcNext,800)}
else{el.classList.add('no');document.querySelectorAll('.hc-opt').forEach(o=>{if(+o.textContent===ans)o.classList.add('ok')});
curScore=hcScore;if(loseHeart('hc'))return;setTimeout(hcNext,800)}}
