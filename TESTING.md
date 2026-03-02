# 테스트 가이드

## 빠른 시작

```bash
npm test              # 유닛/통합 테스트 280개 (~1초)
npm run test:e2e      # E2E 브라우저 테스트 17개 (~15초)
npm run test:watch    # 파일 변경 감지 모드
npm run test:coverage # 커버리지 포함 실행
```

---

## 테스트 구조

```
tests/
├── unit/                        # Vitest 유닛 테스트
│   ├── config.test.js           # GAMES / RANKS / GI 설정 검증 (19개)
│   ├── config-validation.test.js # 설정 유효성 심층 검사 (30개)
│   ├── utils.test.js            # 핵심 비즈니스 로직 (40개)
│   ├── ticket.test.js           # 티켓 시스템 (12개)
│   ├── result.test.js           # 결과화면 로직 (16개)
│   ├── workout.test.js          # 오늘의 두뇌운동 (16개)
│   ├── game-scoring.test.js     # 게임별 점수 공식 (69개)
│   └── server-math.test.js      # normalCDF / 백분위 수학 (22개)
├── server/                      # Express API 통합 테스트
│   ├── api.test.js              # 전체 REST 엔드포인트 (41개)
│   └── percentile.test.js       # 백분위 블렌딩 로직 (14개)
├── e2e/                         # Playwright E2E 테스트
│   ├── fixtures.js              # window.AIT 목 픽스처
│   ├── home.spec.js             # 홈화면 UI 검증 (10개)
│   └── navigation.spec.js       # 화면 전환 플로우 (7개)
└── helpers/
    └── script-loader.js         # vm 기반 스크립트 로더 유틸
```

**합계: 유닛/통합 280개 + E2E 17개 = 297개 테스트**

---

## 테스트 계층별 설명

### 1. 유닛 테스트 — 핵심 비즈니스 로직

**도구**: Vitest + Node.js vm 모듈

프론트엔드 코드(`src/`)는 ES 모듈이 아닌 전역 스코프 스크립트입니다.
import/export가 없어서 일반적인 테스트 임포트가 불가능합니다.

**해결책**: `vm.runInContext()` 로 소스 파일을 격리된 가상 컨텍스트에 로드합니다.

```js
// tests/unit/utils.test.js 패턴 예시
const context = createContext({ localStorage: mockLS, Math, JSON, ... });
runInContext(readFileSync('src/core/config.js', 'utf-8'), context);
runInContext(readFileSync('src/core/utils.js', 'utf-8'), context);

// const/let은 vm에서 블록 스코프이므로 별도 추출 필요
runInContext(`__getRank__ = typeof getRank !== 'undefined' ? getRank : undefined`, context);

// 이후 테스트에서 사용
expect(context.__getRank__(0).age).toBe(100);
```

**커버하는 로직:**

| 모듈 | 테스트 대상 함수 |
|------|----------------|
| config.js | GAMES 38개 구조, RANKS 81개(100세→20세), GI 아이콘 매핑, 색상 보간 |
| utils.js | getDayKey (KST 9시 경계), LS.get/set/getJSON, getRank/getNextRank, getStreak (월/연도 경계, 30일 컷), getTodayChallenges, updateChallenge |
| ticket.js | getTickets (일일 충전 로직), useTicket (하한선 0) |
| result.js | getRetryMotivation (5개 분기: 신기록/80%/50%/이하/최초) |
| workout.js | getTodayWorkout (3개 게임, 중복 없음, 캐싱) |
| game-scoring | Math 콤보(1-2=10점, 3-4=20점, 5+=30점), ColorMix 속도보너스, Reaction 반응시간→점수, Stroop 콤보, Sequence 레벨 점수, XP 공식 |
| server-math | normalCDF 정확도 (±1σ≈84%, ±2σ≈98%), 대칭성, 99 클램핑 |

---

### 2. 서버 통합 테스트

**도구**: Vitest + Supertest + in-memory SQLite

`server.js`는 CommonJS 모듈입니다. `require.main === module` 가드 덕분에
테스트 환경에서는 서버가 실제로 포트를 열지 않습니다.

```js
process.env.TEST_DB = ':memory:';  // 격리된 DB
const { app } = require('../../server/server.js');
const request = supertest.agent(app);  // 영속적 HTTP 서버
```

**커버하는 엔드포인트:**

