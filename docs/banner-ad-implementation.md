# 배너 광고 구현 시행착오 정리

> 작성일: 2026-03-02
> 대상: daily-brain-exercise (Apps-in-Toss 미니앱)

---

## 최종 구현 구조

### 광고 SDK 흐름

```
TossAdsSpaceKit (toss-ads-space-kit-1.3.0.js)
  └── sdk.banner.createSlot(innerEl, { spaceId, autoLoad, renderPadding, callbacks })
```

공식 `@apps-in-toss/web-bridge`의 `TossAds.attachBanner` 패턴을 직접 구현.
`fetchTossAd` 브리지를 `customAdFetcher`로 연결.

---

## 배너 카드 스타일링

### 컨테이너 (HTML)

```html
<div id="home-banner-1" style="margin:8px 0;width:100%;background:var(--card);border-radius:16px;overflow:hidden"></div>
```

- `background:var(--card)`: 카드 배경색
- `border-radius:16px`: 둥근 모서리
- `overflow:hidden`: 내부 콘텐츠 클리핑

### 텍스트형 배너 (AD_BANNER_ID)

```javascript
// wrapper: 패딩 없음 (SDK가 renderPadding으로 내부 처리)
wrapper.style.cssText = 'width:100%;box-sizing:border-box;overflow:hidden;';
const innerEl = document.createElement('div');

// SDK에 renderPadding 전달
sdk.banner.createSlot(innerEl, {
  spaceId: CONFIG.AD_BANNER_ID,
  renderPadding: (styleId) => styleId === '1' ? '16px 20px' : '20px',
  ...
});
```

### 이미지형 배너 (AD_IMAGE_BANNER_ID)

```javascript
// wrapper: 패딩을 직접 적용 (renderPadding 적용 시 이미지 렌더링 실패)
wrapper.style.cssText = 'width:100%;box-sizing:border-box;overflow:hidden;padding:16px 20px;';
const innerEl = document.createElement('div');
innerEl.style.cssText = 'border-radius:12px;overflow:hidden;';

// renderPadding 미전달 (이미지형에 적용 시 SDK가 렌더링 실패)
sdk.banner.createSlot(innerEl, {
  spaceId: CONFIG.AD_IMAGE_BANNER_ID,
  // renderPadding 없음!
  ...
});
```

---

## 시행착오 기록

### 1. 이중 패딩 문제

**증상:** 텍스트 배너에 패딩이 2배로 들어감
**원인:** wrapper에 `padding: '0 10px'` + SDK `renderPadding '16px 20px'` 동시 적용
**해결:** wrapper 패딩 제거, renderPadding만 유지

---

### 2. 이미지형 배너 미노출

**증상:** `AD_IMAGE_BANNER_ID` 배너가 아무것도 표시되지 않음
**원인:** `renderPadding: (styleId) => styleId === '1' ? '16px 20px' : '20px'`를 이미지형에도 적용했을 때 SDK 내부에서 렌더링 실패 (콜백도 미호출)
**해결:** `isImage` 플래그로 분기 — 이미지형은 renderPadding 미전달, wrapper에 직접 padding 적용

```javascript
const isImage = spaceId === CONFIG.AD_IMAGE_BANNER_ID;
```

---

### 3. 페이지 이동 후 배너 소멸

**증상:** 홈 → 게임 → 홈 이동 시 배너가 사라짐
**원인:** 홈 화면 재진입 시 컨테이너가 stale 상태 (handle 존재, DOM 비어있음)
**해결:** stale 감지 로직 — `el.children.length === 0`이면 handle 제거 후 재로드

```javascript
if (_bannerHandles.has(containerId)) {
  if (el.children.length === 0) {
    _bannerHandles.delete(containerId); // stale → 재로드
  } else {
    return; // 정상 로드 상태 → skip
  }
}
```

---

### 4. 화면 숨김 상태에서 SDK 렌더링 시도

