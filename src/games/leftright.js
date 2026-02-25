// ===== 34. LEFTRIGHT =====
let lrScore,lrTime,lrAns,lrTotal=0,lrQTimer,lrQTime,lrQLimit;
function initLeftright(){lrScore=0;lrTime=30;document.getElementById('lr-score').textContent='0점';initHearts('lr');
document.getElementById('lr-timer').textContent='30s';document.getElementById('lr-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{lrTime--;document.getElementById('lr-timer').textContent=lrTime+'s';
if(lrTime<=10)document.getElementById('lr-timer').className='g-timer urgent';
if(lrTime<=0){clearInterval(curTimer);showResult(lrScore,'좌우 판단',[], {_isTimerEnd:true})}},1000);lrGen()}
function lrGen(){const isLeft=Math.random()<.5;const rot=[0,90,180,270][~~(Math.random()*4)];
const isPalm=Math.random()<.5;
lrAns=isLeft?'left':'right';
const hand=document.getElementById('lr-hand');
const flipX=isPalm?!isLeft:isLeft;
const detail=isPalm?
`<path d="M30 55c10 3 20 3 30 0" stroke="var(--sub)" stroke-width="1" opacity=".5"/><path d="M28 65c12 2 22 2 32 0" stroke="var(--sub)" stroke-width="1" opacity=".5"/>`:
`<path d="M32 22c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M42 18c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M52 20c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/><path d="M62 26c0 1.5 1 2.5 2.5 2.5" stroke="var(--sub)" stroke-width="1.5"/>`;
const thumbColor='var(--text)';
if(hand) {
  hand.innerHTML=`<div style="display:inline-block;position:relative"><svg viewBox="0 0 80 100" fill="none" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:140px;height:175px;transform:rotate(${rot}deg) ${flipX?'scaleX(-1)':''}">
  <path d="M25 90c-8 0-12-5-12-14V42"/><path d="M60 90c8 0 10-6 10-14V38"/><path d="M25 90h35"/>
  <path d="M25 42V20c0-3 2-5 5-5s5 2 5 5v22"/><path d="M35 40V16c0-3 2-5 5-5s5 2 5 5v24"/>
  <path d="M45 42V18c0-3 2-5 5-5s5 2 5 5v24"/><path d="M55 44V24c0-3 2-5 5-5s5 2 5 5v20"/>
  <path d="M25 55c-4 0-10-2-15-2c-4 0-6 2-6 5s2 5 6 5c5 0 11 0 15 0" stroke-width="3" fill="${thumbColor}" fill-opacity=".2" stroke="${thumbColor}"/>
  \${detail}</svg>
  <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--sub);white-space:nowrap;background:var(--bg);padding:2px 10px;border-radius:var(--r-full)">\${isPalm?'손바닥':'손등'}</div></div>`;
}
document.getElementById('lr-msg').textContent=rot===0?'이 손은?':'돌아간 이 손은?'}
function lrPick(d){if(d===lrAns){lrScore+=10;setScore('lr-score',lrScore);toast('정답!')}
else{curScore=lrScore;if(loseHeart('lr'))return}
setTimeout(lrGen,300)}
