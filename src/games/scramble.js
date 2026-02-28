// ===== 32. SCRAMBLE - 글자 섞기 =====
let scScore,scTime,scLevel,scQTimer,scQTime,scQLimit;
const SC_WORDS=[
'사과','포도','수박','딸기','기차','버스','학교','병원','공원','피자','치킨','라면','축구','야구','농구','배구','음악','미술','과학','수학','토끼','바다','여행','안경','모자','구름','나비','시계','우산','거울','창문','의자','연필','지구','우주','가방','신발','양말','장갑','모래','바람','이슬','노을','저녁','아침','점심','책상','칠판','분필','공책','가위','풀칠','색연','도장','상자','열쇠','자물','편지','봉투','우표','택배','선물','꽃병','화분','잔디','나무','숲길','계단','지붕','벽돌','타일','기둥','울타','다리','터널','항구','등대','파도','조개',
'바나나','오렌지','자동차','비행기','도서관','우체국','컴퓨터','전화기','냉장고','세탁기','거북이','코끼리','원숭이','고양이','강아지','햄버거','테니스','선인장','소방차','경찰차','구급차','초콜릿','운동장','수영장','놀이터','호랑이','미술관','박물관','수족관','고구마','감자탕','해바라기','사탕수수','김치찌개','된장찌개','비빔밥','떡볶이','잡채밥','삼겹살','불고기','갈비탕','설렁탕','냉면집','칼국수','만두국','주먹밥','김밥집','라면집','카페인','에너지','비타민','단백질','탄수화물','지방산','아미노산','산소통','이산화탄소','헬리콥터','잠수함','요트선','돛단배','스케이트','스키장','볼링장','당구장','탁구공','배드민턴','마라톤','트라이','철인삼','축구장','농구장','야구장','테니스장','골프장','수영복','운동화','등산화','장화신','슬리퍼','샌들신','목도리','귀마개','손난로','핫초코','아메리카노','카푸치노','에스프레소','라떼아트','밀크티','녹차라떼','딸기쥬스','오렌지쥬스','포도쥬스','망고쥬스','레모네이드','탄산수','생수통','보리차','옥수수차',
'텔레비전','백화점','유치원생','초등학생','고등학생','운동선수','프로그래머','디자이너','피아니스트','바이올린','아이스크림','미끄럼틀','카멜레온','크리스마스','발렌타인','스마트폰','인스타그램','에스컬레이터','롤러코스터','트램펄린','회전목마','관람차','대관람차','워터파크','놀이공원','동물원','식물원','천문대','전망대','도서관','수영장','체육관','볼링장','노래방','영화관','음악실','과학실','미술실','컴퓨터실','운동장','강당','교무실','보건실','급식실','도서실','상담실','방송실','주차장','엘리베이터','에어컨','선풍기','가습기','제습기','공기청정기','전자레인지','식기세척기','건조기','청소기','다리미','믹서기','토스터','커피머신','정수기','냉온수기','안마의자','러닝머신','자전거','킥보드','오토바이',
'할로윈파티','올림픽경기','월드컵축구','블루투스','해돋이','무지개','태블릿','노트북','헤드폰','인터넷','유튜브','롤러블레이드','스노보드','스카이다이빙','번지점프','패러글라이딩','카약타기','서핑보드','윈드서핑','제트스키','수상스키','스쿠버다이빙','열기구타기','행글라이더','경비행기','드론촬영','인공지능','가상현실','증강현실','사물인터넷','빅데이터','클라우드','블록체인','메타버스','자율주행','전기자동차','수소자동차','태양광발전','풍력발전','지열발전','원자력발전','재활용센터','정수처리장','하수처리장','기상관측소','천문관측소','해양연구소','우주정거장','인공위성','화성탐사선'];
function initScramble(){scScore=0;scTime=30;scLevel=0;document.getElementById('sc-score').textContent='0점';
document.getElementById('sc-timer').textContent='30s';document.getElementById('sc-timer').className='g-timer';
initHearts('sc');
clearInterval(curTimer);curTimer=setInterval(()=>{scTime--;document.getElementById('sc-timer').textContent=scTime+'s';
if(scTime<=10)document.getElementById('sc-timer').className='g-timer urgent';
if(scTime<=0){clearInterval(curTimer);clearInterval(scQTimer);showResult(scScore,'글자 섞기',[], {_isTimerEnd:true})}},1000);scGen()}
function scGen(){const minLen=scLevel<4?2:scLevel<8?3:scLevel<14?4:5;
const pool=SC_WORDS.filter(w=>w.length>=minLen);
const word=pool[~~(Math.random()*pool.length)];scLevel++;
const chars=[...word];const shuffled=[...chars].sort(()=>Math.random()-.5);
if(shuffled.join('')===word)shuffled.reverse();
document.getElementById('sc-scrambled').innerHTML=shuffled.map(c=>`<span style="background:var(--card);border-radius:8px;padding:8px 14px;box-shadow:var(--shadow)">${c}</span>`).join('');
const sameLen=SC_WORDS.filter(w=>w.length===word.length&&w!==word);
const diffLen=SC_WORDS.filter(w=>w!==word&&w.length!==word.length);
const decoys=[...sameLen].sort(()=>Math.random()-.5).slice(0,3);
while(decoys.length<3&&diffLen.length){const idx=~~(Math.random()*diffLen.length);decoys.push(diffLen.splice(idx,1)[0])}
const opts=[word,...decoys].sort(()=>Math.random()-.5);
document.getElementById('sc-opts').innerHTML=opts.map(o=>`<div class="sf-opt" onclick="scPick(this,'${o}','${word}')">${o}</div>`).join('');
scQLimit=Math.max(1.5, 3.0 - scLevel*0.08);
scQTime=scQLimit;clearInterval(scQTimer);
const bar=document.getElementById('sc-qbar');if(bar){bar.style.transition='none';bar.style.width='100%';bar.offsetWidth;bar.style.transition=`width ${scQLimit}s linear`;bar.style.width='0%'}const scqt=document.getElementById('sc-q-time');if(scqt)scqt.textContent=scQLimit.toFixed(1)+'s';
scQTimer=setInterval(()=>{scQTime-=0.1;document.getElementById('sc-q-time').textContent=Math.max(0,scQTime).toFixed(1)+'s';if(scQTime<=0){clearInterval(scQTimer);curScore=scScore;setHeartResumeCallback(scGen);if(loseHeart('sc'))return;scheduleNextQuestion(scGen,300)}},100)}
function scPick(el,picked,ans){if(el.classList.contains('ok')||el.classList.contains('no'))return;
clearInterval(scQTimer);
if(picked===ans){el.classList.add('ok');const pct=scQTime/scQLimit;const bonus=pct>.75?5:pct>.5?3:1;scScore+=10+bonus;setScore('sc-score',scScore)}
else{el.classList.add('no');document.querySelectorAll('#sc-opts .sf-opt').forEach(o=>{if(o.textContent===ans)o.classList.add('ok')});curScore=scScore;setHeartResumeCallback(scGen);if(loseHeart('sc'))return}
scheduleNextQuestion(scGen,500)}
