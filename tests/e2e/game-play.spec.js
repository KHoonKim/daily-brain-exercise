import { test, expect } from './fixtures.js';

// Helper: navigate past intro to home screen
async function goToHome(page) {
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.locator('#introStartBtn').click();
  await page.waitForTimeout(600);
  await expect(page.locator('#homeScreen')).toBeVisible({ timeout: 3000 });
}

// Helper: launch the math game from home (free training section)
async function launchMathGame(page) {
  // Call startGame directly to bypass game-card scroll/click issues
  await page.evaluate(() => startGame('math', false, 'free'));
  await expect(page.locator('#game-math')).toBeVisible({ timeout: 3000 });
}

test.describe('Math Game (암산 챌린지)', () => {
  test('math game screen shows correct UI elements', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Timer displayed
    await expect(page.locator('#math-timer')).toBeVisible();
    // Score displayed
    await expect(page.locator('#math-score')).toBeVisible();
    await expect(page.locator('#math-score')).toContainText('0점');
    // Problem elements visible
    await expect(page.locator('#math-a')).toBeVisible();
    await expect(page.locator('#math-op')).toBeVisible();
    await expect(page.locator('#math-b')).toBeVisible();
    await expect(page.locator('#math-ans')).toBeVisible();
    // Numpad present: digits 1-9, 0, delete, submit
    const submitBtn = page.locator('#game-math .nbtn.go');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('확인');
    const delBtn = page.locator('#game-math .nbtn.del');
    await expect(delBtn).toBeVisible();
    // Heart system
    await expect(page.locator('#math-hearts')).toBeVisible();
  });

  test('numpad input updates the answer display', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Press digit 4 via JS call (mirrors onclick="mathPress(4)")
    await page.evaluate(() => mathPress(4));
    await expect(page.locator('#math-ans')).toHaveText('4');

    await page.evaluate(() => mathPress(2));
    await expect(page.locator('#math-ans')).toHaveText('42');

    // Delete one digit
    await page.evaluate(() => mathDel());
    await expect(page.locator('#math-ans')).toHaveText('4');
  });

  test('clicking numpad buttons updates answer display', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Click digit buttons directly in DOM
    await page.locator('#game-math .nbtn').filter({ hasText: '7' }).click();
    await expect(page.locator('#math-ans')).toHaveText('7');

    await page.locator('#game-math .nbtn.del').click();
    await expect(page.locator('#math-ans')).toHaveText('?');
  });

  test('submitting the correct answer increments score', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Read the current correct answer and enter it
    const answer = await page.evaluate(() => mathAnswer);
    const ansStr = String(answer);
    for (const digit of ansStr) {
      await page.evaluate((d) => mathPress(parseInt(d)), digit);
    }
    await page.evaluate(() => mathSubmit());
    await page.waitForTimeout(300);

    // Score should be > 0 now (first correct = +10 points)
    const scoreText = await page.locator('#math-score').textContent();
    const score = parseInt(scoreText);
    expect(score).toBeGreaterThan(0);
  });

  test('game ends and shows result overlay when timer runs out', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Fast-forward: run mathTick until timer hits 0, bypassing real time
    // mathTick decrements mathTime and calls showResult when <= 0
    // We set mathTime to 1 then call mathTick once to trigger end
    await page.evaluate(() => {
      // Stop the real interval to avoid double-fire
      clearInterval(curTimer);
      mathTime = 1;
      mathTick();
    });

    // timeExtendOverlay may appear first (timer-end flow for isTimer games)
    // Dismiss it by clicking quit, then the result overlay appears
    const timeExtendOverlay = page.locator('#timeExtendOverlay');
    const resultOverlay = page.locator('#overlay');

    try {
      await timeExtendOverlay.waitFor({ state: 'visible', timeout: 2000 });
      // Click "그냥 결과 보기" (quit time extend) to proceed to results
      await page.evaluate(() => timeExtendQuit());
    } catch {
      // timeExtendOverlay didn't appear — result shown directly
    }

    // Result overlay must be visible
    await expect(resultOverlay).toBeVisible({ timeout: 3000 });
    // Title contains game name
    await expect(page.locator('#r-title')).toContainText('암산 챌린지');
    // Score element present
    await expect(page.locator('#r-score')).toBeVisible();
    // Home button present
    await expect(page.locator('#overlay').getByText('홈으로')).toBeVisible();
  });

  test('result screen shows retry button', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    await page.evaluate(() => {
      clearInterval(curTimer);
      mathTime = 1;
      mathTick();
    });

    const timeExtendOverlay = page.locator('#timeExtendOverlay');
    try {
      await timeExtendOverlay.waitFor({ state: 'visible', timeout: 2000 });
      await page.evaluate(() => timeExtendQuit());
    } catch {
      // no time extend shown
    }

    await expect(page.locator('#overlay')).toBeVisible({ timeout: 3000 });
    // Main action button (replay / retry)
    await expect(page.locator('#r-main-btn')).toBeVisible();
  });

  test('result screen home button navigates back to home', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    await page.evaluate(() => {
      clearInterval(curTimer);
      mathTime = 1;
      mathTick();
    });

    const timeExtendOverlay = page.locator('#timeExtendOverlay');
    try {
      await timeExtendOverlay.waitFor({ state: 'visible', timeout: 2000 });
      await page.evaluate(() => timeExtendQuit());
    } catch {
      // no time extend shown
    }

    await expect(page.locator('#overlay')).toBeVisible({ timeout: 3000 });

    // Click "홈으로"
    await page.evaluate(() => goHomeFromResult());
    await page.waitForTimeout(400);

    // Home screen should be active again
    await expect(page.locator('#homeScreen')).toBeVisible({ timeout: 3000 });
  });

  test('full math game session: play several answers then end game', async ({ page }) => {
    await goToHome(page);
    await launchMathGame(page);

    // Play 3 correct answers
    for (let i = 0; i < 3; i++) {
      const answer = await page.evaluate(() => mathAnswer);
      const ansStr = String(answer);
      for (const digit of ansStr) {
        await page.evaluate((d) => mathPress(parseInt(d)), digit);
      }
      await page.evaluate(() => mathSubmit());
      await page.waitForTimeout(250);
    }

    // Verify score increased (3 correct answers = at least 30 points)
    const scoreText = await page.locator('#math-score').textContent();
    const score = parseInt(scoreText);
    expect(score).toBeGreaterThanOrEqual(30);

    // End the game
    await page.evaluate(() => {
      clearInterval(curTimer);
      mathTime = 1;
      mathTick();
    });

    const timeExtendOverlay = page.locator('#timeExtendOverlay');
    try {
      await timeExtendOverlay.waitFor({ state: 'visible', timeout: 2000 });
      await page.evaluate(() => timeExtendQuit());
    } catch {
      // no time extend shown
    }

    await expect(page.locator('#overlay')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#r-title')).toContainText('암산 챌린지');

    // Result score should match what we earned
    const resultScore = await page.locator('#r-score').textContent();
    expect(parseInt(resultScore)).toBeGreaterThanOrEqual(30);
  });
});
