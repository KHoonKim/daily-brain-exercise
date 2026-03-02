# 인트로 화면 설계 문서

**날짜**: 2026-02-28
**기능**: 로그인 기반 인트로 화면 추가

---

## 요구사항

- 로그인 상태에 따라 인트로 표시 여부 결정
- 미로그인 → 인트로 화면 → 시작하기 → 토스 로그인 → 홈
- 로그인됨 → 바로 홈 화면

---

## 화면 구성

### 헤드라인
```
하루 1분으로
두뇌능력을 키우고 포인트도 받아요.
```

### 특징 3가지
1. **과학적으로 설계된 두뇌운동** — 하루1분 두뇌능력을 최대치로 끌어올려보세요.
2. **토스 포인트 받기** — 두뇌운동하고 매일 토스포인트를 받아요.
3. **38가지의 두뇌운동** — 기억력, 집중력, 논리력 등 다양한 두뇌능력을 키울 수 있어요.

### CTA
- 버튼 텍스트: `시작하기`
- 하단 고정 (fixed bottom)

---

## 화면 흐름

```
앱 열기
  └─ AIT.storageGet('toss_userKey') 확인
       ├─ 값 있음 → homeScreen (class="active")
       └─ 값 없음 → introScreen (class="active")
                      └─ [시작하기] 클릭
                           └─ AIT.login() 호출
                                ├─ 성공 (userKey or mock) → homeScreen
                                └─ 실패 → 오류 toast 표시
```

---

## 구현 계획

### 1. `index.html`
- `<div id="introScreen" class="screen active">` 추가 (homeScreen보다 앞에)
- `homeScreen`에서 `active` 클래스 제거 (초기값)
- `<script src="src/ui/intro.js?v=1">` 추가

### 2. `src/ui/intro.js` (신규)
```js
async function initIntro() {
  const userKey = await AIT.storageGet('toss_userKey');
  if (userKey) {
    showScreen('homeScreen');
    return;
  }
  showScreen('introScreen');
}

async function startApp() {
  const btn = document.getElementById('introStartBtn');
  btn.disabled = true;
  btn.textContent = '로그인 중...';
  try {
    const result = await AIT.login();
    if (result?.userKey || result?.mock) {
      showScreen('homeScreen');
    } else {
      toast('로그인에 실패했어요. 다시 시도해주세요.');
      btn.disabled = false;
      btn.textContent = '시작하기';
    }
  } catch(e) {
    toast('로그인에 실패했어요. 다시 시도해주세요.');
    btn.disabled = false;
    btn.textContent = '시작하기';
  }
}

document.addEventListener('DOMContentLoaded', initIntro);
```

### 3. `src/styles/main.css`
- `.intro-screen` 레이아웃 (flex column, space-between)
- `.intro-features` 리스트 스타일 (아이콘 + 제목 + 설명)
- `.intro-cta` 하단 고정 버튼

---

## 아이콘 (static.toss.im 2D 이모지)
- 뇌/과학: `u1F9EA.svg` (시험관) 또는 `u1F52C.svg` (현미경)
- 포인트: `u1F4B0.svg` (돈봉투)
- 게임: `u1F9E0.svg` (뇌)

---

## 비고
- 웹(비토스) 환경: `AIT.login()` mock 반환 → `result.mock = true` → 홈으로 이동
- `AIT.init()`의 자동 로그인은 homeScreen 진입 후에도 백그라운드에서 유지
