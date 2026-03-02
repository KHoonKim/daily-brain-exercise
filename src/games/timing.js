// ===== 19. TIMING - 타이밍 =====
let tmScore,tmRound,tmAnim,tmPos,tmTarget,tmDir;
function initTiming(){tmScore=0;tmRound=0;document.getElementById('tm-score').textContent='0점';tmNext()}
function tmNext(){tmRound++;if(tmRound>10){showResult(tmScore,'타이밍',[]);return}
document.getElementById('tm-round').textContent=tmRound+'/10';
const barW=document.getElementById('tm-btn').parentElement.querySelector('.tm-bar')?.offsetWidth||280;
const tgtW=Math.max(60,150-tmRound*10);const tgtL=~~(Math.random()*(barW-tgtW));
tmTarget={l:tgtL,r:tgtL+tgtW};
document.getElementById('tm-target').style.cssText=`left:${tgtL}px;width:${tgtW}px`;
tmPos=0;tmDir=1;const speed=2+tmRound*0.5;
document.getElementById('tm-cursor').style.left='0px';
document.getElementById('tm-msg').textContent=`${tmRound}/10 — 목표에 멈추세요!`;
cancelAnimationFrame(tmAnim);
function tick(){const bar=document.querySelector('.tm-bar');if(!bar)return;const bw=bar.offsetWidth;
tmPos+=tmDir*speed;if(tmPos>=bw||tmPos<=0)tmDir*=-1;tmPos=Math.max(0,Math.min(bw,tmPos));
document.getElementById('tm-cursor').style.left=tmPos+'px';tmAnim=requestAnimationFrame(tick)}
tmAnim=requestAnimationFrame(tick)}
function tmStop(){cancelAnimationFrame(tmAnim);
const hit=tmPos>=tmTarget.l&&tmPos<=tmTarget.r;
let pts;
if(hit){
  const center=(tmTarget.l+tmTarget.r)/2;
  const half=(tmTarget.r-tmTarget.l)/2;
  const ratio=Math.abs(tmPos-center)/half; // 0=정중앙, 1=가장자리
  if(ratio<1/6)pts=30;       // 빨강
  else if(ratio<2/6)pts=25;  // 주황
  else if(ratio<3/6)pts=20;  // 노랑
  else if(ratio<4/6)pts=15;  // 초록
  else if(ratio<5/6)pts=10;  // 파랑
  else pts=5;                 // 회색
}else{pts=0}
tmScore+=pts;setScore('tm-score',tmScore);
const msg=pts>=30?'완벽!':pts>=25?'훌륭해요!':pts>=20?'정확!':pts>=15?'좋아요!':pts>=10?'근접!':pts>=5?'아깝!':'미스!';
toast(msg);
scheduleNextQuestion(tmNext,800)}
