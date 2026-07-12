import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function POST() {
  await requireRole(['ADMIN', 'OWNER']);
  const url = process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL;
  if (!url) return NextResponse.json({ ok: false, message: 'Stripe payment link is not configured. Set STRIPE_PAYMENT_LINK in Render.' }, { status: 503 });
  return NextResponse.redirect(url, 303);
}
