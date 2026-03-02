// ===== LEADERBOARD UI =====
let _lbFromResult = false;
let _lbPrevScreenId = null;

function lbBack() {
  if (_lbFromResult) {
    _lbFromResult = false;
    // Restore the game screen that was active, then re-show the result overlay on top
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (_lbPrevScreenId) document.getElementById(_lbPrevScreenId)?.classList.add('active');
    document.getElementById('overlay').classList.add('active');
  } else {
    goHome();
  }
}

async function showLeaderboard(gameId = 'overall') {
  const title = gameId === 'overall' ? '전체 순위' : (GAMES.find(g => g.id === gameId)?.name || '게임 순위');
  document.getElementById('lb-title').textContent = title;

  _lbFromResult = document.getElementById('overlay')?.classList.contains('active') ?? false;
  _lbPrevScreenId = document.querySelector('.screen.active')?.id ?? null;
  document.getElementById('overlay')?.classList.remove('active');
  show('leaderboardScreen');
  const listEl = document.getElementById('lb-list');
  listEl.innerHTML = '<div class="tds-empty-state">불러오는 중...</div>';

  try {
    const url = gameId === 'overall' ? '/api/score/overall-leaderboard' : `/api/score/leaderboard/${gameId}`;
    const data = await fetch(url).then(r => r.json());

    if (!data.length) {
      listEl.innerHTML = '<div class="tds-empty-state">아직 순위가 없습니다.<br>첫 번째 주인공이 되어보세요!</div>';
      return;
    }

    listEl.innerHTML = data.map((row, i) => {
      const isTop3 = i < 3;
      const rankClass = isTop3 ? `rank-${i + 1}` : '';
      const score = gameId === 'overall' ? row.total_points : row.best;
      const name = row.user_name || '익명';
      
      return `
        <div class="lb-item ${rankClass}">
          <div class="lb-rank">${i + 1}</div>
          <div class="lb-name">${name}</div>
          <div class="lb-score">${score.toLocaleString()}점</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    listEl.innerHTML = '<div class="tds-empty-state tds-empty-state--error">데이터를 가져오지 못했습니다.</div>';
  }
}

// Global hook for AIT
if (window.AIT) {
  AIT.openLeaderboard = (gameId) => showLeaderboard(gameId || 'overall');
}
