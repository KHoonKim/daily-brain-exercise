# 챌린지 목표 점수 교정 설계

**날짜:** 2026-02-28
**대상 파일:** `src/core/config.js`

## 문제

현재 `config.js`의 `goalDefault`와 `missionDefault` 값이 서버의 실제 점수 분포와 맞지 않음:

- `goalDefault`: 너무 높게 설정됨 (평균 60th 백분위 수준 → 첫 플레이어가 달성하기 어려움)
- `missionDefault`: 너무 낮게 설정됨 (평균 10~20th 백분위 수준 → 챌린지 느낌 없음)

## 해결 방법

서버 `server.js`에 이미 존재하는 `ESTIMATED` 분포(평균, 표준편차)를 활용해 1회성 교정.

### 공식

```
goalDefault    = round(mean - 0.4 × std, 10)  // ~35th 백분위
missionDefault = round(mean - 0.1 × std, 10)  // ~46th 백분위
```

### 의미

| 필드 | 백분위 | 의도 |
|------|--------|------|
| goalDefault | ~35th | 첫 플레이어가 집중하면 달성 가능한 목표 ("목표 달성!" 토스트 경험) |
| missionDefault | ~46th | 어느 정도 실력이 있어야 달성 가능한 진짜 챌린지 |

## 변경 값 (38개 게임 전체)

| 게임 | mean | std | goalDefault (현→신) | missionDefault (현→신) |
|------|------|-----|---------------------|------------------------|
| math | 180 | 80 | 200→150 | 80→170 |
| memory | 100 | 40 | 120→80 | 60→100 |
| reaction | 350 | 120 | 400→300 | 200→340 |
| stroop | 160 | 70 | 150→130 | 80→150 |
| sequence | 100 | 50 | 100→80 | 50→100 |
| word | 80 | 35 | 120→70 | 60→80 |
| pattern | 120 | 55 | 120→100 | 60→110 |
| focus | 180 | 70 | 200→150 | 80→170 |
| rotate | 90 | 40 | 120→70 | 60→90 |
| reverse | 80 | 40 | 80→60 | 50→80 |
| numtouch | 100 | 50 | 100→80 | 200→100 ⚠️ |
| rhythm | 100 | 55 | 80→80 | 40→90 |
| rps | 140 | 55 | 120→120 | 80→130 |
| oddone | 200 | 80 | 150→170 | 80→190 |
| compare | 160 | 60 | 120→140 | 80→150 |
| bulb | 100 | 55 | 80→80 | 50→90 |
| colormix | 90 | 40 | 100→70 | 60→90 |
| wordcomp | 110 | 45 | 120→90 | 60→110 |
| timing | 90 | 45 | 100→70 | 60→90 |
| matchpair | 180 | 70 | 120→150 | 100→170 |
| headcount | 90 | 40 | 120→70 | 60→90 |
| pyramid | 70 | 35 | 120→60 | 60→70 |
| maxnum | 160 | 65 | 150→130 | 80→150 |
| signfind | 110 | 45 | 120→90 | 80→110 |
| coincount | 90 | 40 | 120→70 | 60→90 |
| clock | 70 | 35 | 100→60 | 60→70 |
| wordmem | 90 | 45 | 80→70 | 60→90 |
| blockcount | 90 | 40 | 120→70 | 60→90 |
| flanker | 140 | 55 | 120→120 | 80→130 |
| memgrid | 80 | 40 | 80→60 | 50→80 |
| nback | 100 | 45 | 150→80 | 80→100 |
| scramble | 90 | 40 | 120→70 | 60→90 |
| serial | 120 | 50 | 150→100 | 80→110 |
| leftright | 140 | 55 | 120→120 | 80→130 |
| calccomp | 110 | 45 | 120→90 | 60→110 |
| flash | 90 | 45 | 80→70 | 40→90 |
| sort | 140 | 55 | 150→120 | 60→130 |
| mirror | 90 | 40 | 120→70 | 50→90 |

⚠️ `numtouch` missionDefault 200 → 100: 기존 값이 97th 백분위로 달성 거의 불가였음.

## 구현 범위

- `src/core/config.js`의 GAMES 배열에서 각 게임의 `goalDefault`, `missionDefault` 값만 수정
- 로직 변경 없음 (공식은 `game_common.js`, `utils.js`에 그대로 유지)

## 향후 재보정

실제 DB 데이터가 게임당 100건 이상 쌓이면:

```sql
SELECT game, AVG(score) as mean,
       SQRT(AVG(score*score) - AVG(score)*AVG(score)) as std
FROM scores GROUP BY game;
```

으로 실제 분포를 확인 후 재보정 가능.
