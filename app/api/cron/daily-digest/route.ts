// Build 11.0.0 — daily operations digest + cost alerting cron.
// Schedule on Render Cron (07:00 local): GET /api/cron/daily-digest
//   Authorization: Bearer $CRON_SECRET
//
// Emits a JSON summary and, if configured, emails the operator. Flags:
//   * Account-wide AI spend over AI_DAILY_ALERT_CENTS
//   * Notification failures in the last 24h
//   * New Sentry-style error surge (via DeployRecord.errorCountAfterDeploy)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accountAiSpendToday, monthlyCostBreakdown, AI_DAILY_ALERT_CENTS } from '@/lib/cost';
import { sendNotification } from '@/lib/notifications/dispatch';
import { errorCountSince } from '@/lib/observability';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret || secret.length < 12) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === secret;
}

function since(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const [aiSpendCents, notificationFailures, activeRestaurants, activeSubs, monthCosts, errors24h] =
    await Promise.all([
      accountAiSpendToday(),
      prisma.notificationLog.count({
        where: { status: 'FAILED', createdAt: { gte: since(24) } }
      }),
      prisma.restaurant.count({ where: { active: true } }),
      prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
      monthlyCostBreakdown(0),
      errorCountSince(since(24), 'error')
    ]);

  const alerts: string[] = [];
  if (aiSpendCents > AI_DAILY_ALERT_CENTS) {
    alerts.push(`AI spend today $${(aiSpendCents / 100).toFixed(2)} exceeds alert threshold $${(AI_DAILY_ALERT_CENTS / 100).toFixed(2)}.`);
  }
  if (notificationFailures > 0) {
    alerts.push(`${notificationFailures} notification delivery failure(s) in last 24h.`);
  }
  const errorAlertThreshold = Number(process.env.ERROR_ALERT_THRESHOLD_24H || 25);
  if (errors24h > errorAlertThreshold) {
    alerts.push(`${errors24h} server errors in last 24h exceeds threshold ${errorAlertThreshold}.`);
  }

  const summary = {
    date: new Date().toISOString().slice(0, 10),
    activeRestaurants,
    activeSubscriptions: activeSubs,
    aiSpendTodayUsd: (aiSpendCents / 100).toFixed(2),
    notificationFailures24h: notificationFailures,
    serverErrors24h: errors24h,
    monthCostsUsd: monthCosts.map((c) => ({ service: c.service, usd: (c.cents / 100).toFixed(2) })),
    alerts
  };

  // Email the operator if an ops address is configured.
  const opsEmail = process.env.OPS_ALERT_EMAIL;
  if (opsEmail) {
    const line = alerts.length ? `ALERTS:\n- ${alerts.join('\n- ')}` : 'No alerts — system healthy.';
    await sendNotification({
      channel: 'EMAIL',
      category: 'TRANSACTIONAL',
      templateKey: 'daily_digest',
      to: opsEmail,
      timeZone: process.env.OPS_TIMEZONE || 'America/New_York',
      data: {
        name: 'Operator',
        restaurant: `${activeRestaurants} active restaurants`,
        planStatus: `${activeSubs} active/trial subs`,
        eodStatus: `${notificationFailures} notif failures`,
        forecast: line
      },
      idempotencyKey: `daily-digest-${summary.date}`
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, summary });
}
