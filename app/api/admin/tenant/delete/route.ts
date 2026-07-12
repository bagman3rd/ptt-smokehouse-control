import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'api:tenant-delete', 3, 60 * 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${baseUrl(request)}/login`, 303);
  const restaurant = await currentRestaurantForUser(user);
  const form = await request.formData();
  const confirm = String(form.get('confirm') || '').trim();
  if (confirm !== restaurant.name) return NextResponse.redirect(`${baseUrl(request)}/admin/restaurants?deleteError=confirm`, 303);

  // Soft-delete for safety. Physical deletion should happen only after backup/export confirmation and retention review.
  await prisma.customerDataRequest.create({ data: { restaurantId: restaurant.id, type: 'DEACTIVATE', status: 'COMPLETED', requestedBy: user.name, notes: 'Tenant soft-deactivated through admin flow.', completedAt: new Date() } }).catch(() => null);
  await prisma.restaurant.update({ where: { id: restaurant.id }, data: { active: false } });
  await prisma.restaurantMembership.updateMany({ where: { restaurantId: restaurant.id }, data: { active: false } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SOFT_DELETE_TENANT', entity: 'Restaurant', entityId: restaurant.id, beforeJson: { active: true }, afterJson: { active: false } });
  return NextResponse.redirect(`${baseUrl(request)}/login?deleted=1`, 303);
}
