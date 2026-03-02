# CashWord 일일 알림 구현 핸드오프 (2026-03-02)

## 배경

daily-brain-exercise와 동일한 패턴으로 CashWord 유저에게 일일 알림 발송 기능 추가.
`settings` 테이블 및 `PATCH /api/admin/settings` 엔드포인트는 이미 구현되어 있음.

## 기존 구현 참고

`server/server.js` 내 daily-brain-exercise 알림 구현체:
- `let dailyNotifyTemplate` (line ~890): DB에서 1회 로드, 메모리 캐시
- `sendDailyNotification()` (line ~892): 배치 발송 함수
- cron (line ~954): `0 9 * * *` Asia/Seoul

## 해야 할 작업

### 1. 메모리 캐시 변수 추가

daily-brain-exercise 알림 cron 등록 바로 아래 (`// ===== CASHWORD API =====` 섹션 직전):

```js
// CashWord 일일 알림 templateSetCode (서버 시작 시 1회 로드)
let cashwordNotifyTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('cashword_notify_template')?.value ?? null;
```

### 2. `sendDailyCashwordNotification()` 함수 추가

같은 위치에 추가. 주의: **`tossFetch` 대신 `cashwordTossFetch` 사용** (mTLS 인증서 필요).
유저 테이블도 `cashword_users` 사용.

```js
async function sendDailyCashwordNotification() {
  if (!cashwordNotifyTemplate) {
    console.log('[CashWordNotify] templateSetCode 미설정 — 발송 건너뜀');
    return;
  }

  const users = db.prepare('SELECT user_hash FROM cashword_users').all();
  if (users.length === 0) {
    console.log('[CashWordNotify] 발송 대상 유저 없음');
    return;
  }

  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BULK_BATCH_SIZE) {
    const chunk = users.slice(i, i + BULK_BATCH_SIZE);
    const contextList = chunk.map(u => ({
      userKey: parseInt(u.user_hash, 10),
      context: {}
    }));

    try {
      const resp = await cashwordTossFetch(`${TOSS_API}/api-partner/v1/apps-in-toss/messenger/send-bulk-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSetCode: cashwordNotifyTemplate, contextList })
      });
      const data = await resp.json();
      if (data.resultType === 'SUCCESS') {
        totalSuccess += chunk.length;
      } else {
        totalFail += chunk.length;
        console.error('[CashWordNotify] 배치 실패:', JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      totalFail += chunk.length;
      console.error('[CashWordNotify] 배치 오류:', e.message);
    }
  }

  console.log(`[CashWordNotify] 완료 — 대상: ${users.length}명, 성공: ${totalSuccess}, 실패: ${totalFail}`);
}

cron.schedule('0 9 * * *', sendDailyCashwordNotification, { timezone: 'Asia/Seoul' });
```

### 3. admin 엔드포인트 캐시 갱신 추가

기존 `PATCH /api/admin/settings` 핸들러 내 메모리 갱신 블록에 한 줄 추가:

```js
// 기존
if (key === 'daily_notify_template') dailyNotifyTemplate = value;
// 추가
if (key === 'cashword_notify_template') cashwordNotifyTemplate = value;
```

## 템플릿 설정 방법 (심사 승인 후)

```bash
curl -X PATCH https://서버주소/api/admin/settings \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"key":"cashword_notify_template","value":"실제templateSetCode"}'
```

## 체크리스트

- [ ] `cashwordNotifyTemplate` 변수 추가 (settings 테이블 1회 로드)
- [ ] `sendDailyCashwordNotification()` 함수 추가 (`cashwordTossFetch` 사용)
- [ ] cron 등록 (`0 9 * * *`, Asia/Seoul)
- [ ] admin 엔드포인트 메모리 갱신 한 줄 추가
- [ ] 서버 재시작 후 동작 확인 (templateSetCode 미설정 시 건너뜀 로그 확인)
