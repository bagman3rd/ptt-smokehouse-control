// Build 11.0.0 — production observability & error tracking.
//
// Addresses the v3.0 §41 finding that "Sentry" previously existed only as a
// comment. This provides a real error-capture pipeline:
//   * captureException / captureMessage record structured events to ErrorEvent
//     (queryable for the daily digest + admin dashboard) and, when SENTRY_DSN
//     is configured, forward them to Sentry's HTTP ingest API (no SDK needed).
//   * recordDeploy / markDeployHealthy support the post-deploy error-surge and
//     rollback-decision workflow (§40, §41).
//
// The Sentry transport uses the documented store endpoint so we avoid a heavy
// dependency that cannot be installed in restricted build environments; on
// Render it activates automatically when SENTRY_DSN is present.

import { prisma } from '@/lib/prisma';

export type Severity = 'fatal' | 'error' | 'warning' | 'info';

interface CaptureContext {
  restaurantId?: string | null;
  userId?: string | null;
  route?: string;
  release?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

const RELEASE = process.env.APP_BUILD_VERSION || process.env.RENDER_GIT_COMMIT || '11.0.0';

function parseDsn(dsn: string): { url: string; auth: string } | null {
  // DSN format: https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) return null;
  const [, publicKey, host, projectId] = m;
  return {
    url: `https://${host}/api/${projectId}/store/`,
    auth: `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=shc-observability/11.0.0`
  };
}

async function forwardToSentry(payload: Record<string, unknown>): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV === 'test') return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;
  try {
    await fetch(parsed.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sentry-Auth': parsed.auth },
      body: JSON.stringify(payload)
    });
  } catch {
    // Never let telemetry failures affect the request path.
  }
}

/** Capture a handled or unhandled exception. Best-effort, never throws. */
export async function captureException(error: unknown, context: CaptureContext = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const fingerprint = `${err.name}:${(err.message || '').slice(0, 120)}`;

  try {
    await prisma.errorEvent.create({
      data: {
        severity: 'error',
        name: err.name.slice(0, 200),
        message: (err.message || 'unknown').slice(0, 2000),
        stack: (err.stack || '').slice(0, 8000),
        fingerprint: fingerprint.slice(0, 300),
        route: context.route?.slice(0, 300),
        restaurantId: context.restaurantId ?? null,
        userId: context.userId ?? null,
        release: context.release || RELEASE,
        tagsJson: context.tags ? JSON.stringify(context.tags) : null
      }
    });
  } catch {
    // If the DB write fails we still try to forward to Sentry below.
  }

  await forwardToSentry({
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    level: 'error',
    release: context.release || RELEASE,
    platform: 'node',
    exception: { values: [{ type: err.name, value: err.message, stacktrace: { frames: [] } }] },
    tags: { route: context.route || 'unknown', ...(context.tags || {}) },
    extra: context.extra || {}
  });
}

/** Capture a non-exception message (e.g. a business-rule anomaly). */
export async function captureMessage(
  message: string,
  severity: Severity = 'warning',
  context: CaptureContext = {}
): Promise<void> {
  try {
    await prisma.errorEvent.create({
      data: {
        severity,
        name: 'message',
        message: message.slice(0, 2000),
        fingerprint: `message:${message.slice(0, 120)}`,
        route: context.route?.slice(0, 300),
        restaurantId: context.restaurantId ?? null,
        userId: context.userId ?? null,
        release: context.release || RELEASE,
        tagsJson: context.tags ? JSON.stringify(context.tags) : null
      }
    });
  } catch {
    /* best effort */
  }
  await forwardToSentry({
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    level: severity,
    release: context.release || RELEASE,
    platform: 'node',
    message: { formatted: message },
    tags: context.tags || {}
  });
}

/** Count recent error events, optionally since a deploy, for surge detection. */
export async function errorCountSince(since: Date, severity?: Severity): Promise<number> {
  try {
    return await prisma.errorEvent.count({
      where: { createdAt: { gte: since }, ...(severity ? { severity } : {}) }
    });
  } catch {
    return 0;
  }
}

/** Record a new deploy for post-deploy monitoring + rollback decisions (§40/§41). */
export async function recordDeploy(version: string, commitSha?: string): Promise<string | null> {
  try {
    const rec = await prisma.deployRecord.create({
      data: { version, commitSha: commitSha ?? null, status: 'DEPLOYING' }
    });
    return rec.id;
  } catch {
    return null;
  }
}

/**
 * Evaluate error surge after a deploy. Returns a rollback recommendation when
 * fatal/error events since deploy exceed the configured threshold.
 */
export async function evaluateDeployHealth(deployId: string): Promise<{
  healthy: boolean;
  errorsSinceDeploy: number;
  threshold: number;
  recommendation: 'HEALTHY' | 'ROLLBACK';
}> {
  const threshold = Number(process.env.DEPLOY_ERROR_ROLLBACK_THRESHOLD || 5);
  let deploy: { deployedAt: Date } | null = null;
  try {
    deploy = await prisma.deployRecord.findUnique({
      where: { id: deployId },
      select: { deployedAt: true }
    });
  } catch {
    /* ignore */
  }
  const since = deploy?.deployedAt || new Date(Date.now() - 30 * 60_000);
  const errors = await errorCountSince(since, 'error');
  const fatal = await errorCountSince(since, 'fatal');
  const total = errors + fatal;
  const healthy = total < threshold;
  try {
    await prisma.deployRecord.update({
      where: { id: deployId },
      data: {
        errorCountAfterDeploy: total,
        status: healthy ? 'HEALTHY' : 'ROLLED_BACK',
        healthyAt: healthy ? new Date() : null
      }
    });
  } catch {
    /* ignore */
  }
  return {
    healthy,
    errorsSinceDeploy: total,
    threshold,
    recommendation: healthy ? 'HEALTHY' : 'ROLLBACK'
  };
}
