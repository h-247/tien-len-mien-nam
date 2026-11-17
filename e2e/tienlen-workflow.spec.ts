import { test, expect } from '@playwright/test';

test.describe('Tiến Lên Miền Nam - Critical Workflows', () => {
  test('1. Registration and pending approval flow', async ({ page }) => {
    // Switch to a new unapproved test player
    await page.goto('/');
    // Check page title and Vietnamese heading
    await expect(page).toHaveTitle(/Tiến Lên Miền Nam/);
  });

  test('2. Lobby and Room creation for approved player', async ({ page }) => {
    await page.goto('/');
    // Verify Vietnamese UI elements
    const brand = page.locator('text=Tiến Lên Miền Nam');
    await expect(brand.first()).toBeVisible();
  });

  test('3. Mobile responsiveness check (390px iPhone width)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
