# CashWord English — 설계 문서

**날짜:** 2026-03-01
**서비스명:** CashWord-english
**형태:** 앱인토스(App-in-Toss) WebView 미니앱
**목표:** 영어 단어 퀴즈를 풀고 코인을 모아 토스포인트로 교환하는 서비스

---

## 1. 서비스 개요

### 핵심 루프
```
단어 퀴즈 (4지선다) → 정답 시 1~3코인 랜덤 지급 → 광고 시청 → 다음 문제
                   → 오답 시 0코인            ↗
```

### 교환 비율
- **10코인 = 1 Toss 포인트**
- 하루 코인 획득 제한 없음

---

## 2. 어휘 데이터

- **수준:** CEFR A1~B2 (일상 영단어)
- **규모:** ~800개
- **저장 방식:** `src/core/words.js` 에 JSON 내장 (서버 불필요)
- **퀴즈 방향:** 영어 단어 → 한국어 뜻 (4지선다)
- **힌트:** 영어 단어의 첫 글자 공개 (예: apple → a\_\_\_\_)
- **중복 방지:** localStorage로 이미 출제된 단어 추적, 전체 소진 시 초기화

---

## 3. UI 흐름

### 3.1 홈 화면
```
┌─────────────────────────────────┐
│  지금까지 총 N 코인 받았어요      │  ← 누적 코인 배너
│                                 │
│       [돼지저금통 이미지]          │  ← 중앙 주요 영역
│                                 │
│  💬 AD 광고 보고 이어서 누를 수 있어요 │
│                                 │
│  [퀴즈 풀기]    [코인 교환하기]    │  ← 하단 액션
└─────────────────────────────────┘
```
- 코인 잔액 실시간 표시
- 코인 교환 버튼: 잔액 10코인 이상일 때 활성화

### 3.2 퀴즈 화면
```
┌─────────────────────────────────┐
│  Q. 다음 단어의 뜻은?             │
│                                 │
│    a____    ← 힌트 (첫 글자 공개) │
│    apple    ← 영어 단어 크게 표시 │
│                                 │
│  ┌────────────┐  ┌────────────┐ │
│  │    사과    │  │   바나나   │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐ │
│  │   오렌지   │  │    포도    │ │
│  └────────────┘  └────────────┘ │
└─────────────────────────────────┘
```
- 힌트는 퀴즈 로드 시 즉시 표시 (첫 글자만 노출, 나머지 _)
- 보기 4개: 정답 1개 + 오답 3개 (같은 CEFR 레벨 랜덤 선택)

### 3.3 정답/오답 처리
```
정답 선택 → 버튼 초록색 강조 + "🎉 2코인 획득!" 표시 → [광고 보고 다음 문제] 버튼
오답 선택 → 버튼 빨간색 + "❌ 정답: 사과" 표시   → [광고 보고 다음 문제] 버튼
```
- 정답: 1~3코인 랜덤 지급 → 서버에 적립
- 오답: 0코인 (광고 시청 후 다음 문제는 동일하게 진행)
- 광고 시청 완료 후 → 다음 문제 자동 로드

### 3.4 코인 교환 화면
```
현재 코인: 25개
10코인 → 1 Toss 포인트
[10코인 교환하기]  ← 10코인 단위 교환
```
- 교환 흐름: 서버 잔액 차감 → Toss 프로모션 SDK 호출 → 성공 시 확정 / 실패 시 복원

---

## 4. 광고 시스템

| 광고 타입 | 위치 | 용도 |
|-----------|------|------|
| 전면형(Interstitial) | 문제 사이 | 다음 문제 잠금 해제 |
| 배너형(Banner) | 홈 하단 | 상시 노출 |

- 광고 미시청 시 다음 문제 버튼 비활성화
- 비토스 환경(로컬): 광고 Mock 처리 (즉시 성공)

---

## 5. 코인 시스템 (서버)

