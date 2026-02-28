// ===== 34. LEFT RIGHT - 좌우 판단 =====
let lrScore,lrTime,lrAns,lrTotal=0,lrQTimer,lrQTime,lrQLimit,lrLv;
function initLeftright(){lrScore=0;lrTime=30;lrLv=0;document.getElementById('lr-score').textContent='0점';initHearts('lr');
document.getElementById('lr-timer').textContent='30s';document.getElementById('lr-timer').className='g-timer';
clearInterval(curTimer);setTickFn(lrTick);curTimer=setInterval(lrTick,1000);lrGen()}
function lrTick(){lrTime--;document.getElementById('lr-timer').textContent=lrTime+'s';if(lrTime<=10)document.getElementById('lr-timer').className='g-timer urgent';if(lrTime<=0){clearInterval(curTimer);clearInterval(lrQTimer);setTimeExtendResumeCallback((s)=>{lrTime=s;document.getElementById('lr-timer').textContent=lrTime+'s';document.getElementById('lr-timer').className='g-timer';curTimer=setInterval(lrTick,1000);lrGen()});showResult(lrScore,'좌우 판단',[], {_isTimerEnd:true})}}
function lrGen(){const isLeft=Math.random()<.5;const rot=[0,90,180,270][~~(Math.random()*4)];
const isPalm=Math.random()<.5;
lrAns=isLeft?'left':'right';
const hand=document.getElementById('lr-hand');
const imgFile=isLeft?(isPalm?'left%20palm.png':'left%20back.png'):(isPalm?'right%20palm.png':'right%20back.png');
if(hand) {
  hand.innerHTML=`<img src="./${imgFile}" style="width:140px;height:175px;object-fit:contain;transform:rotate(${rot}deg);display:block;margin:0 auto"/>`;
}
document.getElementById('lr-msg').textContent=rot===0?'이 손은?':'돌아간 이 손은?';
lrQLimit=Math.max(1.5,5.0-lrLv*0.15);lrQTime=lrQLimit;clearInterval(lrQTimer);
const lrbar=document.getElementById('lr-qbar');if(lrbar){lrbar.style.transition='none';lrbar.style.width='100%';lrbar.offsetWidth;lrbar.style.transition=`width ${lrQLimit}s linear`;lrbar.style.width='0%'}
lrQTimer=setInterval(()=>{lrQTime-=0.1;if(lrQTime<=0){clearInterval(lrQTimer);setHeartResumeCallback(lrGen);curScore=lrScore;if(loseHeart('lr'))return;scheduleNextQuestion(lrGen,300)}},100)}
function lrPick(d){if(d===lrAns){clearInterval(lrQTimer);lrLv++;lrScore+=10;setScore('lr-score',lrScore);toast('정답!')}
else{clearInterval(lrQTimer);setHeartResumeCallback(lrGen);curScore=lrScore;if(loseHeart('lr'))return}
scheduleNextQuestion(lrGen,300)}
