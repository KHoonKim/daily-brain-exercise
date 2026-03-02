import { test, expect } from './fixtures.js';

test.describe('Home Screen', () => {
  test('page loads without critical JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(1000);
    // Filter out AIT-related expected errors and network errors for external resources
    const criticalErrors = errors.filter(e =>
      !e.includes('AIT') &&
      !e.includes('__granite__') &&
      !e.includes('__ait__') &&
      !e.includes('Failed to load resource') &&
      !e.includes('ntfy') &&
      !e.includes('score') // ignore backend API errors in test env
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('intro screen is visible on first load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const introScreen = page.locator('#introScreen');
    await expect(introScreen).toBeVisible({ timeout: 3000 });
  });

  test('intro screen has start button', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    const startBtn = page.locator('#introStartBtn');
    await expect(startBtn).toBeVisible({ timeout: 3000 });
    await expect(startBtn).toHaveText('시작하기');
  });

  test('clicking start button shows home screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Click the start button
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    // Home screen should now be visible
    const homeScreen = page.locator('#homeScreen');
    await expect(homeScreen).toBeVisible({ timeout: 3000 });
  });

  test('home screen has title', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    // Check the page title
    await expect(page).toHaveTitle('매일매일 두뇌운동');
  });

  test('home screen has rank display', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    // Check for rank name element
    const rankEl = page.locator('#rankName');
    await expect(rankEl).toBeVisible({ timeout: 3000 });
  });

  test('home screen has XP display', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    const xpCur = page.locator('#xpCur');
    await expect(xpCur).toBeVisible({ timeout: 3000 });
    await expect(xpCur).toContainText('XP');
  });

  test('home screen has ticket count badge', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    const ticketCount = page.locator('#ticketCount');
    await expect(ticketCount).toBeVisible({ timeout: 3000 });
  });

  test('home screen has mission list section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(1000);

    // Mission list section header
    const missionSection = page.locator('.tds-list-header__title').first();
    await expect(missionSection).toBeVisible({ timeout: 3000 });
    await expect(missionSection).toContainText('오늘의 챌린지');
  });

  test('home screen has game grid (자유 훈련)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(1000);

    // Game grid should be populated
    const gameGrid = page.locator('#gameGrid');
    await expect(gameGrid).toBeVisible({ timeout: 3000 });
  });

  test('home screen has point progress section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    const pointProgress = page.locator('#pointProgress');
    await expect(pointProgress).toBeVisible({ timeout: 3000 });
  });
});
