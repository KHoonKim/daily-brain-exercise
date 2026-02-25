// ===== GAME 8: FOCUS =====
let focusScore,focusTime,focusHit,focusMiss,focusSpawnTimer;
function initFocus(){focusScore=0;focusTime=30;focusHit=0;focusMiss=0;document.getElementById('focus-score').textContent='0점';document.getElementById('focus-timer').textContent='30s';document.getElementById('focus-timer').className='g-timer';document.getElementById('focus-field').innerHTML='';clearInterval(curTimer);clearInterval(focusSpawnTimer);curTimer=setInterval(()=>{focusTime--;document.getElementById('focus-timer').textContent=focusTime+'s';if(focusTime<=10)document.getElementById('focus-timer').className='g-timer urgent';if(focusTime<=0){clearInterval(curTimer);clearInterval(focusSpawnTimer);showResult(focusScore,'집중력 탭',[{val:focusHit,label:'명중'},{val:focusMiss,label:'실수'}], {_isTimerEnd:true})}},1000);focusSpawnTimer=setInterval(spawnTarget,800);spawnTarget();spawnTarget()}
function spawnTarget(){const f=document.getElementById('focus-field'),r=f.getBoundingClientRect();if(!r.width)return;
const elapsed=30-focusTime;const difficulty=Math.min(elapsed/30,1);
const el=document.createElement('div');const rnd=Math.random(),type=rnd<.55?'good':rnd<(.55+.3+difficulty*.1)?'bad':'bonus';
el.className='focus-target '+type;
const symbols={good:'○',bad:'×',bonus:'◎'};
el.textContent=symbols[type];el.style.color='#fff';el.style.fontSize='20px';
const size=48-~~(difficulty*12);el.style.width=size+'px';el.style.height=size+'px';
el.style.left=~~(Math.random()*(r.width-size-8))+'px';el.style.top=~~(Math.random()*(r.height-size-8))+'px';
el.onclick=()=>{if(type==='good'){focusScore+=10;focusHit++}else if(type==='bonus'){focusScore+=30;focusHit++;toast('◎ 보너스!')}else{focusScore=Math.max(0,focusScore-5);focusMiss++}el.style.transform='scale(0)';setTimeout(()=>el.remove(),150);setScore('focus-score',focusScore)};
f.appendChild(el);
const lifespan=type==='bonus'?1200:(2200-~~(difficulty*1000));
setTimeout(()=>{if(el.parentNode){if(type==='good')focusMiss++;el.style.opacity='0';setTimeout(()=>el.remove(),200)}},lifespan);
clearInterval(focusSpawnTimer);focusSpawnTimer=setInterval(spawnTarget,Math.max(400,750-~~(difficulty*350)))}
