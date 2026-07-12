import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'api:tenant-export', 8, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const [memberships, users, proteins, scenarios, days, months, cookPlans, eodLogs, savedReports, reportRuns, auditLogs, smokers, learningRecommendations, systemChecks] = await Promise.all([
    prisma.restaurantMembership.findMany({ where: { restaurantId }, include: { user: true } }),
    prisma.user.findMany({ where: { memberships: { some: { restaurantId } } }, select: { id: true, name: true, username: true, email: true, active: true, createdAt: true, updatedAt: true } }),
    prisma.protein.findMany({ where: { restaurantId } }),
    prisma.forecastScenario.findMany({ where: { restaurantId } }),
    prisma.dayMultiplier.findMany({ where: { restaurantId } }),
    prisma.monthMultiplier.findMany({ where: { restaurantId } }),
    prisma.cookPlan.findMany({ where: { restaurantId }, include: { scenario: true, items: { include: { protein: true } } } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.savedReport.findMany({ where: { restaurantId } }),
    prisma.reportRun.findMany({ where: { restaurantId } }),
    prisma.auditLog.findMany({ where: { restaurantId }, orderBy: { createdAt: 'asc' } }),
    prisma.smoker.findMany({ where: { restaurantId } }),
    prisma.learningRecommendation.findMany({ where: { restaurantId } }),
    prisma.systemCheck.findMany({ where: { restaurantId } }).catch(() => [])
  ]);
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'EXPORT_TENANT_DATA', entity: 'Restaurant', entityId: restaurantId, afterJson: { counts: { users: users.length, cookPlans: cookPlans.length, eodLogs: eodLogs.length, smokers: smokers.length, learningRecommendations: learningRecommendations.length, systemChecks: systemChecks.length } } });
  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({ app: 'Smokehouse Control', build: '4.3.2', exportedAt, restaurant, memberships, users, proteins, scenarios, dayMultipliers: days, monthMultipliers: months, cookPlans, endOfDayLogs: eodLogs, savedReports, reportRuns, auditLogs, smokers, learningRecommendations, systemChecks }, null, 2);
  return new NextResponse(body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="tenant-export-${restaurant.slug || restaurant.id}-${exportedAt.slice(0,10)}.json"` } });
}
