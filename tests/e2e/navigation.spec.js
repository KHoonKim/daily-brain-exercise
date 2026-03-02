import { test, expect } from './fixtures.js';

// Helper to navigate past intro screen to home
async function goToHome(page) {
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.locator('#introStartBtn').click();
  await page.waitForTimeout(500);
  await expect(page.locator('#homeScreen')).toBeVisible({ timeout: 3000 });
}

test.describe('Navigation', () => {
  test('ticket shop can be opened', async ({ page }) => {
    await goToHome(page);

    // Click the ticket count badge to open ticket shop
    await page.locator('#ticketCount').click();
    await page.waitForTimeout(500);

    const ticketShop = page.locator('#ticketShop');
    await expect(ticketShop).toBeVisible({ timeout: 3000 });
  });

  test('ticket shop has back button that returns to home', async ({ page }) => {
    await goToHome(page);

    await page.locator('#ticketCount').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#ticketShop')).toBeVisible({ timeout: 3000 });

    // Click the back button (tds-nav__back)
    await page.locator('#ticketShop .tds-nav__back').click();
    await page.waitForTimeout(500);

    // Should return to home
    await expect(page.locator('#homeScreen')).toBeVisible({ timeout: 3000 });
  });

  test('game cards are present in free training section', async ({ page }) => {
    await goToHome(page);
    await page.waitForTimeout(1000);

    // Game grid should have items rendered
    const gameGrid = page.locator('#gameGrid');
    const gameItems = gameGrid.locator('.tds-list-row, .game-card, [onclick*="startGame"]');
    const count = await gameItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('mission list renders mission items', async ({ page }) => {
    await goToHome(page);
    await page.waitForTimeout(1000);

    const missionList = page.locator('#missionList');
    const missionItems = missionList.locator('.tds-list-row');
    const count = await missionItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('screens start hidden except introScreen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // homeScreen should not be active initially
    const homeScreen = page.locator('#homeScreen');
    await expect(homeScreen).not.toHaveClass(/active/, { timeout: 1000 });
  });

  test('intro screen disappears after clicking start', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.locator('#introStartBtn').click();
    await page.waitForTimeout(500);

    // Intro screen should no longer be the active/visible one
    const introScreen = page.locator('#introScreen');
    await expect(introScreen).not.toHaveClass(/active/, { timeout: 2000 });
  });
});
