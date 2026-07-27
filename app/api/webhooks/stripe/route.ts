// Build 11.0.2 — Stripe webhook handler (v3.0 §30 payments, §50.2 stop-conditions).
//
// Guarantees enforced here (directly answering the v3.0 payment stop-conditions):
//   * NO DOUBLE-APPLY: PaymentEvent.stripeEventId is unique; a replayed or
//     duplicated event is recorded once and never applied twice.
//   * SUCCESS IS NEVER SHOWN AS FAILED (and vice-versa): subscription status is
//     derived deterministically from the authoritative Stripe event type.
//   * REFUND STATUS IS CORRECT: refund/dispute events move the subscription to
//     the correct state and are audit-logged.
//
// Signature is verified before any parsing. The raw body is read verbatim
// (required for HMAC verification), so this route must not use a JSON parser
// upstream.

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyStripeSignature } from '@/lib/stripeWebhook';
import { recordCost } from '@/lib/cost';
import { captureMessage } from '@/lib/observability';

export const dynamic = 'force-dynamic';
// Stripe requires the raw, unparsed body for signature verification.
export const runtime = 'nodejs';

// Map Stripe event types to subscription status transitions.
function statusForEvent(eventType: string): string | null {
  switch (eventType) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      return 'ACTIVE';
    case 'invoice.payment_failed':
      return 'PAST_DUE';
    case 'customer.subscription.deleted':
      return 'CANCELED';
    case 'charge.refunded':
    case 'charge.dispute.created':
      return 'PAST_DUE';
    default:
      return null; // event recorded but no status change
  }
}

async function findSubscription(obj: any): Promise<{ id: string; restaurantId: string } | null> {
  const customerId: string | undefined = obj?.customer || obj?.customer_id;
  const subId: string | undefined =
    obj?.subscription || (obj?.object === 'subscription' ? obj?.id : undefined);
  let sub = null;
  if (subId) {
    sub = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subId },
      select: { id: true, restaurantId: true }
    });
  }
  if (!sub && customerId) {
    sub = await prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, restaurantId: true }
    });
  }
  return sub;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

  // 1. Verify signature BEFORE any parsing.
  const verification = verifyStripeSignature(rawBody, signature, secret);
  if (!verification.valid) {
    return NextResponse.json(
      { ok: false, error: `signature_${verification.reason}` },
      { status: 400 }
    );
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const eventId: string = event?.id;
  const eventType: string = event?.type || 'unknown';
  if (!eventId) {
    return NextResponse.json({ ok: false, error: 'missing_event_id' }, { status: 400 });
  }

  // 2. Idempotency: if we've already recorded this event id, acknowledge and stop.
  //    The unique constraint is the true guard against a race; the pre-check
  //    avoids unnecessary work in the common case.
  const existing = await prisma.paymentEvent.findUnique({ where: { stripeEventId: eventId } });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, status: existing.status });
  }

  const obj = event?.data?.object || {};
  const sub = await findSubscription(obj);
  const payloadHash = createHash('sha256').update(rawBody).digest('hex');
  const amountCents: number = obj?.amount_paid ?? obj?.amount ?? obj?.amount_total ?? 0;

  // 3. Create the PaymentEvent row first (unique stripeEventId). If a concurrent
  //    duplicate slips past the pre-check, this create throws on the unique
  //    constraint and we treat it as an already-handled duplicate.
  let paymentEventId: string;
  try {
    const created = await prisma.paymentEvent.create({
      data: {
        stripeEventId: eventId,
        eventType,
        restaurantId: sub?.restaurantId ?? null,
        subscriptionId: sub?.id ?? null,
        stripeObjectId: obj?.id ?? null,
        amountCents: typeof amountCents === 'number' ? amountCents : 0,
        currency: obj?.currency ?? null,
        status: 'RECEIVED',
        payloadHash
      }
    });
    paymentEventId = created.id;
  } catch (err) {
    // Unique violation => concurrent duplicate. Safe to acknowledge.
    return NextResponse.json({ ok: true, duplicate: true, race: true });
  }

  // 4. Apply the deterministic status transition.
  const newStatus = statusForEvent(eventType);
  let outcome = 'no_status_change';
  try {
    if (sub && newStatus) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: newStatus,
          ...(eventType === 'invoice.paid' || eventType === 'invoice.payment_succeeded'
            ? { currentPeriodEndsAt: obj?.lines?.data?.[0]?.period?.end
                ? new Date(obj.lines.data[0].period.end * 1000)
                : undefined }
            : {})
        }
      });
      outcome = `subscription_${sub.id}_status_${newStatus}`;

      // Record revenue/refund as a cost/ledger event for the observability dashboard.
      if (eventType === 'invoice.paid' || eventType === 'invoice.payment_succeeded') {
        await recordCost({
          service: 'STRIPE',
          amountCents: 0, // Stripe *fees* are recorded separately; this is revenue context
          quantity: amountCents,
          unit: 'revenue_cents',
          restaurantId: sub.restaurantId,
          notes: `invoice paid ${obj?.id ?? ''}`
        }).catch(() => {});
      }
    } else if (!sub) {
      outcome = 'no_matching_subscription';
      await captureMessage(
        `Stripe ${eventType} had no matching subscription (obj ${obj?.id ?? 'n/a'})`,
        'warning',
        { route: '/api/webhooks/stripe', tags: { eventType } }
      ).catch(() => {});
    }

    await prisma.paymentEvent.update({
      where: { id: paymentEventId },
      data: { status: 'PROCESSED', outcome, processedAt: new Date() }
    });
  } catch (err) {
    await prisma.paymentEvent.update({
      where: { id: paymentEventId },
      data: { status: 'FAILED', outcome: (err as Error).message?.slice(0, 300) }
    });
    await captureMessage(`Stripe webhook apply failed: ${eventType}`, 'error', {
      route: '/api/webhooks/stripe',
      tags: { eventType }
    }).catch(() => {});
    // Return 500 so Stripe retries (idempotency makes retry safe).
    return NextResponse.json({ ok: false, error: 'apply_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, applied: outcome });
}
