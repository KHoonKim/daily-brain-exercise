# 오늘의 두뇌운동 광고 보상 시스템 설계

## 요약

오늘의 두뇌운동 3게임 완료 시 결과페이지에서 "5초 광고보고 두뇌점수3점 받기" 버튼을 노출하여, 광고 시청 후 두뇌점수 3점을 지급한다. 광고를 보지 않고 홈으로 이동해도 홈 화면에서 다시 광고 시청 버튼을 노출한다.

---

## 상태 설계

workout 객체에 `adRewarded` 필드 추가:

```js
wk = {
  games: [...],
  done: [...],
  scores: {},
  targets: {},
  completed: false,    // 3게임 모두 플레이 완료
  adRewarded: false,   // 광고 시청 후 두뇌점수 3점 수령 완료
}
```

### 상태 전이

| completed | adRewarded | 의미 |
|-----------|------------|------|
| false | false | 진행 중 (게임 미완료) |
| true | false | 게임 완료, 포인트 미수령 |
| true | true | 완전 완료 (포인트 수령까지 완료) |

---

## 화면별 동작

### 1. 결과 화면 (마지막 게임 완료 시)

`result.js` `showResult()` 내 워크아웃 버튼 분기:

- `doneCount < WK_SIZE`: 기존과 동일 ("다음 운동 (X/3)" 버튼)
- `doneCount >= WK_SIZE`:
  - 메인 버튼: **"5초 광고보고 두뇌점수3점 받기"** → `wkFinishWithAd()` 호출
  - 보조 버튼/링크: **"홈으로"** → 광고 없이 `wkFinish()` 호출 (점수 없이 완료 처리)

### 2. 홈 화면 (`completed && !adRewarded`)

`renderWorkout()` 내 새 분기:

- 완료 이모지(✅) + "오늘의 1분 두뇌운동 완료!"
- 게임 결과 목록 표시
- **"광고보고 두뇌점수 3점 받기"** 버튼 → `wkWatchAdForReward()` 호출

### 3. 홈 화면 (`completed && adRewarded`)

- 기존과 동일: 완료 카드 (버튼 없음)

---

## 함수 설계

### `wkFinish()` (워크아웃 완료, 광고 없이)

```js
function wkFinish() {
  const wk = getTodayWorkout();
  if (!wk.completed && wk.done.length >= WK_SIZE) {
    wk.completed = true;
    saveWorkout(wk);
    addXP(50);  // XP는 즉시 지급
    if (window.AIT && AIT.checkPromoFirstWorkout) AIT.checkPromoFirstWorkout();
  }
  wkActive = false;
  document.getElementById('overlay').classList.remove('active');
  goHome();
}
```

### `wkFinishWithAd()` (결과화면에서 광고 시청)

```js
function wkFinishWithAd() {
  // 먼저 완료 처리 (XP 지급, 저장)
  wkFinish();  // 홈으로 이동하지 않고 처리만
  // 광고 표시
  showAd(() => {
    // 성공: 3점 지급 + 홈 이동
    const wk = getTodayWorkout();
    wk.adRewarded = true;
    saveWorkout(wk);
    addPoints(3);
    toast('두뇌점수 3점 획득!');
    goHome();
  }, 'interstitial', () => {
    // 실패: toast + 홈 이동 (점수 없음)
    toast('광고를 불러오지 못했어요');
    goHome();
  });
}
```

> 주의: `showAd()`의 기존 시그니처 `showAd(cb, type)` 활용. 실패 핸들링은 `.catch()` 활용.

### `wkWatchAdForReward()` (홈에서 광고 시청)

```js
function wkWatchAdForReward() {
  showAd(() => {
    const wk = getTodayWorkout();
    wk.adRewarded = true;
    saveWorkout(wk);
    addPoints(3);
    toast('두뇌점수 3점 획득!');
    renderWorkout();  // 홈 카드 갱신
  }, 'interstitial', () => {
    toast('광고를 불러오지 못했어요');
  });
}
```

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/core/workout.js` | `wk` 초기화에 `adRewarded: false` 추가; `finishWorkout()` → `wkFinish()`로 리팩터링 (`addPoints(3)` 제거); `wkFinishWithAd()` 신규; `wkWatchAdForReward()` 신규; `renderWorkout()` 새 상태 분기 추가 |
| `src/ui/result.js` | 마지막 운동 결과 버튼을 "5초 광고보고 두뇌점수3점 받기"로 교체; 보조 "홈으로" 버튼 추가 |

---

## 예외 처리

- **광고 실패**: toast 표시, 홈으로 이동, `adRewarded = false` 유지 (홈에서 재시도 가능)
- **이미 adRewarded**: 홈에서 버튼 노출 안 함 (기존 완료 카드)
- **구 workout 객체 (adRewarded 필드 없음)**: `wk.adRewarded ?? false` 처리로 backward compatible
- **wkActive 중복 호출**: 기존 `wk.completed` 가드로 이중 XP/점수 지급 방지
