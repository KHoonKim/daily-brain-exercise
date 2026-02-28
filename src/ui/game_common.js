// ===== GAME COMMON UI =====
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id)?.classList.add('active')}

let curGoal=0,goalReached=false;
function initGoalBar(id){
  const best=LS.get(id+'-best',0);
  const gameMeta = GAMES.find(g => g.id === id);
  curGoal=best>0?Math.ceil(best*0.9):(gameMeta?.goalDefault||60);goalReached=false;
  const scoreEl=document.querySelector('#game-'+id+' .g-score');
  if(!scoreEl)return;
  let bar=scoreEl.parentElement.querySelector('.goal-bar');
  if(!bar){bar=document.createElement('div');bar.className='goal-bar';
    bar.innerHTML='<div class="gb-label"><span class="gb-cur">0점</span><span class="gb-target">목표 0점</span></div><div class="gb-track"><div class="gb-fill"></div></div>';
    scoreEl.after(bar)}
  bar.querySelector('.gb-target').textContent='목표 '+curGoal+'점';
  bar.querySelector('.gb-cur').textContent='0점';
  bar.querySelector('.gb-fill').style.width='0';
  bar.querySelector('.gb-fill').className='gb-fill';
}

function setScore(elId,score){
  const el = document.getElementById(elId);
  if(el) el.textContent=score+'점';
  if(elId.includes('-score') || elId === 'r-score') {
     updateGoal(score, curGame);
  }
}

function updateGoal(score,gameId){
  const bar=document.querySelector('#game-'+gameId+' .goal-bar');if(!bar)return;
  const pct=Math.min(100,Math.round(score/curGoal*100));
  bar.querySelector('.gb-cur').textContent=score+'점';
  const fill=bar.querySelector('.gb-fill');fill.style.width=pct+'%';
  if(!goalReached&&score>=curGoal){goalReached=true;fill.className='gb-fill done';toast('목표 달성!')}
  else if(pct>=80)fill.className='gb-fill hot';
}

// ===== NEXT QUESTION SCHEDULING =====
// 팝업이 떠 있는 동안 pending된 setTimeout이 실행되지 않도록 중앙 관리
let _nextQTimeout = null;
function scheduleNextQuestion(fn, delay) {
  clearTimeout(_nextQTimeout);
  _nextQTimeout = setTimeout(fn, delay);
}
function cancelNextQuestion() {
  clearTimeout(_nextQTimeout);
  _nextQTimeout = null;
}

// ===== HEART SYSTEM =====
const MAX_HEARTS=3;
let hearts=MAX_HEARTS;
let heartRefillUsed=false;
let heartGameId=null;

function initHearts(gameId){
  hearts=MAX_HEARTS;heartRefillUsed=false;heartGameId=gameId;
  renderHearts(gameId);
}
function renderHearts(gameId){
  const el=document.getElementById(gameId+'-hearts');
  if(!el)return;
  el.innerHTML='';
  for(let i=0;i<MAX_HEARTS;i++){
    const h=document.createElement('span');
    h.className='heart'+(i>=hearts?' lost':'');
    h.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';h.id=gameId+'-heart-'+i;
    el.appendChild(h);
  }
}
function loseHeart(gameId){
  if(!curGame)return false;
  hearts--;
  const el=document.getElementById(gameId+'-heart-'+hearts);
  if(el){el.classList.add('heart-break');setTimeout(()=>el.classList.add('lost'),500)}
  const container=document.getElementById(gameId+'-hearts');
  if(container){container.classList.add('heart-shake');setTimeout(()=>container.classList.remove('heart-shake'),400)}
  if(navigator.vibrate)navigator.vibrate([50,30,50]);
  if(hearts<=0){
    clearInterval(curTimer);
    cancelNextQuestion();
    setTimeout(()=>{
      if(heartRefillUsed){
        const gameName=GAMES.find(g=>g.id===curGame)?.name||'';
        showResult(curScore,gameName);
        return;
      }
      const overlay = document.getElementById('heartOverlay');
      if(overlay) overlay.classList.add('active');
    },600);
    return true; 
  }
  return false;
}
function refillHearts(){
  const doRefill=()=>{heartRefillUsed=true;hearts=1;document.getElementById('heartOverlay').classList.remove('active');renderHearts(heartGameId);toast('마지막 기회!');resumeAfterHeart()};
  if(window.AIT && AIT.showAd){AIT.showAd('interstitial').then(doRefill).catch(doRefill)}else{doRefill()}
}
let _heartResumeCallback=null;
let _curTickFn=null;
function setTickFn(fn){_curTickFn=fn}
function setHeartResumeCallback(fn){_heartResumeCallback=fn}
function resumeAfterHeart(){if(_heartResumeCallback){const cb=_heartResumeCallback;_heartResumeCallback=null;if(_curTickFn){clearInterval(curTimer);curTimer=setInterval(_curTickFn,1000)}cb()}}
function heartQuit(){
  document.getElementById('heartOverlay').classList.remove('active');
  const gameName=GAMES.find(g=>g.id===curGame)?.name||'';
  showResult(curScore,gameName);
}

// ===== TIME EXTEND =====
let timeExtendUsed=false;
let _timeExtendCallback=null;
let _timeExtendResumeCallback=null;
function setTimeExtendResumeCallback(fn){_timeExtendResumeCallback=fn}
function resumeWithExtraTime(seconds){if(_timeExtendResumeCallback){const cb=_timeExtendResumeCallback;_timeExtendResumeCallback=null;cb(seconds)}}
function showTimeExtend(callback){
  if(!curGame)return;
  if(timeExtendUsed){callback();return}
  cancelNextQuestion();
  _timeExtendCallback=callback;
  document.getElementById('timeExtendOverlay').classList.add('active');
}
function timeExtendQuit(){
  document.getElementById('timeExtendOverlay').classList.remove('active');
  _timeExtendResumeCallback=null;
  if(_timeExtendCallback)_timeExtendCallback();
}
function timeExtendAccept(){
  document.getElementById('timeExtendOverlay').classList.remove('active');
  const doResume=()=>{timeExtendUsed=true;toast('+5초!');resumeWithExtraTime(5)};
  const doFallback=()=>{_timeExtendResumeCallback=null;if(_timeExtendCallback)_timeExtendCallback()};
  if(window.AIT && AIT.showAd){
    AIT.showAd('interstitial').then(res=>{if(res.success)doResume();else doFallback()}).catch(doFallback);
  }else{doResume()}
}
