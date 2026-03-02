# 목표 점수 세팅 로직

## 개요

게임 내 목표 점수는 **플레이 기록(best)** 유무에 따라 달라지며, 모드별로 다른 배율을 적용합니다.

---

## 모드별 목표 점수 공식

### 1. 오늘의 두뇌운동 (workout)

- **진입 화면** (`workout.js` `showWkTransition`)
- **인게임 진행 바** (`game_common.js` `initGoalBar`, `curGameContext === 'workout'`)

| 게임 타입 | 기록 있음 | 기록 없음 |
|---|---|---|
| 점수 게임 | `Math.ceil(best × 0.9)` | `goalDefault` |
| ms 게임 | `Math.round(bestMs × 1.1)` | `goalDefault` |

> 개인 최고보다 낮게 설정 → **달성하기 쉬운** 목표

---

### 2. 자유훈련 (free training)

- **인게임 진행 바** (`game_common.js` `initGoalBar`, 기본값)

| 게임 타입 | 기록 있음 | 기록 없음 |
|---|---|---|
| 점수 게임 | `Math.max(Math.ceil(best × 1.03), goalDefault)` | `goalDefault` |
| ms 게임 | `Math.round(bestMs × 0.99)` | `goalDefault` |

> 점수 게임: 개인 최고 + 3% (단, goalDefault 미만으로 내려가지 않음)
> ms 게임: 1% 더 빠른 기록 필요

---

### 3. 오늘의 챌린지 (mission)

- **미션 생성 시** (`utils.js` `getTodayMissions`)
- 매일 전체 게임 중 **5개 랜덤** 선택, 당일 localStorage에 고정

| 게임 타입 | 기록 있음 | 기록 없음 |
|---|---|---|
| 점수 게임 | `Math.ceil(best × 1.03)` | `goalDefault` |
| ms 게임 | 미션 대상 제외 | — |

> 자유훈련과 동일 배율, ms 게임은 챌린지 미션에 포함되지 않음

---

## 난이도 비교

| 모드 | 점수 게임 목표 | ms 게임 목표 | 체감 난이도 |
|---|---|---|---|
| 두뇌운동 | best × **0.9** | bestMs × **1.1** | 쉬움 |
| 자유훈련 | best × **1.03** ↑ | bestMs × **0.99** | 보통 |
| 챌린지 | best × **1.03** | (미해당) | 보통 |

---

## goalDefault

게임별 기본 목표 점수. 플레이 기록이 없을 때 사용되며, 자유훈련 점수 게임에서는 **하한선(floor)** 역할도 함.

`config.js`의 `GAMES` 배열에 게임별로 정의.

```js
// 예시
{id:'math', ..., goalDefault:120}
{id:'reaction', ..., goalDefault:2000, goalUnit:'ms'}
```

> `missionDefault`는 `goalDefault`로 통합됨 (2026-03-01)

---

## 관련 파일

| 파일 | 역할 |
|---|---|
| `src/core/config.js` | `GAMES` 배열 — `goalDefault`, `goalUnit` 정의 |
| `src/ui/game_common.js` | `initGoalBar()` — 자유훈련/두뇌운동 인게임 목표 |
| `src/core/workout.js` | `showWkTransition()` — 두뇌운동 전환 화면 목표 표시 |
| `src/core/utils.js` | `getTodayMissions()` — 챌린지 목표 생성 |
