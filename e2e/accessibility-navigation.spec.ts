import { test, expect } from '@playwright/test';
const password=process.env.ADMIN_PASSWORD || 'ci-admin-password';
test('keyboard user can open native dropdowns and reach Today', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button',{name:'Login'}).click();
  await expect(page).toHaveURL(/\/today/);
  const operations=page.getByTestId('nav-menu-button-operations');
  await operations.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('nav-menu-panel-operations')).toBeVisible();
  await page.getByTestId('nav-link-end-of-day').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/end-of-day/);
});
