# Challenge Goal Calibration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `src/core/config.js`의 38개 게임 `goalDefault`·`missionDefault` 값을 ESTIMATED 분포 기반 공식으로 교정한다.

**Architecture:** config.js GAMES 배열의 숫자 값만 수정. 로직 변경 없음. 공식: `goalDefault = round(mean - 0.4×std, 10)`, `missionDefault = round(mean - 0.1×std, 10)`.

**Tech Stack:** Vanilla JS, Vite

---

### Task 1: config.js 값 교정

**Files:**
- Modify: `src/core/config.js` (GAMES 배열 내 각 게임의 goalDefault, missionDefault)

**Step 1: 교정 전 현재 값 확인**

파일 열기: `src/core/config.js` 46~85번째 줄 확인.

**Step 2: 아래 표 기준으로 값 수정**

각 게임의 `goalDefault`와 `missionDefault`를 다음으로 교체:

| id | goalDefault | missionDefault |
|----|-------------|----------------|
| math | 150 | 170 |
| memory | 80 | 100 |
| reaction | 300 | 340 |
| stroop | 130 | 150 |
| sequence | 80 | 100 |
| word | 70 | 80 |
| pattern | 100 | 110 |
| focus | 150 | 170 |
| rotate | 70 | 90 |
| reverse | 60 | 80 |
| numtouch | 80 | 100 |
| rhythm | 80 | 90 |
| rps | 120 | 130 |
| oddone | 170 | 190 |
| compare | 140 | 150 |
| bulb | 80 | 90 |
| colormix | 70 | 90 |
| wordcomp | 90 | 110 |
| timing | 70 | 90 |
| matchpair | 150 | 170 |
| headcount | 70 | 90 |
| pyramid | 60 | 70 |
| maxnum | 130 | 150 |
| signfind | 90 | 110 |
| coincount | 70 | 90 |
| clock | 60 | 70 |
| wordmem | 70 | 90 |
| blockcount | 70 | 90 |
| flanker | 120 | 130 |
| memgrid | 60 | 80 |
| nback | 80 | 100 |
| scramble | 70 | 90 |
| serial | 100 | 110 |
| leftright | 120 | 130 |
| calccomp | 90 | 110 |
| flash | 70 | 90 |
| sort | 120 | 130 |
| mirror | 70 | 90 |

**Step 3: 브라우저에서 검증**

```bash
npm run dev
```

1. 게임 하나 플레이 (처음 플레이 상태, localStorage 없이)
2. 게임 내 목표 바가 합리적인 수치로 표시되는지 확인
3. 홈화면 → 오늘의 챌린지 → 미션 목표 점수 확인

검증 항목:
- `math` goalDefault: 150점으로 표시되어야 함
- `numtouch` missionDefault: 100점 (기존 200에서 수정됨 — 가장 중요한 버그 수정)

**Step 4: 커밋**

```bash
git add src/core/config.js
git commit -m "fix: calibrate goalDefault and missionDefault using ESTIMATED distributions

- goalDefault: ~35th percentile (mean - 0.4*std), achievable on first play
- missionDefault: ~46th percentile (mean - 0.1*std), genuine daily challenge
- fixes numtouch missionDefault 200→100 (was 97th percentile, nearly impossible)"
```

---

## 검증 기준

| 항목 | 기대 결과 |
|------|-----------|
| math goal | 150점 표시 |
| reaction goal | 300점 표시 |
| numtouch mission | 100점 (기존 200점에서 수정) |
| 전반적 체감 | 목표 바가 게임 중에 달성 가능한 느낌 |

---

## 향후 재보정 방법

게임당 DB 기록 100건 이상 쌓이면:

```sql
SELECT game,
       ROUND(AVG(score) - 0.4 * SQRT(AVG(score*score) - AVG(score)*AVG(score)), -1) as new_goal,
       ROUND(AVG(score) - 0.1 * SQRT(AVG(score*score) - AVG(score)*AVG(score)), -1) as new_mission
FROM scores
GROUP BY game
HAVING COUNT(*) >= 100;
```

결과를 config.js에 다시 적용.
