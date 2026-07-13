import { test, expect, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const adminPassword = process.env.ADMIN_PASSWORD || 'ci-admin-password';

async function login(request: APIRequestContext) {
  const response = await request.post('/api/login', {
    form: { username: 'admin', password: adminPassword, otp: process.env.CI_ADMIN_OTP || '' },
    maxRedirects: 0
  });
  expect([302, 303, 307, 308]).toContain(response.status());
}

test.afterAll(async () => prisma.$disconnect());

test('Quick EOD upsert satisfies the tenant guard in next dev', async ({ request }) => {
  await login(request);
  const restaurant = await prisma.restaurant.findFirstOrThrow({ where: { slug: 'pigeon-toed-tavern' } });
  const proteins = await prisma.protein.findMany({ where: { restaurantId: restaurant.id, active: true } });
  const serviceDate = '2032-07-13';
  const response = await request.post('/api/end-of-day', {
    data: {
      mode: 'QUICK', serviceDate, status: 'COMPLETE', totalSales: 0, bbqSales: 0, notes: '', lockLog: false,
      proteins: proteins.map((protein) => ({
        proteinId: protein.id,
        sealedUnopenedUnits: protein.name.toLowerCase().includes('pork') ? 3 : 0,
        openedMeatLb: 0
      }))
    }
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  expect(body.ok).toBe(true);
  const saved = await prisma.endOfDayLog.findUniqueOrThrow({
    where: { restaurantId_serviceDate: { restaurantId: restaurant.id, serviceDate: new Date(`${serviceDate}T00:00:00.000Z`) } },
    include: { proteinLogs: true }
  });
  expect(saved.proteinLogs.length).toBe(proteins.length);
});

test('rapid sequential cook-plan requests do not intermittently return 403', async ({ request }) => {
  await login(request);
  const serviceDate = '2032-07-14';
  for (let i = 0; i < 12; i += 1) {
    const response = await request.post('/api/cook-plan', {
      data: { serviceDate, scenarioId: '', eventMultiplier: 1, dayPatternKey: '' }
    });
    const body = await response.json();
    expect(response.status(), `attempt ${i + 1}: ${JSON.stringify(body)}; denial=${response.headers()['x-auth-denial'] || ''}`).toBe(200);
    expect(body.ok).toBe(true);
  }
});
