import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || '';
  if (!secret || secret.length < 12) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized cron request. Set CRON_SECRET and send Authorization: Bearer <secret>.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const restaurantIdParam = url.searchParams.get('restaurantId') || undefined;
  const restaurants = await prisma.restaurant.findMany({
    where: restaurantIdParam ? { id: restaurantIdParam, active: true } : { active: true },
    orderBy: { name: 'asc' }
  });

  const exportedAt = new Date().toISOString();
  const backups = [];

  for (const restaurant of restaurants) {
    const restaurantId = restaurant.id;
    const [proteins, scenarios, days, months, cookPlans, eodLogs, savedReports, reportRuns, auditLogs, smokers, learningRecommendations, systemChecks] = await Promise.all([
      prisma.protein.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } }),
      prisma.forecastScenario.findMany({ where: { restaurantId }, orderBy: { annualSales: 'asc' } }),
      prisma.dayMultiplier.findMany({ where: { restaurantId }, orderBy: { dayOfWeek: 'asc' } }),
      prisma.monthMultiplier.findMany({ where: { restaurantId }, orderBy: { month: 'asc' } }),
      prisma.cookPlan.findMany({ where: { restaurantId }, orderBy: { serviceDate: 'asc' }, include: { scenario: true, items: { include: { protein: true } } } }),
      prisma.endOfDayLog.findMany({ where: { restaurantId }, orderBy: { serviceDate: 'asc' }, include: { proteinLogs: { include: { protein: true } } } }),
      prisma.savedReport.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }),
      prisma.reportRun.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' }, take: 1000 }),
      prisma.auditLog.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' }, take: 3000 }),
      prisma.smoker.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } }),
      prisma.learningRecommendation.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }),
      prisma.systemCheck.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }).catch(() => [])
    ]);

    const counts = {
      proteins: proteins.length,
      scenarios: scenarios.length,
      dayMultipliers: days.length,
      monthMultipliers: months.length,
      cookPlans: cookPlans.length,
      eodLogs: eodLogs.length,
      savedReports: savedReports.length,
      reportRuns: reportRuns.length,
      auditLogs: auditLogs.length,
      smokers: smokers.length,
      learningRecommendations: learningRecommendations.length,
      systemChecks: systemChecks.length
    };

    const payload = {
      app: 'PTT Smokehouse Control',
      build: '4.2.0',
      backupType: 'scheduled-weekly-tenant-export',
      restaurant,
      exportedAt,
      counts,
      proteins,
      scenarios,
      dayMultipliers: days,
      monthMultipliers: months,
      cookPlans,
      endOfDayLogs: eodLogs,
      savedReports,
      reportRuns,
      auditLogs,
      smokers,
      learningRecommendations,
      systemChecks
    };

    if (process.env.BACKUP_POST_URL) {
      const response = await fetch(process.env.BACKUP_POST_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        await prisma.systemCheck.create({
          data: {
            restaurantId,
            type: 'WEEKLY_BACKUP_EXPORT',
            status: 'FAIL',
            verifiedBy: 'Scheduled backup',
            notes: `BACKUP_POST_URL responded ${response.status}`
          }
        }).catch(() => null);
        backups.push({ restaurantId, restaurant: restaurant.name, ok: false, counts, postStatus: response.status });
        continue;
      }
    }

    await prisma.reportRun.create({
      data: {
        restaurantId,
        source: 'backup',
        metric: 'scheduledTenantJson',
        groupBy: 'dataset',
        protein: 'all',
        start: exportedAt.slice(0, 10),
        end: exportedAt.slice(0, 10),
        dataset: 'scheduled-backup-json',
        rowCount: Object.values(counts).reduce((sum, value) => sum + value, 0),
        createdBy: 'Scheduled backup'
      }
    }).catch(() => null);

    await prisma.systemCheck.create({
      data: {
        restaurantId,
        type: 'WEEKLY_BACKUP_EXPORT',
        status: 'PASS',
        verifiedBy: 'Scheduled backup',
        notes: `Scheduled backup captured at ${exportedAt}. Counts: ${JSON.stringify(counts)}`
      }
    }).catch(() => null);

    await prisma.auditLog.create({
      data: {
        restaurantId,
        actorName: 'Scheduled backup',
        action: 'SCHEDULED_BACKUP_EXPORTED',
        entity: 'TenantBackup',
        afterJson: JSON.stringify({ exportedAt, counts, posted: Boolean(process.env.BACKUP_POST_URL) })
      }
    }).catch(() => null);

    backups.push({ restaurantId, restaurant: restaurant.name, ok: true, counts, posted: Boolean(process.env.BACKUP_POST_URL) });
  }

  return NextResponse.json({ ok: true, exportedAt, backupCount: backups.length, backups });
}
