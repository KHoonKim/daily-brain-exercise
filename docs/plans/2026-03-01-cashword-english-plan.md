# CashWord English — 구현 계획서

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 영어 단어 4지선다 퀴즈를 풀고 코인을 모아 Toss 포인트로 교환하는 앱인토스 WebView 미니앱 신규 프로젝트 구축

**Architecture:** 독립 Vite + Vanilla JS 프로젝트 (`~/Documents/CashWord-english`). 단어 데이터는 JSON 내장, 코인은 기존 `littlesunnydays.com` 서버(daily-brain-exercise)에 `/api/cashword/*` 엔드포인트 추가로 관리. 기존 `ait.js` 브릿지 복사해 광고·로그인·프로모션 재사용.

**Tech Stack:** Vite 6, Vanilla JS (ESM), `@apps-in-toss/web-framework` 1.14.x, Express.js + better-sqlite3 (기존 서버), granite CLI

---

## 사전 준비 (코딩 전 필수)

> 다음은 콘솔/수동 작업이라 코드 구현 전에 확인해야 합니다.

- [ ] 앱인토스 콘솔에서 앱 이름 `cashword-english` 등록
- [ ] 광고 그룹 ID 발급: 전면형(interstitial), 배너형(banner) 각 1개
- [ ] 프로모션 코드 발급: 코인→Toss 포인트 교환용 1개 (PROMO_COIN_EXCHANGE)
- [ ] `granite` CLI 설치 확인: `npx @apps-in-toss/web-framework --version`

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `~/Documents/CashWord-english/` (새 디렉토리)
- Create: `~/Documents/CashWord-english/package.json`
- Create: `~/Documents/CashWord-english/vite.config.js`
- Create: `~/Documents/CashWord-english/granite.config.ts`
- Create: `~/Documents/CashWord-english/.gitignore`
- Create: `~/Documents/CashWord-english/index.html`

**Step 1: 디렉토리 생성 및 git 초기화**

```bash
mkdir -p ~/Documents/CashWord-english
cd ~/Documents/CashWord-english
git init
```

**Step 2: package.json 생성**

```json
{
  "name": "cashword-english",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "granite dev",
    "build": "granite build",
    "dev:vite": "vite",
    "build:vite": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@apps-in-toss/web-framework": "^1.14.1"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vite-plugin-full-reload": "^1.2.0"
  }
}
```

**Step 3: 패키지 설치**

```bash
cd ~/Documents/CashWord-english
npm install
```

Expected: `node_modules/` 생성, no errors

**Step 4: vite.config.js 생성**

```js
import { defineConfig } from 'vite';
import fullReload from 'vite-plugin-full-reload';

export default defineConfig({
  plugins: [
    fullReload(['src/**/*.js', 'src/**/*.css', 'index.html']),
  ],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
```

**Step 5: granite.config.ts 생성**

```ts
export default {
  appName: 'cashword-english',
  brand: {
    displayName: '영단어 저금통',
    primaryColor: '#3182F6',
    icon: '',
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

**Step 6: .gitignore 생성**

```
node_modules/
dist/
*.ait
.env
```

**Step 7: 디렉토리 구조 생성**

```bash
mkdir -p src/core src/ui src/styles public
```

**Step 8: index.html 생성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#3182F6" />
  <title>영단어 저금통</title>
  <link rel="stylesheet" href="src/styles/main.css?v=1" />
  <script src="src/core/ait.js?v=1"></script>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { renderHome } from './src/ui/home.js';
    renderHome();
  </script>
</body>
</html>
```

**Step 9: 첫 커밋**

```bash
cd ~/Documents/CashWord-english
git add .
git commit -m "chore: initial project scaffold"
```

---

## Task 2: AIT 브릿지 복사 및 설정

**Files:**
- Create: `~/Documents/CashWord-english/src/core/ait.js`

기존 프로젝트의 `ait.js`를 복사하되, CONFIG 섹션의 AD ID와 PROMO 코드를 CashWord용으로 교체합니다.

**Step 1: ait.js 복사**

```bash
cp ~/Documents/daily-brain-exercise/daily-brain-exercise/src/core/ait.js \
   ~/Documents/CashWord-english/src/core/ait.js
```

**Step 2: CONFIG 섹션 수정** (`src/core/ait.js` 68~78번째 줄 부근)

아래 값들을 콘솔에서 발급받은 실제 ID로 교체:

