// ===== API BASE URL =====
// 로컬 개발: 상대경로 (Vite 프록시 → localhost:3001)
// Toss 미니앱: 절대경로 (tossmini.com에서 서빙되므로)
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? ''
  : 'https://littlesunnydays.com';

// ===== APPINTOSS NATIVE BRIDGE =====
// @apps-in-toss/bridge-core 프로토콜을 직접 구현
// (ES module import 없이 plain script에서 동작)
if (typeof window !== 'undefined' && !window.__GRANITE_NATIVE_EMITTER) {
  const _evts = {};
  window.__GRANITE_NATIVE_EMITTER = {
    emit(e, d) { (_evts[e] || []).forEach(cb => cb(d)); },
    on(e, cb) {
      if (!_evts[e]) _evts[e] = [];
      _evts[e].push(cb);
      return () => { _evts[e] = (_evts[e] || []).filter(i => i !== cb); };
    }
  };
}

window.AIT = (() => {
  const _bridge = (typeof window !== 'undefined') ? (window.__granite__ || window.__ait__) : null;
  const isToss = (typeof window !== 'undefined') && !!(window.ReactNativeWebView || _bridge) || (typeof navigator !== 'undefined' && navigator.userAgent.includes('TossApp'));
  let _userHash = null;
  let _adLoaded = { interstitial: false, rewarded: false };

  // ── Native Bridge Helpers ──
  // createAsyncBridge: postMessage + resolve/reject events
  function _bridgeCall(method, args = []) {
    return new Promise((resolve, reject) => {
      const rnwv = typeof window !== 'undefined' && window.ReactNativeWebView;
      if (!rnwv) { reject(new Error('ReactNativeWebView not available')); return; }
      const emitter = window.__GRANITE_NATIVE_EMITTER;
      if (!emitter) { reject(new Error('__GRANITE_NATIVE_EMITTER not available')); return; }
      const eventId = Math.random().toString(36).slice(2);
      const r1 = emitter.on(`${method}/resolve/${eventId}`, d => { r1(); r2(); resolve(d); });
      const r2 = emitter.on(`${method}/reject/${eventId}`, e => { r1(); r2(); reject(e); });
      rnwv.postMessage(JSON.stringify({ type: 'method', functionName: method, eventId, args }));
    });
  }
  // createConstantBridge: __CONSTANT_HANDLER_MAP lookup
  function _bridgeConst(method) {
    const map = typeof window !== 'undefined' && window.__CONSTANT_HANDLER_MAP;
    if (map && method in map) return map[method];
    return null;
  }
  // createEventBridge: addEventListener/removeEventListener
  function _bridgeEvent(method, options) {
    const rnwv = typeof window !== 'undefined' && window.ReactNativeWebView;
    if (!rnwv) return () => {};
    const emitter = window.__GRANITE_NATIVE_EMITTER;
    if (!emitter) return () => {};
    const eventId = Math.random().toString(36).slice(2);
    const removes = [
      emitter.on(`${method}/onEvent/${eventId}`, d => options.onEvent && options.onEvent(d)),
      emitter.on(`${method}/onError/${eventId}`, e => options.onError && options.onError(e)),
    ];
    rnwv.postMessage(JSON.stringify({ type: 'addEventListener', functionName: method, eventId, args: options.options }));
    return () => {
      rnwv.postMessage(JSON.stringify({ type: 'removeEventListener', functionName: method, eventId }));
      removes.forEach(r => r && r());
    };
  }

  // ── Config ──
  const CONFIG = {
    AD_BANNER_ID: 'ait.v2.live.47d7aeae54c14818',        // 배너형: 게임 결과 페이지
    AD_INTERSTITIAL_ID: 'ait.v2.live.d1d5d979d5074f0d',  // 전면형: 하트 더받기, 5초 더하기, 한판 더하기
    AD_REWARDED_ID: 'ait.v2.live.f7733fd1f31d4772',       // 보상형: 티켓 샵
    // 4 Promotions
    PROMO_FIRST_LOGIN: 'TEST_01KJ8A3HFMP24HQ5743KD6Q9GK',
    PROMO_POINT_100: 'TEST_01KJ8BCF26T648AQ1QCKYMS4TZ',
    PROMO_FIRST_WORKOUT: 'TEST_01KJ8B95RPCGDQV9NZSCQ418VT',
    SHARE_MODULE_ID: '12a10659-c8aa-407a-a090-38f3c5dd4639', // 공유 리워드 모듈 ID
  };

  // ── User Key ──
  async function getUserHash() {
    if (_userHash) return _userHash;
    if (!isToss) { _userHash = 'web_' + (localStorage.getItem('bf-uid') || (() => { const id = crypto.randomUUID(); localStorage.setItem('bf-uid', id); return id; })()); return _userHash; }
    try {
      const result = await Promise.race([
        _bridgeCall('getUserKeyForGame'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      if (result && result.type === 'HASH') { _userHash = result.hash; return _userHash; }
    } catch (e) { console.warn('AIT getUserKeyForGame failed:', e); }
    // 폴백: 저장된 toss_userKey 사용
    const storedKey = await storageGet('toss_userKey');
    if (storedKey) { _userHash = storedKey; return _userHash; }
    _userHash = 'toss_anonymous';
    return _userHash;
  }

  // ── Ads ──
  function preloadAd(type) {
    if (!isToss) return;
    const id = type === 'rewarded' ? CONFIG.AD_REWARDED_ID : CONFIG.AD_INTERSTITIAL_ID;
    const handleEvent = (e) => {
      const t = typeof e === 'string' ? e : e?.type;
      if (t === 'loaded' || t === 'adLoaded') _adLoaded[type] = true;
    };
    const handleError = () => { _adLoaded[type] = false; };
    try {
      if (_bridge && _bridge.loadAppsInTossAdMob) {
        _bridge.loadAppsInTossAdMob({ options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
      } else {
        _bridgeEvent('loadAppsInTossAdMob', { options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
      }
    } catch (e) { console.warn('AIT ad preload failed:', e); }
  }

  async function showAd(type) {
    if (!isToss) { console.log(`[Mock] ${type} ad shown`); return { success: true, mock: true }; }
    const id = type === 'rewarded' ? CONFIG.AD_REWARDED_ID : CONFIG.AD_INTERSTITIAL_ID;
    return new Promise((resolve) => {
      const handleEvent = (event) => {
        const evtType = typeof event === 'string' ? event : event?.type;
        if (evtType === 'userEarnedReward' || evtType === 'dismissed' || evtType === 'adDismissed') {
          _adLoaded[type] = false;
          preloadAd(type);
          resolve({ success: true, event: evtType });
        }
      };
      const handleError = (err) => { resolve({ success: false, error: err }); };
      try {
        if (_bridge && _bridge.showAppsInTossAdMob) {
          _bridge.showAppsInTossAdMob({ options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
        } else {
          _bridgeEvent('showAppsInTossAdMob', { options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
        }
      } catch (e) { resolve({ success: false, error: e }); }
      // 타임아웃: 30초 내 응답 없으면 실패 처리
      setTimeout(() => resolve({ success: false, error: 'timeout' }), 30000);
    });
  }

  // ── Banner Ad ──
  // 배너 광고는 TossAdsSpaceKit + fetchTossAd 방식 사용 (loadAppsInTossAdMob은 전면 광고 전용)
  const _TOSS_ADS_SDK_URL = 'https://static.toss.im/ads/sdk/toss-ads-space-kit-1.3.0.js';
  let _tossAdSdkPromise = null;

  function _loadTossAdSdk() {
    if (_tossAdSdkPromise) return _tossAdSdkPromise;
    if (typeof window.TossAdsSpaceKit !== 'undefined') return Promise.resolve(window.TossAdsSpaceKit);
    _tossAdSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = _TOSS_ADS_SDK_URL;
      script.async = true;
      script.onload = () => {
        _tossAdSdkPromise = null;
        if (window.TossAdsSpaceKit) resolve(window.TossAdsSpaceKit);
        else reject(new Error('TossAdsSpaceKit not found after load'));
      };
      script.onerror = () => { _tossAdSdkPromise = null; reject(new Error('Failed to load TossAdsSpaceKit')); };
      document.head.appendChild(script);
    });
    return _tossAdSdkPromise;
  }

  function loadBannerAd(containerId) {
    if (!isToss) {
      const el = document.getElementById(containerId);
      if (el) { el.style.cssText += ';background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;border-radius:var(--r12)'; el.textContent = '광고 영역'; }
      return;
    }
    const el = document.getElementById(containerId);
    if (!el) return;
    const handleError = (e) => {
      console.warn('Banner ad error:', e);
      if (el) { el.style.cssText += ';background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;font-size:12px;border-radius:var(--r12)'; el.textContent = '광고 영역'; }
    };
    _loadTossAdSdk().then(sdk => {
      if (!sdk.isInitialized()) {
        sdk.init({
          environment: 'live',
          customAdFetcher: async (_ctx, slotOpts) => {
            return new Promise((res, rej) => {
              const cleanup = _bridgeEvent('fetchTossAd', {
                options: { adGroupId: slotOpts.spaceUnitId, sdkId: '108', availableStyleIds: ['1', '2'] },
                onEvent: (r) => { if (cleanup) cleanup(); res(r); },
                onError: (e) => { if (cleanup) cleanup(); rej(e); }
              });
            }).then(raw => {
              const ads = Array.isArray(raw?.ads) ? raw.ads.filter(a => ['1', '2'].includes(String(a.styleId))) : [];
              return { resultType: 'SUCCESS', success: { requestId: raw?.requestId || '', status: 'OK', ads, ext: raw?.ext } };
            }).catch(e => ({ resultType: 'FAIL', error: { reason: String(e?.message || e) } }));
          },
          opener: (url) => { _bridgeCall('openURL', [url]).catch(() => {}); }
        });
      }
      if (!sdk.banner) { handleError(new Error('banner not supported')); return; }
      sdk.banner.createSlot(el, {
        spaceId: CONFIG.AD_BANNER_ID,
        autoLoad: true,
        callbacks: {
          onAdFailedToRender: (info) => handleError(info?.error),
          onNoFill: () => console.log('[Banner] No fill:', containerId)
        }
      });
    }).catch(handleError);
  }

  // ── Game Center ──
  async function submitScore(score) {
    if (!isToss) return { mock: true };
    try {
      return await _bridgeCall('submitGameCenterLeaderBoardScore', [{ score: String(score) }]);
    } catch (e) { return { error: e }; }
  }

  async function openLeaderboard() {
    if (!isToss) return;
    try { await _bridgeCall('openGameCenterLeaderboard'); } catch (e) { console.warn('AIT leaderboard failed:', e); }
  }

  async function getProfile() {
    if (!isToss) return null;
    try { return await _bridgeCall('getGameCenterGameProfile'); } catch (e) { return null; }
  }

  // ── Storage ──
  async function storageGet(key) { return localStorage.getItem(key); }
  async function storageSet(key, value) { localStorage.setItem(key, value); }

  // ── Haptic ──
  function haptic(type = 'light') {
    if (!isToss) return;
    try { _bridgeCall('generateHapticFeedback', [{ type }]); } catch (e) {}
  }

  // ── Promotion Reward (비게임: 서버 프록시 → Toss REST API) ──
  async function grantPromoReward(code, amount) {
    if (!isToss) return { mock: true };
    const userKey = await storageGet('toss_userKey');
    if (!userKey) return { error: 'no_userKey' };
    try {
      const result = await fetch(`${API_BASE}/api/score/promo/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey, promotionCode: code, amount })
      }).then(r => r.json());
      console.log('[AIT] grantPromoReward result:', JSON.stringify(result));
      return result;
    } catch (e) {
      console.warn('[AIT] grantPromoReward error:', e);
      return { error: String(e) };
    }
  }

  // ── Share (친구초대/공유) ──
  // contactsViral: _bridgeEvent(PostMessage) 패턴으로 작동 확인됨
  function shareInvite(moduleId) {
    if (!isToss) {
      console.log('[Mock] share invite');
      if (typeof toast === 'function') toast('친구 초대 기능은 토스 앱에서만 사용할 수 있어요');
      return () => {};
    }
    let cleanup = () => {};
    try {
      cleanup = _bridgeEvent('contactsViral', {
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
            cleanup();
          }
        },
        onError: (e) => {
          console.warn('AIT share error:', e);
          log('share_invite_error', { error: String(e) });
        }
      }) || (() => {});
    } catch (e) { console.warn('shareInvite failed:', e); }
    return cleanup;
  }

  // ── Simple Share ──
  async function shareMessage(msg) {
    if (!isToss) { if (navigator.share) await navigator.share({ text: msg }); return; }
    try { await _bridgeCall('share', [{ message: msg }]); } catch (e) {}
  }

  // ── Event Log (분석) ──
  async function log(name, params = {}) {
    if (!isToss) { console.log(`[AIT Log] ${name}`, params); return; }
    try { await _bridgeCall('eventLog', [{ log_name: name, params }]); } catch (e) {}
  }

  // ── Screen Awake (게임 중 화면 꺼짐 방지) ──
  async function setScreenAwake(enabled) {
    if (!isToss) return;
    try { await _bridgeCall('setScreenAwakeMode', [{ enabled }]); } catch (e) {}
  }

  // ── Close View (미니앱 닫기) ──
  async function close() {
    if (!isToss) { window.close(); return; }
    try { await _bridgeCall('closeView'); } catch (e) {}
  }

  // ── Device Info ──
  function getDeviceId() {
    if (!isToss) return 'web_device';
    try { return _bridgeConst('getDeviceId') || 'unknown'; } catch (e) { return 'unknown'; }
  }

  function getPlatform() {
    if (!isToss) return 'web';
    try { return _bridgeConst('getPlatformOS') || 'unknown'; } catch (e) { return 'unknown'; }
  }

  function getEnv() {
    if (!isToss) return 'web';
    try { return _bridgeConst('getOperationalEnvironment') || 'web'; } catch (e) { return 'web'; }
  }

  // ── Toss Login ──
  let _loginData = null;
  async function login() {
    console.log('[AIT] login called, isToss:', isToss, 'ReactNativeWebView:', !!(typeof window !== 'undefined' && window.ReactNativeWebView));
    if (!isToss) { console.log('[Mock] Toss login'); return { mock: true, userHash: await getUserHash() }; }
    try {
      console.log('[AIT] calling appLogin...');
      const loginResult = await _bridgeCall('appLogin');
      console.log('[AIT] appLogin result:', JSON.stringify(loginResult));
      const { authorizationCode, referrer } = loginResult || {};
      if (!authorizationCode) { console.warn('[AIT] no authorizationCode'); return { error: 'no_auth_code' }; }
      const resp = await fetch(`${API_BASE}/api/score/toss/login`, {
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
    if (promoType !== 'POINT_100' && _promoGranted[promoType]) return;
    if (_promoLock[promoType]) return;
    _promoLock[promoType] = true;
    try {
      const uh = await getUserHash();
      if (promoType !== 'POINT_100') {
        try {
          const chk = await fetch(`${API_BASE}/api/score/promo/check/${uh}/${promoType}`).then(r=>r.json());
          if (chk.granted) { _promoGranted[promoType] = true; return; }
        } catch(e) { console.warn('[AIT] promo check failed:', e); }
      }
      let bridgeOk = !isToss;
      if (isToss) {
        const result = await grantPromoReward(promoCode, amount);
        bridgeOk = result && result.key;
        console.log('[AIT] triggerPromo result:', promoType, bridgeOk, result);
        if (bridgeOk) log('promo_granted', { type: promoType, amount });
      }
      if (bridgeOk && promoType !== 'POINT_100') {
        await fetch(`${API_BASE}/api/score/promo/record`, {
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

  async function checkPromoFirstLogin() { triggerPromo('FIRST_LOGIN', CONFIG.PROMO_FIRST_LOGIN, 1); }
  async function checkPromoPoint100() { triggerPromo('POINT_100', CONFIG.PROMO_POINT_100, 100); }
  async function checkPromoFirstWorkout() { triggerPromo('FIRST_WORKOUT', CONFIG.PROMO_FIRST_WORKOUT, 2); }

  // ── Init ──
  async function init() {
    await getUserHash();
    if (isToss) {
      _loadTossAdSdk().catch(() => {}); // 배너 SDK 선제 로드
      preloadAd('interstitial');
      preloadAd('rewarded');
      setScreenAwake(true);
      log('app_open', { version: 'v57' });
      // 자동 로그인 제거: 사용자가 시작하기 버튼 클릭 시에만 로그인
    }
  }

  return {
    isToss, CONFIG, getUserHash, login, getLoginData, triggerPromo,
    checkPromoFirstLogin, checkPromoPoint100, checkPromoFirstWorkout,
    showAd, preloadAd, loadBannerAd,
    submitScore, openLeaderboard, getProfile,
    storageGet, storageSet, haptic,
    grantPromoReward, shareInvite, shareMessage,
    log, setScreenAwake, close, getDeviceId, getPlatform, getEnv,
    init, get userHash() { return _userHash; }
  };
})();

// Initialize SDK on load
AIT.init();
