    const AIT = (() => {
      const isToss = typeof window !== 'undefined' && (window.__granite__ || window.__ait__ || navigator.userAgent.includes('TossApp'));
      let _userHash = null;
      let _adLoaded = { interstitial: false, rewarded: false };

      // ── Config (플레이스홀더 — 콘솔 발급 후 교체) ──
      const CONFIG = {
        AD_INTERSTITIAL_ID: 'ait-ad-test-interstitial-id',  // TODO: 실제 광고 그룹 ID로 교체
        AD_REWARDED_ID: 'ait-ad-test-rewarded-id',           // TODO: 실제 광고 그룹 ID로 교체
        LEADERBOARD_ID: 'PLACEHOLDER_LEADERBOARD_ID',        // TODO: 게임센터 리더보드 ID
        PROMO_CODE: 'PLACEHOLDER_PROMO_CODE',                // TODO: 프로모션 코드 (레거시)
        PROMO_AMOUNT: 100,
        // 4 Promotions (IDs filled after approval)
        PROMO_FIRST_LOGIN: 'PLACEHOLDER_PROMO_FIRST_LOGIN',
        PROMO_BRAIN_AGE_50: 'PLACEHOLDER_PROMO_BRAIN_AGE_50',
        PROMO_POINT_100: 'PLACEHOLDER_PROMO_POINT_100',
        PROMO_FIRST_WORKOUT: 'PLACEHOLDER_PROMO_FIRST_WORKOUT',
        SHARE_MODULE_ID: '12a10659-c8aa-407a-a090-38f3c5dd4639',
      };

      // ── User Key ──
      async function getUserHash() {
        if (_userHash) return _userHash;
        if (!isToss) { _userHash = 'web_' + (localStorage.getItem('bf-uid') || (() => { const id = crypto.randomUUID(); localStorage.setItem('bf-uid', id); return id; })()); return _userHash; }
        try {
          // @apps-in-toss/web-framework의 getUserKeyForGame() 호출
          const result = await window.__granite__?.getUserKeyForGame?.();
          if (result?.type === 'HASH') { _userHash = result.hash; return _userHash; }
        } catch (e) { console.warn('AIT getUserKeyForGame failed:', e); }
        _userHash = 'toss_anonymous';
        return _userHash;
      }

      // ── Ads ──
      function preloadAd(type) {
        if (!isToss) return;
        const id = type === 'rewarded' ? CONFIG.AD_REWARDED_ID : CONFIG.AD_INTERSTITIAL_ID;
        try {
          window.__granite__?.loadAppsInTossAdMob?.({
            options: { adGroupId: id },
            onEvent: (e) => { if (e === 'adLoaded') _adLoaded[type] = true; },
            onError: () => { _adLoaded[type] = false; }
          });
        } catch (e) { console.warn('AIT ad preload failed:', e); }
      }

      async function showAd(type) {
        if (!isToss) { console.log(`[Mock] ${type} ad shown`); return { success: true, mock: true }; }
        const id = type === 'rewarded' ? CONFIG.AD_REWARDED_ID : CONFIG.AD_INTERSTITIAL_ID;
        return new Promise((resolve) => {
          try {
            window.__granite__?.showAppsInTossAdMob?.({
              options: { adUnitId: id },
              onEvent: (event) => {
                if (event === 'userEarnedReward' || event === 'adDismissed') {
                  _adLoaded[type] = false;
                  preloadAd(type); // 다음 광고 미리 로드
                  resolve({ success: true, event });
                }
              },
              onError: (err) => { resolve({ success: false, error: err }); }
            });
          } catch (e) { resolve({ success: false, error: e }); }
        });
      }

      // ── Game Center ──
      async function submitScore(score) {
        if (!isToss) return { mock: true };
        try {
          return await window.__granite__?.submitGameCenterLeaderBoardScore?.({ score: String(score) });
        } catch (e) { return { error: e }; }
      }

      async function openLeaderboard() {
        if (!isToss) return;
        try { await window.__granite__?.openGameCenterLeaderboard?.(); } catch (e) { console.warn('AIT leaderboard failed:', e); }
      }

      async function getProfile() {
        if (!isToss) return null;
        try { return await window.__granite__?.getGameCenterGameProfile?.(); } catch (e) { return null; }
      }

      // ── Storage (Toss native or localStorage fallback) ──
      async function storageGet(key) {
        if (!isToss) return localStorage.getItem(key);
        try { return await window.__granite__?.getItem?.(key); } catch (e) { return localStorage.getItem(key); }
      }

      async function storageSet(key, value) {
        if (!isToss) { localStorage.setItem(key, value); return; }
        try { await window.__granite__?.setItem?.(key, value); } catch (e) { localStorage.setItem(key, value); }
      }

      // ── Haptic ──
      function haptic(type = 'light') {
        if (!isToss) return;
        try { window.__granite__?.generateHapticFeedback?.({ type }); } catch (e) { }
      }

      // ── Promotion Reward ──
      async function grantPromoReward(code, amount) {
        if (!isToss) return { mock: true };
        try {
          return await window.__granite__?.grantPromotionRewardForGame?.({ params: { promotionCode: code || CONFIG.PROMO_CODE, amount: amount || CONFIG.PROMO_AMOUNT } });
        } catch (e) { return { error: e }; }
      }

      // ── Share (친구초대/공유) ──
      function shareInvite(moduleId) {
        if (!isToss) { console.log('[Mock] share invite'); if (typeof toast === 'function') toast('친구 초대 기능은 토스 앱에서만 사용할 수 있어요'); return () => { }; }
        try {
          return window.__granite__?.contactsViral?.({
            options: { moduleId: moduleId || CONFIG.SHARE_MODULE_ID },
            onEvent: (e) => {
              if (e && e.type === 'sendViral') {
                if (typeof addPoints === 'function') addPoints(1);
                if (typeof toast === 'function') toast('🎉 두뇌점수 +1점 지급 완료!');
                log('share_invite_rewarded', { ...(e.data || {}) });
              } else if (e && e.type === 'close') {
                const { sentRewardsCount } = e.data || {};
                if (sentRewardsCount > 0 && typeof toast === 'function') toast(`총 ${sentRewardsCount}명에게 공유 완료!`);
                log('share_invite_close', { ...(e.data || {}) });
              }
            },
            onError: (e) => { console.warn('AIT share error:', e); log('share_invite_error', { error: String(e) }); }
          }) || (() => { });
        } catch (e) { return () => { }; }
      }

      // ── Simple Share ──
      async function shareMessage(msg) {
        if (!isToss) { if (navigator.share) await navigator.share({ text: msg }); return; }
        try { await window.__granite__?.share?.({ message: msg }); } catch (e) { }
      }

      // ── Event Log (분석) ──
      async function log(name, params = {}) {
        if (!isToss) { console.log(`[AIT Log] ${name}`, params); return; }
        try { await window.__granite__?.eventLog?.({ log_name: name, params }); } catch (e) { }
      }

      // ── Screen Awake (게임 중 화면 꺼짐 방지) ──
      async function setScreenAwake(enabled) {
        if (!isToss) return;
        try { await window.__granite__?.setScreenAwakeMode?.({ enabled }); } catch (e) { }
      }

      // ── Close View (미니앱 닫기) ──
      async function close() {
        if (!isToss) { window.close(); return; }
        try { await window.__granite__?.closeView?.(); } catch (e) { }
      }

      // ── Device Info ──
      function getDeviceId() {
        if (!isToss) return 'web_device';
        try { return window.__granite__?.getDeviceId?.() || 'unknown'; } catch (e) { return 'unknown'; }
      }

      function getPlatform() {
        if (!isToss) return 'web';
        try { return window.__granite__?.getPlatformOS?.() || 'unknown'; } catch (e) { return 'unknown'; }
      }

      function getEnv() {
        if (!isToss) return 'web';
        try { return window.__granite__?.getOperationalEnvironment?.() || 'web'; } catch (e) { return 'web'; }
      }

      // ── Toss Login ──
      let _loginData = null;
      async function login() {
        if (!isToss) { console.log('[Mock] Toss login'); return { mock: true, userHash: await getUserHash() }; }
        try {
          const { authorizationCode, referrer } = await window.__granite__?.appLogin?.() || {};
          if (!authorizationCode) return { error: 'no_auth_code' };
          const resp = await fetch('/api/score/toss/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authorizationCode, referrer })
          });
          const data = await resp.json();
          if (data.status === 'ok') {
            _userHash = data.userHash;
            _loginData = data;
            await storageSet('toss_userKey', data.userKey);
            await storageSet('toss_name', data.name || '');
            log('toss_login', { userKey: data.userKey });
            checkPromoFirstLogin();
          }
          return data;
        } catch (e) { console.error('AIT login failed:', e); return { error: e.message }; }
      }

      function getLoginData() { return _loginData; }

      // ── Promotion (중복 방지 + SDK 호출) ──
      const _promoGranted = {};
      let _promoLock = {};
      async function triggerPromo(promoType, promoCode, amount) {
        // 1회성 프로모션 메모리 중복 방지
        if (promoType !== 'POINT_100' && _promoGranted[promoType]) return;
        // 동시 호출 잠금
        if (_promoLock[promoType]) return;
        _promoLock[promoType] = true;
        try {
          const uh = await getUserHash();
          // 서버에서 이미 지급했는지 확인 (POINT_100은 반복 가능이므로 스킵)
          if (promoType !== 'POINT_100') {
            try {
              const chk = await fetch(`/api/score/promo/check/${uh}/${promoType}`).then(r => r.json());
              if (chk.granted) { _promoGranted[promoType] = true; return; }
            } catch (e) { return; } // 서버 오류 시 안전하게 중단
          }
          // SDK 호출 (토스 환경)
          if (isToss) {
            await grantPromoReward(promoCode, amount);
            log('promo_granted', { type: promoType, amount });
          }
          // 서버에 기록 (1회성만)
          if (promoType !== 'POINT_100') {
            await fetch('/api/score/promo/record', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userHash: uh, promoType, promoCode, amount })
            });
            _promoGranted[promoType] = true;
          }
        } finally {
          _promoLock[promoType] = false;
        }
      }

      // 프로모션 1: 첫 로그인
      async function checkPromoFirstLogin() {
        triggerPromo('FIRST_LOGIN', CONFIG.PROMO_FIRST_LOGIN, 10);
      }
      // 프로모션 2: 두뇌나이 50세 달성 (called from addXP outside AIT scope)
      async function checkPromoBrainAge50(xp) {
        // RANKS is defined outside AIT, check after DOM ready
        if (typeof RANKS === 'undefined') return;
        const rank = RANKS.reduce((a, r) => xp >= r.minXp ? r : a, RANKS[0]);
        if (rank && rank.age <= 50) {
          triggerPromo('BRAIN_AGE_50', CONFIG.PROMO_BRAIN_AGE_50, 50);
        }
      }
      // 프로모션 3: 두뇌점수 100점 교환
      async function checkPromoPoint100() {
        triggerPromo('POINT_100', CONFIG.PROMO_POINT_100, 100);
      }
      // 프로모션 4: 첫 두뇌운동 완료
      async function checkPromoFirstWorkout() {
        triggerPromo('FIRST_WORKOUT', CONFIG.PROMO_FIRST_WORKOUT, 10);
      }

      // ── Init ──
      async function init() {
        await getUserHash();
        if (isToss) {
          preloadAd('interstitial');
          preloadAd('rewarded');
          setScreenAwake(true);
          log('app_open', { version: 'v57' });
          // 자동 로그인 시도
          login().catch(e => console.warn('Auto login failed:', e));
        }
      }

      return {
        isToss, CONFIG, getUserHash, login, getLoginData, triggerPromo,
        checkPromoFirstLogin, checkPromoBrainAge50, checkPromoPoint100, checkPromoFirstWorkout,
        showAd, preloadAd,
        submitScore, openLeaderboard, getProfile,
        storageGet, storageSet, haptic,
        grantPromoReward, shareInvite, shareMessage,
        log, setScreenAwake, close, getDeviceId, getPlatform, getEnv,
        init, get userHash() { return _userHash; }
      };
    })();

AIT.init();
