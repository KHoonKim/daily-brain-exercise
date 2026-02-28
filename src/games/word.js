// ===== 6. WORD - 단어 찾기 =====
let wordScore,wordTime,wordWords,wordFound,wordSel,wordDragging,wordGridData;
const WORD_CATS=[
  {name:'🍎 과일',words:['사과','포도','수박','딸기','참외','감귤','복숭아','자두','앵두','키위']},
  {name:'🌊 자연',words:['바다','하늘','구름','태양','달빛','별빛','노을','안개','번개','폭풍']},
  {name:'💖 감정',words:['사랑','행복','희망','용기','자유','평화','진실','믿음','지혜','열정']},
  {name:'🐯 동물',words:['호랑이','토끼','사슴','고래','거북','여우','늑대','다람쥐','펭귄','독수리']},
  {name:'🎨 예술',words:['노래','음악','그림','연극','영화','소설','무용','조각','시인','작곡']},
  {name:'🏙️ 도시',words:['서울','부산','대구','인천','광주','대전','제주','울산','수원','춘천']},
  {name:'👨‍⚕️ 직업',words:['의사','교사','화가','작가','군인','경찰','기사','판사','약사','목사']},
  {name:'🎵 악기',words:['피아노','기타','드럼','첼로','하프','비올라','오보에','플루트','호른','벨']},
  {name:'🌸 계절',words:['여름','가을','겨울','장마','폭설','서리','이슬','태풍','벚꽃','단풍']},
  {name:'🐱 반려',words:['고양이','강아지','햄스터','앵무새','금붕어','거미','개미','나비','매미','두꺼비']}
];
const FILLER='가나다라마바사아자차카타파하거너더러머버서어저커터퍼허고노도로모보소오조코토포호구누두루무부수우주쿠투푸후기니디리미비시이지키티피히갈날달말발살알잘칼탈팔할감남담람밤삼암잠참탐팜함'.split('');
function genWordGrid(){const sz=6,grid=Array(sz*sz).fill(''),dirs=[[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0]];
const cat=WORD_CATS[~~(Math.random()*WORD_CATS.length)];
const pool=[...cat.words].filter(w=>w.length<=sz).sort(()=>Math.random()-.5),placed=[];
for(const w of pool){if(placed.length>=5)break;const chars=w.split(''),len=chars.length;
let ok=false;for(let t=0;t<60&&!ok;t++){const d=dirs[~~(Math.random()*dirs.length)];
const minR=Math.max(0,d[0]<0?len-1:0),maxR=Math.min(sz-1,d[0]>0?sz-len:sz-1);
const minC=Math.max(0,d[1]<0?len-1:0),maxC=Math.min(sz-1,d[1]>0?sz-len:sz-1);
if(minR>maxR||minC>maxC)continue;
const r0=minR+~~(Math.random()*(maxR-minR+1)),c0=minC+~~(Math.random()*(maxC-minC+1));
let fit=true;for(let i=0;i<len;i++){const r=r0+d[0]*i,c=c0+d[1]*i;if(r<0||r>=sz||c<0||c>=sz){fit=false;break}const idx=r*sz+c;if(grid[idx]!==''&&grid[idx]!==chars[i]){fit=false;break}}
if(fit){for(let i=0;i<len;i++){grid[(r0+d[0]*i)*sz+(c0+d[1]*i)]=chars[i]}placed.push(w);ok=true}}
}
for(let i=0;i<grid.length;i++)if(grid[i]==='')grid[i]=FILLER[~~(Math.random()*FILLER.length)];
return{words:placed,grid,catName:cat.name}}
function initWord(){wordScore=0;wordTime=30;wordFound=[];wordSel=[];wordDragging=false;document.getElementById('word-score').textContent='0점';document.getElementById('word-timer').textContent='30s';document.getElementById('word-timer').className='g-timer';const set=genWordGrid();wordWords=[...set.words];wordGridData=[...set.grid];document.getElementById('word-cat').textContent=set.catName+' — '+wordWords.length+'개 숨김';renderWordBoard();renderWordList();clearInterval(curTimer);curTimer=setInterval(()=>{wordTime--;document.getElementById('word-timer').textContent=wordTime+'s';if(wordTime<=10)document.getElementById('word-timer').className='g-timer urgent';if(wordTime<=0){clearInterval(curTimer);showResult(wordScore,'단어 찾기',[{val:wordFound.length+'/'+wordWords.length,label:'찾은 단어'}])}},1000)}
function renderWordBoard(){document.getElementById('word-board').innerHTML=wordGridData.map((ch,i)=>`<div class="wc" data-i="${i}" ontouchstart="wordTS(${i},event)" ontouchmove="wordTM(event)" ontouchend="wordTE()" onmousedown="wordMD(${i})" onmouseover="wordMO(${i})" onmouseup="wordMU()">${ch}</div>`).join('')}
function renderWordList(){document.getElementById('word-list').innerHTML=wordWords.map(w=>{if(wordFound.includes(w))return`<span class="wl-item found">${w}</span>`;return`<span class="wl-item" style="color:transparent;background:var(--border);border-radius:6px">${'●'.repeat(w.length)}</span>`}).join('')}
function wordTS(i,e){e.preventDefault();wordDragging=true;wordSel=[i];updWS()}function wordTM(e){if(!wordDragging)return;e.preventDefault();const t=e.touches[0];const el=document.elementFromPoint(t.clientX,t.clientY);if(el?.dataset.i!==undefined){const i=+el.dataset.i;if(!wordSel.includes(i)){wordSel.push(i);updWS()}}}function wordTE(){wordDragging=false;chkW()}function wordMD(i){wordDragging=true;wordSel=[i];updWS()}function wordMO(i){if(wordDragging&&!wordSel.includes(i)){wordSel.push(i);updWS()}}function wordMU(){wordDragging=false;chkW()}
function updWS(){document.querySelectorAll('.wc').forEach(c=>c.classList.remove('selected'));wordSel.forEach(i=>document.querySelector(`.wc[data-i="${i}"]`)?.classList.add('selected'))}
function chkW(){const fwd=wordSel.map(i=>wordGridData[i]).join('');const rev=wordSel.slice().reverse().map(i=>wordGridData[i]).join('');const word=wordWords.includes(fwd)?fwd:wordWords.includes(rev)?rev:null;if(word&&!wordFound.includes(word)){wordFound.push(word);wordScore+=20;setScore('word-score',wordScore);wordSel.forEach(i=>document.querySelector(`.wc[data-i="${i}"]`)?.classList.add('found'));renderWordList();toast('✓ '+word);if(wordFound.length===wordWords.length){wordScore+=Math.max(0,wordTime*2);clearInterval(curTimer);setTimeout(()=>showResult(wordScore,'단어 찾기',[{val:wordFound.length+'/'+wordWords.length,label:'찾은 단어'}]),500)}}wordSel=[];updWS()}