```js
const CONFIG = {
  AD_BANNER_ID: 'CASHWORD_BANNER_AD_ID',           // 콘솔 등록 후 교체
  AD_IMAGE_BANNER_ID: 'CASHWORD_IMAGE_BANNER_ID',  // 콘솔 등록 후 교체
  AD_INTERSTITIAL_ID: 'CASHWORD_INTERSTITIAL_ID',  // 콘솔 등록 후 교체
  AD_REWARDED_ID: 'CASHWORD_REWARDED_ID',          // 콘솔 등록 후 교체
  PROMO_FIRST_LOGIN: 'CASHWORD_FIRST_LOGIN_PROMO', // 콘솔 등록 후 교체
  PROMO_COIN_EXCHANGE: 'CASHWORD_COIN_EXCHANGE_PROMO', // 코인→포인트 교환
  SHARE_MODULE_ID: '',
};
```

> 콘솔 등록 전에는 Mock 값으로 진행 가능. 로컬 환경에서는 `isToss = false`로 동작해 광고가 자동으로 Mock 처리됨.

**Step 3: init() 함수에서 버전 로그 수정** (파일 하단 부근)

```js
log('app_open', { version: 'cashword-v1' });
```

**Step 4: checkPromoFirstLogin 함수 수정**

기존 프로모션 함수들은 그대로 두고, CashWord용 교환 트리거 함수 추가:

```js
async function checkPromoExchange(amount) {
  return triggerPromo('POINT_100', CONFIG.PROMO_COIN_EXCHANGE, amount);
}
```

그리고 `return { ... }` 블록에 `checkPromoExchange` 추가:

```js
return {
  isToss, CONFIG, getUserHash, login, getLoginData, triggerPromo,
  checkPromoFirstLogin, checkPromoExchange,
  showAd, preloadAd, loadBannerAd, destroyBannerAd,
  submitScore, openLeaderboard, getProfile,
  storageGet, storageSet, haptic,
  grantPromoReward, shareInvite, shareMessage,
  log, setScreenAwake, close, getDeviceId, getPlatform, getEnv,
  init, get userHash() { return _userHash; }
};
```

**Step 5: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/core/ait.js
git commit -m "feat: add AIT bridge (copied from daily-brain-exercise)"
```

---

## Task 3: 단어 데이터베이스 (words.js)

**Files:**
- Create: `~/Documents/CashWord-english/src/core/words.js`

CEFR A1~B2 수준의 영한 단어 ~800개를 JSON 배열로 내장합니다.

**Step 1: words.js 생성**

아래는 구조 예시 + 샘플 50개. 실제 구현 시 800개로 확장:

```js
// CEFR A1~B2 영한 단어 사전
// 형식: { en: '영어', ko: '한국어 뜻', level: 'A1'|'A2'|'B1'|'B2' }
export const WORDS = [
  // === A1 (기초) ===
  { en: 'apple', ko: '사과', level: 'A1' },
  { en: 'banana', ko: '바나나', level: 'A1' },
  { en: 'book', ko: '책', level: 'A1' },
  { en: 'cat', ko: '고양이', level: 'A1' },
  { en: 'dog', ko: '개', level: 'A1' },
  { en: 'eat', ko: '먹다', level: 'A1' },
  { en: 'family', ko: '가족', level: 'A1' },
  { en: 'friend', ko: '친구', level: 'A1' },
  { en: 'go', ko: '가다', level: 'A1' },
  { en: 'happy', ko: '행복한', level: 'A1' },
  { en: 'house', ko: '집', level: 'A1' },
  { en: 'job', ko: '직업', level: 'A1' },
  { en: 'kid', ko: '아이', level: 'A1' },
  { en: 'love', ko: '사랑', level: 'A1' },
  { en: 'man', ko: '남자', level: 'A1' },
  { en: 'name', ko: '이름', level: 'A1' },
  { en: 'open', ko: '열다', level: 'A1' },
  { en: 'park', ko: '공원', level: 'A1' },
  { en: 'question', ko: '질문', level: 'A1' },
  { en: 'red', ko: '빨간색', level: 'A1' },
  { en: 'school', ko: '학교', level: 'A1' },
  { en: 'time', ko: '시간', level: 'A1' },
  { en: 'umbrella', ko: '우산', level: 'A1' },
  { en: 'visit', ko: '방문하다', level: 'A1' },
  { en: 'water', ko: '물', level: 'A1' },
  // === A2 (초급) ===
  { en: 'accident', ko: '사고', level: 'A2' },
  { en: 'advice', ko: '조언', level: 'A2' },
  { en: 'angry', ko: '화난', level: 'A2' },
  { en: 'borrow', ko: '빌리다', level: 'A2' },
  { en: 'carefully', ko: '조심스럽게', level: 'A2' },
  { en: 'decide', ko: '결정하다', level: 'A2' },
  { en: 'enjoy', ko: '즐기다', level: 'A2' },
  { en: 'forget', ko: '잊다', level: 'A2' },
  { en: 'guess', ko: '추측하다', level: 'A2' },
  { en: 'habit', ko: '습관', level: 'A2' },
  { en: 'imagine', ko: '상상하다', level: 'A2' },
  { en: 'jealous', ko: '질투하는', level: 'A2' },
  { en: 'knowledge', ko: '지식', level: 'A2' },
  { en: 'listen', ko: '듣다', level: 'A2' },
  { en: 'nervous', ko: '긴장한', level: 'A2' },
  // === B1 (중급) ===
  { en: 'achievement', ko: '성취', level: 'B1' },
  { en: 'alternative', ko: '대안', level: 'B1' },
  { en: 'benefit', ko: '이점', level: 'B1' },
  { en: 'challenge', ko: '도전', level: 'B1' },
  { en: 'develop', ko: '발전하다', level: 'B1' },
  { en: 'encourage', ko: '격려하다', level: 'B1' },
  { en: 'influence', ko: '영향', level: 'B1' },
  { en: 'manage', ko: '관리하다', level: 'B1' },
  { en: 'opportunity', ko: '기회', level: 'B1' },
  { en: 'responsible', ko: '책임있는', level: 'B1' },
  // === B2 (중상급) ===
  { en: 'accomplish', ko: '성취하다', level: 'B2' },
  { en: 'controversial', ko: '논쟁적인', level: 'B2' },
  { en: 'demonstrate', ko: '보여주다', level: 'B2' },
  { en: 'elaborate', ko: '정교한', level: 'B2' },
  { en: 'fundamental', ko: '근본적인', level: 'B2' },
  // ... 총 800개로 확장
];

