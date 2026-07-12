import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD || 'ci-admin-password-6-1-0');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('login and core kitchen pages render', async ({ page }) => {
  await login(page);
  for (const route of ['/today', '/cook-plan', '/end-of-day', '/admin/smokers', '/admin/smokers/schedule']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('smoker form exposes coded operational choices with friendly labels', async ({ page }) => {
  await login(page);
  await page.goto('/admin/smokers');
  const cookWindow = page.locator('select[name="cookWindow"]').first();
  await expect(cookWindow).toBeVisible();
  await expect(cookWindow.locator('option[value="OVERNIGHT_ONLY"]')).toHaveText('Overnight only');
  await expect(cookWindow.locator('option[value="BACKUP_OVERFLOW"]')).toHaveText('Backup / overflow only');
  await expect(cookWindow.locator('option[value="INACTIVE"]')).toHaveText('Not currently active');
  const location = page.locator('select[name="location"]').first();
  await expect(location.locator('option[value="INDOOR_HOOD"]')).toHaveText('Indoors under hood');
});

test('tenant-owned admin route rejects anonymous access', async ({ page }) => {
  await page.goto('/admin/smokers');
  await expect(page).toHaveURL(/\/login/);
});
