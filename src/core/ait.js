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
    AD_BANNER_ID: 'ait.v2.live.47d7aeae54c14818',
    AD_IMAGE_BANNER_ID: 'ait.v2.live.2892ccfe07f44db8',
    AD_INTERSTITIAL_ID: 'ait.v2.live.d1d5d979d5074f0d',
    AD_REWARDED_ID: 'ait.v2.live.f7733fd1f31d4772',       // 보상형: 티켓 샵
    // 프로모션 코드 (실제 코드는 Toss 콘솔 승인 후 교체)
    PROMO_FIRST_LOGIN: '01KJ8A3HFMP24HQ5743KD6Q9GK',    // 토스로 로그인하기
    PROMO_POINT_100: '01KJ8BCF26T648AQ1QCKYMS4TZ',        // 두뇌점수 100점 교환
    PROMO_FIRST_WORKOUT: '01KJ8B95RPCGDQV9NZSCQ418VT',   // 오늘의 두뇌운동 완료
    PROMO_FIRST_QUESTION: 'PLACEHOLDER_FIRST_QUESTION',   // 첫문제 풀기 (검토중)
    PROMO_COIN_EXCHANGE: 'PLACEHOLDER_COIN_EXCHANGE',     // 코인→포인트 교환 (검토중)
    SHARE_MODULE_ID: '12a10659-c8aa-407a-a090-38f3c5dd4639', // 공유 리워드 모듈 ID
  };

  // ── User Key ──
  // 정책: stored OAuth userHash (numeric 만) 사용. 그 외 모든 형태는 무효 처리.
  // - numeric stored → 그대로 반환
  // - non-numeric stored (과거 빌드에서 잘못 저장된 anonymous SDK key 등) → 정리 + 'toss_anonymous'
  // - stored 없음 → 'toss_anonymous'
  // 'toss_anonymous' 반환 시 server 호출 가드로 차단되며, exchangePoints 등에서 _recoverViaSilentLogin() 으로 회복.
  async function getUserHash() {
    if (_userHash) return _userHash;
    if (!isToss) { _userHash = 'web_' + (localStorage.getItem('bf-uid') || (() => { const id = crypto.randomUUID(); localStorage.setItem('bf-uid', id); return id; })()); return _userHash; }
    const storedHash = await storageGet('toss_userHash');
    if (storedHash && /^\d+$/.test(storedHash)) { _userHash = storedHash; return _userHash; }
    // 잘못된 형식의 stored 정리 (과거 빌드 잔재)
    if (storedHash) {
      try { await storageSet('toss_userHash', ''); } catch (_) {}
      console.warn('[AIT] cleared invalid stored toss_userHash:', storedHash);
    }
    _userHash = 'toss_anonymous';
    return _userHash;
  }

  // stored 비어있는 유저를 silent appLogin 으로 회복.
  // - 이미 로그인 동의한 유저는 토스 SDK가 동의 화면 없이 바로 인가코드 반환 (공식 문서 보장)
  // - 미동의 유저는 동의 화면 뜸 → 호출 컨텍스트(교환 버튼 등)에서 사용자가 인지하는 액션이어야 안전
  // - LS bf-points 는 절대 건드리지 않음 (실패해도 보존)
  let _recoverInFlight = null;
  async function _recoverViaSilentLogin() {
    if (!isToss) return false;
    if (_recoverInFlight) return _recoverInFlight;
    _recoverInFlight = (async () => {
      try {
        // 이미 stored 있으면 회복 불필요
        const existing = await storageGet('toss_userHash');
        if (existing) { _userHash = existing; return true; }
        // 로그인 (이미 동의한 유저는 silent)
        const result = await login();
        // 엄격 판정: userHash + userKey 둘 다 있어야 진짜 회복 성공.
        // login() 내부에서 둘 다 있을 때만 storage 저장하므로 이 조건이 일치해야 stored 가 채워졌음.
        if (result?.userHash && result?.userKey) {
          // login() 내부의 fire-and-forget sync 와 별개로 await sync 보장 (회복 흐름은 sync 결과까지 기다려야 함).
          await _syncLocalPointsOnce();
          return true;
        }
        return false;
      } catch (e) {
        console.warn('[AIT] silent recovery failed:', e);
        return false;
      } finally {
        _recoverInFlight = null;
      }
    })();
    return _recoverInFlight;
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
        const evtType = typeof event === 'string' ? event : (event?.type || event?.eventType);
        console.log('[AIT] showAd event:', type, evtType, JSON.stringify(event));
        if (evtType === 'userEarnedReward' || evtType === 'rewarded' || evtType === 'reward' ||
            evtType === 'dismissed' || evtType === 'adDismissed' || evtType === 'adClosed' || evtType === 'closed') {
          _adLoaded[type] = false;
          preloadAd(type);
          resolve({ success: true, event: evtType });
        }
      };
      const handleError = (err) => { resolve({ success: false, error: err }); };
      try {
        _bridgeEvent('showAppsInTossAdMob', { options: { adGroupId: id }, onEvent: handleEvent, onError: handleError });
      } catch (e) { resolve({ success: false, error: e }); }
      // 타임아웃: 리워드 광고는 1분 이상일 수 있으므로 5분으로 설정
      setTimeout(() => resolve({ success: false, error: 'timeout' }), 300000);
    });
  }

  // ── Banner Ad (official TossAds.attachBanner API via window.TossAds bridge) ──
  let _tossAdsInitialized = false;
  let _tossAdsInitPromise = null;
  const _bannerHandles = new Map();
  const _bannerRetryTimers = {};

  function _initTossAds() {
    if (_tossAdsInitialized) return Promise.resolve();
    if (_tossAdsInitPromise) return _tossAdsInitPromise;
    // window.TossAds is set by module bridge in index.html
    const _TossAds = window.TossAds;
    if (!_TossAds || !_TossAds.initialize || !_TossAds.initialize.isSupported()) {
      console.warn('[Banner] TossAds.initialize not supported');
      return Promise.reject(new Error('TossAds not supported'));
    }
    _tossAdsInitPromise = new Promise((resolve, reject) => {
      _TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            console.log('[Banner] TossAds initialized');
            _tossAdsInitialized = true;
            resolve();
          },
          onFailedToInitialize: (err) => {
            console.warn('[Banner] TossAds init failed:', err);
            _tossAdsInitPromise = null;
            reject(err);
          }
        }
      });
    });
    return _tossAdsInitPromise;
  }

  function destroyBannerAd(containerId) {
    const handle = _bannerHandles.get(containerId);
    if (handle) { try { handle.destroy(); } catch(e) {} _bannerHandles.delete(containerId); }
    if (_bannerRetryTimers[containerId]) { clearTimeout(_bannerRetryTimers[containerId]); _bannerRetryTimers[containerId] = null; }
  }

  function loadBannerAd(containerId, opts = {}) {
    if (!isToss) {
      const el = document.getElementById(containerId);
      if (el) { el.style.cssText += ';background:var(--border);display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:12px;min-height:60px'; el.textContent = '광고 영역'; }
      return;
    }
    const el = document.getElementById(containerId);
    if (!el) return;
    if (_bannerHandles.has(containerId)) {
      if (el.children.length === 0) {
        _bannerHandles.delete(containerId);
      } else {
        return;
      }
    }
    const adGroupId = opts.spaceId || CONFIG.AD_BANNER_ID;
    const theme = opts.theme || 'light';
    const variant = opts.variant || 'expanded';
    const retryCount = opts._retryCount || 0;
    console.log('[Banner] loadBannerAd:', containerId, adGroupId, retryCount > 0 ? `retry:${retryCount}` : '');

    const retryBanner = () => {
      if (retryCount < 3 && document.getElementById(containerId)) {
        const delay = (retryCount + 1) * 10000;
        console.log(`[Banner] ${containerId} retry ${retryCount + 1}/3 in ${delay}ms`);
        _bannerRetryTimers[containerId] = setTimeout(() => {
          _bannerHandles.delete(containerId);
          loadBannerAd(containerId, { ...opts, _retryCount: retryCount + 1 });
        }, delay);
      }
    };

    _initTossAds().then(() => {
      if (!document.getElementById(containerId)) return;
      const _TossAds = window.TossAds;
      const handle = _TossAds.attachBanner(adGroupId, el, {
        theme,
        variant,
        callbacks: {
          onAdRendered: (payload) => {
            console.log('[Banner] rendered:', containerId, payload?.slotId);
            if (_bannerRetryTimers[containerId]) { clearTimeout(_bannerRetryTimers[containerId]); _bannerRetryTimers[containerId] = null; }
          },
          onAdViewable: (payload) => console.log('[Banner] viewable:', containerId, payload?.slotId),
          onAdImpression: (payload) => console.log('[Banner] impression:', containerId, payload?.slotId),
          onAdClicked: (payload) => console.log('[Banner] clicked:', containerId, payload?.slotId),
          onAdFailedToRender: (payload) => { console.warn('[Banner] failed:', containerId, payload?.error?.message); retryBanner(); },
          onNoFill: (payload) => { console.log('[Banner] no fill:', containerId, payload?.adGroupId); retryBanner(); },
        },
      });
      _bannerHandles.set(containerId, handle);
    }).catch(e => {
      console.warn('[Banner] loadBannerAd failed:', containerId, e);
      retryBanner();
    });
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
            if (typeof addPoints === 'function') addPoints(5);
            log('share_invite_rewarded', { ...(e.data || {}) });
          } else if (e && e.type === 'close') {
            const { sentRewardsCount } = e.data || {};
            if (sentRewardsCount > 0 && typeof toast === 'function') toast(`총 ${sentRewardsCount}명 초대 완료!`);
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

  // ── Pop Activity (뒤로가기 — 종료 모달 없이 이전 화면으로) ──
  async function popActivity() {
    if (!isToss) { window.history.back(); return; }
    try { await _bridgeCall('popActivity'); } catch (e) {
      try { await _bridgeCall('closeView'); } catch (e2) {}
    }
  }

  // ── Back Event (네이티브 백버튼 기본 동작 차단 + 직접 처리) ──
  function subscribeBackEvent(cb) {
    return _bridgeEvent('backEvent', { onEvent: cb, onError: () => {} });
  }

  function addBackEventListener(options) {
    if (!isToss) {
      const handler = (e) => { if (e.key === 'Escape') options.onEvent && options.onEvent(); };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
    return _bridgeEvent('backEvent', options);
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
        // userHash 가 falsy 면 stored 빈 문자열 저장 → 다음 진입에 anonymous 로 떨어짐.
        // 따라서 둘 다 있을 때만 stored 저장 (없으면 다음 진입에 재시도).
        if (data.userHash && data.userKey) {
          _userHash = data.userHash;
          _loginData = data;
          await storageSet('toss_userKey', String(data.userKey));
          await storageSet('toss_userHash', data.userHash);
          await storageSet('toss_name', data.name || '');
          log('toss_login', { userKey: data.userKey });
          checkPromoFirstLogin();
          // LS bf-points 가 anonymous 시기에 쌓여있을 수 있으므로 즉시 server 로 max sync.
          // fire-and-forget — 실패해도 LS 점수는 보존됨 (sync 라우트가 max 보장).
          _syncLocalPointsOnce().catch(() => {});
        } else {
          console.warn('[AIT] login response missing userHash/userKey; not persisting', data);
        }
      }
      return data;
    } catch (e) { console.error('AIT login failed:', e); return { error: e.message }; }
  }

  function getLoginData() { return _loginData; }

  // ── Promotion (중복 방지 + SDK 호출) ──
  const _promoGranted = {};
  let _promoLock = {};
  async function triggerPromo(promoType, promoCode, amount) {
    if (promoType !== 'POINT_100' && _promoGranted[promoType]) return true; // 이미 지급됨
    if (_promoLock[promoType]) return false;
    _promoLock[promoType] = true;
    // 플레이스홀더: Toss 콘솔 미승인 프로모션은 API 호출 없이 스킵
    if (promoCode && promoCode.includes('PLACEHOLDER_')) {
      console.log('[AIT] triggerPromo: placeholder, skipping:', promoType);
      _promoLock[promoType] = false;
      return false;
    }
    try {
      const uh = await getUserHash();
      if (promoType !== 'POINT_100') {
        try {
          const chk = await fetch(`${API_BASE}/api/score/promo/check/${uh}/${promoType}`).then(r=>r.json());
          if (chk.granted) { _promoGranted[promoType] = true; return true; }
        } catch(e) { console.warn('[AIT] promo check failed:', e); }
      }
      let bridgeOk = !isToss;
      if (isToss) {
        const result = await grantPromoReward(promoCode, amount);
        bridgeOk = !!(result && result.key);
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
      return bridgeOk;
    } finally {
      _promoLock[promoType] = false;
    }
  }

  async function checkPromoFirstLogin() { triggerPromo('FIRST_LOGIN', CONFIG.PROMO_FIRST_LOGIN, 1); }
  async function checkPromoPoint100() { triggerPromo('POINT_100', CONFIG.PROMO_POINT_100, 100); }
  async function checkPromoFirstWorkout() { triggerPromo('FIRST_WORKOUT', CONFIG.PROMO_FIRST_WORKOUT, 2); }
  // 첫문제 풀기 (플레이스홀더 - 코드 승인 후 자동 활성화)
  async function checkPromoFirstQuestion() { triggerPromo('FIRST_QUESTION', CONFIG.PROMO_FIRST_QUESTION, 1); }
  // 코인→포인트 교환 (플레이스홀더 - 코드 승인 후 자동 활성화)
  async function checkPromoCoinExchange() { triggerPromo('COIN_EXCHANGE', CONFIG.PROMO_COIN_EXCHANGE, 1); }

  // ── Init ──
  async function init() {
    await getUserHash();
    if (isToss) {
      _initTossAds().catch(e => { console.warn('[AIT] TossAds init failed on startup:', e); });
      preloadAd('interstitial');
      preloadAd('rewarded');
      setScreenAwake(true);
      log('app_open', { version: 'v57' });
      // 자동 로그인 제거: 사용자가 시작하기 버튼 클릭 시에만 로그인
    }
  }

  // 두뇌점수 양방향 동기화 (4/15 SDK 마이그레이션 보정 + storage 손실 회복).
  // server <-> local 중 큰 값으로 양쪽 정합.
  // ⚠️ stored toss_userHash 가 있을 때만 동작 — 익명 hash 로 절대 sync 안 함 (race condition 방지)
  async function _syncLocalPointsOnce() {
    try {
      const storedHash = await storageGet('toss_userHash');
      if (!storedHash) return;  // 로그인 안 된 상태면 sync 시도 자체 안 함
      const localPoints = parseInt(localStorage.getItem('bf-points') || '0', 10) || 0;
      const resp = await fetch(`${API_BASE}/api/score/points/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userHash: storedHash, localPoints })
      }).catch(() => null);
      if (!resp) return;
      // 응답 직전에 storage 가 비워졌는지 재확인 (UNLINK race 방지)
      const stillStored = await storageGet('toss_userHash');
      if (!stillStored || stillStored !== storedHash) return;
      if (resp.status === 404) {
        // 자동 청소 비활성화 — 무한 루프 위험. 로그만 남김. 필요 시 ?reset=1 로 수동 처리.
        console.warn('[AIT] sync 404 (server has no user) — auto-clear disabled');
        return;
      }
      const res = await resp.json().catch(() => null);
      if (res && res.status === 'ok' && typeof res.points === 'number') {
        if (res.points !== localPoints) {
          localStorage.setItem('bf-points', String(res.points));
          console.log('[AIT] points reconciled:', { local: localPoints, server: res.server, final: res.points });
          if (typeof window.renderPoints === 'function') {
            try { window.renderPoints(); } catch (e) {}
          }
        }
      }
    } catch (e) { console.warn('[AIT] _syncLocalPointsOnce error:', e); }
  }

  // 서버에 user 레코드 없음 (UNLINK / 데이터 삭제 등) 감지 시 인증 정리 + 인트로 재진입
  function _handleStaleSession() {
    console.warn('[AIT] stale session detected (server user not found) — clearing auth & forcing re-login');
    try {
      localStorage.removeItem('toss_userKey');
      localStorage.removeItem('toss_userHash');
      localStorage.removeItem('toss_name');
      _userHash = null;
    } catch (e) {}
    // 화면 전환: intro 가 있으면 그쪽으로, 없으면 reload
    try {
      const intro = document.getElementById('introScreen');
      const home = document.getElementById('homeScreen');
      if (intro && typeof window.show === 'function') {
        window.show('introScreen');
      } else {
        window.location.reload();
      }
    } catch (e) { try { window.location.reload(); } catch (_) {} }
  }

  return {
    isToss, CONFIG, getUserHash, login, getLoginData, triggerPromo,
    checkPromoFirstLogin, checkPromoPoint100, checkPromoFirstWorkout,
    checkPromoFirstQuestion, checkPromoCoinExchange,
    showAd, preloadAd, loadBannerAd, destroyBannerAd,
    submitScore, openLeaderboard, getProfile,
    storageGet, storageSet, haptic,
    grantPromoReward, shareInvite, shareMessage,
    log, setScreenAwake, close, popActivity, subscribeBackEvent, addBackEventListener, getDeviceId, getPlatform, getEnv,
    init, _recoverViaSilentLogin, get userHash() { return _userHash; }
  };
})();

// Initialize SDK on load
AIT.init();
