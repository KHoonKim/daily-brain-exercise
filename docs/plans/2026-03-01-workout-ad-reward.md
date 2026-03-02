# 오늘의 두뇌운동 광고 보상 시스템 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 오늘의 두뇌운동 마지막 게임 완료 시 결과페이지에서 "5초 광고보고 두뇌점수3점 받기" 버튼으로 교체하고, 광고 시청 후에만 두뇌점수 3점을 지급. 광고 미시청 시 홈 화면에서 재시도 가능.

**Architecture:** workout 객체에 `adRewarded` 필드를 추가해 `completed`(게임 완료)와 `adRewarded`(포인트 수령)를 분리 관리. 결과화면과 홈화면 모두 이 상태를 참조해 광고 버튼 노출 여부 결정.

**Tech Stack:** Vanilla JS, localStorage (LS util), AIT SDK (`AIT.showAd('interstitial')`)

---

### Task 1: workout 객체에 adRewarded 필드 추가

**Files:**
- Modify: `src/core/workout.js:52` (`wk` 초기화 부분)

**Step 1: adRewarded 필드 초기화 추가**

`getTodayWorkout()` 함수 내 `wk` 초기값 구성 부분에서 `adRewarded: false` 추가:

```js
// 기존 (workout.js:52)
wk={games:picked.map(g=>g.id),done:[],scores:{},targets,completed:false};

// 변경 후
wk={games:picked.map(g=>g.id),done:[],scores:{},targets,completed:false,adRewarded:false};
```

**Step 2: 수동 확인**

로컬에서 앱 열기 → 개발자 도구 콘솔:
```js
JSON.parse(localStorage.getItem('workout-' + new Date().toISOString().slice(0,10)))
// → adRewarded: false 필드 포함 확인
// 기존 오브젝트: 없어도 wk.adRewarded ?? false 로 backward compat 처리
```

**Step 3: Commit**

```bash
git add src/core/workout.js
git commit -m "feat: add adRewarded field to workout state"
```

---

### Task 2: finishWorkout() 리팩터링 - addPoints(3) 제거

**Files:**
- Modify: `src/core/workout.js` — `finishWorkout()` 함수 (line ~194)
- Modify: `src/core/workout.js` — `renderWorkout()` 함수 (line ~63) 내 중복 완료 처리

**Context:** `finishWorkout()`은 두 곳에서 호출됨:
1. `wkContinue()` → `finishWorkout()` (result.js에서 버튼 클릭 시)
2. `renderWorkout()` 내 `if(!wk.completed&&wk.done.length>=WK_SIZE)` 블록

두 곳 모두에서 `addPoints(3)` 제거해야 함. XP(+50)는 그대로 유지.

**Step 1: finishWorkout() 수정**

```js
// 기존 (workout.js ~line 194)
function finishWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);addPoints(3);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  wkActive=false;
  goHome();
}

// 변경 후 — addPoints(3) 제거, 함수명 wkFinish로 변경
function wkFinish(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  wkActive=false;
  document.getElementById('overlay').classList.remove('active');
  goHome();
}
```

**Step 2: renderWorkout() 내 중복 완료 처리 수정**

```js
// 기존 (workout.js ~line 63)
function renderWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);addPoints(3);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }

// 변경 후 — addPoints(3) 제거
function renderWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
```

**Step 3: wkContinue()에서 finishWorkout → wkFinish 호출로 변경**

`result.js`의 `wkContinue()` 함수에서 `finishWorkout()` 호출이 있는지 확인 후 `wkFinish()`로 교체:

```js
// workout.js 내 wkContinue()
function wkContinue(){
  document.getElementById('overlay').classList.remove('active');
  if(wkIdx<wkGames.length){
    showWkTransition();
  }else{
    wkFinish();  // finishWorkout() → wkFinish()
  }
}
```

**Step 4: Commit**

```bash
git add src/core/workout.js
git commit -m "refactor: extract wkFinish(), remove addPoints from workout completion"
```

---

### Task 3: wkFinishWithAd() 추가 (결과화면에서 광고 시청)

**Files:**
- Modify: `src/core/workout.js` — `wkFinish()` 아래에 신규 함수 추가

**Step 1: wkFinishWithAd() 함수 작성**

`showAd()`는 성공/실패 모두 cb를 호출하므로, `AIT.showAd()` 직접 사용해 성공 여부 판단:

