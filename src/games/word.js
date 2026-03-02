// ===== 6. WORD - 단어 찾기 =====
let wordScore,wordTime,wordWords,wordFound,wordHinted,wordSel,wordDragging,wordGridData,wordTotalFound,wordRound,_wcEls,_wcPrevSel,_rafUpdWS;
const WORD_CATS=[
  {name:'🍎 과일',words:['사과','포도','수박','딸기','참외','감귤','복숭아','자두','앵두','키위']},
  {name:'🌊 자연',words:['바다','하늘','구름','태양','달빛','별빛','노을','안개','번개','폭풍']},
  {name:'💖 감정',words:['사랑','행복','희망','용기','자유','평화','진실','믿음','지혜','열정']},
  {name:'🐯 동물',words:['호랑이','토끼','사슴','고래','거북','여우','늑대','다람쥐','펭귄','독수리']},
  {name:'🎨 예술',words:['노래','음악','그림','연극','영화','소설','무용','조각','시인','작곡']},
  {name:'🏙️ 한국도시',words:['서울','부산','대구','인천','광주','대전','제주','울산','수원','춘천']},
  {name:'👨‍⚕️ 직업',words:['의사','교사','화가','작가','군인','경찰','기사','판사','약사','목사']},
  {name:'🎵 악기',words:['피아노','기타','드럼','첼로','하프','비올라','오보에','플루트','호른','바이올린']},
  {name:'🌸 계절',words:['여름','가을','겨울','장마','폭설','서리','이슬','태풍','벚꽃','단풍']},
  {name:'🐱 반려동물',words:['고양이','강아지','햄스터','앵무새','금붕어','거미','개미','나비','매미','두꺼비']},
  {name:'🍜 한국음식',words:['비빔밥','불고기','삼겹살','된장국','잡채','갈비탕','냉면','순대국','떡볶이','삼계탕']},
  {name:'🏅 스포츠',words:['축구','야구','농구','배구','수영','테니스','골프','탁구','태권도','씨름']},
  {name:'🌍 나라',words:['일본','중국','미국','영국','프랑스','독일','캐나다','호주','브라질','이탈리아']},
  {name:'🌺 꽃',words:['장미','튤립','국화','수선화','해바라기','라일락','진달래','무궁화','연꽃','개나리']},
  {name:'🎨 색깔',words:['빨강','주황','노랑','초록','파랑','남색','보라','하얀','검정','분홍']},
  {name:'🏠 집',words:['거실','침실','부엌','화장실','발코니','다락방','현관','창고','마당','욕실']},
  {name:'🚗 교통',words:['버스','기차','비행기','자동차','택시','자전거','오토바이','지하철','헬기','트럭']},
  {name:'📚 교과목',words:['수학','영어','과학','역사','미술','음악','체육','도덕','국어','지리']},
  {name:'🪐 우주',words:['화성','금성','목성','토성','해왕성','위성','혜성','은하수','블랙홀','우주선']},
  {name:'🎯 취미',words:['독서','요리','등산','낚시','사진','여행','캠핑','그림','글쓰기','수영']},
  {name:'🐠 바다생물',words:['상어','고래','오징어','문어','해마','불가사리','해파리','조개','새우','가오리']},
  {name:'🥦 채소',words:['당근','감자','양파','오이','토마토','브로콜리','시금치','콩나물','고추','배추']},
  {name:'💪 신체',words:['머리','이마','눈썹','어깨','손목','발목','무릎','허벅지','손가락','발가락']},
  {name:'🏰 세계유산',words:['에펠탑','피라미드','타지마할','파르테논','마추픽추','콜로세움','성당','궁전','성곽','사원']},
  {name:'🎉 축제',words:['설날','추석','크리스마스','할로윈','생일','졸업식','결혼식','입학식','송년회','돌잔치']},
  {name:'🌏 아시아도시',words:['도쿄','베이징','상하이','방콕','싱가포르','홍콩','타이베이','하노이','자카르타','뭄바이']},
  {name:'🧁 디저트',words:['케이크','아이스크림','초콜릿','쿠키','마카롱','도넛','와플','타르트','푸딩','젤리']},
  {name:'🌲 나무',words:['소나무','느티나무','은행나무','벚나무','대나무','선인장','야자수','참나무','단풍나무','버드나무']},
  {name:'💻 IT',words:['스마트폰','노트북','태블릿','인터넷','소프트웨어','하드웨어','클라우드','데이터','코딩','키보드']},
  {name:'🎮 보드게임',words:['체스','장기','바둑','포커','퍼즐','볼링','다트','당구','카드','윷놀이']},
  {name:'🏘️ 장소',words:['학교','병원','도서관','공원','시장','마트','식당','카페','극장','박물관']},
  {name:'🧪 과학',words:['원자','분자','에너지','중력','마찰력','산소','수소','탄소','전자','광합성']}
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
function initWord(){wordScore=0;wordTime=60;wordFound=[];wordHinted=[];wordSel=[];wordDragging=false;wordTotalFound=0;wordRound=1;document.getElementById('word-score').textContent='0점';document.getElementById('word-timer').textContent='60s';document.getElementById('word-timer').className='g-timer';const set=genWordGrid();wordWords=[...set.words];wordGridData=[...set.grid];const _wlc=set.catName[set.catName.length-1],_wcc=_wlc.charCodeAt(0),_wp=(_wcc>=0xAC00&&_wcc<=0xD7A3&&(_wcc-0xAC00)%28>0)?'과':'와';document.getElementById('word-guide').textContent=set.catName+' '+_wp+' 관련된 단어를 찾아 드래그로 연결해주세요.';document.getElementById('word-cat').textContent=wordWords.length+'개 숨김';renderWordBoard();renderWordList();clearInterval(curTimer);curTimer=setInterval(()=>{wordTime--;document.getElementById('word-timer').textContent=wordTime+'s';if(wordTime<=10)document.getElementById('word-timer').className='g-timer urgent';if(wordTime>0&&(60-wordTime)%4===0){const avail=wordWords.filter(w=>!wordFound.includes(w)&&!wordHinted.includes(w));if(avail.length>0){const hw=avail[~~(Math.random()*avail.length)];wordHinted.push(hw);renderWordList();toast('💡 힌트: '+hw)}}if(wordTime<=0){clearInterval(curTimer);showResult(wordScore,'단어 찾기',[{val:wordTotalFound,label:'찾은 단어'},{val:wordRound-1+'판',label:'완성 라운드'}])}},1000)}
function renderWordBoard(){document.getElementById('word-board').innerHTML=wordGridData.map((ch,i)=>`<div class="wc" data-i="${i}" ontouchstart="wordTS(${i},event)" ontouchmove="wordTM(event)" ontouchend="wordTE()" onmousedown="wordMD(${i})" onmouseover="wordMO(${i})" onmouseup="wordMU()">${ch}</div>`).join('');_wcEls=[...document.getElementById('word-board').querySelectorAll('.wc')];_wcPrevSel=new Set()}
function renderWordList(){document.getElementById('word-list').innerHTML=wordWords.map(w=>{if(wordFound.includes(w))return`<span class="wl-item found">${w}</span>`;if(wordHinted.includes(w))return`<span class="wl-item hint">${w}</span>`;return`<span class="wl-item" style="color:transparent;background:var(--border);border-radius:6px">${'●'.repeat(w.length)}</span>`}).join('')}
function wordTS(i,e){e.preventDefault();wordDragging=true;wordSel=[i];updWS()}function wordTM(e){if(!wordDragging)return;e.preventDefault();const t=e.touches[0];const el=document.elementFromPoint(t.clientX,t.clientY);if(el?.dataset.i===undefined)return;const sz=6;const curI=+el.dataset.i;const ns=calcWordSel(wordSel[0],curI,sz);if(ns.join()===wordSel.join())return;wordSel=ns;if(_rafUpdWS)cancelAnimationFrame(_rafUpdWS);_rafUpdWS=requestAnimationFrame(()=>{updWS();_rafUpdWS=null})}function wordTE(){if(_rafUpdWS){cancelAnimationFrame(_rafUpdWS);_rafUpdWS=null;updWS()}wordDragging=false;chkW()}function wordMD(i){wordDragging=true;wordSel=[i];updWS()}function wordMO(i){if(!wordDragging)return;const sz=6;wordSel=calcWordSel(wordSel[0],i,sz);updWS()}function wordMU(){wordDragging=false;chkW()}function calcWordSel(startI,curI,sz){if(curI===startI)return[startI];const sr=Math.floor(startI/sz),sc=startI%sz,cr=Math.floor(curI/sz),cc=curI%sz,dr=cr-sr,dc=cc-sc,adx=Math.abs(dc),ady=Math.abs(dr);let nr,nc;if(ady===0){nr=0;nc=dc>0?1:-1}else if(adx===0){nr=dr>0?1:-1;nc=0}else if(adx>ady*2){nr=0;nc=dc>0?1:-1}else if(ady>adx*2){nr=dr>0?1:-1;nc=0}else{nr=dr>0?1:-1;nc=dc>0?1:-1}const steps=nr===0?adx:nc===0?ady:Math.min(adx,ady);const sel=[];for(let s=0;s<=steps;s++){const r=sr+nr*s,c=sc+nc*s;if(r>=0&&r<sz&&c>=0&&c<sz)sel.push(r*sz+c)}return sel}
function updWS(){const newSel=new Set(wordSel);if(_wcEls){(_wcPrevSel||new Set()).forEach(i=>{if(!newSel.has(i))_wcEls[i]?.classList.remove('selected')});newSel.forEach(i=>{if(!(_wcPrevSel||new Set()).has(i))_wcEls[i]?.classList.add('selected')})}else{document.querySelectorAll('.wc').forEach(c=>c.classList.remove('selected'));wordSel.forEach(i=>document.querySelector(`.wc[data-i="${i}"]`)?.classList.add('selected'))}_wcPrevSel=newSel}
function chkW(){const fwd=wordSel.map(i=>wordGridData[i]).join('');const rev=wordSel.slice().reverse().map(i=>wordGridData[i]).join('');const word=wordWords.includes(fwd)?fwd:wordWords.includes(rev)?rev:null;if(word&&!wordFound.includes(word)){wordFound.push(word);wordScore+=20;setScore('word-score',wordScore);wordSel.forEach(i=>(_wcEls?_wcEls[i]:document.querySelector(`.wc[data-i="${i}"]`))?.classList.add('found'));renderWordList();toast('✓ '+word);if(wordFound.length===wordWords.length){wordScore+=Math.max(0,wordTime*2);setScore('word-score',wordScore);wordTotalFound+=wordWords.length;wordRound++;toast('🎉 완성! 다음 판으로~');setTimeout(()=>{const set=genWordGrid();wordWords=[...set.words];wordGridData=[...set.grid];wordFound=[];wordHinted=[];document.getElementById('word-guide').textContent=set.catName+' 와 관련된 단어를 찾아 드래그로 연결해주세요.';document.getElementById('word-cat').textContent=wordWords.length+'개 숨김';renderWordBoard();renderWordList()},600)}}wordSel=[];updWS()}
