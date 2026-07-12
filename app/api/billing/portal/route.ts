import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { customerPortalUrl } from '@/lib/billing';

export async function POST() {
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
  const url = customerPortalUrl();
  if (!url) return NextResponse.json({ ok: false, message: 'Stripe customer portal is not configured. Set STRIPE_CUSTOMER_PORTAL_URL in Render.' }, { status: 503 });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'BILLING_PORTAL_OPENED', entity: 'Subscription' });
  return NextResponse.redirect(url, 303);
}
