// ===== 14. ODD ONE =====
let oddScore,oddTime,oddLv,oddQTimer,oddQTime,oddQLimit;
const ODD_PAIRS=[['뎡','경'],['곰','공'],['달','닭'],['봄','볼'],['갈','잘'],['물','뭄'],['눈','논'],['밤','밥'],['손','존'],['말','맘'],['불','붉'],['곧','곤'],['답','닫'],['살','삼'],['풀','품'],['날','낫'],['굽','굿'],['집','짓'],['감','같'],['힘','험'],['돈','든'],['별','벌'],['꿈','꿀'],['삶','삼'],['빛','빗'],['숲','술'],['맛','맞'],['꽃','꼿'],['잎','잊'],['값','갑']];
function initOddone(){oddScore=0;oddTime=30;oddLv=1;document.getElementById('odd-score').textContent='0점';document.getElementById('odd-timer').textContent='30s';document.getElementById('odd-timer').className='g-timer';initHearts('odd');
clearInterval(curTimer);curTimer=setInterval(()=>{oddTime--;document.getElementById('odd-timer').textContent=oddTime+'s';if(oddTime<=10)document.getElementById('odd-timer').className='g-timer urgent';if(oddTime<=0){clearInterval(curTimer);clearInterval(oddQTimer);showResult(oddScore,'다른 글자 찾기',[{val:oddLv-1,label:'클리어 수'}], {_isTimerEnd:true})}},1000);oddGen()}
function oddGen(){const sz=oddLv<=2?4:oddLv<=5?5:6;
const gridEl = document.getElementById('odd-grid');
if(gridEl) gridEl.style.gridTemplateColumns=`repeat(${sz},1fr)`;
const pair=ODD_PAIRS[~~(Math.random()*ODD_PAIRS.length)];
const main=pair[0],diff=pair[1];
const total=sz*sz,pos=~~(Math.random()*total);
const fs=sz<=4?24:sz<=5?20:17;
if(gridEl) gridEl.innerHTML=Array.from({length:total},(_,i)=>{
return`<div class="odd-cell" onclick="oddPick(this,${i},${pos})" style="font-size:${fs}px;color:var(--text)">${i===pos?diff:main}</div>`}).join('');
oddQLimit=Math.max(2.0,4.0-oddLv*0.12);oddQTime=oddQLimit;clearInterval(oddQTimer);
const oddbar=document.getElementById('odd-qbar');if(oddbar){oddbar.style.transition='none';oddbar.style.width='100%';requestAnimationFrame(()=>{oddbar.style.transition=`width ${oddQLimit}s linear`;oddbar.style.width='0%'})}
oddQTimer=setInterval(()=>{oddQTime-=0.1;if(oddQTime<=0){clearInterval(oddQTimer);curScore=oddScore;if(loseHeart('odd'))return;setTimeout(oddGen,300)}},100)}
function oddPick(el,i,ans){if(i===ans){clearInterval(oddQTimer);el.classList.add('ok');const pct=oddQTime/oddQLimit;const bonus=pct>.75?5:pct>.5?3:1;oddScore+=10+oddLv*2+bonus;oddLv++;setScore('odd-score',oddScore);setTimeout(oddGen,400)}else{el.classList.add('no');oddScore=Math.max(0,oddScore-5);setScore('odd-score',oddScore)}}
