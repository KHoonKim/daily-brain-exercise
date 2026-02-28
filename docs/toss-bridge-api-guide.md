# Toss 브릿지 API 호출 가이드

## 문제 배경

`granite.config.ts`에서 webView 타입으로 변경한 후, 광고(AdMob) 기능이 동작하지 않는 버그가 발생했다.
버튼을 눌러도 아무 반응이 없었다.

---

## Toss 브릿지 API의 두 가지 패턴

Toss 미니앱 브릿지에는 **호출 방식이 다른 두 가지 패턴**이 존재한다.

### 패턴 1: Direct Method (동기 객체 메서드)

`window.__granite__` 객체에 메서드가 직접 붙어있는 방식.

```js
window.__granite__.someMethod({ options: {...}, onEvent: (e) => {}, onError: (e) => {} });
```

**특징:**
- `window.__granite__` 또는 `window.__ait__` 에 직접 메서드가 존재
- 게임 타입 앱, 또는 특정 네이티브 기능(haptic, contactsViral, eventLog 등)에서 사용
- 이벤트 콜백의 인자는 **객체** (`{ type: 'eventName', data: {...} }`)

**이 방식을 쓰는 기능:**
- `contactsViral` (친구 초대)
- `generateHapticFeedback`
- `eventLog`
- `appLogin`
- `getUserKeyForGame`

### 패턴 2: PostMessage Bridge (비동기 메시지)

`ReactNativeWebView.postMessage()`를 통해 네이티브와 통신하는 방식.
SDK의 `createEventBridge`가 이 방식을 사용한다.

```js
// 내부적으로 아래와 동일하게 동작
ReactNativeWebView.postMessage(JSON.stringify({
  type: 'addEventListener',
  functionName: 'loadAppsInTossAdMob',
  eventId: '<random-id>',
  args: { adGroupId: '...' }
}));

// 네이티브가 결과를 __GRANITE_NATIVE_EMITTER로 emit
window.__GRANITE_NATIVE_EMITTER.on('loadAppsInTossAdMob/onEvent/<eventId>', callback);
```

**특징:**
- `window.ReactNativeWebView.postMessage()` + `window.__GRANITE_NATIVE_EMITTER` 조합
- webView 타입 앱, 또는 SDK(`GoogleAdMob`, `SafeAreaInsets` 등)에서 사용
- 이벤트 콜백의 인자는 **객체** (`{ type: 'eventName', data: {...} }`)

**이 방식을 쓰는 기능:**
- `loadAppsInTossAdMob` / `showAppsInTossAdMob` (광고)
- `SafeAreaInsets.subscribe`

---

## 버그 원인 분석

### 버그 1: 잘못된 브릿지 패턴 사용

```js
// ❌ 잘못된 코드 (before)
_bridge.loadAppsInTossAdMob({ ... });   // _bridge = window.__granite__
_bridge.showAppsInTossAdMob({ ... });
```

`window.__granite__`에 `loadAppsInTossAdMob`/`showAppsInTossAdMob` 메서드가 없으므로
조건이 false가 되어 **호출 자체가 일어나지 않음** → Promise가 영원히 pending.

### 버그 2: 이벤트 타입 비교 오류

```js
// ❌ 잘못된 코드 (before)
if (event === 'userEarnedReward' || event === 'adDismissed') { ... }
```

이벤트 콜백 인자는 **문자열이 아니라 객체**다.
`event`는 `{ type: 'dismissed', data: {...} }` 형태이므로 조건이 절대 true가 되지 않음.

---

## 수정 방법

### 1. 양방향 폴백 구조

Direct Method가 있으면 쓰고, 없으면 PostMessage 방식으로 폴백.

```js
function preloadAd(type) {
  const handleEvent = (e) => {
    const t = typeof e === 'string' ? e : e?.type; // 문자열/객체 모두 처리
    if (t === 'loaded' || t === 'adLoaded') _adLoaded[type] = true;
  };
  const handleError = () => { _adLoaded[type] = false; };

  if (_bridge && _bridge.loadAppsInTossAdMob) {
    // 패턴 1: Direct Method
    _bridge.loadAppsInTossAdMob({ options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
  } else {
    // 패턴 2: PostMessage (webView 타입)
    _bridgeEvent('loadAppsInTossAdMob', { options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
  }
}
```

### 2. 이벤트 타입 정규화

```js
const handleEvent = (event) => {
  // 문자열('dismissed')과 객체({type: 'dismissed'}) 모두 처리
  const evtType = typeof event === 'string' ? event : event?.type;
  if (evtType === 'userEarnedReward' || evtType === 'dismissed' || evtType === 'adDismissed') {
    resolve({ success: true, event: evtType });
  }
};
```

### 3. `_bridgeEvent` 헬퍼 (PostMessage 패턴)

```js
function _bridgeEvent(method, options) {
  const rnwv = typeof window !== 'undefined' && window.ReactNativeWebView;
  if (!rnwv) return () => {};                      // WebView 환경 아니면 noop
  const emitter = window.__GRANITE_NATIVE_EMITTER;
  if (!emitter) return () => {};

  const eventId = Math.random().toString(36).slice(2);
  const removes = [
    emitter.on(`${method}/onEvent/${eventId}`, d => options.onEvent && options.onEvent(d)),
    emitter.on(`${method}/onError/${eventId}`, e => options.onError && options.onError(e)),
  ];
  rnwv.postMessage(JSON.stringify({
    type: 'addEventListener', functionName: method, eventId, args: options.options
  }));
  return () => {
    rnwv.postMessage(JSON.stringify({ type: 'removeEventListener', functionName: method, eventId }));
    removes.forEach(r => r && r());
  };
}
```

---

## 어떤 함수가 어떤 패턴인지 판단하는 방법

1. **SDK 소스 확인**: `node_modules/@apps-in-toss/web-bridge/dist/index.js`에서 해당 기능이
   - `createEventBridge(...)` → **PostMessage 패턴**
   - `createAsyncBridge(...)` → **PostMessage 패턴** (Promise 형태)
   - `createConstantBridge(...)` → `window.__CONSTANT_HANDLER_MAP` 직접 조회

2. **실제 테스트**: 샌드박스에서 `_bridge.methodName`이 `undefined`인지 확인

---

## 샌드박스 vs 라이브 환경

| 환경 | 광고 동작 |
|------|----------|
| Toss Sandbox | 라이브 광고 ID(`ait.v2.live.*`) 작동 안 함 → `onError` 즉시 반환 |
| Toss 라이브 앱 | 정상 작동 |

샌드박스에서 광고 관련 기능 테스트가 필요하면 `getEnv()`로 환경을 감지하거나,
별도의 테스트용 광고 ID를 사용해야 한다.

---

## 이벤트 타입 참고

### `loadAppsInTossAdMob` onEvent
| type | 의미 |
|------|------|
| `loaded` | 광고 로드 성공 |

### `showAppsInTossAdMob` onEvent
| type | 의미 |
|------|------|
| `requested` | 광고 보여주기 요청 완료 |
| `show` | 광고 컨텐츠 표시됨 |
| `impression` | 광고 노출 |
| `clicked` | 광고 클릭 |
| `userEarnedReward` | 보상형 광고 시청 완료 (티켓 지급 트리거) |
| `dismissed` | 광고 닫힘 |
| `failedToShow` | 광고 보여주기 실패 |
