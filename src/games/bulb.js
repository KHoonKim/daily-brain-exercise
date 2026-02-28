// ===== 16. BULB - 전구 기억 =====
let bulbSeq,bulbIdx,bulbLv,bulbScore,bulbShowing;
function initBulb(){bulbLv=1;bulbScore=0;bulbShowing=false;document.getElementById('bulb-score').textContent='0점';document.getElementById('bulb-level').textContent='Lv.1';initHearts('bulb');
document.getElementById('bulb-grid').innerHTML=Array.from({length:9},(_,i)=>`<div class="bulb-item" onclick="bulbTap(${i})"></div>`).join('');bulbNewRound()}
function bulbNewRound(){bulbShowing=true;bulbIdx=0;const len=bulbLv+2;bulbSeq=Array.from({length:len},()=>~~(Math.random()*9));
document.getElementById('bulb-msg').textContent='전구 순서를 기억하세요!';
const items=document.querySelectorAll('.bulb-item');items.forEach(it=>it.classList.remove('on'));
const ON_MS=400,OFF_MS=300;let i=0;
function showNext(){items.forEach(it=>it.classList.remove('on'));
if(i<bulbSeq.length){items[bulbSeq[i]].classList.add('on');i++;setTimeout(()=>{items.forEach(it=>it.classList.remove('on'));setTimeout(showNext,OFF_MS)},ON_MS)}else{bulbShowing=false;document.getElementById('bulb-msg').textContent='같은 순서로 터치!'}}
setTimeout(showNext,400)}
function bulbTap(n){if(bulbShowing)return;const items=document.querySelectorAll('.bulb-item');
items[n].classList.add('on');setTimeout(()=>items[n].classList.remove('on'),300);
if(n===bulbSeq[bulbIdx]){bulbIdx++;if(bulbIdx===bulbSeq.length){bulbLv++;bulbScore+=bulbLv*10;setScore('bulb-score',bulbScore);document.getElementById('bulb-level').textContent='Lv.'+bulbLv;toast('✓ 정답!');scheduleNextQuestion(bulbNewRound,800)}
}else{curScore=bulbScore;if(loseHeart('bulb'))return;const its=document.querySelectorAll('.bulb-item');its.forEach(it=>{it.classList.remove('on');it.classList.add('wrong')});document.getElementById('bulb-msg').textContent='틀렸어요! 다시 시작!';setTimeout(()=>its.forEach(it=>it.classList.remove('wrong')),600);scheduleNextQuestion(bulbNewRound,800)}}
