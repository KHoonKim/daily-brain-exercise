// ===== 19. TIMING - 타이밍 =====
let tmScore,tmRound,tmAnim,tmPos,tmTarget,tmDir;
function initTiming(){tmScore=0;tmRound=0;document.getElementById('tm-score').textContent='0점';tmNext()}
function tmNext(){tmRound++;if(tmRound>10){showResult(tmScore,'타이밍',[]);return}
document.getElementById('tm-round').textContent=tmRound+'/10';
const barW=document.getElementById('tm-btn').parentElement.querySelector('.tm-bar')?.offsetWidth||280;
const tgtW=Math.max(30,80-tmRound*5);const tgtL=~~(Math.random()*(barW-tgtW));
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
const dist=hit?0:Math.min(Math.abs(tmPos-tmTarget.l),Math.abs(tmPos-tmTarget.r));
const pts=hit?15:Math.max(0,10-~~(dist/10));
tmScore+=pts;setScore('tm-score',tmScore);
toast(hit?'정확!':pts>5?'근접!':'아깝!');
scheduleNextQuestion(tmNext,800)}
