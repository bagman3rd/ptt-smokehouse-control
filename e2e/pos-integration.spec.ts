import { test, expect } from '@playwright/test';

test('POS page exposes every live-integration action', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email|username/i).fill(process.env.E2E_ADMIN_EMAIL || 'admin@example.com');
  await page.getByLabel(/password/i).fill(process.env.E2E_ADMIN_PASSWORD || 'ChangeMe123!');
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await page.goto('/admin/restaurants/pos');
  await expect(page.getByRole('heading', { name: 'POS Integrations' })).toBeVisible();
  for (const provider of ['square','toast','clover','lightspeed','touchbistro','spoton','revel','oracle_simphony','ncr_aloha','par_brink']) {
    await expect(page.getByTestId(`pos-card-${provider}`)).toBeVisible();
  }
  const squareCard = page.getByTestId('pos-card-square');
  await expect(squareCard.getByRole('link', { name: 'Connect Square' }).or(squareCard.getByRole('button', { name: 'Sync Now' }))).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sync History' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Item-to-Protein Mapping' })).toBeVisible();
});
