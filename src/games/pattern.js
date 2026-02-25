// ===== GAME 7: PATTERN =====
let patScore,patRound,patMaxCombo,patCombo,patTime,patExplain='';
const PAT_TYPES=[
  ()=>{const s=~~(Math.random()*5)+1,st=~~(Math.random()*3)+1,seq=[];for(let i=0;i<5;i++)seq.push(s+st*i);const a=seq.pop();return{seq:seq.map(String),answer:String(a),opts:genOpts(a,4).map(String),explain:'등차수열: +'+st+'씩 증가'}},
  ()=>{const e=['A','B','C','D','E'],a=e[~~(Math.random()*5)];let b;do{b=e[~~(Math.random()*5)]}while(b===a);return{seq:[a,b,a,b],answer:a,opts:[a,b,e[~~(Math.random()*5)]].filter((v,i,ar)=>ar.indexOf(v)===i).concat(e[~~(Math.random()*5)]).slice(0,4).sort(()=>Math.random()-.5),explain:'반복 패턴: '+a+', '+b+' 교대 반복'}},
  ()=>{const a=~~(Math.random()*3)+1,b=~~(Math.random()*3)+2;return{seq:[a,b,a+b,b+a+b].map(String),answer:String(a+b+b+a+b),opts:genOpts(a+b+b+a+b,4).map(String),explain:'피보나치: 앞 두 수의 합 ('+b+'+'+(a+b)+'='+(a+b+b)+', '+(a+b)+'+'+(b+a+b)+'='+(a+b+b+a+b)+')'}},
  ()=>({seq:['1','4','9','16'],answer:'25',opts:genOpts(25,4).map(String),explain:'제곱수: 1², 2², 3², 4², 5²=25'}),
  ()=>{const s=~~(Math.random()*3)+1;return{seq:[s,s*2,s*4,s*8].map(String),answer:String(s*16),opts:genOpts(s*16,4).map(String),explain:'×2 패턴: 매번 2배씩 증가'}},
  ()=>({seq:['○','●','○','●'],answer:'○',opts:['○','●','◇','◆'].sort(()=>Math.random()-.5),explain:'교대 패턴: ○● 반복'}),
  ()=>({seq:['R','O','Y','G'],answer:'B',opts:['B','V','K','W'].sort(()=>Math.random()-.5),explain:'무지개 순서: R→O→Y→G→B(lue)'})
];
function genOpts(a,c){const o=[a];while(o.length<c){const v=a+~~(Math.random()*10)-5;if(v!==a&&v>0&&!o.includes(v))o.push(v)}return o.sort(()=>Math.random()-.5)}
function initPattern(){patScore=0;patRound=0;patCombo=0;patMaxCombo=0;patTime=30;document.getElementById('pat-score').textContent='0점';initHearts('pat');
document.getElementById('pat-round').textContent='30s';
clearInterval(curTimer);curTimer=setInterval(()=>{patTime--;document.getElementById('pat-round').textContent=patTime+'s';
if(patTime<=10)document.getElementById('pat-round').className='g-timer urgent';
if(patTime<=0){clearInterval(curTimer);showResult(patScore,'패턴 완성',[{val:patMaxCombo+'x',label:'최대 콤보'}], {_isTimerEnd:true})}},1000);patNext()}
function patNext(){patRound++;const g=PAT_TYPES[~~(Math.random()*PAT_TYPES.length)]();patExplain=g.explain||'';document.getElementById('pat-seq').innerHTML=g.seq.map(s=>`<div class="pat-item">${s}</div>`).join('')+'<div class="pat-item q">?</div>';document.getElementById('pat-opts').innerHTML=g.opts.map(o=>`<div class="pat-opt" onclick="patPick(this,'${o}','${g.answer}')">${o}</div>`).join('')}
function patPick(el,p,a){if(el.classList.contains('ok')||el.classList.contains('no'))return;document.querySelector('.pat-item.q').textContent=a;document.querySelector('.pat-item.q').classList.remove('q');if(p===a){el.classList.add('ok');patCombo++;patMaxCombo=Math.max(patMaxCombo,patCombo);patScore+=10*(1+~~(patCombo/3));setScore('pat-score',patScore);toast(patCombo>=3?''+patCombo+'콤보! — '+patExplain:'✓ '+patExplain)}else{el.classList.add('no');patCombo=0;document.querySelectorAll('.pat-opt').forEach(o=>{if(o.textContent===a)o.classList.add('ok')});toast('→ '+patExplain);curScore=patScore;if(loseHeart('pat'))return}setTimeout(patNext,1200)}