### 5.1 기존 서버에 추가할 API 엔드포인트
**서버:** `littlesunnydays.com` (기존 daily-brain-exercise 서버 재사용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| `POST` | `/api/cashword/coins/add` | 코인 적립 (정답 시) |
| `GET`  | `/api/cashword/coins/:userHash` | 코인 잔액 조회 |
| `POST` | `/api/cashword/exchange` | 10코인 → 1포인트 교환 시작 |
| `POST` | `/api/cashword/exchange/:id/confirm` | 교환 확정 (SDK 성공 후) |
| `POST` | `/api/cashword/exchange/:id/restore` | 교환 취소 (SDK 실패 시 복원) |

### 5.2 DB 테이블 (기존 scores.db에 추가)
```sql
CREATE TABLE cashword_coins (
  user_hash TEXT PRIMARY KEY,
  coins INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cashword_exchanges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash TEXT NOT NULL,
  coins INTEGER NOT NULL,        -- 차감 코인 (항상 10)
  toss_points INTEGER NOT NULL,  -- 지급 포인트 (항상 1)
  status TEXT DEFAULT 'pending', -- pending | granted | cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 anti-cheat
- 코인 적립은 서버에서만 처리
- 클라이언트가 amount를 직접 전송 (1~3), 서버에서 1~3 범위 검증
- 동시 교환 방지: 10초 내 중복 요청 차단

---

## 6. 프로젝트 구조

```
CashWord-english/             ← 신규 독립 프로젝트
├── src/
│   ├── core/
│   │   ├── ait.js            ← 기존 프로젝트에서 복사 (AD ID 신규 등록 후 교체)
│   │   └── words.js          ← CEFR A1~B2 단어 JSON (~800개)
│   ├── ui/
│   │   ├── home.js           ← 홈 화면 렌더링 + 코인 표시
│   │   └── quiz.js           ← 퀴즈 로직 + 힌트 + 광고 흐름
│   └── styles/
│       └── main.css          ← TDS 스타일 + 커스텀 (심사 필수)
├── public/
│   └── piggy.png             ← 돼지저금통 이미지
├── index.html
├── vite.config.js
├── package.json
└── granite.config.ts         ← 앱인토스 앱 설정
```

---

## 7. 앱인토스 설정

### granite.config.ts
```typescript
export default {
  appName: 'cashword-english',  // 콘솔 등록명과 일치 필수
  brand: {
    displayName: '영단어 저금통',
    primaryColor: '#3182F6',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
};
```

### 필요한 신규 앱인토스 리소스 (콘솔 등록 필요)
- 광고 그룹 ID (전면형, 배너형) — 신규 등록
- 프로모션 코드 (코인→포인트 교환용) — 신규 등록
- 공유 모듈 ID (선택사항)

---

## 8. 기술 스택

| 항목 | 기술 |
|------|------|
| 프론트엔드 | Vite + Vanilla JS |
| 스타일 | CSS + TDS (토스 디자인 시스템, 심사 필수) |
| 서버 | 기존 Express.js + better-sqlite3 재사용 |
| 앱인토스 브릿지 | ait.js (기존 프로젝트 복사) |
| 빌드 | granite build → .ait 파일 |
| 테스트 | 샌드박스 앱 + QR 코드 실기기 테스트 |

---

## 9. 로그인 흐름

기존 프로젝트와 동일:
1. 앱 로드 → `AIT.login()` 호출 (appLogin → OAuth2 토큰 → 유저 정보)
2. `toss_userKey` localStorage 저장
3. 첫 로그인 시 `FIRST_LOGIN` 프로모션 지급 (선택)

---

## 10. 주요 구현 결정사항

| 결정 | 내용 |
|------|------|
| 단어 DB | JSON 내장 (서버 불필요, 빠른 로드) |
| 코인 저장 | 서버 저장 (anti-cheat) |
| 일일 한도 | 없음 |
| 힌트 | 영어 단어 첫 글자 공개 (a____) |
| 오답 코인 | 0코인 (광고는 동일하게 시청 필요) |
| 서버 | 기존 서버 재사용 (/api/cashword/* 추가) |
| 광고 | 문제 사이 전면 광고 (다음 문제 게이팅) |
