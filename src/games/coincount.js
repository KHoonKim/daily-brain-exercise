// ===== 25. COIN COUNT - 동전 세기 =====
let ccScore,ccTime,ccTotal;
const COINS=[{val:10,color:'#B87333',label:'10',size:36},{val:50,color:'#C0C0C0',label:'50',size:46},{val:100,color:'#B8B8B8',label:'100',size:56},{val:500,color:'#D8D8D8',label:'500',size:68}];
function initCoincount(){ccScore=0;ccTime=30;ccTotal=0;document.getElementById('cc-score').textContent='0점';initHearts('cc');
document.getElementById('cc-timer').textContent='30s';document.getElementById('cc-timer').className='g-timer';
clearInterval(curTimer);setTickFn(ccTick);curTimer=setInterval(ccTick,1000);ccGen()}
function ccTick(){ccTime--;document.getElementById('cc-timer').textContent=ccTime+'s';if(ccTime<=10)document.getElementById('cc-timer').className='g-timer urgent';if(ccTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{ccTime=s;document.getElementById('cc-timer').textContent=ccTime+'s';document.getElementById('cc-timer').className='g-timer';curTimer=setInterval(ccTick,1000);ccGen()});showResult(ccScore,'동전 세기',[{val:ccTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function ccGen(){const count=Math.min(10,3+~~(ccTotal/3)+~~(Math.random()*2));const coins=Array.from({length:count},()=>COINS[~~(Math.random()*4)]);
const total=coins.reduce((s,c)=>s+c.val,0);
document.getElementById('cc-coins').innerHTML=coins.map(c=>`<div class="cc-coin" style="background:${c.color};width:${c.size}px;height:${c.size}px;font-size:${Math.max(9,c.size/5)}px">${c.label}</div>`).join('');
const opts=new Set([total]);while(opts.size<4){opts.add(total+(~~(Math.random()*21)-10)*10)}
opts.delete(total-total);if(opts.size<4)opts.add(total+50);
const optArr=[...opts].filter(v=>v>0).slice(0,4).sort(()=>Math.random()-.5);
if(!optArr.includes(total)){optArr[0]=total;optArr.sort(()=>Math.random()-.5)}
document.getElementById('cc-opts').innerHTML=optArr.map(v=>`<div class="cc-opt" onclick="ccPick(this,${v},${total})">${v}원</div>`).join('')}
function ccPick(el,v,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;ccTotal++;
if(v===ans){el.classList.add('ok');ccScore+=10;setScore('cc-score',ccScore);toast('정답!')}
else{el.classList.add('no');document.querySelectorAll('.cc-opt').forEach(o=>{if(o.textContent===ans+'원')o.classList.add('ok')});
curScore=ccScore;setHeartResumeCallback(ccGen);if(loseHeart('cc'))return}
scheduleNextQuestion(ccGen,700)}
