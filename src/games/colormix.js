// ===== 17. COLOR MIX - 색깔 조합 =====
let cmxScore,cmxRound,cmxQTimer,cmxQTime,cmxQLimit,cmxTime,cmxQueue;
const CMIX=[
  {a:{name:'빨강',hex:'#F04452'},b:{name:'파랑',hex:'#3182F6'},result:{name:'보라',hex:'#8B5CF6'},wrong:[{name:'초록',hex:'#1FC58E'},{name:'주황',hex:'#F97316'},{name:'갈색',hex:'#92400E'}]},
  {a:{name:'빨강',hex:'#F04452'},b:{name:'노랑',hex:'#FBBF24'},result:{name:'주황',hex:'#F97316'},wrong:[{name:'초록',hex:'#1FC58E'},{name:'보라',hex:'#8B5CF6'},{name:'갈색',hex:'#92400E'}]},
  {a:{name:'파랑',hex:'#3182F6'},b:{name:'노랑',hex:'#FBBF24'},result:{name:'초록',hex:'#1FC58E'},wrong:[{name:'보라',hex:'#8B5CF6'},{name:'주황',hex:'#F97316'},{name:'갈색',hex:'#92400E'}]},
  {a:{name:'빨강',hex:'#F04452'},b:{name:'초록',hex:'#1FC58E'},result:{name:'갈색',hex:'#92400E'},wrong:[{name:'보라',hex:'#8B5CF6'},{name:'주황',hex:'#F97316'},{name:'노랑',hex:'#FBBF24'}]},
  {a:{name:'빨강',hex:'#F04452'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'분홍',hex:'#FB7185'},wrong:[{name:'보라',hex:'#8B5CF6'},{name:'주황',hex:'#F97316'},{name:'갈색',hex:'#92400E'}]},
  {a:{name:'파랑',hex:'#3182F6'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'하늘',hex:'#7DD3FC'},wrong:[{name:'초록',hex:'#1FC58E'},{name:'보라',hex:'#8B5CF6'},{name:'분홍',hex:'#FB7185'}]},
  {a:{name:'검정',hex:'#333'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'회색',hex:'#9CA3AF'},wrong:[{name:'갈색',hex:'#92400E'},{name:'보라',hex:'#8B5CF6'},{name:'하늘',hex:'#7DD3FC'}]},
  {a:{name:'보라',hex:'#8B5CF6'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'연보라',hex:'#DDD6FE'},wrong:[{name:'분홍',hex:'#FB7185'},{name:'하늘',hex:'#7DD3FC'},{name:'회색',hex:'#9CA3AF'}]},
  {a:{name:'주황',hex:'#F97316'},b:{name:'검정',hex:'#333333'},result:{name:'고동색',hex:'#7C2D12'},wrong:[{name:'갈색',hex:'#92400E'},{name:'진녹색',hex:'#064E3B'},{name:'보라',hex:'#8B5CF6'}]},
  {a:{name:'빨강',hex:'#F04452'},b:{name:'회색',hex:'#9CA3AF'},result:{name:'인디핑크',hex:'#FDA4AF'},wrong:[{name:'보라',hex:'#8B5CF6'},{name:'주황',hex:'#F97316'},{name:'분홍',hex:'#FB7185'}]},
  {a:{name:'노랑',hex:'#FBBF24'},b:{name:'파랑',hex:'#3182F6'},result:{name:'청록',hex:'#0D9488'},wrong:[{name:'연두',hex:'#A3E635'},{name:'보라',hex:'#8B5CF6'},{name:'남색',hex:'#1E3A8A'}]},
  {a:{name:'초록',hex:'#1FC58E'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'민트',hex:'#99F6E4'},wrong:[{name:'연두',hex:'#A3E635'},{name:'하늘',hex:'#7DD3FC'},{name:'노랑',hex:'#FBBF24'}]},
  {a:{name:'갈색',hex:'#92400E'},b:{name:'흰색',hex:'#E5E5E5'},result:{name:'베이지',hex:'#FDE68A'},wrong:[{name:'회색',hex:'#9CA3AF'},{name:'살구',hex:'#FFEDD5'},{name:'연두',hex:'#A3E635'}]},
  {a:{name:'자주',hex:'#BE185D'},b:{name:'파랑',hex:'#3182F6'},result:{name:'남보라',hex:'#4C1D95'},wrong:[{name:'검정',hex:'#333333'},{name:'진녹색',hex:'#064E3B'},{name:'청록',hex:'#0D9488'}]},
  {a:{name:'하늘',hex:'#7DD3FC'},b:{name:'노랑',hex:'#FBBF24'},result:{name:'옥색',hex:'#CCFBF1'},wrong:[{name:'연두',hex:'#A3E635'},{name:'보라',hex:'#8B5CF6'},{name:'분홍',hex:'#FB7185'}]},
  {a:{name:'빨강',hex:'#F04452'},b:{name:'노랑',hex:'#FBBF24'},result:{name:'다홍',hex:'#FB923C'},wrong:[{name:'주황',hex:'#F97316'},{name:'분홍',hex:'#FB7185'},{name:'갈색',hex:'#92400E'}]},
  {a:{name:'청록',hex:'#0D9488'},b:{name:'검정',hex:'#333333'},result:{name:'심해색',hex:'#134E4A'},wrong:[{name:'남색',hex:'#1E3A8A'},{name:'고동색',hex:'#7C2D12'},{name:'회색',hex:'#9CA3AF'}]},
];
function cmxShuffle(){cmxQueue=[...CMIX].sort(()=>Math.random()-.5)}
function initColormix(){cmxScore=0;cmxRound=0;cmxTime=30;cmxShuffle();document.getElementById('cmx-score').textContent='0점';initHearts('cmx');
document.getElementById('cmx-round').textContent='30s';
clearInterval(curTimer);setTickFn(cmxTick);curTimer=setInterval(cmxTick,1000);cmxNext()}
function cmxTick(){cmxTime--;document.getElementById('cmx-round').textContent=cmxTime+'s';if(cmxTime<=10)document.getElementById('cmx-round').className='g-timer urgent';if(cmxTime<=0){clearInterval(curTimer);clearInterval(cmxQTimer);setTimeExtendResumeCallback((s)=>{cmxTime=s;document.getElementById('cmx-round').textContent=cmxTime+'s';document.getElementById('cmx-round').className='g-timer';curTimer=setInterval(cmxTick,1000);cmxNext()});showResult(cmxScore,'색깔 조합',[], {_isTimerEnd:true})}}
function cmxNext(){cmxRound++;
document.getElementById('cmx-round').textContent=cmxRound+'/10';
if(!cmxQueue||cmxQueue.length===0)cmxShuffle();const q=cmxQueue.pop();
const chip=(c,sz=40)=>`<span style="display:inline-block;width:${sz}px;height:${sz}px;border-radius:50%;background:${c.hex};vertical-align:middle;box-shadow:0 2px 6px ${c.hex}44"></span>`;
document.getElementById('cmx-q').innerHTML=`<div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:8px">${chip(q.a,48)}<span style="font-size:28px;font-weight:800;color:var(--sub)">+</span>${chip(q.b,48)}</div><div style="font-size:15px;color:var(--sub)">${q.a.name} + ${q.b.name} = ?</div>`;
const opts=[q.result,...q.wrong.sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
document.getElementById('cmx-opts').innerHTML=opts.map(o=>`<div class="cmx-opt" data-name="${o.name}" onclick="cmxPick(this,'${o.name}','${q.result.name}')" style="background:var(--card)"><div>${chip(o,36)}</div><div style="font-size:13px;margin-top:6px;font-weight:600">${o.name}</div></div>`).join('');
cmxQLimit=Math.max(1.0,3.0-(cmxRound-1)*0.1);cmxQTime=cmxQLimit;clearInterval(cmxQTimer);
const cmxbar=document.getElementById('cmx-qbar');if(cmxbar){cmxbar.style.transition='none';cmxbar.style.width='100%';cmxbar.offsetWidth;cmxbar.style.transition=`width ${cmxQLimit}s linear`;cmxbar.style.width='0%'}const cmxqt=document.getElementById('cmx-q-time');if(cmxqt)cmxqt.textContent=cmxQLimit.toFixed(1)+'s';
cmxQTimer=setInterval(()=>{cmxQTime-=0.1;document.getElementById('cmx-q-time').textContent=Math.max(0,cmxQTime).toFixed(1)+'s';if(cmxQTime<=0){clearInterval(cmxQTimer);curScore=cmxScore;setHeartResumeCallback(cmxNext);if(loseHeart('cmx'))return;scheduleNextQuestion(cmxNext,300)}},100)}
function cmxPick(el,picked,answer){if(el.classList.contains('ok')||el.classList.contains('no'))return;clearInterval(cmxQTimer);
if(picked===answer){el.classList.add('ok');const pct=cmxQTime/cmxQLimit;const bonus=pct>.75?5:pct>.5?3:1;cmxScore+=10+bonus;setScore('cmx-score',cmxScore)}
else{el.classList.add('no');document.querySelectorAll('.cmx-opt').forEach(o=>{if(o.dataset.name===answer)o.classList.add('ok')});curScore=cmxScore;setHeartResumeCallback(cmxNext);if(loseHeart('cmx'))return}
scheduleNextQuestion(cmxNext,800)}
