# 게임 완료 오버레이 설계

## 배경

게임 종료 즉시 결과 페이지가 표시되어 사용자가 게임 중 눌렀던 버튼 입력이 결과 화면에 전달되는 UX 문제가 있음.

## 목표

게임 완료 후 "게임 완료!" 오버레이를 1초간 표시하여 클릭을 차단한 뒤 결과 화면으로 전환.

## 선택된 방법: showResult() 내부 딜레이 처리

### 변경 파일
- `src/ui/result.js`
- `src/styles/main.css`

### 동작 흐름

```
게임 종료
   ↓
showResult() 호출
   ↓
시간 연장 체크 (해당 시 early return → 오버레이 표시 안 함)
   ↓
점수/XP/미션 계산 (기존 로직 유지)
   ↓
"게임 완료!" 오버레이 표시 (1초, 클릭 차단)
   ↓
1000ms 후 오버레이 제거 → 결과 화면(#overlay) 표시
```

### 오버레이 시각 디자인

- 전체화면 반투명 배경: `rgba(0,0,0,0.6)`
- 중앙 정렬: ✓ 아이콘 (SVG 체크마크) + "게임 완료!" 텍스트
- 폰트: `tds-t2` (24px), `tds-fw-bold`, 흰색
- 애니메이션: 기존 `lvlPop` keyframe 재사용 (.3s pop-in)
- `pointer-events: all` — 클릭 완전 차단
- z-index: 300 (levelup-overlay 200보다 위)

### 구현 상세

**result.js**

1. `_showGameCompleteOverlay(cb)` 헬퍼 함수 추가
2. 기존 `overlay.classList.add('active')` 및 `AIT.loadBannerAd('r-banner')` 호출을 콜백으로 이동
3. DOM 업데이트(점수, XP 등)는 오버레이 표시 전에 그대로 실행 (화면에 보이지 않으므로 무방)

```js
function _showGameCompleteOverlay(cb) {
  const el = document.createElement('div');
  el.className = 'game-complete-overlay';
  el.innerHTML = `
    <div class="game-complete-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"
           style="width:52px;height:52px">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="8 12 11 15 16 9"/>
      </svg>
      <div class="tds-t2 tds-fw-bold" style="color:#fff;margin-top:12px">게임 완료!</div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); cb(); }, 1000);
}
```

**main.css**

```css
.game-complete-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  z-index: 300;
  display: flex; align-items: center; justify-content: center;
}
.game-complete-card {
  text-align: center;
  animation: lvlPop .3s cubic-bezier(.32,.72,0,1);
}
```

## 주의사항

- 시간 연장(time extend) 플로우는 early return이므로 오버레이 영향 없음
- 광고 로딩(`AIT.loadBannerAd`)은 결과 화면 표시와 함께 콜백 내에서 호출
- 게임 파일(34개) 수정 불필요
