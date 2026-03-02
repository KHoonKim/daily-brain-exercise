# 두뇌나이 1살 단위 + 토스 게임센터 리더보드 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 두뇌나이를 10살 단위에서 1살 단위로 세분화하고, 게임 종료 시 누적 XP를 토스 게임센터 리더보드에 자동 제출한다.

**Architecture:** config.js의 RANKS 배열을 지수 공식 생성 함수로 교체하고(81단계), utils.js의 addXP()에 AIT.submitScore() 호출을 추가한다. 변경 파일은 단 2개.

**Tech Stack:** Vanilla JS, Vite (빌드), localStorage (XP 저장), window.__granite__ (토스 SDK)

---

## Task 1: RANKS 지수 곡선 생성 함수

**Files:**
- Modify: `src/core/config.js` (기존 `RANKS=[...]` 블록 교체)

### 현재 코드 (교체 대상)

```js
const RANKS=[
  {name:'100세',minXp:0,color:'#CD7F32',label:'100',age:100},
  {name:'90세',minXp:500,color:'#C0C0C0',label:'90',age:90},
  // ... (9개 항목)
  {name:'20세',minXp:80000,color:'#E040FB',label:'20',age:20},
];
```

### Step 1: 색상 보간 헬퍼 함수 추가

RANKS 배열 직전에 다음 코드를 삽입:

```js
function _hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function _rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}
function _interpolateColor(age,anchors){
  // anchors: [{age,color}], 내림차순 정렬 (100→20)
  for(let i=0;i<anchors.length-1;i++){
    const a=anchors[i],b=anchors[i+1];
    if(age<=a.age&&age>=b.age){
      const t=(a.age-age)/(a.age-b.age);
      const [r1,g1,b1]=_hexToRgb(a.color);
      const [r2,g2,b2]=_hexToRgb(b.color);
      return _rgbToHex(r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t);
    }
  }
  return anchors[anchors.length-1].color;
}
```

### Step 2: generateRanks 함수 + RANKS 교체

```js
function generateRanks(){
  const k=0.0615,C=590;
  const COLOR_ANCHORS=[
    {age:100,color:'#CD7F32'},
    {age:90, color:'#C0C0C0'},
    {age:80, color:'#9E9E9E'},
    {age:70, color:'#FFD700'},
    {age:60, color:'#FFA726'},
    {age:50, color:'#66BB6A'},
    {age:40, color:'#4DD0E1'},
    {age:30, color:'#42A5F5'},
    {age:20, color:'#E040FB'},
  ];
  const ranks=[];
  for(let age=100;age>=20;age--){
    const minXp=age===100?0:Math.round(C*(Math.exp(k*(100-age))-1));
    const color=_interpolateColor(age,COLOR_ANCHORS);
    ranks.push({name:`${age}세`,minXp,color,label:String(age),age});
  }
  return ranks;
}
const RANKS=generateRanks();
```

### Step 3: 빌드 후 콘솔에서 확인

브라우저 콘솔에서 검증:
```js
// 주요 앵커 XP 확인
console.table(RANKS.filter(r=>[100,90,80,70,60,50,40,30,20].includes(r.age))
  .map(r=>({age:r.age, minXp:r.minXp, color:r.color})));

// 총 81개인지 확인
console.assert(RANKS.length===81, 'RANKS length should be 81');

// 단조증가 확인
console.assert(RANKS.every((r,i)=>i===0||r.minXp>RANKS[i-1].minXp), 'XP should be monotonically increasing');
```

기대값:
- 100세: 0 XP
- 90세: ~500 XP
- 20세: ~80,000 XP
- 총 81개 항목

### Step 4: 커밋

```bash
cd /Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise
git add src/core/config.js
git commit -m "feat: 두뇌나이 1살 단위 지수 곡선으로 변경 (81단계)"
```

---

## Task 2: 게임 종료 시 XP 토스 게임센터 제출

**Files:**
- Modify: `src/core/utils.js:23` (`addXP` 함수)

### 현재 코드

```js
function addXP(n){const xp=getXP()+n;LS.set('xp',xp);if(window.AIT && AIT.checkPromoBrainAge50)AIT.checkPromoBrainAge50(xp);return xp}
```

### Step 1: addXP에 submitScore 추가

위 한 줄을 아래로 교체:

```js
function addXP(n){
  const xp=getXP()+n;
  LS.set('xp',xp);
  if(window.AIT){
    if(AIT.checkPromoBrainAge50)AIT.checkPromoBrainAge50(xp);
    AIT.submitScore(xp);
  }
  return xp;
}
```

> `AIT.submitScore`는 `src/core/ait.js`에 이미 구현됨:
> ```js
> async function submitScore(score){
>   if(!isToss)return{mock:true};
>   return await window.__granite__?.submitGameCenterLeaderBoardScore?.({score:String(score)});
> }
> ```
> 토스 앱 외 환경에서는 자동으로 `{mock:true}` 반환 → 오류 없음

### Step 2: 빌드 후 동작 확인

브라우저 콘솔에서 검증:
```js
// AIT.submitScore 모킹 후 addXP 호출
const orig = AIT.submitScore;
AIT.submitScore = (xp) => { console.log('[TEST] submitScore called with', xp); return orig(xp); };
addXP(10);
// 콘솔 출력: "[TEST] submitScore called with XXXX" 확인
AIT.submitScore = orig; // 복원
```

### Step 3: 게임 플레이 후 E2E 확인

1. 게임 1판 플레이 → 결과 화면 진입
2. 결과 화면에서 "리더보드" 버튼 탭
3. 토스 앱 내에서 리더보드 오버레이 열림 확인
   - 웹 환경에서는 `AIT.openLeaderboard()`가 아무 동작 안 함 (정상)

### Step 4: 빌드

```bash
npm run build
```

기대: 오류 없이 `js/core.js`, `js/games.js`, `js/sdk.js` 생성

### Step 5: 커밋

```bash
git add src/core/utils.js
git commit -m "feat: 게임 종료 시 XP를 토스 게임센터 리더보드에 자동 제출"
```

---

## 최종 확인사항

- [ ] `RANKS.length === 81`
- [ ] `RANKS[0].age === 100`, `RANKS[80].age === 20`
- [ ] 90세 XP ≈ 500, 20세 XP ≈ 80,000
- [ ] `addXP()` 호출 시 콘솔에 `submitScore` 로그 확인 (테스트 모킹)
- [ ] `npm run build` 오류 없음
- [ ] `CONFIG.LEADERBOARD_ID` placeholder 주석 → 토스에서 실제 ID 발급 필요 (별도 작업)

---

## 주의사항

- `LEADERBOARD_ID`는 현재 `'PLACEHOLDER_LEADERBOARD_ID'`로 설정됨 (`src/core/ait.js:14`)
- `submitGameCenterLeaderBoardScore` API는 leaderboard ID 파라미터 없이 호출 → 토스 앱 설정에서 미니앱에 연결된 리더보드 ID가 자동 매핑됨
- 배포 후 실제 토스 앱에서 테스트 필요 (샌드박스: Android 2025-12-16+, iOS 2025-12-07+)
