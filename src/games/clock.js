// ===== 26. CLOCK =====
let clkScore,clkRound,clkTime,clkQTimer,clkQTime,clkQLimit;
function initClock(){clkScore=0;clkRound=0;clkTime=30;document.getElementById('clk-score').textContent='0점';initHearts('clk');
document.getElementById('clk-round').textContent='30s';document.getElementById('clk-round').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{clkTime--;document.getElementById('clk-round').textContent=clkTime+'s';
if(clkTime<=10)document.getElementById('clk-round').className='g-timer urgent';
if(clkTime<=0){clearInterval(curTimer);clearInterval(clkQTimer);showResult(clkScore,'시계 읽기',[], {_isTimerEnd:true})}},1000);clkNext()}
function clkNext(){clkRound++;
const h=~~(Math.random()*12)+1,m=[0,5,10,15,20,25,30,35,40,45,50,55][~~(Math.random()*12)];
const cv=document.getElementById('clk-canvas'),ctx=cv.getContext('2d'),cx=120,cy=120,r=95;
ctx.clearRect(0,0,240,240);
ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--card').trim()||'#fff';ctx.fill();ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#ddd';ctx.lineWidth=3;ctx.stroke();
for(let i=1;i<=12;i++){const a=(i/12)*Math.PI*2-Math.PI/2;ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text').trim()||'#333';ctx.font='bold 16px Pretendard,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i,cx+Math.cos(a)*75,cy+Math.sin(a)*75)}
for(let i=0;i<60;i++){const a=(i/60)*Math.PI*2;const inner=i%5===0?82:87;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);ctx.lineTo(cx+Math.cos(a)*90,cy+Math.sin(a)*90);ctx.strokeStyle=i%5===0?'var(--text,#333)':'var(--border,#ccc)';ctx.lineWidth=i%5===0?2:1;ctx.stroke()}
const ha=(h%12+m/60)/12*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ha)*50,cy+Math.sin(ha)*50);ctx.strokeStyle='var(--text,#333)';ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();
const ma=m/60*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ma)*70,cy+Math.sin(ma)*70);ctx.strokeStyle='var(--p,#3182F6)';ctx.lineWidth=3;ctx.stroke();
ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle='var(--text,#333)';ctx.fill();
const answer=h+':'+(m<10?'0':'')+m;const opts=new Set([answer]);
while(opts.size<4){const rh=~~(Math.random()*12)+1,rm=[0,5,10,15,20,25,30,35,40,45,50,55][~~(Math.random()*12)];opts.add(rh+':'+(rm<10?'0':'')+rm)}
document.getElementById('clk-opts').innerHTML=[...opts].sort(()=>Math.random()-.5).map(o=>`<div class="clk-opt" onclick="clkPick(this,'${o}','${answer}')">${o}</div>`).join('');
clkQLimit=Math.max(2.5, 5.0 - clkRound*0.15);
clkQTime=clkQLimit;clearInterval(clkQTimer);
const qbar=document.getElementById('clk-qbar');if(qbar){qbar.style.transition='none';qbar.style.width='100%';requestAnimationFrame(()=>{qbar.style.transition=`width ${clkQLimit}s linear`;qbar.style.width='0%'})}
clkQTimer=setInterval(()=>{clkQTime-=0.1;if(clkQTime<=0){clearInterval(clkQTimer);curScore=clkScore;if(loseHeart('clk'))return;setTimeout(clkNext,300)}},100)}
function clkPick(el,v,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;
clearInterval(clkQTimer);
if(v===ans){el.classList.add('ok');const pct=clkQTime/clkQLimit;const bonus=pct>.75?5:pct>.5?3:1;clkScore+=10+bonus;setScore('clk-score',clkScore)}
else{el.classList.add('no');document.querySelectorAll('.clk-opt').forEach(o=>{if(o.textContent===ans)o.classList.add('ok')});
curScore=clkScore;if(loseHeart('clk'))return}
setTimeout(clkNext,800)}
