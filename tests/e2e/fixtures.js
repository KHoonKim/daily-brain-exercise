import { test as base } from '@playwright/test';

// Extend Playwright test with AIT mock setup
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock window.AIT before each page load
    await page.addInitScript(() => {
      window.AIT = {
        isReady: true,
        getUser: () => Promise.resolve({ userHash: 'test-user-e2e', userName: '테스트유저' }),
        getUserHash: () => Promise.resolve('test-user-e2e'),
        getXP: () => 0,
        loadBannerAd: () => Promise.resolve(),
        showAd: () => Promise.resolve(true),
        preloadAd: () => Promise.resolve(),
        logEvent: () => {},
        addPoints: () => Promise.resolve(),
        shareScore: () => Promise.resolve(),
        getTickets: () => ({ count: 3, day: new Date().toISOString().split('T')[0] }),
        haptics: () => {},
        checkPromoFirstLogin: () => Promise.resolve(false),
        checkPromoFirstWorkout: () => Promise.resolve(false),
      };
      // Also mock granite bridge
      window.__granite__ = null;
      window.__ait__ = null;
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
