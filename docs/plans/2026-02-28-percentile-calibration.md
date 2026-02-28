# 백분위 보정 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 38개 게임의 `ESTIMATED [mean, std]`를 `goalDefault` 기반으로 재보정하고, 실데이터 자동 수렴 구조 추가

**Architecture:** Phase 1은 server.js의 ESTIMATED 객체를 goalDefault 앵커로 즉시 교체. Phase 2는 서버 시작 시 calibration.json 로드 + admin 재보정 API 추가로 실데이터가 쌓이면 자동 수렴.

**Tech Stack:** Node.js, Express, better-sqlite3 — 기존 스택 외 추가 의존성 없음

---

### Task 1: ESTIMATED 객체 재계산

**Files:**
- Modify: `server/server.js` (lines 50–127)

**Step 1: ESTIMATED 객체 전체를 아래 값으로 교체**

아래 값은 `goalDefault = mean`, std는 게임 타입별 공식으로 계산:
- `isLevel=true`: `std = mean × 0.45`
- `isTimer=true, isLevel=false`: `std = mean × 0.40`
- 특수(reaction, numtouch, timing): `std = mean × 0.35`
- 나머지(not timer, not level): `std = mean × 0.40`

```js
const ESTIMATED = {
  math:       [200, 80],   // isTimer, goal=200
  memory:     [120, 48],   // default, goal=120
  reaction:   [400, 140],  // special, goal=400
  stroop:     [150, 60],   // isTimer, goal=150
  sequence:   [100, 45],   // isLevel, goal=100
  word:       [120, 48],   // default, goal=120
  pattern:    [120, 48],   // isTimer, goal=120
  focus:      [200, 80],   // isTimer, goal=200
  rotate:     [120, 48],   // isTimer, goal=120
  reverse:    [80,  36],   // isLevel, goal=80
  numtouch:   [100, 35],   // special, goal=100
  rhythm:     [80,  36],   // isLevel, goal=80
  rps:        [120, 48],   // isTimer, goal=120
  oddone:     [150, 60],   // isTimer, goal=150
  compare:    [120, 48],   // isTimer, goal=120
  bulb:       [80,  36],   // isLevel, goal=80
  colormix:   [100, 40],   // isTimer, goal=100
  wordcomp:   [120, 48],   // isTimer, goal=120
  timing:     [100, 35],   // special, goal=100
  matchpair:  [120, 48],   // isTimer, goal=120
  headcount:  [120, 54],   // isTimer+isLevel → isLevel 우선, goal=120
  pyramid:    [120, 48],   // isTimer, goal=120
  maxnum:     [150, 60],   // isTimer, goal=150
  signfind:   [120, 48],   // isTimer, goal=120
  coincount:  [120, 48],   // isTimer, goal=120
  clock:      [100, 40],   // isTimer, goal=100
  wordmem:    [80,  36],   // isLevel, goal=80
  blockcount: [120, 48],   // isTimer, goal=120
  flanker:    [120, 48],   // isTimer, goal=120
  memgrid:    [80,  36],   // isLevel, goal=80
  nback:      [150, 60],   // isTimer, goal=150
  scramble:   [120, 48],   // default, goal=120
  serial:     [150, 60],   // isTimer, goal=150
  leftright:  [120, 48],   // isTimer, goal=120
  calccomp:   [120, 48],   // isTimer, goal=120
  flash:      [80,  36],   // isLevel, goal=80
  sort:       [150, 60],   // isTimer, goal=150
  mirror:     [120, 48],   // isTimer, goal=120
};
```

**Step 2: 변경 확인**

```bash
node -e "
const ESTIMATED = require('./server/server.js'); // 직접 실행 불가이므로 아래 방법으로 확인
"
# 대신: 서버 시작 후 curl로 테스트
```

**Step 3: 커밋**

```bash
git add server/server.js
git commit -m "fix: recalibrate ESTIMATED using goalDefault as 50th percentile anchor"
```

---

### Task 2: 블렌딩 임계값 낮추기

**Files:**
- Modify: `server/server.js` (lines 163–177)

**Step 1: 블렌딩 시작 기준 10 → 5로 변경**

```js
// 변경 전
if (count >= 100) {
  percentile = realPercentile(game, score);
  source = 'real';
} else {
  const est = estimatedPercentile(game, score);
  if (count >= 10) {  // ← 이 줄
```

```js
// 변경 후
if (count >= 100) {
  percentile = realPercentile(game, score);
  source = 'real';
} else {
  const est = estimatedPercentile(game, score);
  if (count >= 5) {   // ← 5로 변경
```

**Step 2: 직접 테스트 (서버 실행 후)**

```bash
cd daily-brain-exercise && node server/server.js &
# 테스트: 낮은 count에서 블렌딩 동작 확인
curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"game":"math","score":200}'
# 응답: { percentile: 50, source: "estimated" or "blended", totalPlayers: N }
```

**Step 3: 커밋**

```bash
git add server/server.js
git commit -m "fix: lower blending threshold from 10 to 5 for faster convergence"
```

