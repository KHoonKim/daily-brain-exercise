# 상위 N% 백분위 보정 설계

**날짜**: 2026-02-28
**작업 범위**: `server/server.js`

---

## 문제

38개 게임의 백분위(상위 n%) 계산이 게임마다 체감이 달랐다. 일부 게임은 평범한 점수에도 상위권이 나오고, 일부는 목표 점수를 달성해도 하위권으로 표시됐다.

**근본 원인**: `ESTIMATED[game] = [mean, std]` 값이 게임 메커니즘 기반으로 수동 추정되어, `goalDefault`(설계된 목표 점수)와 따로 놀고 있었다.

**설계 원칙**: `goalDefault` 점수 달성 = 상위 50% (평균 수준)

주요 오차 사례:
- `matchpair`: goalDefault=120, 기존 mean=180 → 목표 달성해도 하위권
- `oddone`: goalDefault=150, 기존 mean=200 → 목표 달성해도 하위권
- `pyramid`: goalDefault=120, 기존 mean=70 → 평범한 점수에도 상위권
- `nback`: goalDefault=150, 기존 mean=100 → 평범한 점수에도 상위권

---

## 해결 방안: 2단계 접근 (즉시 수정 + 자동 수렴)

---

## Phase 1 — 즉시 수정

### 1-A. ESTIMATED mean을 goalDefault로 앵커링

모든 38개 게임의 `mean = goalDefault`로 재설정.

std는 게임 타입별 비율 적용:
- `isTimer` (30s 타이머 게임): `std = mean × 0.40`
- `isLevel` (레벨업 게임): `std = mean × 0.45`
- 특수 게임 (reaction, numtouch, timing): `std = mean × 0.35`

**변경 대상 파일**: `server/server.js` — `ESTIMATED` 객체 전체 재계산

### 1-B. 블렌딩 시작 기준 낮춤

실유저 데이터를 더 빨리 반영하기 위해 블렌딩 시작 임계값 조정.

```
변경 전: count >= 10 → 블렌딩 시작
변경 후: count >= 5  → 블렌딩 시작
```

블렌딩 가중치 공식은 동일 유지: `w = count / 100`

---

## Phase 2 — 자동 수렴 (Admin 재보정 API)

### 2-A. 재보정 엔드포인트

```
POST /api/admin/recalibrate
Header: x-admin-secret: {ADMIN_SECRET 환경변수}
```

**동작 순서**:
1. 게임별 DB 점수 조회 (해당 게임 30개 이상인 게임만 대상)
2. 실제 mean(평균), std(표준편차) 계산
3. 서버 메모리의 `ESTIMATED` 업데이트 (in-place)
4. `server/calibration.json`에 결과 persist
5. 응답: 변경된 게임 목록 + `{ game, before: [m,s], after: [m,s] }` 형태

### 2-B. 서버 시작 시 자동 로드

서버 시작 시 `server/calibration.json` 존재 여부 확인:
- 있으면: `ESTIMATED`를 calibration 값으로 덮어씀
- 없으면: goalDefault 기반 기본값 사용

### 2-C. 데이터 단계별 수렴

| 데이터 수 | 계산 방식 |
|----------|----------|
| 0~4명 | 순수 estimated (goalDefault 기반 정규분포) |
| 5~99명 | blended (실데이터 비중 = count/100) |
| 100명+ | 순수 real (DB 실측 백분위) |
| 30명+ (any) | `/recalibrate` 호출 시 ESTIMATED 자동 업데이트 |

---

## 전체 흐름 요약

```
출시 직후:  goalDefault 기반 mean → 즉시 공정한 백분위
유저 5명+:  실데이터 블렌딩 시작 → 빠른 수렴
유저 30명+: /recalibrate 호출 → 실분포로 ESTIMATED 갱신
유저 100명+: 완전히 실데이터만 사용 → 보정 불필요
```

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `server/server.js` | ESTIMATED 전체 재계산, 블렌딩 임계값 5로 변경, `/api/admin/recalibrate` 엔드포인트 추가, 서버 시작 시 calibration.json 로드 |
| `server/calibration.json` | 신규 생성 (재보정 후 자동 생성, git ignore 대상) |

---

## 비고

- `calibration.json`은 `.gitignore`에 추가 (서버별 데이터)
- `ADMIN_SECRET` 환경변수 미설정 시 `/recalibrate` 엔드포인트 비활성화
- `numtouch`는 goalDefault=100, missionDefault=200으로 역전된 값이 있어 별도 검토 필요
