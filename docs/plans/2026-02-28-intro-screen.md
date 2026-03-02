# 인트로 화면 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 미로그인 유저에게 인트로 화면을 표시하고, "시작하기" 버튼으로 토스 로그인 후 홈으로 이동

**Architecture:** `introScreen` div를 SPA에 추가하고, 페이지 로드 시 `AIT.storageGet('toss_userKey')` 값으로 초기 화면 결정. 로그인 성공 시 기존 `show()` 함수로 homeScreen으로 전환.

**Tech Stack:** Vanilla JS, TDS CSS (tds.css), AIT SDK wrapper, static.toss.im 2D 이모지

---

### Task 1: introScreen HTML 추가

**Files:**
- Modify: `index.html` (homeScreen div 바로 앞에 삽입)

**Step 1: homeScreen의 `active` 클래스 제거**

`index.html` 27번째 줄에서:
```html
<div id="homeScreen" class="home screen active">
```
를 아래로 변경:
```html
<div id="homeScreen" class="home screen">
```

**Step 2: introScreen div를 homeScreen 바로 앞에 추가**

`<!-- ===== HOME (ORIGINAL DESIGN) ===== -->` 주석 바로 앞에 삽입:

```html
<!-- ===== INTRO SCREEN ===== -->
<div id="introScreen" class="screen active">
  <!-- 헤더 -->
  <div class="tds-top__row">
    <h1 class="tds-top__title">
      <img src="icon-192.png" style="width:28px;height:28px;vertical-align:-6px;border-radius:6px">
      매일매일 두뇌운동
    </h1>
  </div>

  <!-- 메인 콘텐츠 -->
  <div class="intro-body">
    <!-- 앱 아이콘 -->
    <div class="intro-icon-wrap">
      <img src="icon-192.png" class="intro-icon" alt="매일매일 두뇌운동">
    </div>

    <!-- 헤드라인 -->
    <h2 class="tds-t1 tds-fw-bold intro-headline">
      하루 1분으로<br>두뇌능력을 키우고<br>포인트도 받아요.
    </h2>

    <!-- 특징 3가지 -->
    <div class="intro-features">
      <div class="intro-feature-item">
        <div class="intro-feature-icon">
          <img src="https://static.toss.im/2d-emojis/svg/u1F9EA.svg" alt="">
        </div>
        <div class="intro-feature-text">
          <p class="tds-t5 tds-fw-bold tds-color-text">과학적으로 설계된 두뇌운동</p>
          <p class="tds-t6 tds-color-sub">하루 1분 두뇌능력을 최대치로 끌어올려보세요.</p>
        </div>
      </div>
      <div class="intro-feature-item">
        <div class="intro-feature-icon">
          <img src="https://static.toss.im/2d-emojis/svg/u1F4B0.svg" alt="">
        </div>
        <div class="intro-feature-text">
          <p class="tds-t5 tds-fw-bold tds-color-text">토스 포인트 받기</p>
          <p class="tds-t6 tds-color-sub">두뇌운동하고 매일 토스포인트를 받아요.</p>
        </div>
      </div>
      <div class="intro-feature-item">
        <div class="intro-feature-icon">
          <img src="https://static.toss.im/2d-emojis/svg/u1F9E0.svg" alt="">
        </div>
        <div class="intro-feature-text">
          <p class="tds-t5 tds-fw-bold tds-color-text">38가지의 두뇌운동</p>
          <p class="tds-t6 tds-color-sub">기억력, 집중력, 논리력 등 다양한 두뇌능력을 키울 수 있어요.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 하단 CTA -->
  <div class="tds-bottom-cta">
    <button id="introStartBtn" class="tds-btn tds-btn-xl tds-btn-block tds-btn-primary" onclick="startApp()">
      시작하기
    </button>
  </div>
</div>
```

---

### Task 2: 인트로 JS 로직 추가 (`src/ui/intro.js`)

**Files:**
- Create: `src/ui/intro.js`

**Step 1: 파일 생성**

```js
// ===== INTRO SCREEN =====
// 로그인 여부 확인 후 초기 화면 결정
async function initIntro() {
  const userKey = await AIT.storageGet('toss_userKey');
  if (userKey) {
    show('homeScreen');
  }
  // userKey 없으면 introScreen이 이미 active 상태 → 유지
}

// 시작하기 버튼 핸들러
async function startApp() {
  const btn = document.getElementById('introStartBtn');
  btn.disabled = true;
  btn.textContent = '로그인 중...';
  try {
    const result = await AIT.login();
    if (result?.userKey || result?.mock) {
      show('homeScreen');
    } else {
      toast('로그인에 실패했어요. 다시 시도해주세요.');
      btn.disabled = false;
      btn.textContent = '시작하기';
    }
  } catch (e) {
    toast('로그인에 실패했어요. 다시 시도해주세요.');
    btn.disabled = false;
    btn.textContent = '시작하기';
  }
}

// DOM 준비 후 실행
document.addEventListener('DOMContentLoaded', initIntro);
```

---

### Task 3: 인트로 화면 CSS 추가 (`src/styles/main.css`)

**Files:**
- Modify: `src/styles/main.css` (파일 하단에 추가)

**Step 1: 인트로 전용 스타일 추가**

```css
/* ===== INTRO SCREEN ===== */
#introScreen {
  background: var(--bg);
  display: none;
  flex-direction: column;
}
#introScreen.active {
  display: flex;
}

.intro-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 24px 120px;
  overflow-y: auto;
}

.intro-icon-wrap {
  display: flex;
  justify-content: center;
  padding: 32px 0 28px;
}

.intro-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  box-shadow: var(--tds-shadow-md);
}

.intro-headline {
  margin: 0 0 36px;
  color: var(--tds-text);
  line-height: 1.4;
}

.intro-features {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.intro-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--tds-border);
}
.intro-feature-item:last-child {
  border-bottom: none;
}

.intro-feature-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--tds-r12);
  background: var(--tds-elephant-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.intro-feature-icon img {
  width: 26px;
  height: 26px;
}

.intro-feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}
```

---

### Task 4: `index.html`에 intro.js 스크립트 태그 추가

**Files:**
- Modify: `index.html` (scripts 섹션)

**Step 1: intro.js 스크립트 추가**

`index.html`에서 `home.js` script 태그를 찾아:
```html
<script src="src/ui/home.js?v=132"></script>
```

바로 앞에 추가:
```html
<script src="src/ui/intro.js?v=1"></script>
```

---

### Task 5: 빌드 및 확인

**Step 1: 빌드 실행**
```bash
cd /Users/daniel/Documents/daily-brain-exercise/daily-brain-exercise
npm run build
```
Expected: 빌드 성공, `dist/index.html` 생성

**Step 2: 로컬 개발 서버에서 확인**
```bash
npm run dev
```

**Step 3: 동작 확인 체크리스트**
- [ ] 처음 열면 introScreen이 보임 (localStorage에 toss_userKey 없는 상태)
- [ ] "시작하기" 클릭 시 버튼이 "로그인 중..."으로 변경됨
- [ ] 웹 환경에서 mock 로그인 후 homeScreen으로 이동
- [ ] localStorage에 toss_userKey 수동 설정 후 새로고침 → homeScreen 바로 표시
- [ ] 화면 하단 CTA 버튼이 고정되어 보임

**Step 4: 완료 알림 전송**
```bash
curl -s -d '인트로 화면 구현 완료' ntfy.sh/kyunghoon-claude-code > /dev/null
```
