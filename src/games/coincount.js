// ===== 25. COIN COUNT =====
let ccScore,ccTime,ccTotal;
const COINS=[{val:10,color:'#B87333',label:'10'},{val:50,color:'#C0C0C0',label:'50'},{val:100,color:'#FFD700',label:'100'},{val:500,color:'#E8E8E8',label:'500'}];
function initCoincount(){ccScore=0;ccTime=30;ccTotal=0;document.getElementById('cc-score').textContent='0점';initHearts('cc');
document.getElementById('cc-timer').textContent='30s';document.getElementById('cc-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{ccTime--;document.getElementById('cc-timer').textContent=ccTime+'s';
if(ccTime<=10)document.getElementById('cc-timer').className='g-timer urgent';
if(ccTime<=0){clearInterval(curTimer);showResult(ccScore,'동전 세기',[{val:ccTotal,label:'문제 수'}], {_isTimerEnd:true})}},1000);ccGen()}
function ccGen(){const count=Math.min(10,3+~~(ccTotal/3)+~~(Math.random()*2));const coins=Array.from({length:count},()=>COINS[~~(Math.random()*4)]);
const total=coins.reduce((s,c)=>s+c.val,0);
document.getElementById('cc-coins').innerHTML=coins.map(c=>`<div class="cc-coin" style="background:${c.color}">${c.label}원</div>`).join('');
const opts=new Set([total]);while(opts.size<4){opts.add(total+~~(Math.random()*201)-100)}
opts.delete(total-total);if(opts.size<4)opts.add(total+50);
const optArr=[...opts].filter(v=>v>0).slice(0,4).sort(()=>Math.random()-.5);
if(!optArr.includes(total)){optArr[0]=total;optArr.sort(()=>Math.random()-.5)}
document.getElementById('cc-opts').innerHTML=optArr.map(v=>`<div class="cc-opt" onclick="ccPick(this,${v},${total})">${v}원</div>`).join('')}
function ccPick(el,v,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;ccTotal++;
if(v===ans){el.classList.add('ok');ccScore+=10;setScore('cc-score',ccScore);toast('정답!')}
else{el.classList.add('no');document.querySelectorAll('.cc-opt').forEach(o=>{if(o.textContent===ans+'원')o.classList.add('ok')});
curScore=ccScore;if(loseHeart('cc'))return}
setTimeout(ccGen,700)}