```js
function wkFinishWithAd(){
  // 먼저 완료 처리 (XP 지급, 저장) — overlay는 닫지 않음
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  wkActive=false;

  // 광고 표시
  if(window.AIT && AIT.isToss){
    AIT.showAd('interstitial')
      .then(r=>{
        if(r && r.success!==false){
          const wk2=getTodayWorkout();
          if(!wk2.adRewarded){
            wk2.adRewarded=true;saveWorkout(wk2);
            addPoints(3);
            if(window.AIT) AIT.log('workout_ad_rewarded',{});
            toast('두뇌점수 3점 획득!');
          }
        } else {
          toast('광고를 불러오지 못했어요');
        }
        document.getElementById('overlay').classList.remove('active');
        goHome();
      })
      .catch(()=>{
        toast('광고를 불러오지 못했어요');
        document.getElementById('overlay').classList.remove('active');
        goHome();
      });
  } else {
    // 비Toss 환경(로컬 개발): 광고 없이 바로 3점 지급
    const wk2=getTodayWorkout();
    if(!wk2.adRewarded){
      wk2.adRewarded=true;saveWorkout(wk2);
      addPoints(3);
      toast('두뇌점수 3점 획득! (테스트)');
    }
    document.getElementById('overlay').classList.remove('active');
    goHome();
  }
}
```

**Step 2: Commit**

```bash
git add src/core/workout.js
git commit -m "feat: add wkFinishWithAd() for ad-gated brain point reward"
```

---

### Task 4: wkWatchAdForReward() 추가 (홈에서 광고 시청)

**Files:**
- Modify: `src/core/workout.js` — `wkFinishWithAd()` 아래에 신규 함수 추가

**Step 1: wkWatchAdForReward() 함수 작성**

```js
function wkWatchAdForReward(){
  if(window.AIT && AIT.isToss){
    AIT.showAd('interstitial')
      .then(r=>{
        if(r && r.success!==false){
          const wk=getTodayWorkout();
          if(!wk.adRewarded){
            wk.adRewarded=true;saveWorkout(wk);
            addPoints(3);
            if(window.AIT) AIT.log('workout_ad_rewarded_home',{});
            toast('두뇌점수 3점 획득!');
            renderWorkout();  // 홈 카드 갱신
          }
        } else {
          toast('광고를 불러오지 못했어요');
        }
      })
      .catch(()=>{ toast('광고를 불러오지 못했어요'); });
  } else {
    // 비Toss 환경
    const wk=getTodayWorkout();
    if(!wk.adRewarded){
      wk.adRewarded=true;saveWorkout(wk);
      addPoints(3);
      toast('두뇌점수 3점 획득! (테스트)');
      renderWorkout();
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/core/workout.js
git commit -m "feat: add wkWatchAdForReward() for home screen ad retry"
```

---

### Task 5: renderWorkout() 홈 화면 새 상태 분기 추가

**Files:**
- Modify: `src/core/workout.js` — `renderWorkout()` 함수의 완료 상태 HTML 부분

**Context:** 현재 `allDone = wk.completed` 하나로 분기하지만, 이제 `completed && adRewarded` (완전 완료) vs `completed && !adRewarded` (광고 미시청) 두 상태로 나뉨.

**Step 1: renderWorkout() allDone 분기 수정**

```js
function renderWorkout(){
  const wk=getTodayWorkout();
  if(!wk.completed&&wk.done.length>=WK_SIZE){
    wk.completed=true;saveWorkout(wk);
    addXP(50);
    if(window.AIT && AIT.checkPromoFirstWorkout)AIT.checkPromoFirstWorkout();
  }
  const el=document.getElementById('dailyWorkout');
  if(!el) return;
  const allDone=wk.completed;
  const adRewarded=wk.adRewarded??false;  // backward compat
  // ... (기존 변수들 유지)

  // 완료 상태 HTML 수정:
  // allDone && adRewarded → 기존 완료 카드 (변경 없음)
  // allDone && !adRewarded → 광고 버튼 포함 카드 (신규)
```

완료 카드 HTML을 다음과 같이 분기:

```js
el.innerHTML = !allDone ? `
  ... // 기존 진행 중 카드 (변경 없음)
` : !adRewarded ? `
  <div class="workout-card done tds-card tds-card--p20" style="margin-bottom:12px;border:1px solid var(--border)">
    <div style="text-align:center;padding:8px 0">
      <div style="margin-bottom:12px"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:48px;height:48px"></div>
      <div class="tds-st9 tds-fw-extrabold" style="margin-bottom:4px">오늘의 1분 두뇌운동 완료!</div>
      <div class="tds-t7 tds-color-sub" style="margin-bottom:16px">광고를 보고 두뇌점수 3점을 받아가세요</div>
    </div>
    <div class="wk-games" style="margin:0 0 16px;display:flex;gap:8px">
      ${wk.games.map(id=>{const g=GAMES.find(x=>x.id===id);return`<div class="wk-game done" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border-radius:var(--r12);background:rgba(49,130,246,.04);position:relative"><div class="wk-check" style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;display:flex;align-items:center;justify-content:center"><img src="https://static.toss.im/2d-emojis/svg/u2705.svg" style="width:14px;height:14px"></div><div class="wk-icon" style="width:24px;height:24px;color:var(--p)">${GI[g.id]||''}</div><div class="wk-name tds-st13 tds-fw-semibold" style="text-align:center">${g.name}</div><div class="tds-st13 tds-fw-bold" style="color:var(--p)">${wk.scores[id]||0}점</div></div>`}).join('')}
    </div>
    <button class="tds-btn tds-btn-xl tds-btn-block tds-btn-primary" onclick="wkWatchAdForReward()" style="margin-bottom:0">
      광고보고 두뇌점수 3점 받기
    </button>
  </div>
