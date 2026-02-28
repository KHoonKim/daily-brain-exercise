// ===== 2. MEMORY - 기억력 카드 =====
let memScore,memTime,memCards,memFlipped,memMatched,memLocked,memPairs;
const EMOJIS=['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐵','🐧','🐦','🦋'];
function initMemory(){
  memScore=0;memTime=30;memFlipped=[];memMatched=[];memLocked=false;memPairs=0;
  document.getElementById('mem-score').textContent='0점';
  clearInterval(curTimer);document.getElementById('mem-timer').textContent='30s';document.getElementById('mem-timer').className='g-timer';
  curTimer=setInterval(()=>{memTime--;document.getElementById('mem-timer').textContent=memTime+'s';if(memTime<=10)document.getElementById('mem-timer').className='g-timer urgent';if(memTime<=0){clearInterval(curTimer);showResult(memScore,'기억력 카드',[{val:memPairs,label:'찾은 쌍'}], {_isTimerEnd: true})}},1000);
  memGen();
}
function memGen(){
  memFlipped=[];memMatched=[];memLocked=false;
  const picked=EMOJIS.sort(()=>Math.random()-.5).slice(0,6);memCards=[...picked,...picked].sort(()=>Math.random()-.5);
  document.getElementById('mem-grid').innerHTML=memCards.map((e,i)=>`<div class="mem-card" data-i="${i}" onclick="memFlip(${i})"><span class="cf">${e}</span></div>`).join('');
}
function memFlip(i){
  if(memLocked||memFlipped.includes(i)||memMatched.includes(i))return;
  document.querySelector(`.mem-card[data-i="${i}"]`).classList.add('flipped');memFlipped.push(i);
  if(memFlipped.length===2){memLocked=true;const[a,b]=memFlipped;
    if(memCards[a]===memCards[b]){memMatched.push(a,b);memPairs++;document.querySelector(`.mem-card[data-i="${a}"]`).classList.add('matched');document.querySelector(`.mem-card[data-i="${b}"]`).classList.add('matched');memScore+=10;setScore('mem-score',memScore);memFlipped=[];memLocked=false;
      if(memMatched.length===memCards.length){const bonus=Math.max(0,memTime*2);memScore+=bonus;setScore('mem-score',memScore);toast('완성! 다음 판!');scheduleNextQuestion(memGen,800)}
    }else{setTimeout(()=>{document.querySelector(`.mem-card[data-i="${a}"]`).classList.remove('flipped');document.querySelector(`.mem-card[data-i="${b}"]`).classList.remove('flipped');memFlipped=[];memLocked=false},600)}}
}
