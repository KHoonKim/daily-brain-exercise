// ===== 36. FLASH =====
let flScore,flLv,flAnswer;
function initFlash(){flScore=0;flLv=1;document.getElementById('fl-score').textContent='0점';document.getElementById('fl-level').textContent='Lv.1';initHearts('fl');flRound()}
function flRound(){const len=Math.floor(flLv/2)+3;flAnswer='';for(let i=0;i<len;i++)flAnswer+=~~(Math.random()*10);
document.getElementById('fl-msg').textContent='숫자를 기억하세요!';
const flD=document.getElementById('fl-display');flD.textContent=flAnswer;flD.style.fontSize=(len<=5?56:len<=7?42:len<=9?32:24)+'px';document.getElementById('fl-input').innerHTML='';
const showTime=800+len*150;
setTimeout(()=>{
document.getElementById('fl-msg').textContent='무슨 숫자였을까요?';
const keys=[1,2,3,4,5,6,7,8,9,'←',0,'OK'];
document.getElementById('fl-input').innerHTML=`<div class="numpad" style="grid-template-columns:repeat(4,1fr)">${[1,2,3,4,5,6,7,8,9,0].map(k=>`<button class="nbtn" onclick="flKey('${k}')">\${k}</button>`).join('')}<button class="nbtn del" onclick="flKey('DEL')">⌫</button><button class="nbtn go" onclick="flKey('OK')">확인</button></div>`;
window._flInput='';window._flLen=len;flUpdateDisplay()},showTime)}
function flUpdateDisplay(){const len=window._flLen;const inp=window._flInput;
let txt='';for(let i=0;i<len;i++){txt+=i<inp.length?inp[i]:'_'}
const d=document.getElementById('fl-display');
d.innerHTML=txt.split('').map((c,i)=>`<span style="display:inline-block;width:36px;text-align:center;\${i<inp.length?'color:var(--p)':'color:var(--sub);opacity:.4'}">\${c}</span>`).join('')}
function flKey(k){if(k==='DEL' || k==='←'){window._flInput=window._flInput.slice(0,-1);flUpdateDisplay()}
else if(k==='OK'){if(window._flInput===flAnswer){flScore+=10+flLv*5;flLv++;
setScore('fl-score',flScore);document.getElementById('fl-level').textContent='Lv.'+flLv;toast('정답!')}
else{document.getElementById('fl-display').textContent=flAnswer;document.getElementById('fl-display').style.color='var(--no)';curScore=flScore;if(loseHeart('fl')){return}setTimeout(()=>{document.getElementById('fl-display').style.color='';flRound()},800);return}
setTimeout(flRound,500);return}
else if(window._flInput.length<window._flLen){window._flInput+=k;flUpdateDisplay();
if(window._flInput.length===window._flLen){setTimeout(()=>flKey('OK'),300)}}}
