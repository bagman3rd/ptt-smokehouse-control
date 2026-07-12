import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'api:backup', 10, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;

  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
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
    prisma.auditLog.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' }, take: 2000 }),
    prisma.smoker.findMany({ where: { restaurantId }, orderBy: { name: 'asc' } }),
    prisma.learningRecommendation.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }),
    prisma.systemCheck.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }).catch(() => [])
  ]);

  const exportedAt = new Date().toISOString();
  await prisma.reportRun.create({ data: { restaurantId, source: 'backup', metric: 'tenantJson', groupBy: 'dataset', protein: 'all', start: exportedAt.slice(0, 10), end: exportedAt.slice(0, 10), dataset: 'backup-json', rowCount: proteins.length + scenarios.length + cookPlans.length + eodLogs.length + savedReports.length + reportRuns.length + smokers.length + learningRecommendations.length, createdBy: user.name } }).catch(() => null);
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'BACKUP_EXPORTED', entity: 'TenantBackup', afterJson: { exportedAt, counts: { proteins: proteins.length, scenarios: scenarios.length, cookPlans: cookPlans.length, eodLogs: eodLogs.length, savedReports: savedReports.length, reportRuns: reportRuns.length, smokers: smokers.length, learningRecommendations: learningRecommendations.length, systemChecks: systemChecks.length } } });

  const body = JSON.stringify({
    app: 'PTT Smokehouse Control',
    build: '4.3.2',
    restaurant,
    exportedAt,
    counts: { proteins: proteins.length, scenarios: scenarios.length, cookPlans: cookPlans.length, eodLogs: eodLogs.length, savedReports: savedReports.length, reportRuns: reportRuns.length, smokers: smokers.length, learningRecommendations: learningRecommendations.length, systemChecks: systemChecks.length },
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
  }, null, 2);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="smokehouse-control-backup-${exportedAt.slice(0,10)}.json"`
    }
  });
}
