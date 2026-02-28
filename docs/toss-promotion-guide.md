# Toss 프로모션 시스템 구현 가이드

## 개요

매일매일 두뇌운동은 `webView` 타입 미니앱으로, 총 3가지 프로모션을 Toss 콘솔에서 관리한다.

| 프로모션 | 트리거 조건 | 지급 금액 |
|---------|-----------|---------|
| `FIRST_LOGIN` | 최초 로그인 시 | 1원 |
| `FIRST_WORKOUT` | 오늘의 두뇌운동 3게임 완료 시 | 2원 |
| `POINT_100` | 두뇌점수 100점 이상 → 교환 시도 시 | 100원 |

---

## 문제 발생 원인

### 핵심 원인: webView 타입 앱의 제약

Toss 미니앱은 **game 타입**과 **webView 타입** 두 가지로 분류된다.

우리 앱은 `granite.config.ts`에서 `webView` 타입으로 설정되어 있었는데, 이 경우 게임용 브릿지 API와 파트너 REST API 모두 제약이 있었다.

### 시도했던 접근과 실패 원인

#### 시도 1: `grantPromotionRewardForGame` 브릿지
```javascript
// ❌ 실패: 에러코드 40000 "게임이 아닙니다"
await _bridgeCall('grantPromotionRewardForGame', [{ promotionCode, key, amount }]);
```
- `grantPromotionRewardForGame`은 **game 타입 전용** 브릿지
- webView 타입에서 호출하면 에러코드 40000 반환

#### 시도 2: `grantPromotionReward` 브릿지
```javascript
// ❌ 실패: 응답 없음 (무한 대기)
await _bridgeCall('grantPromotionReward', [{ promotionCode, amount }]);
```
- SDK에 해당 메서드가 존재하지 않음 (`node_modules` 검색 결과 `grantPromotionRewardForGame`만 존재)
- 브릿지 호출이 영원히 pending 상태

#### 시도 3: Toss REST API 직접 호출 (클라이언트)
```javascript
// ❌ 실패: CORS "Load failed"
await fetch('https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion/...');
```
- Toss WebView에서 직접 외부 API 호출 → CORS 차단

#### 시도 4: 서버 프록시 (mTLS 없이)
```javascript
// ❌ 실패: "TypeError: Load failed"
// 서버에서 fetch로 Toss API 호출 시도
const res = await fetch('https://apps-in-toss-api.toss.im/...');
```
- `apps-in-toss-api.toss.im`은 **mTLS (상호 TLS)** 를 요구함
- 서버가 클라이언트 인증서 없이 호출하면 `tlsv13 alert certificate required` 에러

---

## 최종 해결책: 서버 프록시 + mTLS 파트너 인증서

### 아키텍처

```
[Toss WebView]
    ↓ (fetch, CORS 없음 - 같은 도메인)
[우리 서버: /api/score/promo/grant]
    ↓ (HTTPS + mTLS 클라이언트 인증서)
[Toss Partner API: apps-in-toss-api.toss.im]
```

### 구현 상세

#### 1. mTLS Agent 설정 (`server/server.js`)

```javascript
const https = require('https');

const tossAgent = new https.Agent({
  cert: fs.readFileSync(path.join(__dirname, 'keys/certificate_public.crt')),
  key: fs.readFileSync(path.join(__dirname, 'keys/certificate_private.key')),
});

function tossFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) },
      agent: tossAgent,  // mTLS 인증서 적용
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
      }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
```

#### 2. 프록시 엔드포인트 (`server/server.js`)

```javascript
app.post('/api/score/promo/grant', async (req, res) => {
  const { userKey, promotionCode, amount } = req.body;
  if (!userKey || !promotionCode || amount == null)
    return res.status(400).json({ error: 'missing params' });

  const BASE = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/promotion';
  const headers = { 'Content-Type': 'application/json', 'x-toss-user-key': userKey };

  try {
    // Step 1: 실행 키 발급
    const keyRes = await (await tossFetch(`${BASE}/execute-promotion/get-key`, {
      method: 'POST', headers
    })).json();
    if (keyRes.resultType !== 'SUCCESS') return res.json({ error: keyRes });

    // Step 2: 프로모션 실행
    const execRes = await (await tossFetch(`${BASE}/execute-promotion`, {
      method: 'POST', headers,
      body: JSON.stringify({ promotionCode, key: keyRes.success.key, amount })
    })).json();
    if (execRes.resultType !== 'SUCCESS') return res.json({ error: execRes });

    res.json({ key: execRes.success.key });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
```

#### 3. 클라이언트 호출 (`src/core/ait.js`)

```javascript
async function grantPromoReward(code, amount) {
  if (!isToss) return { mock: true };
  const userKey = await storageGet('toss_userKey');
  if (!userKey) return { error: 'no_userKey' };
  try {
    const result = await fetch(`${API_BASE}/api/score/promo/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userKey, promotionCode: code, amount })
    }).then(r => r.json());
    return result;
  } catch (e) {
    return { error: String(e) };
  }
}
```

---

## 인증서 관리

- **파일 위치**: `server/keys/certificate_public.crt`, `server/keys/certificate_private.key`
- **gitignore**: `server/keys/` 전체가 gitignore됨 → git으로 배포 불가
- **VPS 배포**: SCP로 직접 복사 필요
  ```bash
  scp certificate_public.crt root@76.13.210.78:/var/www/daily-brain-exercise/server/keys/
  scp certificate_private.key root@76.13.210.78:/var/www/daily-brain-exercise/server/keys/
  ```
- **인증서 갱신 시**: 위 SCP 명령으로 다시 복사 후 `pm2 restart brain-server`

---

## 프로모션 코드

현재는 **테스트 코드** 사용 중. 실제 서비스 시 정식 코드로 교체 필요.

```javascript
// src/core/ait.js CONFIG
PROMO_FIRST_LOGIN:   'TEST_01KJ8A3HFMP24HQ5743KD6Q9GK',
PROMO_POINT_100:     'TEST_01KJ8BCF26T648AQ1QCKYMS4TZ',
PROMO_FIRST_WORKOUT: 'TEST_01KJ8B95RPCGDQV9NZSCQ418VT',
```

---

## 중복 방지 로직

`triggerPromo` 함수에서 두 가지 방법으로 중복 지급을 방지한다.

1. **메모리 캐시**: `_promoGranted[promoType]` — 앱 세션 내 중복 방지
2. **서버 DB 확인**: `/api/score/promo/check/:userHash/:promoType` — 영구 중복 방지
   - 성공 후 `/api/score/promo/record`에 기록

`POINT_100`은 교환할 때마다 반복 가능하므로 DB 중복 체크에서 제외.

---

## 트리거 위치

| 프로모션 | 트리거 위치 | 코드 |
|---------|-----------|------|
| FIRST_LOGIN | 로그인 완료 후 | `ait.js: login()` → `checkPromoFirstLogin()` |
| FIRST_WORKOUT | 두뇌운동 완료 감지 시 | `workout.js: renderWorkout()` → `AIT.checkPromoFirstWorkout()` |
| POINT_100 | 두뇌점수 교환 버튼 클릭 시 | `utils.js: exchangePoints()` → `AIT.triggerPromo('POINT_100', ...)` |
