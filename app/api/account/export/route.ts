// Build 11.0.1 — self-service data export (GDPR Article 20 portability).
// Returns a JSON dump of the current tenant's data as a downloadable file.

import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'api:data-export', 5, 60 * 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;

  const [
    proteins,
    scenarios,
    cookPlans,
    eodLogs,
    savedReports,
    smokers,
    members,
    subscriptions,
    consents
  ] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId } }),
    prisma.forecastScenario.findMany({ where: { restaurantId } }),
    prisma.cookPlan.findMany({ where: { restaurantId }, include: { items: true } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId }, include: { proteinLogs: true } }),
    prisma.savedReport.findMany({ where: { restaurantId } }),
    prisma.smoker.findMany({ where: { restaurantId } }),
    prisma.restaurantMembership.findMany({ where: { restaurantId }, include: { user: { select: { name: true, email: true, role: true } } } }),
    prisma.subscription.findMany({ where: { restaurantId } }),
    prisma.communicationConsent.findMany({ where: { restaurantId } })
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    restaurant: { id: restaurant.id, name: restaurant.name, city: restaurant.city, state: restaurant.state, timezone: restaurant.timezone },
    proteins,
    scenarios,
    cookPlans,
    endOfDayLogs: eodLogs,
    savedReports,
    smokers,
    members: members.map((m) => ({ role: m.role, user: m.user })),
    subscriptions,
    communicationConsents: consents
  };

  await auditLog({
    restaurantId,
    actorUserId: user.id,
    actorName: user.name,
    action: 'DATA_EXPORT',
    entity: 'Restaurant',
    entityId: restaurantId
  }).catch(() => {});

  const filename = `smokehouse-export-${restaurant.slug || restaurant.id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
