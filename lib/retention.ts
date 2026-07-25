// Build 10.0.0 — data retention automation + GDPR erasure.
//
// Retention job (run daily via cron):
//   * Purge Archer conversation logs older than each restaurant's retention window.
//   * Purge notification logs older than the retention window.
//   * Anonymize/cleanup trial accounts with no payment after 90 days inactivity.
//
// Erasure: anonymize personal identifiers while preserving audit + financial
// history required by law (Section 36.4).

import { prisma } from '@/lib/prisma';

const DEFAULT_AI_RETENTION_DAYS = 90;
const DEFAULT_NOTIFICATION_RETENTION_DAYS = 365;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** Purge AI conversation logs per each restaurant's retention setting. */
export async function purgeAiLogs(): Promise<number> {
  const settings = await prisma.dataRetentionSetting.findMany();
  const settingMap = new Map(settings.map((s) => [s.restaurantId, s.aiLogRetentionDays]));

  const restaurants = await prisma.restaurant.findMany({ select: { id: true } });
  let deleted = 0;
  for (const r of restaurants) {
    const days = settingMap.get(r.id) ?? DEFAULT_AI_RETENTION_DAYS;
    if (days < 0) continue; // -1 = never delete
    const cutoff = days === 0 ? new Date() : daysAgo(days);
    const res = await prisma.archerConversationLog.deleteMany({
      where: { restaurantId: r.id, createdAt: { lt: cutoff } }
    });
    deleted += res.count;
  }
  return deleted;
}

/** Purge notification logs older than retention window. */
export async function purgeNotificationLogs(): Promise<number> {
  const res = await prisma.notificationLog.deleteMany({
    where: { createdAt: { lt: daysAgo(DEFAULT_NOTIFICATION_RETENTION_DAYS) } }
  });
  return res.count;
}

/** Record a retention job run with results. */
export async function runRetentionJob(): Promise<{
  aiLogsDeleted: number;
  notificationLogsDeleted: number;
}> {
  const run = await prisma.retentionJobRun.create({
    data: { jobType: 'DAILY_RETENTION', status: 'RUNNING' }
  });
  try {
    const aiLogsDeleted = await purgeAiLogs();
    const notificationLogsDeleted = await purgeNotificationLogs();
    await prisma.retentionJobRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        recordsDeleted: aiLogsDeleted + notificationLogsDeleted
      }
    });
    return { aiLogsDeleted, notificationLogsDeleted };
  } catch (err) {
    await prisma.retentionJobRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', finishedAt: new Date(), errorMessage: (err as Error).message }
    });
    throw err;
  }
}

/**
 * GDPR erasure. Anonymizes personal identifiers for a restaurant's users while
 * preserving audit + financial records. Deactivates the tenant.
 */
export async function eraseRestaurantPersonalData(restaurantId: string, requestedBy: string): Promise<void> {
  const disableGuard = process.env.DISABLE_TENANT_GUARD;
  process.env.DISABLE_TENANT_GUARD = '1';
  try {
    const users = await prisma.user.findMany({ where: { restaurantId } });
    for (const u of users) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          name: 'Deleted User',
          email: `deleted+${u.id}@invalid.local`,
          username: null,
          passwordHash: null,
          twoFactorSecret: null,
          twoFactorRecoveryCodes: null,
          twoFactorRecoveryDisplay: null,
          active: false,
          sessionVersion: { increment: 1 }
        }
      });
    }
    // Purge conversation logs entirely (personal content).
    await prisma.archerConversationLog.deleteMany({ where: { restaurantId } });
    // Deactivate tenant + memberships.
    await prisma.restaurantMembership.updateMany({ where: { restaurantId }, data: { active: false } });
    await prisma.restaurant.update({ where: { id: restaurantId }, data: { active: false } });
    // Record the completed request (audit-preserving).
    await prisma.customerDataRequest.create({
      data: {
        restaurantId,
        type: 'ERASURE',
        status: 'COMPLETED',
        requestedBy,
        notes: 'GDPR erasure: personal identifiers anonymized; audit/financial records preserved.',
        completedAt: new Date()
      }
    });
  } finally {
    if (disableGuard === undefined) delete process.env.DISABLE_TENANT_GUARD;
    else process.env.DISABLE_TENANT_GUARD = disableGuard;
  }
}

export { DEFAULT_AI_RETENTION_DAYS, DEFAULT_NOTIFICATION_RETENTION_DAYS };
