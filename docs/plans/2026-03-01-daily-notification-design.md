# 일일 알림 발송 설계 (2026-03-01)

## 목표
매일 KST 09:00에 등록된 전체 유저에게 토스 스마트메시지로 기능성 알림 발송.
- 내용: 티켓 충전 완료 + 오늘의 두뇌운동 시작 안내
- 동적 변수 없음, 고정 문구

## 기술 결정
- **스케줄러**: `node-cron` (`0 9 * * *`, timezone: Asia/Seoul)
- **API**: `POST /api-partner/v1/apps-in-toss/messenger/send-bulk-message`
- **배치 크기**: 최대 2,500건/요청 (Toss 제한)
- **동의 처리**: Toss 서버가 자동으로 미동의 유저 필터링

## 플레이스홀더
```
DAILY_NOTIFY_TEMPLATE = 'PLACEHOLDER_TEMPLATE_SET_CODE'
```
심사 승인 후 `server.js` 상수값만 교체하면 됨.

## 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `server/package.json` | `node-cron` 의존성 추가 |
| `server/server.js` | cron require, 상수 2개, `sendDailyNotification()` 함수, cron 등록 |

## 발송 흐름
1. 매일 KST 09:00 cron 트리거
2. `users` 테이블 전체 조회
3. 2,500건 단위로 분할 → `send-bulk-message` API 호출
4. 결과 콘솔 로그 출력
