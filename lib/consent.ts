// Build 10.0.0 — Communication consent management (TCPA + CAN-SPAM).
//
// Rules enforced here:
//   * Marketing SMS/email requires an explicit OPT-IN with recorded consent text.
//   * "STOP"/"UNSUBSCRIBE" opt-outs are honored immediately and permanently
//     until the contact explicitly re-subscribes.
//   * Transactional messages (payment failures, security, booking confirmations)
//     are always allowed but still recorded for audit.
//   * Every state change writes an immutable ConsentEvent row for legal defense.

import { prisma } from '@/lib/prisma';
import { normalizeEmail, normalizePhone } from '@/lib/contact';

export type Channel = 'SMS' | 'EMAIL';
export type Category = 'MARKETING' | 'TRANSACTIONAL';

export interface ConsentContext {
  restaurantId?: string | null;
  source?: string;
  consentText?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function normalizeDestination(channel: Channel, raw: string): string | null {
  return channel === 'SMS' ? normalizePhone(raw) : normalizeEmail(raw);
}

async function loadOrCreateConsent(channel: Channel, destination: string, ctx: ConsentContext) {
  const existing = await prisma.communicationConsent.findUnique({
    where: { channel_destination: { channel, destination } }
  });
  if (existing) return existing;
  return prisma.communicationConsent.create({
    data: {
      channel,
      destination,
      restaurantId: ctx.restaurantId ?? null,
      consentSource: ctx.source,
      consentText: ctx.consentText,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null
    }
  });
}

/** Record an explicit marketing opt-in (checkbox, SMS START keyword, etc). */
export async function recordOptIn(channel: Channel, rawDestination: string, ctx: ConsentContext) {
  const destination = normalizeDestination(channel, rawDestination);
  if (!destination) return { ok: false as const, error: 'invalid_destination' };

  const consent = await loadOrCreateConsent(channel, destination, ctx);
  const now = new Date();
  await prisma.$transaction([
    prisma.communicationConsent.update({
      where: { id: consent.id },
      data: {
        marketingState: 'OPTED_IN',
        lastOptInAt: now,
        consentSource: ctx.source ?? consent.consentSource,
        consentText: ctx.consentText ?? consent.consentText,
        ipAddress: ctx.ipAddress ?? consent.ipAddress,
        userAgent: ctx.userAgent ?? consent.userAgent
      }
    }),
    prisma.consentEvent.create({
      data: {
        consentId: consent.id,
        channel,
        destination,
        action: consent.marketingState === 'OPTED_OUT' ? 'RESUBSCRIBE' : 'OPT_IN',
        category: 'MARKETING',
        source: ctx.source,
        consentText: ctx.consentText,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null
      }
    })
  ]);
  return { ok: true as const, destination };
}

/** Record a permanent marketing opt-out (STOP keyword, unsubscribe link). */
export async function recordOptOut(channel: Channel, rawDestination: string, ctx: ConsentContext) {
  const destination = normalizeDestination(channel, rawDestination);
  if (!destination) return { ok: false as const, error: 'invalid_destination' };

  const consent = await loadOrCreateConsent(channel, destination, ctx);
  const now = new Date();
  await prisma.$transaction([
    prisma.communicationConsent.update({
      where: { id: consent.id },
      data: { marketingState: 'OPTED_OUT', lastOptOutAt: now }
    }),
    prisma.consentEvent.create({
      data: {
        consentId: consent.id,
        channel,
        destination,
        action: 'OPT_OUT',
        category: 'MARKETING',
        source: ctx.source,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null
      }
    })
  ]);
  return { ok: true as const, destination };
}

/**
 * The single gate every message must pass through.
 * Transactional messages are always allowed. Marketing requires OPTED_IN.
 */
export async function isSendAllowed(
  channel: Channel,
  rawDestination: string,
  category: Category
): Promise<{ allowed: boolean; destination: string | null; reason?: string }> {
  const destination = normalizeDestination(channel, rawDestination);
  if (!destination) return { allowed: false, destination: null, reason: 'invalid_destination' };
  if (category === 'TRANSACTIONAL') return { allowed: true, destination };

  const consent = await prisma.communicationConsent.findUnique({
    where: { channel_destination: { channel, destination } }
  });
  if (!consent || consent.marketingState !== 'OPTED_IN') {
    return { allowed: false, destination, reason: 'no_marketing_consent' };
  }
  return { allowed: true, destination };
}

// Re-exported for backward compatibility; implementation lives in smsKeywords.ts.
export { classifyInboundSms } from '@/lib/smsKeywords';
