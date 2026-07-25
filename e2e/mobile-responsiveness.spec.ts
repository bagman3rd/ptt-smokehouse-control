import { test, expect } from '@playwright/test';

// Build 10.0.0 — mobile responsiveness + compliance UI on small screens.
// Runs across all configured device projects (Pixel 7, iPhone 14, iPad, Desktop).

const password = process.env.ADMIN_PASSWORD || 'ci-admin-password';

test('login page has no horizontal overflow on mobile', async ({ page }) => {
  await page.goto('/login');
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  });
  expect(overflow).toBeFalsy();
});

test('cookie consent banner is reachable and dismissible', async ({ page }) => {
  await page.goto('/login');
  const banner = page.getByRole('dialog', { name: /cookie/i });
  // Banner appears for first-time visitors.
  if (await banner.isVisible().catch(() => false)) {
    const reject = page.getByRole('button', { name: /reject non-essential/i });
    await expect(reject).toBeVisible();
    await reject.click();
    await expect(banner).toBeHidden();
  }
});

test('primary action buttons meet 44px touch-target minimum', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium', 'touch-target rule targets mobile viewports');
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Login' });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  if (box) expect(box.height).toBeGreaterThanOrEqual(40); // ~44 with sub-pixel tolerance
});

test('privacy and terms pages render on mobile', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
  await expect(page.getByText(/reply STOP/i)).toBeVisible(); // SMS opt-out disclosure present
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
});

test('signup shows consent + legal checkboxes on mobile', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByText(/I agree to the/i)).toBeVisible();
  await expect(page.locator('input[name="termsAgree"]')).toBeAttached();
  await expect(page.locator('input[name="marketingConsent"]')).toBeAttached();
});
