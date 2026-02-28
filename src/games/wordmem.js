// ===== 27. WORD MEM - 단어 암기 =====
let wmScore,wmLv,wmWords,wmShowing,wmFound,wmTarget;
const WM_POOL=['사과','바나나','포도','수박','딸기','오렌지','복숭아','키위','멜론','체리','자두','감','귤','배','밤','호두','잣','살구','망고','파인애플',
'강아지','고양이','토끼','거북이','사자','호랑이','코끼리','기린','펭귄','독수리','돌고래','나비','잠자리','벌','개미','다람쥐','여우','늑대','곰','원숭이',
'학교','병원','공원','시장','도서관','미술관','극장','식당','카페','서점','은행','약국','우체국','경찰서','소방서','공항','기차역','항구','놀이터','수영장'];
function initWordmem(){wmScore=0;wmLv=1;wmShowing=false;document.getElementById('wm-score').textContent='0점';document.getElementById('wm-level').textContent='Lv.1';initHearts('wm');wmNewRound()}
function wmNewRound(){wmShowing=true;const count=wmLv+2;
wmWords=[];const pool=[...WM_POOL].sort(()=>Math.random()-.5);
for(let i=0;i<count&&i<pool.length;i++)wmWords.push(pool[i]);
document.getElementById('wm-msg').textContent='단어를 기억하세요!';
document.getElementById('wm-opts').innerHTML='';
let i=0;const display=document.getElementById('wm-display');
display.innerHTML=`<div class="wm-word">${wmWords[0]}</div>`;
const iv=setInterval(()=>{i++;if(i<wmWords.length){display.innerHTML=`<div class="wm-word">${wmWords[i]}</div>`}
else{clearInterval(iv);wmShowing=false;wmAsk()}},1200)}
function wmAsk(){document.getElementById('wm-display').innerHTML='';
const count=wmWords.length;
const decoyCount=Math.min(count+1,WM_POOL.length-count);
const decoy=WM_POOL.filter(w=>!wmWords.includes(w)).sort(()=>Math.random()-.5).slice(0,decoyCount);
const opts=[...wmWords,...decoy].sort(()=>Math.random()-.5);
wmFound=0;wmTarget=wmWords.length;
document.getElementById('wm-msg').textContent=`있었던 단어를 모두 고르세요 (${wmFound}/${wmTarget})`;
document.getElementById('wm-opts').innerHTML=opts.map(w=>`<div class="wm-opt" onclick="wmPick(this,'${w}',${wmWords.includes(w)})">${w}</div>`).join('')}
function wmPick(el,w,correct){if(el.classList.contains('ok')||el.classList.contains('no'))return;
if(correct){el.classList.add('ok');wmFound++;wmScore+=10;setScore('wm-score',wmScore);
document.getElementById('wm-msg').textContent=`있었던 단어를 모두 고르세요 (${wmFound}/${wmTarget})`;
if(wmFound>=wmTarget){wmLv++;wmScore+=wmLv*5;setScore('wm-score',wmScore);
document.getElementById('wm-level').textContent='Lv.'+wmLv;toast('완벽!');scheduleNextQuestion(wmNewRound,800)}}
else{el.classList.add('no');curScore=wmScore;setHeartResumeCallback(wmNewRound);if(loseHeart('wm'))return}}
