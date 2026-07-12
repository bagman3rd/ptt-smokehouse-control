import { NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { ensureTrialSubscription, checkoutUrlForPlan } from '@/lib/billing';

export async function POST(request: Request) {
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  const form = await request.formData().catch(() => new FormData());
  const plan = String(form.get('plan') || 'MONTHLY').toUpperCase();
  const url = checkoutUrlForPlan(plan);
  const restaurant = await currentRestaurantForUser(user);
  await ensureTrialSubscription(restaurant.id);
  if (!url) return NextResponse.json({ ok: false, message: 'Stripe checkout is not configured. Set STRIPE_MONTHLY_PAYMENT_LINK, STRIPE_ANNUAL_PAYMENT_LINK, STRIPE_PAYMENT_LINK, or STRIPE_CHECKOUT_URL in Render.' }, { status: 503 });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'BILLING_CHECKOUT_STARTED', entity: 'Subscription', afterJson: { plan } });
  return NextResponse.redirect(url, 303);
}
