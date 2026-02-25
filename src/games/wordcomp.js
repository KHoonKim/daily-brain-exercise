// ===== 18. WORD COMPLETE =====
let wcScore,wcTime,wcTotal,wcQTimer,wcQTime,wcQLimit;
const WC_DB=[
  {word:'사__',full:'사과',hint:'빨간 과일',opts:['과','랑','람','울']},
  {word:'행_',full:'행복',hint:'기쁜 감정',opts:['복','운','사','동']},
  {word:'_늘',full:'하늘',hint:'머리 위에',opts:['하','바','그','저']},
  {word:'_다',full:'바다',hint:'넓고 푸른',opts:['바','나','아','가']},
  {word:'사_',full:'사랑',hint:'♥ 감정',opts:['랑','과','람','진']},
  {word:'_교',full:'학교',hint:'배우는 곳',opts:['학','교','성','사']},
  {word:'_화',full:'영화',hint:'극장에서 보는',opts:['영','전','문','동']},
  {word:'음_',full:'음악',hint:'🎵 소리 예술',opts:['악','식','료','산']},
  {word:'_구',full:'친구',hint:'함께 노는 사이',opts:['친','야','축','한']},
  {word:'_물',full:'동물',hint:'🐾 생명체',opts:['동','식','음','건']},
  {word:'_험',full:'모험',hint:'새로운 도전',opts:['모','위','경','시']},
  {word:'_장',full:'시장',hint:'물건 사는 곳',opts:['시','공','광','미']},
  {word:'_방',full:'침방',hint:'잠자는 곳',opts:['침','주','부','목']},
  {word:'_기',full:'용기',hint:'두려움을 이기는',opts:['용','전','공','운']},
  {word:'자_',full:'자유',hint:'구속 없는 상태',opts:['유','연','동','리']},
  {word:'_식',full:'지식',hint:'배워서 아는 것',opts:['지','음','의','상']},
  {word:'_실',full:'진실',hint:'거짓의 반대',opts:['진','현','교','빈']},
  {word:'평_',full:'평화',hint:'☮ 전쟁 없는',opts:['화','야','일','소']},
  {word:'_상',full:'이상',hint:'꿈꾸는 모습',opts:['이','사','현','비']},
  {word:'_래',full:'미래',hint:'앞으로 올 시간',opts:['미','노','거','과']},
];
function initWordcomp(){wcScore=0;wcTime=30;wcTotal=0;document.getElementById('wc-score').textContent='0점';initHearts('wc');
document.getElementById('wc-timer').textContent='30s';document.getElementById('wc-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{wcTime--;document.getElementById('wc-timer').textContent=wcTime+'s';if(wcTime<=10)document.getElementById('wc-timer').className='g-timer urgent';if(wcTime<=0){clearInterval(curTimer);clearInterval(wcQTimer);showResult(wcScore,'단어 완성',[{val:wcTotal,label:'문제 수'}], {_isTimerEnd:true})}},1000);wcGen()}
function wcGen(){const q=WC_DB[~~(Math.random()*WC_DB.length)];
document.getElementById('wc-word').textContent=q.word;
document.getElementById('wc-hint').textContent='힌트: '+q.hint;
const ans=q.opts[0];const opts=[...q.opts].sort(()=>Math.random()-.5);
document.getElementById('wc-opts').innerHTML=opts.map(o=>`<div class="wc-opt" onclick="wcPick(this,'${o}','${ans}','${q.full}')">${o}</div>`).join('');
wcQLimit=Math.max(1.5,3.0-wcTotal*0.06);wcQTime=wcQLimit;clearInterval(wcQTimer);
const wcbar=document.getElementById('wc-qbar');if(wcbar){wcbar.style.transition='none';wcbar.style.width='100%';requestAnimationFrame(()=>{wcbar.style.transition=`width ${wcQLimit}s linear`;wcbar.style.width='0%'})}
wcQTimer=setInterval(()=>{wcQTime-=0.1;if(wcQTime<=0){clearInterval(wcQTimer);wcTotal++;curScore=wcScore;if(loseHeart('wc'))return;setTimeout(wcGen,300)}},100)}
function wcPick(el,picked,answer,full){if(el.classList.contains('ok')||el.classList.contains('no'))return;clearInterval(wcQTimer);wcTotal++;
if(picked===answer){el.classList.add('ok');const pct=wcQTime/wcQLimit;const bonus=pct>.75?5:pct>.5?3:1;wcScore+=10+bonus;setScore('wc-score',wcScore);document.getElementById('wc-word').textContent=full}
else{el.classList.add('no');document.querySelectorAll('.wc-opt').forEach(o=>{if(o.textContent===answer)o.classList.add('ok')});document.getElementById('wc-word').textContent=full;curScore=wcScore;if(loseHeart('wc'))return}
setTimeout(wcGen,700)}
