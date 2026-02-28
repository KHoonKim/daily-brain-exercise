// ===== 28. BLOCK COUNT - 블록 세기 =====
let bcScore,bcRound,bcQTimer,bcQTime,bcQLimit;
function initBlockcount(){bcScore=0;bcRound=0;document.getElementById('bc-score').textContent='0점';document.getElementById('bc-round').textContent='1라운드';initHearts('bc');bcNext()}
function bcNext(){bcRound++;
const maxH=bcRound<=3?4:bcRound<=6?5:6;const cols=bcRound<=3?3:bcRound<=6?4:5;
const grid=[[]];let total=0;
for(let c=0;c<cols;c++){const h=1+~~(Math.random()*maxH);grid[0][c]=h;total+=h}
const cv=document.getElementById('bc-canvas'),ctx=cv.getContext('2d');
cv.width=280;cv.height=220;ctx.clearRect(0,0,280,220);
const bw=Math.min(50,Math.floor((260-cols*6)/cols)),gap=6;
const totalW=cols*bw+(cols-1)*gap;const startX=(280-totalW)/2;const baseY=210;const bh=32;
const hues=[210,150,35,340,270,100];
for(let c=0;c<cols;c++){const h=grid[0][c];const hue=hues[c%6];
for(let k=0;k<h;k++){const x=startX+c*(bw+gap),y=baseY-(k+1)*bh;
ctx.fillStyle=`hsl(${hue},55%,62%)`;ctx.beginPath();ctx.roundRect(x,y,bw,bh-2,4);ctx.fill();
ctx.fillStyle=`hsl(${hue},55%,72%)`;ctx.fillRect(x+2,y+2,bw-4,6);
ctx.strokeStyle='rgba(0,0,0,.1)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,bw,bh-2,4);ctx.stroke()}}
const opts=new Set([total]);while(opts.size<5){opts.add(total+~~(Math.random()*7)-3)}
const optArr=[...opts].filter(v=>v>0).slice(0,5).sort((a,b)=>a-b);
if(!optArr.includes(total)){optArr[0]=total;optArr.sort((a,b)=>a-b)}
document.getElementById('bc-opts').innerHTML=optArr.map(n=>`<div class="bc-opt" onclick="bcPick(this,${n},${total})">${n}</div>`).join('');
document.getElementById('bc-round').textContent=bcRound+'라운드';
bcQLimit=Math.max(1.5,8.0-(bcRound-1)*0.2);bcQTime=bcQLimit;clearInterval(bcQTimer);
const bcbar=document.getElementById('bc-qbar');if(bcbar){bcbar.style.transition='none';bcbar.style.width='100%';bcbar.offsetWidth;bcbar.style.transition=`width ${bcQLimit}s linear`;bcbar.style.width='0%'}
const bcqt=document.getElementById('bc-q-time');if(bcqt)bcqt.textContent=bcQLimit.toFixed(1)+'s';
bcQTimer=setInterval(()=>{bcQTime-=0.1;const qt=document.getElementById('bc-q-time');if(qt)qt.textContent=Math.max(0,bcQTime).toFixed(1)+'s';if(bcQTime<=0){clearInterval(bcQTimer);curScore=bcScore;setHeartResumeCallback(bcNext);if(loseHeart('bc'))return;scheduleNextQuestion(bcNext,300)}},100)}
function bcPick(el,n,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;clearInterval(bcQTimer);
document.querySelectorAll('.bc-opt').forEach(o=>o.style.pointerEvents='none');
if(n===ans){el.classList.add('ok');bcScore+=10;setScore('bc-score',bcScore);toast('정답!')}
else{el.classList.add('no');document.querySelectorAll('.bc-opt').forEach(o=>{if(+o.textContent===ans)o.classList.add('ok')});
curScore=bcScore;setHeartResumeCallback(bcNext);if(loseHeart('bc'))return}
scheduleNextQuestion(bcNext,600)}
