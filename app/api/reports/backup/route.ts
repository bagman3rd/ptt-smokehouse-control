import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 'api:backup', 10, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;

  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;

  const [proteins, scenarios, days, months, cookPlans, eodLogs, savedReports, reportRuns, auditLogs, smokers, learningRecommendations] = await Promise.all([
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
    prisma.learningRecommendation.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } })
  ]);

  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({
    app: 'PTT Smokehouse Control',
    build: '3.7.0',
    restaurant,
    exportedAt,
    counts: { proteins: proteins.length, scenarios: scenarios.length, cookPlans: cookPlans.length, eodLogs: eodLogs.length, savedReports: savedReports.length, reportRuns: reportRuns.length, smokers: smokers.length, learningRecommendations: learningRecommendations.length },
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
    learningRecommendations
  }, null, 2);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="smokehouse-control-backup-${exportedAt.slice(0,10)}.json"`
    }
  });
}
