import { test, expect, type APIResponse, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adminPassword = process.env.ADMIN_PASSWORD || 'ci-admin-password';
const serviceDateText = '2031-08-18';
const serviceDate = new Date(`${serviceDateText}T00:00:00.000Z`);

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function body(response: APIResponse) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error(`Expected JSON, got ${response.status()}: ${text}`); }
}

test.afterAll(async () => prisma.$disconnect());

test('Quick EOD supports draft, revision, completion, lock, and rejects post-lock edits', async ({ page }) => {
  const restaurant = await prisma.restaurant.findFirstOrThrow({ where: { slug: 'pigeon-toed-tavern' } });
  const proteins = await prisma.protein.findMany({ where: { restaurantId: restaurant.id, active: true }, orderBy: { name: 'asc' } });
  expect(proteins.length).toBeGreaterThan(0);

  const old = await prisma.endOfDayLog.findUnique({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate } }
  });
  if (old) {
    await prisma.endOfDayProteinLog.deleteMany({ where: { restaurantId: restaurant.id, endOfDayLogId: old.id } });
    await prisma.endOfDayLog.delete({ where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate } } });
  }

  await login(page);
  const endpoint = '/api/end-of-day';
  const rows = proteins.map((protein, index) => ({
    proteinId: protein.id,
    sealedUnopenedUnits: index + 1,
    openedMeatLb: index + 0.5
  }));

  const draftResponse = await page.request.post(endpoint, {
    data: { mode: 'QUICK', serviceDate: serviceDateText, status: 'DRAFT', proteins: rows }
  });
  expect(draftResponse.status(), JSON.stringify(await body(draftResponse))).toBe(200);

  const revisedRows = rows.map((row) => ({ ...row, sealedUnopenedUnits: row.sealedUnopenedUnits + 2 }));
  const completeResponse = await page.request.post(endpoint, {
    data: { mode: 'QUICK', serviceDate: serviceDateText, status: 'COMPLETE', proteins: revisedRows }
  });
  expect(completeResponse.status(), JSON.stringify(await body(completeResponse))).toBe(200);

  const complete = await prisma.endOfDayLog.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate } },
    include: { proteinLogs: true }
  });
  expect(complete.status).toBe('COMPLETE');
  expect(complete.proteinLogs).toHaveLength(proteins.length);
  expect(new Set(complete.proteinLogs.map((row) => row.proteinId)).size).toBe(proteins.length);

  const lockResponse = await page.request.post(endpoint, {
    data: { mode: 'QUICK', serviceDate: serviceDateText, status: 'LOCKED', lockLog: true, proteins: revisedRows }
  });
  expect(lockResponse.status(), JSON.stringify(await body(lockResponse))).toBe(200);

  const locked = await prisma.endOfDayLog.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate } },
    include: { proteinLogs: true }
  });
  expect(locked.status).toBe('LOCKED');
  expect(locked.lockedAt).not.toBeNull();
  expect(locked.proteinLogs).toHaveLength(proteins.length);

  const rejectedResponse = await page.request.post(endpoint, {
    data: { mode: 'QUICK', serviceDate: serviceDateText, status: 'COMPLETE', proteins: rows }
  });
  expect(rejectedResponse.status()).toBe(400);
  expect((await body(rejectedResponse)).message).toMatch(/locked and cannot be edited/i);

  const afterRejectedEdit = await prisma.endOfDayLog.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate } },
    include: { proteinLogs: true }
  });
  expect(afterRejectedEdit.status).toBe('LOCKED');
  expect(afterRejectedEdit.proteinLogs).toHaveLength(proteins.length);
});