` : `
  ... // 기존 완전 완료 카드 (변경 없음)
`;
```

> 주의: 삼항 연산 중첩 `!allDone ? A : !adRewarded ? B : C` 패턴 사용. 기존 완료 카드 HTML은 그대로 C에 붙여넣기.

**Step 2: Commit**

```bash
git add src/core/workout.js
git commit -m "feat: renderWorkout shows ad-reward button when completed but not adRewarded"
```

---

### Task 6: result.js — 마지막 게임 결과 버튼 교체

**Files:**
- Modify: `src/ui/result.js` — `showResult()` 함수 내 `wkActive` 분기 (line ~196-204)

**Context:** 현재 코드:

```js
if (wkActive) {
  wkOnGameEnd(curGame, score);
  const wkBtn = document.getElementById('r-main-btn');
  const doneCount = getTodayWorkout().done.length;
  wkBtn.onclick = () => wkContinue();
  wkBtn.textContent = doneCount < WK_SIZE ? `다음 운동 (${doneCount}/${WK_SIZE})` : '운동 완료하기';
}
```

**Step 1: 마지막 게임 버튼을 광고 버튼으로 교체**

```js
if (wkActive) {
  wkOnGameEnd(curGame, score);
  const wkBtn = document.getElementById('r-main-btn');
  const doneCount = getTodayWorkout().done.length;
  if (doneCount < WK_SIZE) {
    // 중간 게임: 기존과 동일
    wkBtn.textContent = `다음 운동 (${doneCount}/${WK_SIZE})`;
    wkBtn.onclick = () => wkContinue();
  } else {
    // 마지막 게임: 광고 버튼
    wkBtn.textContent = '5초 광고보고 두뇌점수3점 받기';
    wkBtn.onclick = () => wkFinishWithAd();
    // 보조 버튼: 홈으로 (광고 없이)
    const homeBtn = document.createElement('button');
    homeBtn.className = 'tds-btn tds-btn-lg tds-btn-block';
    homeBtn.style.cssText = 'margin-top:8px;background:transparent;color:var(--sub-text);border:none';
    homeBtn.textContent = '홈으로';
    homeBtn.onclick = () => wkFinish();
    wkBtn.insertAdjacentElement('afterend', homeBtn);
  }
}
```

**Step 2: 수동 확인 포인트**

- 3게임 플레이 완료 후 결과화면에서 버튼 텍스트 확인
- "5초 광고보고 두뇌점수3점 받기" 버튼 아래 "홈으로" 버튼 노출 확인
- "홈으로" 클릭 시 홈으로 이동, 홈 카드에 광고 버튼 노출 확인
- "5초 광고..." 클릭 시 (로컬) 즉시 3점 지급 + 홈 이동 확인

**Step 3: Commit**

```bash
git add src/ui/result.js
git commit -m "feat: replace workout finish button with ad-reward button"
```

---

### Task 7: 빌드 및 최종 확인

**Step 1: 버전 번프 + 빌드**

```bash
cd daily-brain-exercise
npm run version-bump
npm run build
```

**Step 2: 빌드 성공 확인**

- `everyday-brain-training.ait` 파일 생성 확인
- 빌드 에러 없음 확인

**Step 3: 로컬 테스트 시나리오**

1. 오늘의 두뇌운동 3게임 완료
2. 마지막 결과화면: "5초 광고보고 두뇌점수3점 받기" + "홈으로" 버튼 확인
3. "홈으로" 클릭 → 홈 카드에 "광고보고 두뇌점수 3점 받기" 버튼 확인
4. 광고 버튼 클릭 → (로컬) 3점 지급 + toast "두뇌점수 3점 획득!" 확인
5. 홈 카드가 완전 완료 상태(버튼 없음)로 갱신 확인
6. 로컬스토리지에서 `adRewarded: true` 확인

**Step 4: 알림**

```bash
curl -s -d '오늘의 두뇌운동 광고 보상 시스템 구현 완료 - 마지막 게임 결과에서 광고 버튼 노출, 홈에서 재시도 가능' ntfy.sh/kyunghoon-claude-code > /dev/null
```

**Step 5: Final Commit**

```bash
git add -A
git commit -m "feat: workout ad reward system - 5sec ad for 3 brain points

- Add adRewarded field to workout state
- wkFinish(): complete workout, give XP only (no points)
- wkFinishWithAd(): show interstitial ad, give 3 points on success
- wkWatchAdForReward(): home screen ad retry button
- renderWorkout(): new state for completed && !adRewarded
- result.js: replace last-game button with ad-reward button + home fallback"
```
