import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = process.env.ADMIN_PASSWORD || 'ci-admin-password-6-2-0';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function resetOperationalData() {
  const restaurant = await prisma.restaurant.findFirst({ where: { slug: 'pigeon-toed-tavern' } });
  if (!restaurant) throw new Error('CI seed restaurant is missing.');
  await prisma.auditLog.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.endOfDayProteinLog.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.endOfDayLog.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.cookPlanItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.cookPlan.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.smoker.deleteMany({ where: { restaurantId: restaurant.id } });
  return restaurant;
}

test.afterAll(async () => prisma.$disconnect());

test('complete kitchen workflow: smokers, plan, override, EOD, leftover credit, audit, tenant boundary', async ({ page, browser }) => {
  const restaurant = await resetOperationalData();
  await login(page);

  // Configure dedicated overnight and same-day equipment through the actual UI.
  await page.goto('/admin/smokers');
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add smoker' }) });
  await add.getByLabel('Smoker Brand').fill('CI Overnight Smoker');
  await add.getByLabel('Location').selectOption('OUTDOOR');
  await add.getByLabel('Cook window').selectOption('OVERNIGHT_ONLY');
  await add.getByLabel('Briskets per cook').fill('200');
  await add.getByLabel('Pork butts per cook').fill('200');
  await add.getByLabel(/Rib racks per cook/).fill('0');
  await add.getByLabel(/Chicken breasts per cook/).fill('0');
  await add.getByRole('button', { name: 'Add smoker' }).click();
  await expect(page.getByDisplayValue('CI Overnight Smoker')).toBeVisible();

  await page.goto('/admin/smokers');
  const add2 = page.locator('form').filter({ has: page.getByRole('button', { name: 'Add smoker' }) });
  await add2.getByLabel('Smoker Brand').fill('CI Same-Day Smoker');
  await add2.getByLabel('Location').selectOption('INDOOR_HOOD');
  await add2.getByLabel('Cook window').selectOption('SAME_DAY_ONLY');
  await add2.getByLabel('Briskets per cook').fill('0');
  await add2.getByLabel('Pork butts per cook').fill('0');
  await add2.getByLabel(/Rib racks per cook/).fill('500');
  await add2.getByLabel(/Chicken breasts per cook/).fill('500');
  await add2.getByRole('button', { name: 'Add smoker' }).click();
  await expect(page.getByDisplayValue('CI Same-Day Smoker')).toBeVisible();

  const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  await page.goto('/cook-plan');
  await page.getByLabel('Load Date').fill(tomorrow);
  await page.getByLabel('Event Multiplier').fill('1');
  await page.getByRole('button', { name: 'Generate Plan' }).click();
  await expect(page).toHaveURL(/\/cook-plan/);
  await expect(page.getByText('Brisket', { exact: true }).first()).toBeVisible();

  // Override one recommendation and approve it.
  const brisketCard = page.locator('div.rounded-2xl').filter({ has: page.getByText('Brisket', { exact: true }) }).first();
  const approved = brisketCard.locator('input[name^="approved-"]');
  const original = Number(await approved.inputValue());
  await approved.fill(String(original + 1));
  await brisketCard.locator('input[name^="reason-"]').fill('CI manager verification override');
  await page.getByRole('button', { name: 'Approve Cook Plan' }).click();
  await expect(page.getByText('APPROVED')).toBeVisible();

  // Submit a complete EOD record with explicit leftovers.
  await page.goto(`/end-of-day?serviceDate=${tomorrow}`);
  await page.getByLabel('EOD Status').selectOption('COMPLETE');
  const proteinCards = page.locator('section').filter({ hasText: 'Protein Results' }).locator('div.rounded-2xl');
  const count = await proteinCards.count();
  for (let i = 0; i < count; i++) {
    const card = proteinCards.nth(i);
    const cooked = card.locator('input[name^="cookedUnits-"]');
    const leftover = card.locator('input[name^="usableLeftoverUnits-"]');
    if (await cooked.count()) {
      await cooked.fill('10');
      await leftover.fill(i === 0 ? '2' : '0');
    }
  }
  await page.getByRole('button', { name: 'Save End-of-Day Log' }).click();
  await expect(page.getByText(/Saved COMPLETE end-of-day log|COMPLETE/).first()).toBeVisible();

  // Generate the following plan and prove the prior EOD credit is present.
  const nextDay = new Date(new Date(`${tomorrow}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
  await page.goto('/cook-plan');
  await page.getByLabel('Load Date').fill(nextDay);
  await page.getByRole('button', { name: 'Generate Plan' }).click();
  await expect(page.getByText(/Prior EOD leftover credit/).first()).toBeVisible();
  await expect(page.getByText(/2/).first()).toBeVisible();

  // Database proof for override, EOD and audit trail.
  const approvedPlan = await prisma.cookPlan.findFirst({ where: { restaurantId: restaurant.id, status: 'APPROVED' }, include: { items: { include: { protein: true } } } });
  expect(approvedPlan?.items.some(i => i.protein.code === 'BRISKET' && i.overrideReason === 'CI manager verification override')).toBeTruthy();
  const eod = await prisma.endOfDayLog.findFirst({ where: { restaurantId: restaurant.id, status: 'COMPLETE' }, include: { proteinLogs: true } });
  expect(eod?.proteinLogs.some(log => log.usableLeftoverUnits === 2)).toBeTruthy();
  expect(await prisma.auditLog.count({ where: { restaurantId: restaurant.id } })).toBeGreaterThan(0);

  // Anonymous browser context cannot access tenant-owned operations.
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto('/admin/smokers');
  await expect(anonymousPage).toHaveURL(/\/login/);
  await anonymous.close();
});

test('coded controls render on desktop and mobile projects', async ({ page }) => {
  await login(page);
  await page.goto('/admin/smokers');
  await expect(page.locator('select[name="cookWindow"]').first().locator('option[value="OVERNIGHT_ONLY"]')).toHaveText('Overnight only');
  await expect(page.locator('select[name="cookWindow"]').first().locator('option[value="INACTIVE"]')).toHaveText('Not currently active');
});
