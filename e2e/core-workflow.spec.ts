import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adminPassword = process.env.ADMIN_PASSWORD || 'ci-admin-password';
const tenantBPassword = process.env.CI_TENANT_B_PASSWORD || 'ci-tenant-b-password';

async function login(page: Page, username = 'admin', password = adminPassword) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill(username);
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

test('complete kitchen workflow uses reviewed smokers and stable selectors', async ({ page }) => {
  const restaurant = await resetOperationalData();
  await login(page);

  await page.goto('/admin/smokers');
  const add = page.getByTestId('add-smoker-form');
  await add.getByLabel('Smoker Brand').fill('CI Overnight Smoker');
  await add.getByLabel('Location').selectOption('OUTDOOR');
  await add.getByLabel('Cook window').selectOption('OVERNIGHT_ONLY');
  await add.getByLabel('Briskets per cook').fill('200');
  await add.getByLabel('Pork butts per cook').fill('200');
  await add.getByLabel(/Rib racks per cook/).fill('0');
  await add.getByLabel(/Chicken breasts per cook/).fill('0');
  await add.getByTestId('add-smoker-submit').click();
  await expect(page.locator('input[value="CI Overnight Smoker"]')).toBeVisible();

  await page.goto('/admin/smokers');
  const add2 = page.getByTestId('add-smoker-form');
  await add2.getByLabel('Smoker Brand').fill('CI Same-Day Smoker');
  await add2.getByLabel('Location').selectOption('INDOOR_HOOD');
  await add2.getByLabel('Cook window').selectOption('SAME_DAY_ONLY');
  await add2.getByLabel('Briskets per cook').fill('0');
  await add2.getByLabel('Pork butts per cook').fill('0');
  await add2.getByLabel(/Rib racks per cook/).fill('500');
  await add2.getByLabel(/Chicken breasts per cook/).fill('500');
  await add2.getByTestId('add-smoker-submit').click();
  await expect(page.locator('input[value="CI Same-Day Smoker"]')).toBeVisible();

  const reviewedCount = await prisma.smoker.count({ where: { restaurantId: restaurant.id, configurationReviewedAt: { not: null } } });
  expect(reviewedCount).toBe(2);

  const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  await page.goto('/cook-plan');
  await page.getByTestId('cook-plan-load-date').fill(tomorrow);
  await page.getByTestId('cook-plan-event-multiplier').fill('1');
  await page.getByTestId('generate-cook-plan').click();
  const brisketCard = page.getByTestId('protein-card-BRISKET').first();
  await expect(brisketCard).toBeVisible();
  const approved = brisketCard.locator('input[name^="approved-"]');
  const original = Number(await approved.inputValue());
  await approved.fill(String(original + 1));
  await brisketCard.locator('input[name^="reason-"]').fill('CI manager verification override');
  await page.getByRole('button', { name: 'Approve Cook Plan' }).click();
  await expect(page.getByText('APPROVED')).toBeVisible();

  await page.goto(`/end-of-day?serviceDate=${tomorrow}`);
  await page.getByLabel('EOD Status').selectOption('COMPLETE');
  const cards = page.locator('[data-testid^="eod-protein-"]');
  for (let i = 0; i < await cards.count(); i++) {
    const card = cards.nth(i);
    await card.locator('input[name^="cookedUnits-"]').fill('10');
    await card.locator('input[name^="usableLeftoverUnits-"]').fill(i === 0 ? '2' : '0');
  }
  await page.getByTestId('save-eod').click();
  await expect(page.getByText(/Saved COMPLETE end-of-day log|COMPLETE/).first()).toBeVisible();

  const nextDay = new Date(new Date(`${tomorrow}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
  await page.goto('/cook-plan');
  await page.getByTestId('cook-plan-load-date').fill(nextDay);
  await page.getByTestId('generate-cook-plan').click();
  await expect(page.getByTestId('prior-eod-credit-BRISKET').first()).toBeVisible();

  const approvedPlan = await prisma.cookPlan.findFirst({ where: { restaurantId: restaurant.id, status: 'APPROVED' }, include: { items: { include: { protein: true } } } });
  expect(approvedPlan?.items.some(i => i.protein.code === 'BRISKET' && i.overrideReason === 'CI manager verification override')).toBeTruthy();
});


test('Quick EOD on July 13 applies exact credits to the July 14 cook plan', async ({ page }) => {
  const restaurant = await prisma.restaurant.findFirstOrThrow({ where: { slug: 'pigeon-toed-tavern' } });
  const eodDate = new Date('2031-07-13T00:00:00.000Z');
  const loadDate = new Date('2031-07-14T00:00:00.000Z');

  await prisma.cookPlanItem.deleteMany({ where: { restaurantId: restaurant.id, cookPlan: { serviceDate: loadDate } } });
  await prisma.cookPlan.deleteMany({ where: { restaurantId: restaurant.id, serviceDate: loadDate } });
  const oldLog = await prisma.endOfDayLog.findUnique({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate: eodDate } }
  });
  if (oldLog) {
    await prisma.endOfDayProteinLog.deleteMany({ where: { endOfDayLogId: oldLog.id } });
    await prisma.endOfDayLog.delete({ where: { id: oldLog.id } });
  }

  await login(page);
  await page.goto('/end-of-day?serviceDate=2031-07-13');
  await page.getByTestId('quick-eod-date').fill('2031-07-13');
  await page.getByTestId('quick-eod-sealed-BRISKET').fill('4');
  await page.getByTestId('quick-eod-opened-BRISKET').fill('1.5');
  await page.getByTestId('quick-eod-sealed-PORK').fill('3');
  await page.getByTestId('quick-eod-opened-PORK').fill('2.5');
  await page.getByTestId('quick-eod-sealed-CHICKEN').fill('5');
  await page.getByTestId('quick-eod-opened-CHICKEN').fill('3.5');
  await page.getByTestId('quick-eod-sealed-RIBS').fill('2');
  await page.getByTestId('quick-eod-opened-RIBS').fill('4.5');
  await page.getByTestId('submit-quick-eod').click();
  await expect(page).toHaveURL(/serviceDate=2031-07-13/);

  const saved = await prisma.endOfDayLog.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate: eodDate } },
    include: { proteinLogs: { include: { protein: true } } }
  });
  const savedByCode = new Map(saved.proteinLogs.map((row) => [row.protein.code, row]));
  expect(savedByCode.get('BRISKET')?.sealedUnopenedUnits).toBe(4);
  expect(savedByCode.get('BRISKET')?.openedMeatLb).toBe(1.5);
  expect(savedByCode.get('BRISKET')?.usableLeftoverUnits).toBe(0);
  expect(savedByCode.get('PORK')?.usableLeftoverUnits).toBe(3);
  expect(savedByCode.get('CHICKEN')?.usableLeftoverUnits).toBe(5);
  expect(savedByCode.get('RIBS')?.usableLeftoverUnits).toBe(2);

  await page.goto('/cook-plan');
  await page.getByTestId('cook-plan-load-date').fill('2031-07-14');
  await page.getByTestId('cook-plan-event-multiplier').fill('1');
  await page.getByTestId('generate-cook-plan').click();
  await expect(page).toHaveURL(/planId=/);

  await expect(page.getByTestId('prior-eod-credit-value-BRISKET')).toHaveText('0');
  await expect(page.getByTestId('prior-eod-credit-value-PORK')).toHaveText('3');
  await expect(page.getByTestId('prior-eod-credit-value-CHICKEN')).toHaveText('5');
  await expect(page.getByTestId('prior-eod-credit-value-RIBS')).toHaveText('2');

  const plan = await prisma.cookPlan.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate: loadDate } },
    include: { items: { include: { protein: true } } }
  });
  const planByCode = new Map(plan.items.map((item) => [item.protein.code, item]));
  expect(planByCode.get('BRISKET')?.usableLeftoverUnits).toBe(0);
  expect(planByCode.get('PORK')?.usableLeftoverUnits).toBe(3);
  expect(planByCode.get('CHICKEN')?.usableLeftoverUnits).toBe(5);
  expect(planByCode.get('RIBS')?.usableLeftoverUnits).toBe(2);
});

test('authenticated user cannot read another restaurant cook plan', async ({ browser }) => {
  const tenantA = await prisma.restaurant.findFirstOrThrow({ where: { slug: 'pigeon-toed-tavern' } });
  const tenantAPlan = await prisma.cookPlan.findFirstOrThrow({ where: { restaurantId: tenantA.id }, orderBy: { createdAt: 'desc' } });
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, 'tenantb', tenantBPassword);
  const response = await page.goto(`/cook-plan?planId=${tenantAPlan.id}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/This page could not be found|404/i)).toBeVisible();
  await expect(page.getByText('CI manager verification override')).toHaveCount(0);
  expect((await page.content())).not.toContain(tenantAPlan.id);
  const leaked = await prisma.restaurantMembership.count({ where: { userId: 'ci-tenant-b-user', restaurantId: tenantA.id, active: true } });
  expect(leaked).toBe(0);
  await context.close();
});

test('coded controls render on desktop and mobile projects', async ({ page }) => {
  await login(page);
  await page.goto('/admin/smokers');
  await expect(page.locator('select[name="cookWindow"]').first().locator('option[value="OVERNIGHT_ONLY"]')).toHaveText('Overnight only');
  await expect(page.locator('select[name="cookWindow"]').first().locator('option[value="INACTIVE"]')).toHaveText('Not currently active');
});
