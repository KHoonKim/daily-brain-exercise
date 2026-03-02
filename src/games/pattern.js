// ===== 7. PATTERN - 패턴 완성 =====
let patScore,patRound,patMaxCombo,patCombo,patTime,patExplain='',patQueue=[];
const PAT_TYPES=[
  // 1. ABAB 반복 (가장 쉬움)
  ()=>{const e=['A','B','C','D','E'],a=e[~~(Math.random()*5)];let b;do{b=e[~~(Math.random()*5)]}while(b===a);return{seq:[a,b,a,b],answer:a,opts:[a,b,e[~~(Math.random()*5)]].filter((v,i,ar)=>ar.indexOf(v)===i).concat(e[~~(Math.random()*5)]).slice(0,4).sort(()=>Math.random()-.5),explain:'반복 패턴: '+a+', '+b+' 교대 반복'}},
  // 2. 기호 교대
  ()=>({seq:['○','●','○','●'],answer:'○',opts:['○','●','◇','◆'].sort(()=>Math.random()-.5),explain:'교대 패턴: ○● 반복'}),
  // 3. 대문자 소문자 교대
  ()=>{const c=String.fromCharCode(65+~~(Math.random()*20));return{seq:[c.toUpperCase(),c.toLowerCase(),c.toUpperCase(),c.toLowerCase()],answer:c.toUpperCase(),opts:[c.toUpperCase(),c.toLowerCase(),'A','b'].sort(()=>Math.random()-.5),explain:'대소문자 교대: 대문자와 소문자가 번갈아 나옴'}},
  // 4. 시계 방향 (화살표)
  ()=>({seq:['↑','→','↓','←'],answer:'↑',opts:['↑','→','↓','←'].sort(()=>Math.random()-.5),explain:'회전 패턴: 시계 방향으로 90도씩 회전'}),
  // 5. 주사위 눈
  ()=>({seq:['⚀','⚁','⚂','⚃'],answer:'⚄',opts:['⚄','⚅','⚃','⚂'].sort(()=>Math.random()-.5),explain:'주사위: 1, 2, 3, 4 다음은 5'}),
  // 6. 등차수열 증가
  ()=>{const s=~~(Math.random()*5)+1,st=~~(Math.random()*3)+1,seq=[];for(let i=0;i<5;i++)seq.push(s+st*i);const a=seq.pop();return{seq:seq.map(String),answer:String(a),opts:genOpts(a,4).map(String),explain:'등차수열: +'+st+'씩 증가'}},
  // 7. 등차수열 감소
  ()=>{const s=20+~~(Math.random()*10),st=~~(Math.random()*3)+1;return{seq:[s,s-st,s-st*2,s-st*3].map(String),answer:String(s-st*4),opts:genOpts(s-st*4,4).map(String),explain:'등차수열: '+st+'씩 감소'}},
  // 8. 짝수 수열
  ()=>{const s=(~~(Math.random()*5)+1)*2;return{seq:[s,s+2,s+4,s+6].map(String),answer:String(s+8),opts:genOpts(s+8,4).map(String),explain:'짝수 패턴: 2씩 커지는 짝수의 나열'}},
  // 9. 홀수 수열
  ()=>{const s=(~~(Math.random()*5)+1)*2+1;return{seq:[s,s+2,s+4,s+6].map(String),answer:String(s+8),opts:genOpts(s+8,4).map(String),explain:'홀수 패턴: 2씩 커지는 홀수의 나열'}},
  // 10. 3의 배수
  ()=>{const s=(~~(Math.random()*3)+1)*3;return{seq:[s,s+3,s+6,s+9].map(String),answer:String(s+12),opts:genOpts(s+12,4).map(String),explain:'3의 배수: 3씩 늘어나는 규칙'}},
  // 11. 무지개 색상 (영어 앞글자)
  ()=>({seq:['R','O','Y','G'],answer:'B',opts:['B','V','K','W'].sort(()=>Math.random()-.5),explain:'무지개 순서: Red, Orange, Yellow, Green, Blue'}),
  // 12. 요일 패턴 (한글)
  ()=>{const days=['월','화','수','목','금','토','일'],s=~~(Math.random()*3);return{seq:[days[s],days[s+1],days[s+2],days[s+3]],answer:days[s+4],opts:[days[s+4],days[(s+5)%7],'단','결'].slice(0,4).sort(()=>Math.random()-.5),explain:'요일 순서: 월화수목금토일'}},
  // 13. 월 패턴 (영어)
  ()=>({seq:['Jan','Feb','Mar','Apr'],answer:'May',opts:['May','Jun','Jul','Aug'].sort(()=>Math.random()-.5),explain:'월 순서(Month): 1월부터 5월까지'}),
  // 14. 알파벳 순서 (+1)
  ()=>{const s=65+~~(Math.random()*10);return{seq:[0,1,2,3].map(i=>String.fromCharCode(s+i)),answer:String.fromCharCode(s+4),opts:[4,5,6,7].map(i=>String.fromCharCode(s+i)).sort(()=>Math.random()-.5),explain:'알파벳 순서: ABCDE...'}},
  // 15. 거꾸로 알파벳
  ()=>({seq:['Z','Y','X','W'],answer:'V',opts:['U','V','T','S'].sort(()=>Math.random()-.5),explain:'알파벳 역순: Z부터 거꾸로'}),
  // 16. 덧셈 조합 (A+B=C)
  ()=>{const a=~~(Math.random()*5)+1,b=~~(Math.random()*5)+1;return{seq:[a,'+',b,'='],answer:String(a+b),opts:genOpts(a+b,4).map(String),explain:'단순 연산: 두 수의 합'}},
  // 17. 로마 숫자
  ()=>({seq:['I','II','III','IV'],answer:'V',opts:['V','VI','X','L'].sort(()=>Math.random()-.5),explain:'로마 숫자: 1, 2, 3, 4 다음은 5(V)'}),
  // 18. 숫자 반복 개수 증가
  ()=>({seq:['1','22','333','4444'],answer:'55555',opts:['5555','55555','555555','66666'].sort(()=>Math.random()-.5),explain:'반복 증가: 숫자의 값만큼 숫자를 반복함'}),
  // 19. 거울 숫자 (대칭 패턴)
  ()=>({seq:['101','202','303','404'],answer:'505',opts:['505','606','515','555'].sort(()=>Math.random()-.5),explain:'대칭 패턴: 앞뒤가 같은 숫자의 증가'}),
  // 20. 알파벳 건너뛰기 (+2)
  ()=>{const s=65+~~(Math.random()*5);return{seq:[0,2,4,6].map(i=>String.fromCharCode(s+i)),answer:String.fromCharCode(s+8),opts:[7,8,9,10].map(i=>String.fromCharCode(s+i)).sort(()=>Math.random()-.5),explain:'알파벳 건너뛰기: 한 글자씩 건너뜀'}},
  // 21. 10의 보수
  ()=>{const n=~~(Math.random()*9)+1;return{seq:[n,10-n,n+1,10-(n+1)],answer:String(n+2),opts:genOpts(n+2,4).map(String),explain:'교대 보수: 앞뒤 합이 10이 되는 쌍의 나열'}},
  // 22. 소수
  ()=>({seq:['2','3','5','7'],answer:'11',opts:['9','11','13','15'].sort(()=>Math.random()-.5),explain:'소수 패턴: 1과 자신으로만 나누어지는 수'}),
  // 23. 삼각수
  ()=>({seq:['1','3','6','10'],answer:'15',opts:['12','14','15','16'].sort(()=>Math.random()-.5),explain:'삼각수: 1, 1+2, 1+2+3, 1+2+3+4, 1+2+3+4+5'}),
  // 24. 제곱수
  ()=>({seq:['1','4','9','16'],answer:'25',opts:genOpts(25,4).map(String),explain:'제곱수: 1², 2², 3², 4², 5²=25'}),
  // 25. 등비수열 x2
  ()=>{const s=~~(Math.random()*3)+1;return{seq:[s,s*2,s*4,s*8].map(String),answer:String(s*16),opts:genOpts(s*16,4).map(String),explain:'×2 패턴: 매번 2배씩 증가'}},
  // 26. 등비수열 x3
  ()=>{const s=~~(Math.random()*2)+1;return{seq:[s,s*3,s*9,s*27].map(String),answer:String(s*81),opts:genOpts(s*81,4).map(String),explain:'×3 패턴: 매번 3배씩 증가'}},
  // 27. 점진적 기호 추가
  ()=>({seq:['★','★☆','★☆★','★☆★☆'],answer:'★☆★☆★',opts:['★☆★☆★','☆★☆★☆','★★★★★','☆☆☆☆☆'].sort(()=>Math.random()-.5),explain:'기호 누적: 별과 빈 별을 번갈아 하나씩 추가'}),
  // 28. 피보나치 수열
  ()=>{const a=~~(Math.random()*3)+1,b=~~(Math.random()*3)+2;return{seq:[a,b,a+b,b+a+b].map(String),answer:String(a+b+b+a+b),opts:genOpts(a+b+b+a+b,4).map(String),explain:'피보나치: 앞 두 수의 합 ('+(a+b)+'+'+(b+a+b)+'='+(a+b*2+a+b)+')'}},
  // 29. 계차수열 (+1,+2,+3...)
  ()=>{let s=~~(Math.random()*5),seq=[];for(let i=1;i<=4;i++){seq.push(s);s+=i}return{seq:seq.map(String),answer:String(s),opts:genOpts(s,4).map(String),explain:'계차수열: 증가하는 양이 1, 2, 3, 4...로 커짐'}},
  // 30. 복합 연산 (+2, *2)
  ()=>{let s=2,seq=[];for(let i=0;i<4;i++){seq.push(s);s=(i%2===0)?s+2:s*2}return{seq:seq.map(String),answer:String(s),opts:genOpts(s,4).map(String),explain:'복합 규칙: +2와 ×2를 번갈아 수행'}}
];
function genOpts(a,c){const o=[a];while(o.length<c){const v=a+~~(Math.random()*10)-5;if(v!==a&&v>0&&!o.includes(v))o.push(v)}return o.sort(()=>Math.random()-.5)}
function patShuffleQueue(){patQueue=[...Array(PAT_TYPES.length).keys()].sort(()=>Math.random()-.5)}
function initPattern(){patScore=0;patRound=0;patCombo=0;patMaxCombo=0;patTime=30;patShuffleQueue();document.getElementById('pat-score').textContent='0점';initHearts('pat');
document.getElementById('pat-round').textContent='30s';
clearInterval(curTimer);setTickFn(patTick);curTimer=setInterval(patTick,1000);patNext()}
function patTick(){patTime--;document.getElementById('pat-round').textContent=patTime+'s';if(patTime<=10)document.getElementById('pat-round').className='g-timer urgent';if(patTime<=0){clearInterval(curTimer);setTimeExtendResumeCallback((s)=>{patTime=s;document.getElementById('pat-round').textContent=patTime+'s';document.getElementById('pat-round').className='g-timer';curTimer=setInterval(patTick,1000);patNext()});showResult(patScore,'패턴 완성',[{val:patMaxCombo+'x',label:'최대 콤보'}], {_isTimerEnd:true})}}
function patNext(){patRound++;if(patQueue.length===0)patShuffleQueue();const g=PAT_TYPES[patQueue.pop()]();patExplain=g.explain||'';document.getElementById('pat-seq').innerHTML=g.seq.map(s=>`<div class="pat-item">${s}</div>`).join('')+'<div class="pat-item q">?</div>';document.getElementById('pat-opts').innerHTML=g.opts.map(o=>`<div class="pat-opt" onclick="patPick(this,'${o}','${g.answer}')">${o}</div>`).join('')}
function patPick(el,p,a){if(el.classList.contains('ok')||el.classList.contains('no'))return;document.querySelector('.pat-item.q').textContent=a;document.querySelector('.pat-item.q').classList.remove('q');if(p===a){el.classList.add('ok');patCombo++;patMaxCombo=Math.max(patMaxCombo,patCombo);patScore+=10*(1+~~(patCombo/3));setScore('pat-score',patScore);toast(patCombo>=3?''+patCombo+'콤보! — '+patExplain:'✓ '+patExplain)}else{el.classList.add('no');patCombo=0;document.querySelectorAll('.pat-opt').forEach(o=>{if(o.textContent===a)o.classList.add('ok')});toast('→ '+patExplain);curScore=patScore;setHeartResumeCallback(patNext);if(loseHeart('pat'))return}scheduleNextQuestion(patNext,700)}