---

### Task 3: calibration.json 자동 로드

**Files:**
- Modify: `server/server.js` (DB setup 아래, 약 line 40 이후)
- Create: `server/.gitignore` (또는 기존 `.gitignore`에 추가)

**Step 1: calibration.json 로드 코드 추가 (DB setup 바로 아래)**

```js
// Load persisted calibration if exists (overrides ESTIMATED defaults)
const CALIBRATION_PATH = path.join(__dirname, 'calibration.json');
try {
  if (fs.existsSync(CALIBRATION_PATH)) {
    const saved = JSON.parse(fs.readFileSync(CALIBRATION_PATH, 'utf8'));
    Object.assign(ESTIMATED, saved);
    console.log(`[calibration] Loaded ${Object.keys(saved).length} game overrides`);
  }
} catch (e) {
  console.warn('[calibration] Failed to load calibration.json:', e.message);
}
```

> **주의**: 이 코드는 `ESTIMATED` 객체 정의 **이후**에 위치해야 함

**Step 2: .gitignore에 추가**

```bash
echo "server/calibration.json" >> .gitignore
```

**Step 3: 커밋**

```bash
git add server/server.js .gitignore
git commit -m "feat: auto-load calibration.json on server startup"
```

---

### Task 4: Admin 재보정 엔드포인트 추가

**Files:**
- Modify: `server/server.js` (기존 라우트들 아래에 추가)

**Step 1: 환경변수 확인 로직과 엔드포인트 추가**

기존 라우트 마지막 부분(app.listen 바로 위)에 추가:

```js
// POST /api/admin/recalibrate — recalibrate ESTIMATED from real data
// Requires header: x-admin-secret matching ADMIN_SECRET env var
app.post('/api/admin/recalibrate', (req, res) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: 'Admin not configured' });
  if (req.headers['x-admin-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const MIN_SAMPLES = 30;
  const changes = [];

  for (const game of Object.keys(ESTIMATED)) {
    const row = db.prepare(`
      SELECT COUNT(*) as cnt, AVG(score) as mean,
             AVG((score - (SELECT AVG(score) FROM scores WHERE game = ?)) *
                 (score - (SELECT AVG(score) FROM scores WHERE game = ?))) as variance
      FROM scores WHERE game = ?
    `).get(game, game, game);

    if (!row || row.cnt < MIN_SAMPLES) continue;

    const newMean = Math.round(row.mean);
    const newStd  = Math.round(Math.sqrt(row.variance || 1));
    if (newStd < 5) continue; // 이상치 방어

    const before = [...ESTIMATED[game]];
    ESTIMATED[game] = [newMean, newStd];
    changes.push({ game, before, after: [newMean, newStd], samples: row.cnt });
  }

  // Persist to calibration.json
  if (changes.length > 0) {
    const toSave = {};
    for (const { game, after } of changes) toSave[game] = after;
    try {
      fs.writeFileSync(CALIBRATION_PATH, JSON.stringify(toSave, null, 2));
    } catch (e) {
      console.warn('[calibration] Failed to save:', e.message);
    }
  }

  res.json({ updated: changes.length, changes });
});
```

**Step 2: 엔드포인트 테스트**

```bash
# ADMIN_SECRET 없이 (503 기대)
curl -X POST http://localhost:3001/api/admin/recalibrate
# → {"error":"Admin not configured"}

# ADMIN_SECRET 설정 후 잘못된 secret (403 기대)
ADMIN_SECRET=mysecret node server/server.js &
curl -X POST http://localhost:3001/api/admin/recalibrate \
  -H "x-admin-secret: wrong"
# → {"error":"Forbidden"}

# 올바른 secret (200 기대, 30개 미만이면 changes=[] 정상)
curl -X POST http://localhost:3001/api/admin/recalibrate \
  -H "x-admin-secret: mysecret"
# → {"updated":0,"changes":[]}
```

**Step 3: 커밋**

```bash
git add server/server.js
git commit -m "feat: add /api/admin/recalibrate endpoint for auto-calibration"
```

---

### Task 5: 동작 통합 검증

**Step 1: 서버 재시작 후 전체 흐름 확인**

```bash
# 1. 기존 DB 상태에서 점수 제출
curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"game":"matchpair","score":120}'
# 기대: percentile ≈ 50 (이전에는 ~30이었음)

curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"game":"pyramid","score":120}'
# 기대: percentile ≈ 50 (이전에는 ~70이었음)

# 2. source 필드 확인
# DB에 해당 게임 0~4개 점수: source="estimated"
# 5~99개: source="blended"
# 100+: source="real"
```

**Step 2: numtouch 이슈 확인 (별도 검토)**

`numtouch`의 goalDefault=100, missionDefault=200 역전 현상 기록:

```bash
# numtouch 점수 분포 확인 (운영 중이라면)
curl http://localhost:3001/api/score/stats/numtouch
```

goalDefault가 missionDefault보다 낮으면 config.js 수정 필요 (별도 태스크)

**Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore: percentile calibration complete - phase 1 and 2"
```
