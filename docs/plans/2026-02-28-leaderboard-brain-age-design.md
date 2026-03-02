# 두뇌나이 1살 단위 + 토스 게임센터 리더보드 설계

**날짜**: 2026-02-28
**상태**: 승인됨

---

## 개요

두 가지 작업:
1. **두뇌나이 1살 단위** — 기존 10살 단위(9단계) → 지수 공식으로 81단계(100세~20세) 자동 생성
2. **토스 게임센터 리더보드** — 게임 종료 후 누적 XP를 토스 게임센터에 제출

---

## 1. 두뇌나이 1살 단위 (Approach B)

### 공식

```js
// k = 0.0615, C = 590
XP(age) = Math.round(590 * (Math.exp(0.0615 * (100 - age)) - 1))
```

### 앵커 포인트

| 나이 | XP | 비고 |
|------|----|------|
| 100세 | 0 | 시작 |
| 90세 | ~500 | 기존과 동일 |
| 80세 | ~1,400 | 기존(2,000)보다 빠름 |
| 70세 | ~3,100 | 기존(5,000)보다 빠름 |
| 60세 | ~7,000 | 기존(10,000)보다 빠름 |
| 50세 | ~14,000 | 기존(18,000)보다 빠름 |
| 40세 | ~28,000 | 기존(30,000)과 유사 |
| 30세 | ~52,000 | 기존(50,000)과 유사 |
| 20세 | ~80,000 | 기존과 동일 |

> 기존 유저는 대부분 "더 젊어짐" (XP 임계값 낮아짐). 80세 이하 구간에서 체감 개선.

### 색상 맵 (기존 9색 → 81단계 그라데이션)

기존 9개 색상을 유지하되, 1살 단위로 선형 보간:
- 100세: `#CD7F32` (브론즈)
- 90세: `#C0C0C0` (실버)
- 80세: `#9E9E9E`
- 70세: `#FFD700` (골드)
- 60세: `#FFA726`
- 50세: `#66BB6A`
- 40세: `#4DD0E1`
- 30세: `#42A5F5`
- 20세: `#E040FB` (퍼플)

### 구현

`src/core/config.js`의 `RANKS` 배열을 런타임 생성 함수로 교체:

```js
function generateRanks() {
  const k = 0.0615, C = 590;
  const COLOR_ANCHORS = [
    { age: 100, color: '#CD7F32' },
    { age: 90,  color: '#C0C0C0' },
    { age: 80,  color: '#9E9E9E' },
    { age: 70,  color: '#FFD700' },
    { age: 60,  color: '#FFA726' },
    { age: 50,  color: '#66BB6A' },
    { age: 40,  color: '#4DD0E1' },
    { age: 30,  color: '#42A5F5' },
    { age: 20,  color: '#E040FB' },
  ];
  const ranks = [];
  for (let age = 100; age >= 20; age--) {
    const minXp = age === 100 ? 0 : Math.round(C * (Math.exp(k * (100 - age)) - 1));
    // 색상: 가장 가까운 앵커 2개 사이 선형 보간
    const color = interpolateColor(age, COLOR_ANCHORS);
    ranks.push({ name: `${age}세`, minXp, color, label: String(age), age });
  }
  return ranks;
}
const RANKS = generateRanks();
```

---

## 2. 토스 게임센터 리더보드 (Approach X)

### 전제

- `AIT.submitScore(score)` → `window.__granite__?.submitGameCenterLeaderBoardScore({ score: String(score) })` 이미 구현됨
- `AIT.openLeaderboard()` → `openGameCenterLeaderboard()` 이미 구현됨
- 결과 화면 "리더보드" 버튼 이미 `AIT.openLeaderboard()` 호출 중

### 제출 시점

게임 종료 후 XP가 업데이트되는 시점에 즉시 제출.

```
게임 종료 → 점수 계산 → addXP(xp) 호출 → AIT.submitScore(totalXP) 호출 → 결과 화면
```

### 구현 위치

`src/core/utils.js`의 `addXP()` 함수 내부, XP 저장 직후:

```js
function addXP(amount) {
  // ... 기존 XP 저장 로직 ...
  const newXP = getXP() + amount;
  // localStorage에 저장
  // ...
  // 토스 게임센터에 현재 XP 제출
  if (typeof AIT !== 'undefined') {
    AIT.submitScore(newXP);
  }
  return newXP;
}
```

### 토스 게임센터 제약사항

- 미니앱당 리더보드 1개만 지원
- 점수는 String으로 전달 (`String(xp)`)
- 게임 프로필 초기화 전 제출 시 오류 가능 → `init()` 이후에만 호출되므로 문제없음
- 리더보드 열면 미니앱이 백그라운드로 전환됨 (기존 코드에서 이미 처리)
- `CONFIG.LEADERBOARD_ID`는 현재 placeholder → 토스에서 실제 ID 발급 필요

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/core/config.js` | `RANKS` 배열 → `generateRanks()` 함수로 교체, `interpolateColor()` 헬퍼 추가 |
| `src/core/utils.js` | `addXP()` 내부에 `AIT.submitScore(newXP)` 추가 |

---

## 제외 사항 (YAGNI)

- 내부 리더보드 UI(`leaderboard.js`) 변경 없음 — 토스 네이티브 UI 사용
- 백엔드 변경 없음
- 점수 변환(두뇌나이 역산) 없음 — XP 직접 제출
