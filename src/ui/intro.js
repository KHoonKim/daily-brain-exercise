// ===== INTRO SCREEN =====
// 로그인 여부 확인 후 초기 화면 결정
async function initIntro() {
  // ?reset=1 파라미터: 로그인 상태 초기화 (테스트용)
  if (new URLSearchParams(location.search).get('reset') === '1') {
    // bf- 로컬스토리지 전체 삭제
    Object.keys(localStorage).filter(k => k.startsWith('bf-')).forEach(k => localStorage.removeItem(k));
    await AIT.storageSet('toss_userKey', '');
    await AIT.storageSet('toss_name', '');
    return; // introScreen 유지
  }
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
