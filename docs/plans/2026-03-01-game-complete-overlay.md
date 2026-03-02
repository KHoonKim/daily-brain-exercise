# Game Complete Overlay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 게임 완료 후 결과 화면 표시 직전에 "게임 완료!" 오버레이를 1초간 표시하여 의도치 않은 클릭 차단

**Architecture:** `showResult()` 내부에서 결과 overlay를 활성화하는 시점(line 193)을 `_showGameCompleteOverlay(cb)` 헬퍼로 감싸 1초 딜레이 삽입. 게임 파일(34개) 수정 없이 result.js + main.css 2개만 변경.

**Tech Stack:** Vanilla JS, CSS (no frameworks)

---

### Task 1: main.css에 게임 완료 오버레이 스타일 추가

**Files:**
- Modify: `src/styles/main.css` (LEVEL UP OVERLAY 섹션 아래에 추가)

**Step 1: main.css에 스타일 추가**

`src/styles/main.css`에서 `.levelup-overlay` 블록(line 206 근처) 아래에 다음을 추가:

```css
/* ===== GAME COMPLETE OVERLAY ===== */
.game-complete-overlay{display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300;align-items:center;justify-content:center}
.game-complete-card{text-align:center;animation:lvlPop .3s cubic-bezier(.32,.72,0,1)}
```

> 주의: z-index 300으로 levelup-overlay(200)보다 위에 위치. `lvlPop` 애니메이션은 이미 main.css에 정의되어 있으므로 재사용.

**Step 2: 브라우저에서 시각 확인 (선택)**

개발 서버에서 스타일 클래스가 올바르게 렌더링되는지 확인.

**Step 3: Commit**

```bash
git add src/styles/main.css
git commit -m "style: add game-complete overlay styles"
```

---

### Task 2: result.js에 _showGameCompleteOverlay 헬퍼 추가 및 딜레이 적용

**Files:**
- Modify: `src/ui/result.js`

**Context:** `showResult()` 함수 내 line 193-198이 현재 다음과 같음:

```js
document.getElementById('overlay').classList.add('active');
AIT.loadBannerAd('r-banner');

if (newRank !== oldRank && newRank.age % 10 === 0) {
  setTimeout(() => showLevelUp(newRank, newXP), 600);
}
```

**Step 1: `_showGameCompleteOverlay` 헬퍼 함수를 result.js 상단(또는 `showResult` 위)에 추가**

```js
function _showGameCompleteOverlay(cb) {
  const el = document.createElement('div');
  el.className = 'game-complete-overlay';
  el.innerHTML = `<div class="game-complete-card">
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" style="width:52px;height:52px;display:block;margin:0 auto">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="8 12 11 15 16 9"/>
    </svg>
    <div class="tds-t2 tds-fw-bold" style="color:#fff;margin-top:12px">게임 완료!</div>
  </div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); cb(); }, 1000);
}
```

**Step 2: `showResult()` 내 line 193-198을 다음으로 교체**

기존:
```js
document.getElementById('overlay').classList.add('active');
AIT.loadBannerAd('r-banner');

if (newRank !== oldRank && newRank.age % 10 === 0) {
  setTimeout(() => showLevelUp(newRank, newXP), 600);
}
```

변경 후:
```js
_showGameCompleteOverlay(() => {
  document.getElementById('overlay').classList.add('active');
  AIT.loadBannerAd('r-banner');
  if (newRank !== oldRank && newRank.age % 10 === 0) {
    setTimeout(() => showLevelUp(newRank, newXP), 600);
  }
});
```

> 주의: `newRank`, `oldRank`, `newXP`는 `showResult()` 스코프에 있어 클로저로 접근 가능. 레벨업 팝업도 콜백 안으로 이동해야 결과 화면 표시 이후에 정상 동작.

**Step 3: 동작 확인**

브라우저에서 게임 플레이 후:
1. 게임 종료 시 검은 반투명 배경 + ✓ 아이콘 + "게임 완료!" 텍스트가 1초간 표시되는지 확인
2. 1초 후 결과 화면(#overlay)으로 전환되는지 확인
3. 시간 연장(time extend) 게임에서 정상 동작하는지 확인 (오버레이 뜨지 않아야 함)

**Step 4: Commit**

```bash
git add src/ui/result.js
git commit -m "feat: show game-complete overlay before result screen"
```

---

### Task 3: 빌드 및 최종 확인

**Step 1: 버전 범프 및 빌드**

```bash
npm run version-bump
npm run build
```

**Step 2: 생성된 .ait 파일 확인**

```bash
ls -la everyday-brain-training.ait
```

**Step 3: 최종 동작 확인 체크리스트**

- [ ] 일반 게임 완료 → 오버레이 1초 → 결과 화면
- [ ] 타이머 게임 + 시간 연장 → 오버레이 없이 시간 연장 화면
- [ ] 타이머 게임 + 시간 연장 후 종료 → 오버레이 1초 → 결과 화면
- [ ] 레벨업 조건 충족 시 → 오버레이 → 결과 화면 → 0.6초 후 레벨업 팝업
