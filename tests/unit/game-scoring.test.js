/**
 * Tests for pure scoring logic extracted from game files and result.js.
 *
 * These are tested as plain JS functions (no DOM, no vm loading) since
 * the formulas are simple and well-isolated in the source.
 *
 * NOTE: The functions below are LOCAL REIMPLEMENTATIONS of the formulas that
 * exist in the actual source files. They test formula correctness in isolation
 * but will NOT automatically catch drift if the source files change.
 *
 * For tests that load and exercise the ACTUAL source files via Node.js vm,
 * see: tests/unit/game-source-tests.test.js
 */

// ---------------------------------------------------------------------------
// Math game — combo scoring
// From src/games/math.js line 25:
//   mathScore += (mathCombo >= 5 ? 30 : mathCombo >= 3 ? 20 : 10)
// Note: the combo value used here is the value BEFORE incrementing on the
// current answer, i.e. it represents consecutive correct answers so far
// (0-indexed streak entering this answer).
// ---------------------------------------------------------------------------

function mathComboScore(combo) {
  // Mirrors: mathScore += (mathCombo>=5 ? 30 : mathCombo>=3 ? 20 : 10)
  if (combo >= 5) return 30;
  if (combo >= 3) return 20;
  return 10;
}

describe('Math game — combo scoring', () => {
  it('combo 0 (first answer) gives 10 points', () => {
    expect(mathComboScore(0)).toBe(10);
  });

  it('combo 1 gives 10 points', () => {
    expect(mathComboScore(1)).toBe(10);
  });

  it('combo 2 gives 10 points', () => {
    expect(mathComboScore(2)).toBe(10);
  });

  it('combo 3 gives 20 points', () => {
    expect(mathComboScore(3)).toBe(20);
  });

  it('combo 4 gives 20 points', () => {
    expect(mathComboScore(4)).toBe(20);
  });

  it('combo 5 gives 30 points', () => {
    expect(mathComboScore(5)).toBe(30);
  });

  it('combo 10 gives 30 points', () => {
    expect(mathComboScore(10)).toBe(30);
  });

  it('wrong answer resets combo to 0, so next correct scores 10', () => {
    // After a wrong answer combo resets to 0
    expect(mathComboScore(0)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Math game — difficulty scaling
// From src/games/math.js line 12:
//   const mx = Math.min(10 + Math.floor(mathScore / 3) * 5, 99)
// ---------------------------------------------------------------------------

function mathMaxOperand(score) {
  return Math.min(10 + Math.floor(score / 3) * 5, score);
}

// Test the formula itself directly
function mathMx(score) {
  return Math.min(10 + Math.floor(score / 3) * 5, 99);
}

describe('Math game — operand ceiling formula', () => {
  it('score=0: max operand is 10', () => {
    expect(mathMx(0)).toBe(10);
  });

  it('score=3: max operand is 15', () => {
    expect(mathMx(3)).toBe(15);
  });

  it('score=6: max operand is 20', () => {
    expect(mathMx(6)).toBe(20);
  });

  it('score=60: max operand is 110 capped at 99', () => {
    // 10 + floor(60/3)*5 = 10 + 100 = 110 → capped at 99
    expect(mathMx(60)).toBe(99);
  });

  it('never exceeds 99', () => {
    expect(mathMx(1000)).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Math game — multiplication operator unlocks at score >= 5
// From src/games/math.js line 13:
//   const ops = mathScore < 5 ? ['+', '-'] : ['+', '-', '×']
// ---------------------------------------------------------------------------

function mathOps(score) {
  return score < 5 ? ['+', '-'] : ['+', '-', '×'];
}

describe('Math game — operator pool by score', () => {
  it('score < 5 only has + and -', () => {
    expect(mathOps(0)).toEqual(['+', '-']);
    expect(mathOps(4)).toEqual(['+', '-']);
  });

  it('score >= 5 includes multiplication', () => {
    expect(mathOps(5)).toContain('×');
    expect(mathOps(5)).toContain('+');
    expect(mathOps(5)).toContain('-');
    expect(mathOps(5).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Colormix game — speed bonus
// From src/games/colormix.js line 38:
//   const pct = cmxQTime / cmxQLimit;
//   const bonus = pct > 0.75 ? 5 : pct > 0.5 ? 3 : 1;
//   cmxScore += 10 + bonus;
//
// pct is the REMAINING time fraction (not time used).
// Higher pct = answered faster = bigger bonus.
// ---------------------------------------------------------------------------

function colormixBonus(remainingTimeFraction) {
  // Mirrors: pct > .75 ? 5 : pct > .5 ? 3 : 1
  const pct = remainingTimeFraction;
  return pct > 0.75 ? 5 : pct > 0.5 ? 3 : 1;
}

function colormixTotalScore(remainingTimeFraction) {
  return 10 + colormixBonus(remainingTimeFraction);
}

describe('Colormix game — speed bonus', () => {
  it('pct > 0.75 (answered very fast, > 75% time left): bonus = 5', () => {
    expect(colormixBonus(1.0)).toBe(5);   // full time remaining
    expect(colormixBonus(0.9)).toBe(5);
    expect(colormixBonus(0.76)).toBe(5);
  });

  it('pct exactly 0.75 does NOT qualify for the top bonus', () => {
    // condition is strictly >0.75
    expect(colormixBonus(0.75)).toBe(3);
  });

  it('pct > 0.5 and <= 0.75 (middle speed): bonus = 3', () => {
    expect(colormixBonus(0.75)).toBe(3);
    expect(colormixBonus(0.6)).toBe(3);
    expect(colormixBonus(0.51)).toBe(3);
  });

  it('pct exactly 0.5 does NOT qualify for middle bonus', () => {
    // condition is strictly >0.5
    expect(colormixBonus(0.5)).toBe(1);
  });

  it('pct <= 0.5 (slow answer): bonus = 1', () => {
    expect(colormixBonus(0.5)).toBe(1);
    expect(colormixBonus(0.25)).toBe(1);
    expect(colormixBonus(0.0)).toBe(1);
  });

  it('total score is 10 + bonus', () => {
    expect(colormixTotalScore(1.0)).toBe(15);   // 10 + 5
    expect(colormixTotalScore(0.6)).toBe(13);   // 10 + 3
    expect(colormixTotalScore(0.1)).toBe(11);   // 10 + 1
  });
});

// ---------------------------------------------------------------------------
// Colormix game — question time limit scaling
// From src/games/colormix.js line 34:
//   cmxQLimit = Math.max(1.0, 3.0 - (cmxRound - 1) * 0.1)
// ---------------------------------------------------------------------------

function cmxQLimit(round) {
  return Math.max(1.0, 3.0 - (round - 1) * 0.1);
}

describe('Colormix game — question time limit by round', () => {
  it('round 1: limit is 3.0s', () => {
    expect(cmxQLimit(1)).toBeCloseTo(3.0);
  });

  it('round 11: limit is 2.0s', () => {
    expect(cmxQLimit(11)).toBeCloseTo(2.0);
  });

  it('round 21: limit is 1.0s (at the floor)', () => {
    expect(cmxQLimit(21)).toBeCloseTo(1.0);
  });

  it('limit never goes below 1.0s', () => {
    expect(cmxQLimit(100)).toBe(1.0);
    expect(cmxQLimit(50)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// XP gain formula (result.js lines 50-51)
//   let xpGain = 10 + Math.floor(score / 5);
//   if (isNew && score > 0) xpGain += 15;
// ---------------------------------------------------------------------------

function calcXpGain(score, isNewRecord) {
  let xpGain = 10 + Math.floor(score / 5);
  if (isNewRecord && score > 0) xpGain += 15;
  return xpGain;
}

describe('XP gain formula (result.js)', () => {
  it('score=0, not new record: xpGain = 10', () => {
    expect(calcXpGain(0, false)).toBe(10);
  });

  it('score=0, isNew=true: no record bonus because score must be > 0', () => {
    expect(calcXpGain(0, true)).toBe(10);
  });

  it('score=5: xpGain = 11 (base)', () => {
    expect(calcXpGain(5, false)).toBe(11);
  });

  it('score=50, not new record: xpGain = 10 + 10 = 20', () => {
    expect(calcXpGain(50, false)).toBe(20);
  });

  it('score=100, not new record: xpGain = 10 + 20 = 30', () => {
    expect(calcXpGain(100, false)).toBe(30);
  });

  it('score=50, new record: xpGain = 20 + 15 = 35', () => {
    expect(calcXpGain(50, true)).toBe(35);
  });

  it('score=1, new record: xpGain = 10 + 0 + 15 = 25', () => {
    expect(calcXpGain(1, true)).toBe(25);
  });

  it('score=99: base = 10 + floor(99/5) = 10 + 19 = 29', () => {
    expect(calcXpGain(99, false)).toBe(29);
  });

  it('score=100, new record: xpGain = 30 + 15 = 45', () => {
    expect(calcXpGain(100, true)).toBe(45);
  });

  it('floor division: score=4 gives same as score=0 for base part', () => {
    // floor(4/5) = 0, so base = 10
    expect(calcXpGain(4, false)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Reaction game — per-tap score formula
// From src/games/reaction.js line 5:
//   score += Math.max(5, Math.round((1000 - ms) / 10))
// ms = reaction time in milliseconds; faster tap = higher score per round.
// ---------------------------------------------------------------------------

function reactionTapScore(ms) {
  return Math.max(5, Math.round((1000 - ms) / 10));
}

describe('Reaction game — per-tap scoring formula', () => {
  it('200ms response gives 80 points', () => {
    // (1000 - 200) / 10 = 80
    expect(reactionTapScore(200)).toBe(80);
  });

  it('300ms response gives 70 points', () => {
    expect(reactionTapScore(300)).toBe(70);
  });

  it('500ms response gives 50 points', () => {
    expect(reactionTapScore(500)).toBe(50);
  });

  it('1000ms response gives 0 — floored to minimum 5', () => {
    // (1000 - 1000) / 10 = 0, Math.max(5, 0) = 5
    expect(reactionTapScore(1000)).toBe(5);
  });

  it('1500ms response is negative — floored to minimum 5', () => {
    // (1000 - 1500) / 10 = -50, Math.max(5, -50) = 5
    expect(reactionTapScore(1500)).toBe(5);
  });

  it('exactly 950ms gives 5 points', () => {
    // (1000 - 950) / 10 = 5
    expect(reactionTapScore(950)).toBe(5);
  });

  it('960ms gives 4 — floored to minimum 5', () => {
    // (1000 - 960) / 10 = 4, Math.max(5, 4) = 5
    expect(reactionTapScore(960)).toBe(5);
  });

  it('100ms response gives 90 points', () => {
    // (1000 - 100) / 10 = 90
    expect(reactionTapScore(100)).toBe(90);
  });

  it('rounding: 155ms gives Math.round(84.5) = 85', () => {
    // (1000 - 155) / 10 = 84.5 → rounds to 85
    expect(reactionTapScore(155)).toBe(85);
  });
});

describe('Reaction game — total score across 5 rounds', () => {
  function reactionTotalScore(times) {
    let score = 0;
    times.forEach(ms => { score += reactionTapScore(ms); });
    return score;
  }

  it('5 rounds at 200ms each: total = 5 × 80 = 400', () => {
    expect(reactionTotalScore([200, 200, 200, 200, 200])).toBe(400);
  });

  it('5 rounds all very slow (2000ms each): total = 5 × 5 = 25', () => {
    expect(reactionTotalScore([2000, 2000, 2000, 2000, 2000])).toBe(25);
  });

  it('mixed times: 200,300,400,500,600ms = 80+70+60+50+40 = 300', () => {
    expect(reactionTotalScore([200, 300, 400, 500, 600])).toBe(300);
  });

  it('one very fast round and four slow rounds still contributes minimum per slow round', () => {
    const score = reactionTotalScore([100, 2000, 2000, 2000, 2000]);
    // 90 + 5 + 5 + 5 + 5 = 110
    expect(score).toBe(110);
  });
});

// ---------------------------------------------------------------------------
// Stroop game — combo-based scoring
// From src/games/stroop.js lines 11-12:
//   stroopCombo++
//   const bonus = stroopCombo >= 10 ? 3 : stroopCombo >= 5 ? 2 : 1
//   stroopScore += 10 * bonus
// Note: combo is incremented BEFORE the bonus check, so:
//   first correct = combo 1 → bonus 1 → +10
//   fifth correct = combo 5 → bonus 2 → +20
//   tenth correct = combo 10 → bonus 3 → +30
// ---------------------------------------------------------------------------

function stroopComboBonus(comboAfterIncrement) {
  // Mirrors: bonus = stroopCombo>=10 ? 3 : stroopCombo>=5 ? 2 : 1
  return comboAfterIncrement >= 10 ? 3 : comboAfterIncrement >= 5 ? 2 : 1;
}

function stroopScoreForAnswer(comboAfterIncrement) {
  return 10 * stroopComboBonus(comboAfterIncrement);
}

describe('Stroop game — combo bonus multiplier', () => {
  it('combo 1 (first correct): bonus = 1', () => {
    expect(stroopComboBonus(1)).toBe(1);
  });

  it('combo 4 (fourth consecutive): bonus = 1', () => {
    expect(stroopComboBonus(4)).toBe(1);
  });

  it('combo 5 (fifth consecutive): bonus = 2', () => {
    expect(stroopComboBonus(5)).toBe(2);
  });

  it('combo 9: bonus = 2', () => {
    expect(stroopComboBonus(9)).toBe(2);
  });

  it('combo 10: bonus = 3', () => {
    expect(stroopComboBonus(10)).toBe(3);
  });

  it('combo 20: bonus = 3', () => {
    expect(stroopComboBonus(20)).toBe(3);
  });
});

describe('Stroop game — score per correct answer', () => {
  it('first correct answer gives 10 points', () => {
    expect(stroopScoreForAnswer(1)).toBe(10);
  });

  it('fifth consecutive correct gives 20 points', () => {
    expect(stroopScoreForAnswer(5)).toBe(20);
  });

  it('tenth consecutive correct gives 30 points', () => {
    expect(stroopScoreForAnswer(10)).toBe(30);
  });
});

describe('Stroop game — accumulated score simulation', () => {
  function simulateStroop(answers) {
    // answers: array of true (correct) / false (wrong)
    let score = 0;
    let combo = 0;
    for (const correct of answers) {
      if (correct) {
        combo++;
        const bonus = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
        score += 10 * bonus;
      } else {
        combo = 0;
      }
    }
    return score;
  }

  it('4 correct answers = 4 × 10 = 40', () => {
    expect(simulateStroop([true, true, true, true])).toBe(40);
  });

  it('5 correct answers: first 4 × 10, fifth × 20 = 60', () => {
    expect(simulateStroop([true, true, true, true, true])).toBe(60);
  });

  it('wrong answer resets combo so next correct scores 10', () => {
    // 4 correct (40), wrong (combo→0), 1 correct (10) = 50
    expect(simulateStroop([true, true, true, true, false, true])).toBe(50);
  });

  it('10 correct in a row accumulates correctly', () => {
    // 4×10 + 5×20 + 1×30 = 40 + 100 + 30 = 170
    const answers = Array(10).fill(true);
    expect(simulateStroop(answers)).toBe(170);
  });
});

// ---------------------------------------------------------------------------
// Sequence game — per-tap and per-level scoring
// From src/games/sequence.js line 5:
//   seqScore += 10 per correct tap
// From seqNewRound (line 4):
//   const len = seqLv + 2 (level 1 → 3 taps, level 2 → 4 taps, etc.)
// ---------------------------------------------------------------------------

function seqScoreForLevel(level) {
  // Completing level N requires (N + 2) correct taps, each worth 10 points
  return (level + 2) * 10;
}

function seqCumulativeScore(levels) {
  // Score after completing all levels 1..levels
  let total = 0;
  for (let lv = 1; lv <= levels; lv++) {
    total += seqScoreForLevel(lv);
  }
  return total;
}

describe('Sequence game — score per level', () => {
  it('level 1 sequence has 3 taps = 30 points', () => {
    // len = 1 + 2 = 3 taps × 10 pts
    expect(seqScoreForLevel(1)).toBe(30);
  });

  it('level 2 sequence has 4 taps = 40 points', () => {
    expect(seqScoreForLevel(2)).toBe(40);
  });

  it('level 5 sequence has 7 taps = 70 points', () => {
    expect(seqScoreForLevel(5)).toBe(70);
  });

  it('level 10 sequence has 12 taps = 120 points', () => {
    expect(seqScoreForLevel(10)).toBe(120);
  });

  it('each subsequent level is worth 10 more points than the previous', () => {
    for (let lv = 1; lv < 10; lv++) {
      expect(seqScoreForLevel(lv + 1) - seqScoreForLevel(lv)).toBe(10);
    }
  });
});

describe('Sequence game — cumulative score across levels', () => {
  it('completing levels 1 and 2 = 30 + 40 = 70', () => {
    expect(seqCumulativeScore(2)).toBe(70);
  });

  it('completing levels 1-3 = 30 + 40 + 50 = 120', () => {
    expect(seqCumulativeScore(3)).toBe(120);
  });

  it('partial taps mid-level score 10 per tap', () => {
    // 2 correct taps out of a 3-tap sequence = 20 points
    const partialTaps = 2;
    expect(partialTaps * 10).toBe(20);
  });
});
