// ===== 출석체크 =====
const ATTENDANCE_KEY = 'dbe-attendance';

function _getAttendanceData() {
  try {
    return JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '{"dates":[],"streak":0,"cycleDay":0}');
  } catch { return { dates: [], streak: 0, cycleDay: 0 }; }
}

function markTodayAttendance() {
  const today = getDayKey(); // utils.js의 getDayKey() 재사용 (9시 KST 기준)
  const data = _getAttendanceData();
  if (data.dates.includes(today)) return { data, isNewDay: false, streakBonus: false };

  // 어제 기준 연속 여부 계산
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) kst.setUTCDate(kst.getUTCDate() - 1);
  kst.setUTCDate(kst.getUTCDate() - 1);
  const yesterday = kst.toISOString().slice(0, 10);
  const continued = data.dates.includes(yesterday);

  if (!continued) {
    data.streak = 1;
    data.cycleDay = 1;
    data.streakStart = today;
  } else {
    data.streak = (data.streak || 0) + 1;
    data.cycleDay = (data.cycleDay || 0) + 1;
    if (data.cycleDay === 1) data.streakStart = today;
    if (!data.streakStart) data.streakStart = yesterday;
  }

  const streakBonus = data.cycleDay === 7;
  if (data.cycleDay >= 7) data.cycleDay = 0;

  data.dates = [...data.dates, today].slice(-60);
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
  return { data, isNewDay: true, streakBonus };
}

function _parseDateStr(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d); // 로컬 타임존 기준, 타임존 변환 없음
}

function _toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderAttendanceHTML() {
  const data = _getAttendanceData();
  const today = getDayKey();
  const startDate = _parseDateStr(data.streakStart || today);
  const dayLabel = ['일', '월', '화', '수', '목', '금', '토'];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return _toDateStr(d);
  });

  return `
    <div class="attendance-card tds-card">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px">
        <span style="font-size:20px">🧠</span>
        <span class="tds-t6 tds-fw-semibold" style="color:var(--tds-text)">출석체크 ${data.streak || 0}일 째</span>
      </div>
      <div class="attendance-card__grid">
        <div class="attendance-card__labels">
          ${days.map(date => `<div>${dayLabel[_parseDateStr(date).getDay()]}</div>`).join('')}
        </div>
        <div class="attendance-card__dots">
          ${days.map((date, i) => {
            const checked = data.dates.includes(date);
            const isToday = date === today;
            const isBonus = i === 6;
            return `<div class="attendance-dot${checked ? ' attendance-dot--checked' : ''}${isToday && !checked ? ' attendance-dot--today' : ''}">
              ${checked ? '✓' : ''}
              <span class="attendance-label${isBonus ? ' attendance-label--bonus' : ''}">${isBonus ? '+3점' : '+1점'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