// 힌트: 첫 글자만 공개, 나머지는 _ 로 표시
export function getHint(word) {
  return word[0] + '_'.repeat(word.length - 1);
}

// 출제된 단어 인덱스 관리 (localStorage)
const SEEN_KEY = 'cw_seen';

function getSeenSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch { return new Set(); }
}

function markSeen(en) {
  const seen = getSeenSet();
  seen.add(en);
  // 전체 소진 시 초기화
  if (seen.size >= WORDS.length) {
    localStorage.removeItem(SEEN_KEY);
    return;
  }
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

// 랜덤 미출제 단어 선택
export function getNextWord() {
  const seen = getSeenSet();
  const unseen = WORDS.filter(w => !seen.has(w.en));
  const pool = unseen.length > 0 ? unseen : WORDS; // 전체 소진 시 전체에서 선택
  const word = pool[Math.floor(Math.random() * pool.length)];
  markSeen(word.en);
  return word;
}

// 오답 보기 3개 생성 (같은 레벨 우선, 부족하면 전체에서 선택)
export function getWrongChoices(correctWord, count = 3) {
  const sameLevel = WORDS.filter(w => w.en !== correctWord.en && w.level === correctWord.level);
  const others = WORDS.filter(w => w.en !== correctWord.en && w.level !== correctWord.level);
  const pool = sameLevel.length >= count ? sameLevel : [...sameLevel, ...others];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// 보기 4개 섞기 (정답 포함)
export function buildChoices(correctWord) {
  const wrongs = getWrongChoices(correctWord);
  const all = [correctWord, ...wrongs].sort(() => Math.random() - 0.5);
  return all;
}
```

> **실제 구현 시:** 800개 단어 목록은 온라인 CEFR wordlist (예: EVP - English Vocabulary Profile) 참고하거나 AI로 생성. 구조는 위와 동일.

**Step 2: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/core/words.js
git commit -m "feat: add CEFR A1-B2 word database with hint and selection logic"
```

---

## Task 4: 메인 CSS 스타일

**Files:**
- Create: `~/Documents/CashWord-english/src/styles/main.css`

**Step 1: main.css 생성**

```css
/* TDS 기반 + CashWord 커스텀 스타일 */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue: #3182F6;
  --blue-light: #EBF3FE;
  --green: #00B493;
  --red: #F04452;
  --gray-100: #F9FAFB;
  --gray-200: #F2F4F6;
  --gray-300: #E5E8EB;
  --gray-500: #8B95A1;
  --gray-700: #4E5968;
  --gray-900: #191F28;
  --coin-gold: #F5A623;
  --radius: 12px;
  --radius-lg: 20px;
}

html, body {
  height: 100%;
  font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  background: #EBF0FA;
  color: var(--gray-900);
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}

#app {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: #EBF0FA;
  position: relative;
}

/* === 홈 화면 === */
.home-coin-banner {
  background: white;
  border-radius: 24px;
  padding: 12px 16px;
  margin: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-700);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.home-coin-banner .coin-count {
  color: var(--blue);
  font-weight: 700;
}

.home-piggy-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0 24px;
}
.home-piggy-area img {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

.ad-bubble {
  background: white;
  border-radius: 16px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-700);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin: 8px 16px;
}
.ad-badge {
  background: var(--blue);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}

.home-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
}

/* === 버튼 공통 === */
.btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s, transform 0.1s;
  min-height: 90px;
}
.btn:active { transform: scale(0.97); opacity: 0.85; }
.btn-sub { font-size: 11px; color: rgba(255,255,255,0.75); margin-bottom: 4px; }
.btn-main { font-size: 16px; font-weight: 700; color: white; }

.btn-quiz { background: linear-gradient(135deg, #3182F6, #1A6AE0); }
.btn-exchange { background: linear-gradient(135deg, #4E5968, #2D3540); }
.btn-exchange.disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  width: 100%;
  background: var(--blue);
  color: white;
  padding: 16px;
  border-radius: var(--radius);
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-primary:active { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* === 퀴즈 화면 === */
.quiz-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px 16px;
}

.quiz-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.quiz-back {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  color: var(--gray-700);
}
.quiz-title { font-size: 14px; color: var(--gray-500); }

.quiz-word-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px 24px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.quiz-hint {
  font-size: 14px;
  color: var(--gray-500);
  letter-spacing: 4px;
  margin-bottom: 12px;
}
.quiz-word {
  font-size: 36px;
  font-weight: 800;
  color: var(--gray-900);
  letter-spacing: -1px;
}

.quiz-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}
.choice-btn {
  background: white;
  border: 2px solid var(--gray-300);
  border-radius: var(--radius);
  padding: 18px 12px;
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.choice-btn:active { transform: scale(0.97); }
.choice-btn.correct { background: #E8FAF3; border-color: var(--green); color: var(--green); }
.choice-btn.wrong { background: #FEE8EA; border-color: var(--red); color: var(--red); }
.choice-btn:disabled { cursor: not-allowed; }

/* === 정답/오답 결과 === */
.result-area {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: center;
  margin-bottom: 16px;
}
.result-icon { font-size: 32px; margin-bottom: 8px; }
.result-text { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.result-sub { font-size: 14px; color: var(--gray-500); }
.coin-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #FFF8E6;
  border: 1px solid var(--coin-gold);
  color: var(--coin-gold);
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 16px;
  margin-top: 8px;
}

/* === 코인 교환 화면 === */
.exchange-screen {
  padding: 20px 16px;
}
.exchange-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.exchange-balance {
  font-size: 14px;
  color: var(--gray-500);
  margin-bottom: 4px;
}
.exchange-amount {
  font-size: 32px;
  font-weight: 800;
  color: var(--coin-gold);
}
.exchange-rate {
  font-size: 14px;
  color: var(--gray-500);
  margin-top: 8px;
}

/* === 토스트 메시지 === */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 9999;
  pointer-events: none;
  transition: opacity 0.3s;
}
.toast.hidden { opacity: 0; }

/* === 배너 광고 영역 === */
.banner-ad-area {
  margin: 0 16px 16px;
  min-height: 60px;
  border-radius: var(--radius);
  overflow: hidden;
}
```

**Step 2: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/styles/main.css
git commit -m "feat: add TDS-based CSS styles for home, quiz, exchange screens"
```

---

## Task 5: 홈 화면 (home.js)

**Files:**
- Create: `~/Documents/CashWord-english/src/ui/home.js`
- Create: `~/Documents/CashWord-english/public/piggy.png` (이미지 파일 복사)

**Step 1: 돼지 이미지 준비**

기존 프로젝트에서 복사하거나, 적절한 이미지 파일을 `public/piggy.png`에 배치:

```bash
# 기존 프로젝트에 이미지가 있다면:
# cp ~/Documents/daily-brain-exercise/daily-brain-exercise/airplane.png \
#    ~/Documents/CashWord-english/public/piggy.png
# 실제로는 돼지저금통 이미지 파일을 준비해야 함
```

**Step 2: home.js 생성**

```js
// 서버 API 베이스 URL (ait.js와 동일한 패턴)
const API_BASE = (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? '' : 'https://littlesunnydays.com';

let _userHash = null;
let _coins = 0;

// 토스트 메시지
function toast(msg, duration = 2500) {
  let el = document.getElementById('cw-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cw-toast';
    el.className = 'toast hidden';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}
window.toast = toast;

// 코인 잔액 서버에서 조회
async function fetchCoins(userHash) {
  try {
    const res = await fetch(`${API_BASE}/api/cashword/coins/${userHash}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.coins || 0;
  } catch { return 0; }
}

// 코인 표시 업데이트
function updateCoinDisplay(coins) {
  const el = document.getElementById('cw-coin-count');
  if (el) el.textContent = coins;
  // 교환 버튼 활성/비활성
  const exchBtn = document.getElementById('cw-exchange-btn');
  if (exchBtn) {
    if (coins >= 10) exchBtn.classList.remove('disabled');
    else exchBtn.classList.add('disabled');
  }
}

// 홈 화면 렌더링
export async function renderHome() {
  const app = document.getElementById('app');

  // 로그인
  const loginData = await AIT.login();
  _userHash = loginData?.userHash || await AIT.getUserHash();

  // 첫 로그인 프로모션
  AIT.checkPromoFirstLogin();

  // 코인 조회
  _coins = await fetchCoins(_userHash);

  // 배너 광고 프리로드
  AIT.preloadAd('interstitial');

  app.innerHTML = `
    <div class="home-coin-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3182F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#3182F6" stroke="none">C</text></svg>
      지금까지 총 <span class="coin-count" id="cw-coin-count">${_coins}</span> 코인 받았어요.
    </div>

    <div class="home-piggy-area">
      <img src="public/piggy.png" alt="돼지저금통" onerror="this.style.fontSize='80px';this.alt='🐷';this.style.display='flex'" />
    </div>

    <div class="ad-bubble">
      <span class="ad-badge">AD</span>
      광고 보고 이어서 누를 수 있어요
    </div>

    <div class="home-actions">
      <button class="btn btn-quiz" id="cw-quiz-btn">
        <span class="btn-sub">영단어 퀴즈</span>
        <span class="btn-main">퀴즈 풀기</span>
      </button>
      <button class="btn btn-exchange ${_coins < 10 ? 'disabled' : ''}" id="cw-exchange-btn">
        <span class="btn-sub">10코인 → 1포인트</span>
        <span class="btn-main">코인 교환</span>
      </button>
    </div>

    <div class="banner-ad-area" id="cw-banner-ad"></div>
  `;

  // 배너 광고 로드
  AIT.loadBannerAd('cw-banner-ad');

  // 퀴즈 버튼
  document.getElementById('cw-quiz-btn').addEventListener('click', () => {
    import('./quiz.js').then(({ renderQuiz }) => renderQuiz(_userHash, _coins, onQuizDone));
  });

  // 교환 버튼
  document.getElementById('cw-exchange-btn').addEventListener('click', () => {
    if (_coins < 10) { toast('코인이 부족해요. 퀴즈를 더 풀어보세요!'); return; }
    import('./exchange.js').then(({ renderExchange }) => renderExchange(_userHash, _coins, onExchangeDone));
  });
}

// 퀴즈 완료 콜백 (획득 코인 반영 후 홈 복귀)
async function onQuizDone(earnedCoins) {
  _coins = await fetchCoins(_userHash);
  renderHome();
}

// 교환 완료 콜백
async function onExchangeDone() {
  _coins = await fetchCoins(_userHash);
  renderHome();
}
```

**Step 3: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/ui/home.js
git commit -m "feat: add home screen with coin display and navigation"
```

---

## Task 6: 퀴즈 화면 (quiz.js)

**Files:**
- Create: `~/Documents/CashWord-english/src/ui/quiz.js`

**Step 1: quiz.js 생성**

```js
import { getNextWord, getHint, buildChoices } from '../core/words.js';

const API_BASE = (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? '' : 'https://littlesunnydays.com';

let _userHash = null;
let _onDone = null;
let _currentWord = null;
let _answered = false;
let _earnedThisSession = 0;

// 코인 서버에 적립
async function addCoins(userHash, amount) {
  try {
    const res = await fetch(`${API_BASE}/api/cashword/coins/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userHash, amount })
    });
    const data = await res.json();
    return data.coins || 0;
  } catch { return null; }
}

// 광고 시청 후 다음 문제
async function watchAdAndNext() {
  const nextBtn = document.getElementById('cw-next-btn');
  if (nextBtn) nextBtn.disabled = true;

  const result = await AIT.showAd('interstitial');

  // 광고 성공 여부와 무관하게 다음 문제로 (UX 우선)
  renderQuizQuestion();
}

// 퀴즈 문제 렌더링
function renderQuizQuestion() {
  _currentWord = getNextWord();
  _answered = false;
  const hint = getHint(_currentWord.en);
  const choices = buildChoices(_currentWord);

  const quizArea = document.getElementById('cw-quiz-area');
  if (!quizArea) return;

  quizArea.innerHTML = `
    <div class="quiz-word-card">
      <div class="quiz-hint">${hint}</div>
      <div class="quiz-word">${_currentWord.en}</div>
    </div>

    <div class="quiz-choices" id="cw-choices">
      ${choices.map((w, i) => `
        <button class="choice-btn" data-idx="${i}" data-ko="${w.ko}" data-correct="${w.en === _currentWord.en}">
          ${w.ko}
        </button>
      `).join('')}
    </div>

    <div id="cw-result-area" style="display:none"></div>

    <button class="btn-primary" id="cw-next-btn" style="display:none">
      📺 광고 보고 다음 문제
    </button>
  `;

  // 선택지 이벤트
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn));
  });
}

// 정답/오답 처리
async function handleAnswer(btn) {
  if (_answered) return;
  _answered = true;

  const isCorrect = btn.dataset.correct === 'true';

  // 버튼 비활성화
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true') b.classList.add('correct');
  });
  if (!isCorrect) btn.classList.add('wrong');

  let coinsEarned = 0;

  if (isCorrect) {
    coinsEarned = Math.floor(Math.random() * 3) + 1; // 1~3
    _earnedThisSession += coinsEarned;
    // 서버에 코인 적립
    await addCoins(_userHash, coinsEarned);
    AIT.haptic('medium');
    AIT.log('quiz_correct', { word: _currentWord.en, coins: coinsEarned });
  } else {
    AIT.haptic('light');
    AIT.log('quiz_wrong', { word: _currentWord.en });
  }

  // 결과 표시
  const resultArea = document.getElementById('cw-result-area');
  resultArea.style.display = 'block';
  resultArea.innerHTML = isCorrect
    ? `<div class="result-area">
        <div class="result-icon">🎉</div>
        <div class="result-text">정답!</div>
        <div class="coin-badge">🪙 +${coinsEarned} 코인</div>
       </div>`
    : `<div class="result-area">
        <div class="result-icon">❌</div>
        <div class="result-text">틀렸어요</div>
        <div class="result-sub">정답: ${_currentWord.ko}</div>
       </div>`;

  // 다음 문제 버튼 표시
  const nextBtn = document.getElementById('cw-next-btn');
  nextBtn.style.display = 'block';
  nextBtn.addEventListener('click', watchAdAndNext);
}

// 퀴즈 화면 진입점
export function renderQuiz(userHash, currentCoins, onDone) {
  _userHash = userHash;
  _onDone = onDone;
  _earnedThisSession = 0;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="quiz-screen">
      <div class="quiz-header">
        <button class="quiz-back" id="cw-back-btn">←</button>
        <span class="quiz-title">영단어 퀴즈</span>
      </div>
      <div id="cw-quiz-area"></div>
    </div>
  `;

  document.getElementById('cw-back-btn').addEventListener('click', () => {
    if (typeof _onDone === 'function') _onDone(_earnedThisSession);
  });

  renderQuizQuestion();
}
```

**Step 2: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/ui/quiz.js
git commit -m "feat: add quiz screen with hint, 4-choice answer, coin award, and ad gating"
```

---

## Task 7: 코인 교환 화면 (exchange.js)

**Files:**
- Create: `~/Documents/CashWord-english/src/ui/exchange.js`

**Step 1: exchange.js 생성**

```js
const API_BASE = (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? '' : 'https://littlesunnydays.com';

export function renderExchange(userHash, coins, onDone) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="exchange-screen">
      <div class="quiz-header">
        <button class="quiz-back" id="cw-back-btn">←</button>
        <span class="quiz-title">코인 교환</span>
      </div>

      <div class="exchange-card">
        <div class="exchange-balance">현재 코인</div>
        <div class="exchange-amount">🪙 ${coins}</div>
        <div class="exchange-rate">10코인 = 토스포인트 1원</div>
      </div>

      <button class="btn-primary" id="cw-do-exchange-btn" ${coins < 10 ? 'disabled' : ''}>
        10코인 교환하기
      </button>
      <p style="text-align:center;color:#8B95A1;font-size:13px;margin-top:12px">
        ${coins < 10 ? `앞으로 ${10 - coins}코인 더 모으면 교환 가능해요` : '퀴즈를 풀어 더 많은 코인을 모아보세요!'}
      </p>
    </div>
  `;

  document.getElementById('cw-back-btn').addEventListener('click', () => {
    if (typeof onDone === 'function') onDone();
  });

  document.getElementById('cw-do-exchange-btn')?.addEventListener('click', () => doExchange(userHash, onDone));
}

async function doExchange(userHash, onDone) {
  const btn = document.getElementById('cw-do-exchange-btn');
  btn.disabled = true;
  btn.textContent = '처리 중...';

  try {
    // 1. 서버에서 코인 차감 + 교환 ID 발급
    const res = await fetch(`${API_BASE}/api/cashword/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userHash })
    });
    const data = await res.json();

    if (data.error) {
      toast(data.error === 'insufficient_coins' ? '코인이 부족해요' : '교환 실패. 다시 시도해주세요');
      btn.disabled = false;
      btn.textContent = '10코인 교환하기';
      return;
    }

    const exchangeId = data.exchangeId;

    // 2. Toss 프로모션 SDK 호출 (1 토스포인트 지급)
    const promoResult = await AIT.checkPromoExchange(1);

    if (promoResult) {
      // 성공: 교환 확정
      await fetch(`${API_BASE}/api/cashword/exchange/${exchangeId}/confirm`, { method: 'POST' });
      AIT.log('coin_exchange_success', { exchangeId, coins: 10, points: 1 });
      toast('🎉 토스포인트 1원이 지급됐어요!');
      setTimeout(() => { if (typeof onDone === 'function') onDone(); }, 1500);
    } else {
      // 실패: 코인 복원
      await fetch(`${API_BASE}/api/cashword/exchange/${exchangeId}/restore`, { method: 'POST' });
      toast('교환에 실패했어요. 코인이 복원됐어요.');
      btn.disabled = false;
      btn.textContent = '10코인 교환하기';
    }
  } catch (e) {
    toast('오류가 발생했어요. 다시 시도해주세요.');
    btn.disabled = false;
    btn.textContent = '10코인 교환하기';
  }
}
```

**Step 2: 커밋**

```bash
cd ~/Documents/CashWord-english
git add src/ui/exchange.js
git commit -m "feat: add coin exchange screen with Toss promotion SDK integration"
```

---

## Task 8: 서버 API 추가 (기존 daily-brain-exercise 서버)

**Files:**
- Modify: `~/Documents/daily-brain-exercise/daily-brain-exercise/server/server.js`

기존 `server.js` 끝부분 (`app.listen` 바로 위)에 CashWord API 섹션을 추가합니다.

**Step 1: DB 테이블 초기화 코드 추가** (server.js `db.exec` 블록들 이후)

```js
// ===== CASHWORD DB =====
db.exec(`
  CREATE TABLE IF NOT EXISTS cashword_coins (
    user_hash TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS cashword_exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_hash TEXT NOT NULL,
    coins_spent INTEGER NOT NULL DEFAULT 10,
    toss_points INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
```

**Step 2: CashWord API 엔드포인트 추가** (server.js `app.listen` 바로 위에 삽입)

```js
// ===== CASHWORD API =====

// GET /api/cashword/coins/:userHash — 코인 잔액 조회
app.get('/api/cashword/coins/:userHash', (req, res) => {
  const { userHash } = req.params;
  const row = db.prepare('SELECT coins, total_earned FROM cashword_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins: row?.coins || 0, totalEarned: row?.total_earned || 0 });
});

// POST /api/cashword/coins/add — 코인 적립 (정답 시)
app.post('/api/cashword/coins/add', (req, res) => {
  const { userHash, amount } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });
  // anti-cheat: 1~3 범위만 허용
  const safeAmount = Math.max(1, Math.min(3, parseInt(amount) || 1));
  db.prepare(`
    INSERT INTO cashword_coins (user_hash, coins, total_earned)
    VALUES (?, ?, ?)
    ON CONFLICT(user_hash) DO UPDATE SET
      coins = coins + excluded.coins,
      total_earned = total_earned + excluded.total_earned,
      updated_at = CURRENT_TIMESTAMP
  `).run(userHash, safeAmount, safeAmount);
  const row = db.prepare('SELECT coins, total_earned FROM cashword_coins WHERE user_hash = ?').get(userHash);
  res.json({ coins: row.coins, totalEarned: row.total_earned });
});

// POST /api/cashword/exchange — 10코인 차감 + 교환 ID 발급
app.post('/api/cashword/exchange', (req, res) => {
  const { userHash } = req.body;
  if (!userHash) return res.status(400).json({ error: 'userHash required' });

  const row = db.prepare('SELECT coins FROM cashword_coins WHERE user_hash = ?').get(userHash);
  if (!row || row.coins < 10) {
    return res.status(400).json({ error: 'insufficient_coins', coins: row?.coins || 0 });
  }
  // 동시성: 10초 내 중복 교환 차단
  const recent = db.prepare(
    "SELECT id FROM cashword_exchanges WHERE user_hash = ? AND created_at > datetime('now', '-10 seconds') AND status = 'pending'"
  ).get(userHash);
  if (recent) return res.status(429).json({ error: 'too_fast' });

  const doExchange = db.transaction(() => {
    db.prepare('UPDATE cashword_coins SET coins = coins - 10, updated_at = CURRENT_TIMESTAMP WHERE user_hash = ?').run(userHash);
    return db.prepare(
      'INSERT INTO cashword_exchanges (user_hash, coins_spent, toss_points, status) VALUES (?, 10, 1, ?)'
    ).run(userHash, 'pending');
  });
  const result = doExchange();
  res.json({ exchangeId: result.lastInsertRowid });
});

// POST /api/cashword/exchange/:id/confirm — SDK 성공 후 확정
app.post('/api/cashword/exchange/:id/confirm', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM cashword_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.json({ status: row.status });
  db.prepare("UPDATE cashword_exchanges SET status = 'granted' WHERE id = ?").run(id);
  res.json({ status: 'ok' });
});

// POST /api/cashword/exchange/:id/restore — SDK 실패 시 코인 복원
app.post('/api/cashword/exchange/:id/restore', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM cashword_exchanges WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not found' });
  if (row.status !== 'pending') return res.status(400).json({ error: 'already_processed' });
  db.transaction(() => {
    db.prepare('UPDATE cashword_coins SET coins = coins + 10 WHERE user_hash = ?').run(row.user_hash);
    db.prepare("UPDATE cashword_exchanges SET status = 'cancelled' WHERE id = ?").run(id);
  })();
  res.json({ status: 'ok' });
});
```

**Step 3: 서버 재시작 및 API 테스트**

```bash
cd ~/Documents/daily-brain-exercise/daily-brain-exercise/server
node server.js &

# 테스트
curl -X POST http://localhost:3001/api/cashword/coins/add \
  -H "Content-Type: application/json" \
  -d '{"userHash":"test-user","amount":2}'
# Expected: {"coins":2,"totalEarned":2}

curl http://localhost:3001/api/cashword/coins/test-user
# Expected: {"coins":2,"totalEarned":2}
```

**Step 4: 커밋 (daily-brain-exercise 서버)**

```bash
cd ~/Documents/daily-brain-exercise/daily-brain-exercise
git add server/server.js
git commit -m "feat: add CashWord API endpoints to existing server"
```

---

## Task 9: 로컬 개발 테스트

**Step 1: CashWord 프로젝트 dev 서버 실행**

```bash
cd ~/Documents/CashWord-english
npm run dev:vite
# Expected: Vite dev server at http://localhost:5173
```

**Step 2: 브라우저에서 홈 화면 확인**

브라우저에서 `http://localhost:5173` 열기.

확인 항목:
- [ ] 홈 화면 렌더링됨
- [ ] "지금까지 총 0 코인 받았어요" 표시
- [ ] 퀴즈 풀기 버튼 동작
- [ ] 퀴즈 화면에서 영단어 + 힌트 표시
- [ ] 4개 보기 표시
- [ ] 정답 선택 시 초록색 + 코인 표시
- [ ] 오답 선택 시 빨간색 + 정답 표시
- [ ] "광고 보고 다음 문제" 버튼 → 로컬에서는 광고 Mock으로 즉시 다음 문제

**Step 3: granite dev로 앱인토스 환경 테스트**

```bash
cd ~/Documents/CashWord-english
npm run dev
# granite dev 실행 → 샌드박스 앱에서 intoss://cashword-english 접속
```

---

## Task 10: 빌드 및 배포

**Step 1: 프로덕션 빌드**

```bash
cd ~/Documents/CashWord-english
npm run build
# Expected: dist/ 디렉토리 생성 + cashword-english.ait 파일 생성
```

**Step 2: .ait 파일 업로드**

앱인토스 콘솔 → 빌드 업로드 → `cashword-english.ait` 파일 선택

**Step 3: QR 코드로 실기기 테스트**

콘솔에서 QR 코드 생성 → 토스 앱에서 스캔

확인 항목:
- [ ] 토스 로그인 성공
- [ ] 코인 잔액 조회 정상
- [ ] 광고 로드 및 시청 정상 (실제 광고 ID 등록 후)
- [ ] 퀴즈 → 정답 → 코인 적립 → 서버 확인
- [ ] 10코인 → 토스포인트 교환

---

## 주요 주의사항

| 항목 | 주의 |
|------|------|
| AD ID | 콘솔에서 신규 발급 후 `ait.js` CONFIG에 반영 필수 |
| 프로모션 코드 | `PROMO_COIN_EXCHANGE` 코드를 콘솔에서 발급 후 CONFIG에 반영 |
| `appName` | granite.config.ts의 `cashword-english`와 콘솔 등록명 정확히 일치 필수 |
| TDS | 심사 통과를 위해 `@toss/tds-mobile` 또는 TDS 스타일 준수 |
| anti-cheat | 코인 amount는 반드시 서버에서 1~3 범위 재검증 (현재 구현됨) |
| 이미지 | `public/piggy.png` 돼지저금통 이미지 직접 준비 필요 |
