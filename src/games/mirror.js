// ===== 38. MIRROR =====
let mrScore,mrTime,mrAns,mrLevel=0;
const MR_CHARS='가나다라마바사아자차카타파하거너더러머버서어저커터퍼허고노도로모보소오조코토포호구누두루무부수우주쿠투푸후'.split('');
function initMirror(){mrScore=0;mrTime=30;mrLevel=0;document.getElementById('mr-score').textContent='0점';initHearts('mr');
document.getElementById('mr-timer').textContent='30s';document.getElementById('mr-timer').className='g-timer';
clearInterval(curTimer);curTimer=setInterval(()=>{mrTime--;document.getElementById('mr-timer').textContent=mrTime+'s';
if(mrTime<=10)document.getElementById('mr-timer').className='g-timer urgent';
if(mrTime<=0){clearInterval(curTimer);showResult(mrScore,'거울 문자',[], {_isTimerEnd:true})}},1000);mrGen()}
function mrGen(){mrAns=MR_CHARS[~~(Math.random()*MR_CHARS.length)];
const ch=document.getElementById('mr-char');ch.textContent=mrAns;
const transforms=['scaleX(-1)','scaleY(-1)','scaleX(-1) scaleY(-1)','rotate(180deg)','scaleX(-1) rotate(90deg)'];
const maxT=mrLevel<3?1:mrLevel<6?3:5;
ch.style.transform=transforms[~~(Math.random()*maxT)];mrLevel++;
const opts=new Set([mrAns]);while(opts.size<4){opts.add(MR_CHARS[~~(Math.random()*MR_CHARS.length)])}
document.getElementById('mr-opts').innerHTML=[...opts].sort(()=>Math.random()-.5).map(c=>
`<div class="bc-opt" onclick="mrPick(this,'\${c}')" style="font-size:24px;padding:16px">\${c}</div>`).join('')}
function mrPick(el,c){if(el.classList.contains('ok')||el.classList.contains('no'))return;
if(c===mrAns){el.classList.add('ok');mrScore+=10;setScore('mr-score',mrScore);toast('정답!')}
else{el.classList.add('no');document.querySelectorAll('#mr-opts .bc-opt').forEach(o=>{if(o.textContent===mrAns)o.classList.add('ok')});
curScore=mrScore;if(loseHeart('mr'))return}
setTimeout(mrGen,400)}
