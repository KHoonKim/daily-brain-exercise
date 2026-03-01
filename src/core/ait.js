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
    AD_BANNER_ID: 'ait.v2.live.b85a333f502c4b39',        // 배너형: 홈화면 하단
    AD_IMAGE_BANNER_ID: 'ait.v2.live.0118ea745ccf494d',  // 이미지 강조형: 코인 상세 페이지 하단
    AD_INTERSTITIAL_ID: 'ait.v2.live.253409cb2c514e7f',  // 전면형: 광고보고 다음 문제 풀기
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
  let _sdkInitPromise = null; // race condition 방지: 중복 sdk.init() 호출 차단

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

  // fetchTossAd 지원 여부 확인 (공식 프레임워크와 동일한 체크)
  const _fetchTossAdSupported = () => !!(window.__CONSTANT_HANDLER_MAP?.fetchTossAd_isSupported);

  // fetchTossAd 응답 정규화 (공식 @apps-in-toss/web-framework Re() 함수와 동일한 로직)
  // 두 가지 응답 형식 모두 처리:
  //   1. wrapped:   { resultType: 'SUCCESS', success: { ads:[...], requestId:'', ... } }
  //   2. unwrapped: { ads:[...], requestId:'', status:'OK', ... }
  function _normalizeAdResponse(raw) {
    const VALID_STYLE_IDS = new Set(['1', '2']);
    const filterAds = (ads) => Array.isArray(ads) ? ads.filter(a => VALID_STYLE_IDS.has(String(a.styleId))) : [];
    const hasResultType = raw && typeof raw === 'object' && 'resultType' in raw;
    const hasAds = raw && typeof raw === 'object' && 'ads' in raw;
    if (hasResultType) {
      if (raw.resultType !== 'SUCCESS') return raw;
      if (!raw.success) return { resultType: 'FAIL', error: { reason: 'fetchTossAd returned SUCCESS without payload' } };
      return { ...raw, success: { ...raw.success, ads: filterAds(raw.success.ads) } };
    }
    if (hasAds) {
      return { resultType: 'SUCCESS', success: { requestId: raw.requestId || '', status: raw.status || 'OK', ads: filterAds(raw.ads), ext: raw.ext } };
    }
    return { resultType: 'FAIL', error: { reason: 'Invalid response from fetchTossAd' } };
  }

  function _initSdkOnce(sdk) {
    if (_sdkInitPromise) return _sdkInitPromise;
    if (sdk.isInitialized()) return Promise.resolve(sdk);
    _sdkInitPromise = new Promise((resolve) => {
      try {
        sdk.init({
          environment: 'live',
          customAdFetcher: async (_ctx, slotOpts) => {
            const spaceUnitId = slotOpts?.spaceUnitId || slotOpts?.spaceId;
            const isSupported = _fetchTossAdSupported();
            console.log('[Banner] customAdFetcher: spaceUnitId=', spaceUnitId, 'isSupported=', isSupported, 'RNWV=', !!window.ReactNativeWebView);
            // 공식 프레임워크와 동일: isSupported 체크 먼저
            if (!isSupported) {
              console.warn('[Banner] fetchTossAd not supported in this environment');
              return { resultType: 'FAIL', error: { reason: 'fetchTossAd is not supported in this environment.' } };
            }
            return new Promise((res, rej) => {
              // 타임아웃: 5초 내 응답 없으면 실패 처리
              const timer = setTimeout(() => {
                console.warn('[Banner] fetchTossAd timeout');
                rej(new Error('fetchTossAd timeout'));
              }, 5000);
              const cleanup = _bridgeEvent('fetchTossAd', {
                options: { adGroupId: spaceUnitId, sdkId: '108', availableStyleIds: ['1', '2'] },
                onEvent: (r) => {
                  clearTimeout(timer);
                  console.log('[Banner] fetchTossAd raw response:', JSON.stringify(r)?.slice(0, 300));
                  if (cleanup) cleanup();
                  res(r);
                },
                onError: (e) => {
                  clearTimeout(timer);
                  console.warn('[Banner] fetchTossAd onError:', e);
                  if (cleanup) cleanup();
                  rej(e);
                }
              });
              if (!window.ReactNativeWebView) {
                clearTimeout(timer);
                rej(new Error('ReactNativeWebView not available'));
              }
            }).then(raw => {
              const normalized = _normalizeAdResponse(raw);
              const adCount = normalized?.success?.ads?.length ?? 0;
              console.log('[Banner] normalized resultType:', normalized?.resultType, 'ads:', adCount);
              return normalized;
            }).catch(e => ({ resultType: 'FAIL', error: { reason: String(e?.message || e) } }));
          },
          opener: (url) => { _bridgeCall('openURL', [url]).catch(() => {}); }
        });
        resolve(sdk);
      } catch (e) {
        console.warn('[Banner] sdk.init failed:', e);
        _sdkInitPromise = null;
        resolve(sdk);
      }
    });
    return _sdkInitPromise;
  }

  const _bannerSlots = new Set();
  const _bannerHandles = new Map(); // containerId -> { destroy() } 슬롯 핸들

  function destroyBannerAd(containerId) {
    const handle = _bannerHandles.get(containerId);
    if (handle) { try { handle.destroy(); } catch(e) {} _bannerHandles.delete(containerId); }
    _bannerSlots.delete(containerId);
  }

  function loadBannerAd(containerId, opts = {}) {
    if (!isToss) {
      const el = document.getElementById(containerId);
      if (el) { el.style.cssText += ';background:var(--border);display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:12px'; el.textContent = '광고 영역'; }
      return;
    }
    if (_bannerSlots.has(containerId)) return; // 이미 슬롯 생성됨 or 대기 중
    // fetchTossAd가 아직 준비 안 됐으면 1초 간격으로 최대 10회 재시도 (앱 시작 직후 브릿지 초기화 대기)
    if (!_fetchTossAdSupported()) {
      _bannerSlots.add(containerId); // 중복 폴링 방지
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (_fetchTossAdSupported()) {
          clearInterval(poll);
          _bannerSlots.delete(containerId);
          loadBannerAd(containerId, opts);
        } else if (attempts >= 10) {
          clearInterval(poll);
          _bannerSlots.delete(containerId);
          console.warn('[Banner] fetchTossAd 미지원 환경 - 포기:', containerId);
        }
      }, 1000);
      return;
    }
    const el = document.getElementById(containerId);
    if (!el) return;
    const handleError = (e) => {
      console.warn('Banner ad error:', e);
      el.style.display = 'none';
    };
    const hideContainer = () => { el.style.display = 'none'; };
    const spaceId = opts.spaceId || CONFIG.AD_BANNER_ID;
    const variant = opts.variant || 'card';
    const theme = opts.theme || 'light';
    const tone = opts.tone || 'blackAndWhite';
    console.log('[Banner] loadBannerAd:', containerId, spaceId, 'RNWV:', !!window.ReactNativeWebView, 'bridge:', !!_bridge);
    _loadTossAdSdk().then(sdk => {
      console.log('[Banner] SDK loaded, isInitialized:', sdk.isInitialized(), 'hasBanner:', !!sdk.banner);
      return _initSdkOnce(sdk);
    }).then(sdk => {
      if (!sdk.banner) { hideContainer(); return; }
      console.log('[Banner] createSlot:', containerId, spaceId);
      _bannerSlots.add(containerId);
      const slotHandle = sdk.banner.createSlot(el, {
        spaceId,
        variant,
        theme,
        tone,
        autoLoad: true,
        callbacks: {
          onAdRendered: () => console.log('[Banner] rendered:', containerId),
          onAdFailedToRender: (info) => { console.warn('[Banner] failed:', info); destroyBannerAd(containerId); handleError(info?.error); },
          onNoFill: () => { console.log('[Banner] No fill:', containerId); hideContainer(); }
        }
      });
      if (slotHandle?.destroy) _bannerHandles.set(containerId, slotHandle);
    }).catch(e => { console.warn('[Banner] SDK load failed:', e); handleError(e); });
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
    if (promoType !== 'POINT_100' && _promoGranted[promoType]) return true; // 이미 지급됨
    if (_promoLock[promoType]) return false;
    _promoLock[promoType] = true;
    // 플레이스홀더: Toss 콘솔 미승인 프로모션은 API 호출 없이 스킵
    if (promoCode && promoCode.startsWith('PLACEHOLDER_')) {
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
    checkPromoFirstQuestion, checkPromoCoinExchange,
    showAd, preloadAd, loadBannerAd, destroyBannerAd,
    submitScore, openLeaderboard, getProfile,
    storageGet, storageSet, haptic,
    grantPromoReward, shareInvite, shareMessage,
    log, setScreenAwake, close, getDeviceId, getPlatform, getEnv,
    init, get userHash() { return _userHash; }
  };
})();

// Initialize SDK on load
AIT.init();
