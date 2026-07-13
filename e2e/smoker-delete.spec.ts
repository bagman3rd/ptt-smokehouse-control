import { test, expect, type Page } from '@playwright/test';

const password = process.env.ADMIN_PASSWORD || 'ci-admin-password';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/today/);
}

test('admin can cancel and confirm deleting a tenant-scoped smoker', async ({ page }) => {
  await login(page);
  await page.goto('/admin/smokers');

  const uniqueName = `Delete Test Smoker ${Date.now()}`;
  const addForm = page.getByTestId('add-smoker-form');
  await addForm.getByLabel('Smoker Brand').fill(uniqueName);
  await addForm.getByLabel('Location').selectOption({ index: 1 });
  await addForm.getByLabel('Cook window').selectOption({ index: 1 });
  await page.getByTestId('add-smoker-submit').click();
  await expect(page.locator(`input[name="name"][value="${uniqueName}"]`)).toBeVisible();

  const smokerForm = page.locator('form').filter({ has: page.locator(`input[name="name"][value="${uniqueName}"]`) });
  const deleteButton = smokerForm.getByRole('button', { name: 'Delete smoker' });

  page.once('dialog', async (dialog) => dialog.dismiss());
  await deleteButton.click();
  await expect(page.locator(`input[name="name"][value="${uniqueName}"]`)).toBeVisible();

  page.once('dialog', async (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(page.locator(`input[name="name"][value="${uniqueName}"]`)).toHaveCount(0);
});
