import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'api:saved-report-delete', 30, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const formData = await req.formData();
  const id = String(formData.get('id') || '');
  if (id) {
    await prisma.savedReport.deleteMany({ where: { id, restaurantId } });
    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'DELETE', entity: 'SavedReport', entityId: id });
  }
  revalidatePath('/reports');
  return NextResponse.redirect(new URL('/reports?deleted=1', req.url), { status: 303 });
}
