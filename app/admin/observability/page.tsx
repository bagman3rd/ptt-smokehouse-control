import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { monthlyCostBreakdown, accountAiSpendToday } from '@/lib/cost';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function since(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

export default async function ObservabilityPage() {
  await requireRole(['ADMIN']);
  noStore();

  const [
    monthCosts,
    lastMonthCosts,
    aiSpendToday,
    notifSent24h,
    notifFailed24h,
    notifSuppressed24h,
    flaggedAi7d,
    activeRestaurants,
    activeSubs,
    trialSubs,
    latestDeploy,
    latestRetention,
    consentOptOuts
  ] = await Promise.all([
    monthlyCostBreakdown(0),
    monthlyCostBreakdown(1),
    accountAiSpendToday(),
    prisma.notificationLog.count({ where: { status: { in: ['SENT', 'DELIVERED'] }, createdAt: { gte: since(24) } } }),
    prisma.notificationLog.count({ where: { status: 'FAILED', createdAt: { gte: since(24) } } }),
    prisma.notificationLog.count({ where: { status: { in: ['SUPPRESSED_CONSENT', 'SUPPRESSED_QUIET_HOURS'] }, createdAt: { gte: since(24) } } }),
    prisma.archerConversationLog.count({ where: { flagged: true, createdAt: { gte: since(24 * 7) } } }),
    prisma.restaurant.count({ where: { active: true } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIALING' } }),
    prisma.deployRecord.findFirst({ orderBy: { deployedAt: 'desc' } }).catch(() => null),
    prisma.retentionJobRun.findFirst({ orderBy: { startedAt: 'desc' } }).catch(() => null),
    prisma.consentEvent.count({ where: { action: 'OPT_OUT', createdAt: { gte: since(24 * 30) } } })
  ]);

  const monthTotal = monthCosts.reduce((s, c) => s + c.cents, 0);
  const lastMonthTotal = lastMonthCosts.reduce((s, c) => s + c.cents, 0);
  const mrrCents = activeSubs * 9900;

  return (
    <Shell>
      <div id="main-content" className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Observability &amp; Cost</h1>
        <p className="mt-2 text-slate-600">
          Admin-only cost, notification, AI-safety, and compliance monitoring for scaling to 1,000 restaurants.
        </p>
      </div>

      {/* Top-line metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active restaurants" value={String(activeRestaurants)} />
        <Metric label="Est. MRR" value={usd(mrrCents)} sub={`${activeSubs} paid · ${trialSubs} trial`} />
        <Metric label="Cost this month" value={usd(monthTotal)} sub={`last month ${usd(lastMonthTotal)}`} />
        <Metric
          label="Gross margin (est.)"
          value={mrrCents > 0 ? `${Math.round(((mrrCents - monthTotal) / mrrCents) * 100)}%` : '—'}
          sub="MRR minus tracked cost"
        />
      </section>

      {/* Cost breakdown */}
      <section className="mt-8">
        <h2 className="text-xl font-black">Cost breakdown (this month)</h2>
        <div className="card mt-3 overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">Monthly cost by service</caption>
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th scope="col" className="p-3">Service</th>
                <th scope="col" className="p-3 text-right">This month</th>
                <th scope="col" className="p-3 text-right">Last month</th>
              </tr>
            </thead>
            <tbody>
              {['STRIPE', 'ARCHER_AI', 'SMS', 'EMAIL', 'DATABASE', 'STORAGE', 'HOSTING', 'OTHER'].map((svc) => {
                const now = monthCosts.find((c) => c.service === svc)?.cents ?? 0;
                const prev = lastMonthCosts.find((c) => c.service === svc)?.cents ?? 0;
                return (
                  <tr key={svc} className="border-b last:border-0">
                    <td className="p-3 font-medium">{svc.replace('_', ' ')}</td>
                    <td className="p-3 text-right">{usd(now)}</td>
                    <td className="p-3 text-right text-slate-500">{usd(prev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Health signals */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Panel title="Notifications (24h)">
          <Row label="Sent" value={String(notifSent24h)} />
          <Row label="Failed" value={String(notifFailed24h)} tone={notifFailed24h > 0 ? 'warn' : 'ok'} />
          <Row label="Suppressed (consent/quiet)" value={String(notifSuppressed24h)} />
        </Panel>
        <Panel title="AI safety &amp; spend">
          <Row label="AI spend today" value={usd(aiSpendToday)} />
          <Row label="Flagged messages (7d)" value={String(flaggedAi7d)} tone={flaggedAi7d > 0 ? 'warn' : 'ok'} />
          <Row label="Marketing opt-outs (30d)" value={String(consentOptOuts)} />
        </Panel>
        <Panel title="Operations">
          <Row label="Last deploy" value={latestDeploy?.version ? `${latestDeploy.version} (${latestDeploy.status})` : '—'} />
          <Row
            label="Last retention run"
            value={latestRetention ? `${latestRetention.status} · ${latestRetention.recordsDeleted} purged` : '—'}
          />
        </Panel>
      </section>

      <p className="mt-8 text-xs text-slate-400">
        Cost figures come from recorded CostEvent rows. Wire provider billing webhooks to keep them exact.
      </p>
    </Shell>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-black" dangerouslySetInnerHTML={{ __html: title }} />
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={tone === 'warn' ? 'font-bold text-amber-700' : 'font-semibold text-slate-900'}>{value}</span>
    </div>
  );
}