**증상:** 폴링(`_fetchTossAdSupported` 대기) 중 다른 화면으로 이동하면, 폴링 resolve 시 숨겨진 컨테이너에 SDK가 렌더링 시도 → 실패 (콜백 미호출, wrapper는 DOM에 잔류)
**원인:** `.screen` CSS가 `display:none`/`display:flex` 전환. 숨겨진 상태에서 `createSlot` 호출 시 SDK 렌더링 실패
**해결:**

```javascript
// 1) 폴링 resolve 시: visibility 확인 후 재시도
const curEl = document.getElementById(containerId);
if (curEl && curEl.offsetParent !== null) {
  loadBannerAd(containerId, opts);
}
// → 숨겨진 상태면 스킵 (다음 화면 진입 시 자연 재호출)

// 2) SDK .then(): visibility 재확인
if (el.offsetParent === null) {
  wrapper.parentNode?.removeChild(wrapper); // wrapper 제거 (stale 방지)
  return;
}
```

---

### 5. 정적 div 배너의 영구 미노출

**증상:** `home-banner-1`, `home-banner-2`가 항상 미노출 (`home-banner-4`만 노출)
**원인 분석:**
- `home-banner-4`: `gameGrid.innerHTML = gridHtml`로 **매 renderHome마다 div 재생성** → stale 감지 → 재로드 성공
- `home-banner-1/2`: `index.html` 정적 div → 첫 로드가 SDK 초기화 타이밍 등으로 실패해도 wrapper가 DOM에 남음 → `el.children.length > 0` → 이후 모든 renderHome에서 "이미 로드됨"으로 영구 skip

**해결:** 정적 div를 제거하고 wrapper 컨테이너만 두고, renderHome()에서 동적 생성

```html
<!-- index.html: 정적 div 제거, wrapper만 유지 -->
<div id="home-banner-1-wrap"></div>
<div id="home-banner-2-wrap"></div>
```

```javascript
// home.js renderHome(): home-banner-4와 동일한 패턴으로 동적 생성
const b1Wrap = document.getElementById('home-banner-1-wrap');
if(b1Wrap) b1Wrap.innerHTML = '<div id="home-banner-1" style="margin:8px 0;width:100%;background:var(--card);border-radius:16px;overflow:hidden"></div>';
const b2Wrap = document.getElementById('home-banner-2-wrap');
if(b2Wrap) b2Wrap.innerHTML = '<div id="home-banner-2" style="margin:8px 0;width:100%;background:var(--card);border-radius:16px;overflow:hidden"></div>';
```

---

## 광고 실패 시 플레이스홀더

광고 미노출 또는 실패 시 빈 카드 대신 디버그 정보 표시:

```javascript
function _showBannerPlaceholder(el, containerId, reason) {
  el.innerHTML = '';
  // flex 레이아웃으로 중앙 정렬
  el.style.cssText += ';display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60px;padding:12px 16px;gap:4px';
  el.innerHTML = `
    <div style="font-size:11px;color:#8B95A1;text-align:center">📭 광고 없음 [${containerId}]</div>
    <div style="font-size:10px;color:#C4CAD4;text-align:center;word-break:break-all">${reason}</div>
  `;
}
```

콜백:
- `onAdFailedToRender` → destroyBannerAd + placeholder
- `onNoFill` → placeholder

---

## 배너 스페이스 ID 정리

| 배너 ID | 타입 | SpaceId |
|---------|------|---------|
| home-banner-1 | 텍스트형 | AD_BANNER_ID |
| home-banner-2 | 이미지형 | AD_IMAGE_BANNER_ID |
| home-banner-4 | 텍스트형 | AD_BANNER_ID |
| ts-banner | 이미지형 | AD_IMAGE_BANNER_ID |
| r-banner | 이미지형 | AD_IMAGE_BANNER_ID |
| wkt-banner | 텍스트형 | AD_BANNER_ID |

---

## 핵심 원칙

1. **이미지형 배너에 renderPadding 금지** — SDK 내부 렌더링 실패 유발
2. **이미지형 패딩은 wrapper CSS로** — `padding:16px 20px` + innerEl `border-radius:12px`
3. **배너 컨테이너는 동적 생성** — 정적 div는 stale 상태로 영구 skip 위험
4. **SDK 로드 전 visibility 확인** — 숨겨진 화면에서 createSlot 금지