| 엔드포인트 | 테스트 내용 |
|-----------|------------|
| GET /api/score/health | 서버 상태, 총 점수 수 |
| POST /api/score | 유효한 점수 제출, 백분위 반환, 필드 누락 시 400 |
| GET /api/score/stats/:game | 통계 (count, avg, max, min) |
| GET /api/score/me/:userHash | 유저 개인 통계 |
| GET /api/score/rank/:game/:userHash | 유저 랭킹 |
| GET /api/score/overall-rank/:userHash | 전체 랭킹 |
| GET /api/score/leaderboard/:game | 상위 50명 |
| GET /api/score/overall-leaderboard | 전체 상위 50명 |
| POST /api/score/user | 유저 프로필 저장 |
| GET /api/score/user/:userHash | 유저 프로필 조회 |
| GET/POST /api/score/promo/* | 프로모션 체크/기록/교환 |
| POST /api/score/toss/* | Toss 로그인 (401/400 반환 확인) |
| GET/POST /api/score/disconnect | Basic 인증 없이 401 |
| POST /api/admin/* | 어드민 시크릿 없이 403 |

**백분위 블렌딩 검증:**
- 5개 미만: 순수 추정값
- 5-99개: 실제 + 추정값 가중 블렌딩
- 100개 이상: 순수 실제값
- 항상 [1, 99] 클램핑

---

### 3. E2E 브라우저 테스트

**도구**: Playwright + Chromium

실제 브라우저에서 앱을 실행하고 UI 요소를 검증합니다.
`window.AIT` (Toss 브릿지 SDK)는 `addInitScript`로 목 처리합니다.

```js
// tests/e2e/fixtures.js
await page.addInitScript(() => {
  window.AIT = {
    getUser: () => Promise.resolve({ userHash: 'test-user-e2e' }),
    loadBannerAd: () => Promise.resolve(),
    // ...
  };
});
```

**커버하는 시나리오:**
- 페이지 로드 시 치명적 JS 에러 없음
- 인트로 → 홈화면 전환
- 홈화면 요소 존재: 타이틀, 랭크, XP, 티켓수, 미션, 게임 그리드, 포인트
- 티켓샵 열기/닫기
- 게임 카드 렌더링
- 화면 초기 표시 상태 (인트로만 표시)

---

## 현재 테스트의 한계 (솔직한 평가)

### ✅ 잘 커버되는 것
- 핵심 비즈니스 로직 (XP, 랭크, 스트릭, 챌린지, 티켓)
- 서버 API 전체 엔드포인트
- 백분위 계산 수학
- 설정 데이터 유효성
- 홈화면 렌더링

### ⚠️ 부분적으로 커버되는 것
- **게임 점수 공식**: 실제 소스 파일을 로드하는 것이 아닌, 소스를 읽고 수식을 재구현하여 테스트합니다. 원본 코드 변경 시 테스트가 자동으로 실패하지 않을 수 있습니다.
- **E2E 게임 플레이**: 인트로→홈 전환만 테스트. 실제 게임을 플레이하고 결과화면까지 확인하는 테스트 없음

### ❌ 커버되지 않는 것
- **38개 게임 파일 (`src/games/*.js`)**: 모두 DOM 의존성이 강해 vm 테스트 어려움. 현재 math, colormix, reaction, stroop, sequence 5개만 공식 검증
- **AIT SDK 실제 동작**: 토스 브릿지는 실제 앱 환경에서만 동작. 목 처리만 가능
- **game_common.js**: hearts 시스템, 타이머, 목표 바 등 DOM 의존성이 강한 공통 UI
- **result.js 렌더링**: showResult() DOM 렌더링 부분
- **home.js 렌더링**: renderHome() DOM 렌더링 부분
- **서버 Toss OAuth 흐름**: 실제 Toss API 키 필요

### 📊 코드 커버리지 측정 한계
프론트엔드 파일은 `readFileSync + vm.runInContext`로 로드되고, 서버는 `createRequire` (CJS-in-ESM)로 로드되어 istanbul이 계측할 수 없습니다. **커버리지 수치가 0%로 표시되는 것은 도구 한계이며, 실제로는 핵심 로직이 테스트되고 있습니다.**

---

## 개선 제안 (우선순위 순)

### 높음
1. **게임 공식 테스트 개선**: 게임 파일에서 순수 함수를 분리(export)하거나, vm 로드 방식으로 실제 소스 파일을 테스트
2. **E2E 게임 플레이 추가**: math 게임 한 판 플레이 → 결과화면 → XP 증가 확인

### 중간
3. **더 많은 게임 파일 커버**: colormix, memory, reaction 등 나머지 33개 게임
4. **스냅샷 테스트**: 결과화면, 홈화면 주요 HTML 구조 스냅샷

### 낮음
5. **부하 테스트**: 서버 API 동시 요청 처리 (artillery, k6 등)
6. **접근성 테스트**: Playwright axe-core 통합

---

## 기술 참고

### vm 로더 패턴의 원리

`const`/`let`은 vm 실행 컨텍스트의 블록 스코프 안에 갇혀 외부에서 접근이 안 됩니다. 함수 선언(`function foo(){}`)은 컨텍스트 객체에 자동으로 노출됩니다.

```js
// vm 내에서 const는 context.myConst로 접근 불가
// 별도 runInContext로 var에 복사해야 함
runInContext(`__myConst__ = typeof myConst !== 'undefined' ? myConst : undefined`, ctx);
```

### 서버 테스트 격리

```js
// 테스트 파일마다 새로운 in-memory DB 사용
process.env.TEST_DB = ':memory:';
delete require.cache[require.resolve('../../server/server.js')];
const { app } = require('../../server/server.js');

// supertest.agent()로 영속적 서버 유지 (per-request 서버 재생성 방지)
request = supertest.agent(app);
```
