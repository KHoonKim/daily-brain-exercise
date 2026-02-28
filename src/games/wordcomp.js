// ===== 18. WORD COMP - 단어 완성 =====
let wcScore,wcTime,wcTotal,wcQTimer,wcQTime,wcQLimit;
const WC_DB=[
  // 2글자 단어 (1-20)
  {word:'사_',full:'사과',hint:'빨간 과일',opts:['과','랑','람','울']},
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
  {word:'_실',full:'침실',hint:'잠자는 곳',opts:['침','주','부','목']},
  {word:'_기',full:'용기',hint:'두려움을 이기는',opts:['용','전','공','운']},
  {word:'자_',full:'자유',hint:'구속 없는 상태',opts:['유','연','동','리']},
  {word:'_식',full:'지식',hint:'배워서 아는 것',opts:['지','음','의','상']},
  {word:'_실',full:'진실',hint:'거짓의 반대',opts:['진','현','교','빈']},
  {word:'평_',full:'평화',hint:'☮ 전쟁 없는',opts:['화','야','일','소']},
  {word:'_상',full:'이상',hint:'꿈꾸는 모습',opts:['이','사','현','비']},
  {word:'_래',full:'미래',hint:'앞으로 올 시간',opts:['미','노','거','과']},
  // 2글자 단어 (21-50)
  {word:'우_',full:'우주',hint:'별과 행성이 있는 곳',opts:['주','리','림','별']},
  {word:'_무',full:'나무',hint:'산에서 자라는',opts:['나','다','가','마']},
  {word:'태_',full:'태양',hint:'낮에 뜨는 뜨거운 별',opts:['양','음','빛','현']},
  {word:'_차',full:'기차',hint:'칙칙폭폭 레일 위',opts:['기','자','마','나']},
  {word:'_도',full:'지도',hint:'길을 찾을 때 보는',opts:['지','위','약','보']},
  {word:'안_',full:'안경',hint:'눈이 나쁠 때 써요',opts:['경','심','대','문']},
  {word:'_기',full:'아기',hint:'응애응애 귀여운',opts:['아','오','우','이']},
  {word:'_름',full:'여름',hint:'더운 계절',opts:['여','가','겨','봄']},
  {word:'의_',full:'의사',hint:'병원에서 치료해주는',opts:['사','원','료','무']},
  {word:'시_',full:'시계',hint:'시간을 알려주는',opts:['계','분','초','간']},
  {word:'_래',full:'노래',hint:'즐겁게 불러요',opts:['노','모','소','미']},
  {word:'수_',full:'수박',hint:'줄무늬 큰 과일',opts:['박','영','도','건']},
  {word:'_도',full:'포도',hint:'보라색 송이 과일',opts:['포','사','배','귤']},
  {word:'우_',full:'우유',hint:'하얀 건강 음료',opts:['유','산','수','기']},
  {word:'_름',full:'구름',hint:'하늘의 솜사탕',opts:['구','여','푸','바']},
  {word:'산_',full:'산책',hint:'가볍게 걷기',opts:['책','보','소','길']},
  {word:'_표',full:'우표',hint:'편지 봉투에 붙여요',opts:['우','수','지','태']},
  {word:'커_',full:'커피',hint:'검고 쓴 음료',opts:['피','페','라','티']},
  {word:'_자',full:'의자',hint:'앉을 때 필요해요',opts:['의','탁','책','침']},
  {word:'_리',full:'요리',hint:'맛있는 음식 만들기',opts:['요','조','식','배']},
  {word:'거_',full:'거울',hint:'얼굴을 비춰요',opts:['울','실','문','기']},
  {word:'_찰',full:'경찰',hint:'도둑을 잡는',opts:['경','검','형','사']},
  {word:'_림',full:'그림',hint:'도화지에 그려요',opts:['그','소','색','나']},
  {word:'지_',full:'지구',hint:'우리가 사는 행성',opts:['구','계','도','형']},
  {word:'_화',full:'전화',hint:'멀리 있는 사람과 통화',opts:['전','신','통','대']},
  {word:'소_',full:'소풍',hint:'즐겁게 놀러 가기',opts:['풍','식','학','동']},
  {word:'_추',full:'고추',hint:'매운 채소',opts:['고','배','상','마']},
  {word:'기_',full:'기쁨',hint:'웃음이 나는 마음',opts:['쁨','운','분','상']},
  {word:'_도',full:'기도',hint:'간절히 바라는 것',opts:['기','소','희','원']},
  {word:'_망',full:'희망',hint:'밝은 내일의 기대',opts:['희','소','전','꿈']},
  // 3글자 단어 (51-79)
  {word:'무_개',full:'무지개',hint:'비 온 뒤 일곱 빛깔',opts:['지','신','하','아']},
  {word:'옥_수',full:'옥수수',hint:'노란 알갱이 곡물',opts:['수','밀','보','콩']},
  {word:'비_기',full:'비행기',hint:'하늘을 나는 탈것',opts:['행','차','공','버']},
  {word:'_전거',full:'자전거',hint:'두 바퀴로 가요',opts:['자','기','유','오']},
  {word:'도_관',full:'도서관',hint:'책 읽는 곳',opts:['서','락','물','관']},
  {word:'코끼_',full:'코끼리',hint:'코가 아주 긴 동물',opts:['리','코','끼','바']},
  {word:'_과점',full:'제과점',hint:'빵과 케이크 파는 곳',opts:['제','빵','백','상']},
  {word:'휴_폰',full:'휴대폰',hint:'스마트폰 다른 말',opts:['대','스','핸','태']},
  {word:'컴_터',full:'컴퓨터',hint:'IT 기기',opts:['퓨','큐','뮤','튜']},
  {word:'_동차',full:'자동차',hint:'도로 위 네 바퀴',opts:['자','기','전','트']},
  {word:'고_마',full:'고구마',hint:'겨울철 맛있는 간식',opts:['구','감','도','마']},
  {word:'앵_새',full:'앵무새',hint:'말을 잘 따라해요',opts:['무','비','갈','까']},
  {word:'선_님',full:'선생님',hint:'가르쳐 주시는 분',opts:['생','교','사','의']},
  {word:'카_라',full:'카메라',hint:'사진 찍는 기계',opts:['메','네','레','테']},
  {word:'_마토',full:'토마토',hint:'빨간 채소 같은 과일',opts:['토','포','도','수']},
  {word:'사_다',full:'사이다',hint:'톡 쏘는 투명 음료',opts:['이','삼','오','구']},
  {word:'_치원',full:'유치원',hint:'어린이들이 배우는 곳',opts:['유','학','교','어']},
  {word:'무_화',full:'무궁화',hint:'우리나라 꽃',opts:['궁','진','국','장']},
  {word:'백_점',full:'백화점',hint:'쇼핑하기 좋은 큰 건물',opts:['화','상','고','금']},
  {word:'편_점',full:'편의점',hint:'24시간 열려 있는',opts:['의','리','문','상']},
  {word:'_화기',full:'소화기',hint:'불을 끌 때 사용해요',opts:['소','전','변','계']},
  {word:'주_소',full:'주유소',hint:'차에 기름 넣는 곳',opts:['유','식','차','정']},
  {word:'_구장',full:'야구장',hint:'홈런을 치는 곳',opts:['야','축','농','배']},
  {word:'_영장',full:'수영장',hint:'어푸어푸 수영해요',opts:['수','목','욕','헬']},
  {word:'영_관',full:'영화관',hint:'팝콘 먹으며 영화 보기',opts:['화','상','진','투']},
  {word:'_원경',full:'망원경',hint:'멀리 있는 것을 봐요',opts:['망','안','현','거']},
  {word:'현_경',full:'현미경',hint:'작은 것을 크게 봐요',opts:['미','망','안','경']},
  {word:'장_감',full:'장난감',hint:'어린이가 가지고 노는 것',opts:['난','인','완','선']},
  {word:'_화기',full:'전화기',hint:'통화하는 기계',opts:['전','통','신','인']},
  // 4글자 이상 단어 (80-93)
  {word:'_레비전',full:'텔레비전',hint:'TV의 긴 이름',opts:['텔','테','셀','델']},
  {word:'아_스크림',full:'아이스크림',hint:'여름에 인기 있는 디저트',opts:['이','아','어','우']},
  {word:'_리마을',full:'우리마을',hint:'내가 사는 동네',opts:['우','내','그','저']},
  {word:'스_트폰',full:'스마트폰',hint:'똑똑한 휴대전화',opts:['마','매','무','메']},
  {word:'_한민국',full:'대한민국',hint:'우리나라 이름',opts:['대','한','민','국']},
  {word:'대_민국',full:'대한민국',hint:'우리의 조국',opts:['한','대','국','민']},
  {word:'독_리',full:'독수리',hint:'하늘의 제왕 조류',opts:['수','도','매','기']},
  {word:'해_라기',full:'해바라기',hint:'태양만 바라보는 꽃',opts:['바','나','다','가']},
  {word:'할_버지',full:'할아버지',hint:'아빠의 아빠',opts:['아','어','외','할']},
  {word:'_머니',full:'어머니',hint:'나를 낳아주신 분',opts:['어','아','할','이']},
  {word:'생_파티',full:'생일파티',hint:'태어난 날 축하해요',opts:['일','축','선','물']},
  {word:'크리스_스',full:'크리스마스',hint:'12월 25일 예수님 탄신일',opts:['마','성','축','트']},
  {word:'가위바위_',full:'가위바위보',hint:'주먹, 가위, 보!',opts:['보','이','수','가']},
  {word:'소_과',full:'소아과',hint:'어린이들이 가는 병원',opts:['아','치','내','산']},
];
function initWordcomp(){wcScore=0;wcTime=30;wcTotal=0;document.getElementById('wc-score').textContent='0점';initHearts('wc');
document.getElementById('wc-timer').textContent='30s';document.getElementById('wc-timer').className='g-timer';
clearInterval(curTimer);setTickFn(wcTick);curTimer=setInterval(wcTick,1000);wcGen()}
function wcTick(){wcTime--;document.getElementById('wc-timer').textContent=wcTime+'s';if(wcTime<=10)document.getElementById('wc-timer').className='g-timer urgent';if(wcTime<=0){clearInterval(curTimer);clearInterval(wcQTimer);setTimeExtendResumeCallback((s)=>{wcTime=s;document.getElementById('wc-timer').textContent=wcTime+'s';document.getElementById('wc-timer').className='g-timer';curTimer=setInterval(wcTick,1000);wcGen()});showResult(wcScore,'단어 완성',[{val:wcTotal,label:'문제 수'}], {_isTimerEnd:true})}}
function wcGen(){const q=WC_DB[~~(Math.random()*WC_DB.length)];
document.getElementById('wc-word').textContent=q.word;
document.getElementById('wc-hint').textContent='힌트: '+q.hint;
const ans=q.opts[0];const opts=[...q.opts].sort(()=>Math.random()-.5);
document.getElementById('wc-opts').innerHTML=opts.map(o=>`<div class="wc-opt" onclick="wcPick(this,'${o}','${ans}','${q.full}')">${o}</div>`).join('');
wcQLimit=Math.max(1.5,3.0-wcTotal*0.06);wcQTime=wcQLimit;clearInterval(wcQTimer);
const wcbar=document.getElementById('wc-qbar');if(wcbar){wcbar.style.transition='none';wcbar.style.width='100%';wcbar.offsetWidth;wcbar.style.transition=`width ${wcQLimit}s linear`;wcbar.style.width='0%'}const wcqt=document.getElementById('wc-q-time');if(wcqt)wcqt.textContent=wcQLimit.toFixed(1)+'s';
wcQTimer=setInterval(()=>{wcQTime-=0.1;document.getElementById('wc-q-time').textContent=Math.max(0,wcQTime).toFixed(1)+'s';if(wcQTime<=0){clearInterval(wcQTimer);wcTotal++;curScore=wcScore;setHeartResumeCallback(wcGen);if(loseHeart('wc'))return;scheduleNextQuestion(wcGen,300)}},100)}
function wcPick(el,picked,answer,full){if(el.classList.contains('ok')||el.classList.contains('no'))return;clearInterval(wcQTimer);wcTotal++;
if(picked===answer){el.classList.add('ok');const pct=wcQTime/wcQLimit;const bonus=pct>.75?5:pct>.5?3:1;wcScore+=10+bonus;setScore('wc-score',wcScore);document.getElementById('wc-word').textContent=full}
else{el.classList.add('no');document.querySelectorAll('.wc-opt').forEach(o=>{if(o.textContent===answer)o.classList.add('ok')});document.getElementById('wc-word').textContent=full;curScore=wcScore;setHeartResumeCallback(wcGen);if(loseHeart('wc'))return}
scheduleNextQuestion(wcGen,700)}
