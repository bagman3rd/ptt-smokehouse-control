// Build 10.0.0 — central notification dispatcher.
//
// Every outbound message passes through sendNotification(). It enforces, in order:
//   1. Consent (marketing requires OPTED_IN; transactional always allowed).
//   2. Quiet hours (marketing deferred to 8 AM local; transactional exempt).
//   3. Idempotency (a repeated idempotencyKey never sends twice).
//   4. Logging (every attempt is recorded in NotificationLog with status).
//
// The two unforgivable payment outcomes (double charge, lost success) have
// analogues here: never send a suppressed marketing message, and never send
// the same message twice. Both are covered by explicit tests.

import { prisma } from '@/lib/prisma';
import { isSendAllowed, type Category, type Channel } from '@/lib/consent';
import { nextAllowedSendTime } from '@/lib/quietHours';
import { getEmailProvider, getSmsProvider } from '@/lib/notifications/providers';
import { EMAIL_TEMPLATES, SMS_TEMPLATES } from '@/lib/notifications/templates';
import { normalizeEmail, normalizePhone } from '@/lib/contact';

export interface DispatchInput {
  channel: Channel;
  category: Category;
  templateKey: string;
  to: string;
  restaurantId?: string | null;
  timeZone?: string;
  data?: Record<string, string>;
  unsubToken?: string;
  // A stable key so retries/duplicate triggers never double-send.
  idempotencyKey?: string;
}

export interface DispatchResult {
  status:
    | 'SENT'
    | 'QUEUED'
    | 'SUPPRESSED_CONSENT'
    | 'SUPPRESSED_QUIET_HOURS'
    | 'DUPLICATE'
    | 'FAILED'
    | 'INVALID';
  logId?: string;
  reason?: string;
}

const mapCategory = (c: Category): 'MARKETING' | 'TRANSACTIONAL' =>
  c === 'MARKETING' ? 'MARKETING' : 'TRANSACTIONAL';

export async function sendNotification(input: DispatchInput): Promise<DispatchResult> {
  const data = input.data ?? {};

  // Idempotency: if we already have a log for this key, do not send again.
  if (input.idempotencyKey) {
    const existing = await prisma.notificationLog.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) {
      return { status: 'DUPLICATE', logId: existing.id, reason: 'idempotency_key_seen' };
    }
  }

  // 1. Consent gate.
  const consent = await isSendAllowed(input.channel, input.to, input.category);
  const destination = consent.destination;
  if (!destination) {
    const log = await prisma.notificationLog.create({
      data: {
        restaurantId: input.restaurantId ?? null,
        channel: input.channel,
        category: mapCategory(input.category),
        templateKey: input.templateKey,
        destination: input.to,
        status: 'FAILED',
        errorMessage: 'invalid_destination',
        idempotencyKey: input.idempotencyKey
      }
    });
    return { status: 'INVALID', logId: log.id, reason: 'invalid_destination' };
  }

  if (!consent.allowed) {
    const log = await prisma.notificationLog.create({
      data: {
        restaurantId: input.restaurantId ?? null,
        channel: input.channel,
        category: mapCategory(input.category),
        templateKey: input.templateKey,
        destination,
        status: 'SUPPRESSED_CONSENT',
        suppressionReason: consent.reason,
        idempotencyKey: input.idempotencyKey
      }
    });
    return { status: 'SUPPRESSED_CONSENT', logId: log.id, reason: consent.reason };
  }

  // 2. Quiet-hours gate (marketing only).
  if (input.category === 'MARKETING') {
    const tz = input.timeZone || 'America/New_York';
    const deferUntil = nextAllowedSendTime(new Date(), tz);
    if (deferUntil) {
      const log = await prisma.notificationLog.create({
        data: {
          restaurantId: input.restaurantId ?? null,
          channel: input.channel,
          category: 'MARKETING',
          templateKey: input.templateKey,
          destination,
          status: 'SUPPRESSED_QUIET_HOURS',
          scheduledFor: deferUntil,
          suppressionReason: 'quiet_hours',
          idempotencyKey: input.idempotencyKey
        }
      });
      return { status: 'SUPPRESSED_QUIET_HOURS', logId: log.id, reason: 'quiet_hours' };
    }
  }

  // 3. Render + send.
  if (input.channel === 'EMAIL') {
    const tpl = EMAIL_TEMPLATES[input.templateKey];
    if (!tpl) return { status: 'FAILED', reason: 'unknown_template' };
    const rendered = tpl({ category: input.category, unsubToken: input.unsubToken, data });
    const log = await prisma.notificationLog.create({
      data: {
        restaurantId: input.restaurantId ?? null,
        channel: 'EMAIL',
        category: mapCategory(input.category),
        templateKey: input.templateKey,
        destination,
        subject: rendered.subject,
        status: 'SENDING',
        idempotencyKey: input.idempotencyKey
      }
    });
    const provider = getEmailProvider();
    const result = await provider.sendEmail({
      to: destination,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.ok ? 'SENT' : 'FAILED',
        providerId: result.providerId,
        errorMessage: result.error,
        sentAt: result.ok ? new Date() : null
      }
    });
    return { status: result.ok ? 'SENT' : 'FAILED', logId: log.id, reason: result.error };
  }

  // SMS
  const smsTpl = SMS_TEMPLATES[input.templateKey];
  if (!smsTpl) return { status: 'FAILED', reason: 'unknown_template' };
  const body = smsTpl(data);
  const log = await prisma.notificationLog.create({
    data: {
      restaurantId: input.restaurantId ?? null,
      channel: 'SMS',
      category: mapCategory(input.category),
      templateKey: input.templateKey,
      destination,
      status: 'SENDING',
      idempotencyKey: input.idempotencyKey
    }
  });
  const provider = getSmsProvider();
  const result = await provider.sendSms({ to: destination, body });
  await prisma.notificationLog.update({
    where: { id: log.id },
    data: {
      status: result.ok ? 'SENT' : 'FAILED',
      providerId: result.providerId,
      errorMessage: result.error,
      sentAt: result.ok ? new Date() : null
    }
  });
  return { status: result.ok ? 'SENT' : 'FAILED', logId: log.id, reason: result.error };
}

export { normalizeEmail, normalizePhone };
