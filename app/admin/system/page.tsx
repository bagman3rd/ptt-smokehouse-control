import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import pkg from '@/package.json';
import { recordSystemCheck } from './actions';
import { computeDataQuality } from '@/lib/dataQuality';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(date: Date | null | undefined) {
  return date ? date.toLocaleString('en-US', { timeZone: 'America/New_York' }) : '—';
}

export default async function SystemPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  noStore();
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const [restaurantCount, userCount, smokerCount, lastEod, lastPlan, lastAudit, backupRunCount, recommendationCount, systemChecks, dataQuality] = await Promise.all([
    prisma.restaurant.count(),
    prisma.user.count({ where: { memberships: { some: { restaurantId, active: true } } } }),
    prisma.smoker.count({ where: { restaurantId, active: true } }),
    prisma.endOfDayLog.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' } }),
    prisma.cookPlan.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' } }),
    prisma.auditLog.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' } }),
    prisma.reportRun.count({ where: { restaurantId, dataset: { contains: 'backup', mode: 'insensitive' } } }).catch(() => 0),
    prisma.learningRecommendation.count({ where: { restaurantId, status: 'PENDING' } }).catch(() => 0),
    prisma.systemCheck.findMany({ where: { restaurantId }, orderBy: { createdAt: 'desc' }, take: 10 }).catch(() => []),
    computeDataQuality(prisma, restaurantId)
  ]);

  const migrationMode = 'Migrate Deploy Mode';
  const cronReady = Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 12);
  const backupPostReady = Boolean(process.env.BACKUP_POST_URL);
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">System Health</h1>
      <p className="mt-2 text-slate-600">Admin-only operational health page for pilot support, staging checks, and commercial-readiness tracking.</p>
    </div>

    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
      <div className="text-lg font-black">Pilot Mode Warning</div>
      <p className="mt-1 text-sm">This deployment is configured for <strong>{migrationMode}</strong>. Record proof that tenant, cross-tenant, forecast, backup, restore, and migration checks passed against staging before relying on outside-customer data.</p>
    </div>


    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
        <div className="text-lg font-black">Migration Repair Gate</div>
        <p className="mt-2 text-sm">The production migration baseline has been repaired. Keep migrate deploy active and test future schema changes against staging before production.</p>
        <div className="mt-3 rounded-xl bg-white/70 p-3 font-mono text-xs">TENANT_ISOLATION_BUILD_4_7_0.md</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-black">Scheduled Backup Readiness</div>
        <p className="mt-2 text-sm text-slate-600">Configure CRON_SECRET and BACKUP_APP_URL for scheduled backups, then run restore drills against staging.</p>
        <div className={cronReady ? 'mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800' : 'mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800'}>
          CRON_SECRET: {cronReady ? 'configured' : 'missing or too short'}
        </div>
        <div className={backupPostReady ? 'mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800' : 'mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700'}>
          BACKUP_POST_URL: {backupPostReady ? 'configured' : 'optional; not configured'}
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="text-lg font-black">Data Quality as Product Feature</div>
        <p className="mt-2 text-sm">Use this in demos: the app does not just forecast. It tells the restaurant when bad logging is making forecasts less trustworthy.</p>
        <div className="mt-3 text-3xl font-black">{dataQuality.score}%</div>
        <div className="text-xs font-bold">Current tenant data quality · {dataQuality.label}</div>
      </div>
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">App Version</div><div className="mt-2 text-2xl font-black">{pkg.version}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Migration Mode</div><div className="mt-2 text-xl font-black">{migrationMode}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Restaurants</div><div className="mt-2 text-3xl font-black">{restaurantCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Active Smokers</div><div className="mt-2 text-3xl font-black">{smokerCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Users in Tenant</div><div className="mt-2 text-3xl font-black">{userCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Last EOD</div><div className="mt-2 text-lg font-black">{fmt(lastEod?.serviceDate)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Last Cook Plan</div><div className="mt-2 text-lg font-black">{fmt(lastPlan?.serviceDate)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Pending Learning Items</div><div className="mt-2 text-3xl font-black">{recommendationCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Data Quality</div><div className="mt-2 text-3xl font-black">{dataQuality.score}%</div><div className="text-xs font-bold text-slate-500">{dataQuality.label}</div></div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">PTT Pilot-Readiness Checklist</h2>
      <p className="mt-2 text-sm text-slate-600">Go/no-go checks before relying on the app during live service.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {dataQuality.checks.map((check) => <div key={check.key} className={check.complete ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-3' : 'rounded-xl border border-amber-200 bg-amber-50 p-3'}>
          <div className="font-black">{check.complete ? '✓' : '✗'} {check.label}</div>
          <div className="mt-1 text-xs font-bold text-slate-600">{check.detail} · {check.points}/{check.max} pts</div>
        </div>)}
      </div>
    </section>



    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Test Status Tracking</h2>
      <p className="mt-2 text-sm text-slate-600">Record staging checks here after running them against a real staging database. This is intentionally separate from the local static build evaluation.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[
          ['STAGING_MIGRATION_STATUS', 'Staging migration status', 'DATABASE_URL=staging npx prisma migrate status'],
          ['STAGING_TENANT_TEST', 'Staging tenant isolation test', 'DATABASE_URL=staging pnpm run test:tenant'],
          ['STAGING_CROSS_TENANT_TEST', 'Staging cross-tenant test', 'DATABASE_URL=staging pnpm run test:cross-tenant'],
          ['STAGING_FORECAST_TEST', 'Staging forecast test', 'pnpm run test:forecast'],
          ['STAGING_BACKUP_TEST', 'Staging backup export test', 'DATABASE_URL=staging pnpm run test:backup'],
          ['STAGING_CLICK_TEST', 'Staging app click-through', '/today, /dashboard, /cook-plan, /end-of-day, /reports, /learning, /admin/system'],
          ['STAGING_RESTORE_DRILL', 'Staging restore drill', 'Restore backup into staging and verify app boots and counts match'],
          ['PRODUCTION_MIGRATION_STATUS', 'Production migration status', 'Production npx prisma migrate status reports up to date'],
          ['WEEKLY_BACKUP_EXPORT', 'Weekly backup export', 'Render Cron calls /api/admin/backups/weekly with CRON_SECRET'],
          ['SECURITY_REVIEW', 'Security review', 'Review auth, rate limits, roles, tenant scoping, and session revocation']
        ].map(([type, label, hint]) => (
          <form key={type} action={recordSystemCheck} className="rounded-2xl border border-slate-200 p-4">
            <input type="hidden" name="type" value={type} />
            <div className="font-black">{label}</div>
            <div className="mt-1 text-xs font-mono text-slate-500">{hint}</div>
            <label className="label mt-3 block">Result</label>
            <select name="status" className="field mt-1">
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="NEEDS_REVIEW">Needs review</option>
            </select>
            <label className="label mt-3 block">Notes</label>
            <textarea name="notes" className="field mt-1 min-h-20" placeholder="What was tested, where, and what happened?" />
            <button className="btn-secondary mt-3" type="submit">Record Check</button>
          </form>
        ))}
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Recent Staging / Restore Checks</h2>
      {systemChecks.length === 0 ? <p className="mt-2 text-sm text-amber-700 font-bold">No staging or restore checks have been recorded yet.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">When</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Verified By</th><th className="p-3">Notes</th></tr></thead>
            <tbody>{systemChecks.map((check) => <tr key={check.id} className="border-t border-slate-100"><td className="p-3">{fmt(check.createdAt)}</td><td className="p-3 font-black">{check.type}</td><td className="p-3 font-black">{check.status}</td><td className="p-3">{check.verifiedBy}</td><td className="p-3 text-slate-600">{check.notes || '—'}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Staging Tests Required Before Outside Customers</h2>
      <div className="mt-3 rounded-xl bg-slate-950 p-4 font-mono text-sm text-white">
        <div>DATABASE_URL=&quot;postgres://...staging...&quot; pnpm run test:tenant</div>
        <div>DATABASE_URL=&quot;postgres://...staging...&quot; pnpm run test:backup</div>
        <div>pnpm run test:forecast</div>
      </div>
      <p className="mt-3 text-sm text-slate-600">The scripts exist in the repo. This page intentionally does not claim they passed until they are run against a real staging PostgreSQL database and recorded as SystemChecks.</p>
    </section>


    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Scheduled Backup Endpoint</h2>
      <p className="mt-2 text-sm text-slate-600">Use this with Render Cron after setting <strong>CRON_SECRET</strong>. If <strong>BACKUP_POST_URL</strong> is set, the route posts the full tenant JSON backup to that destination; otherwise it records the check and returns backup counts.</p>
      <div className="mt-3 rounded-xl bg-slate-950 p-4 font-mono text-sm text-white">
        <div>GET /api/admin/backups/weekly</div>
        <div>Authorization: Bearer $CRON_SECRET</div>
        <div>Optional: /api/admin/backups/weekly?restaurantId=...</div>
      </div>
      <p className="mt-3 text-sm text-slate-600">This is a structural backup discipline step. It does not replace Render Postgres backups or restore drills.</p>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Migration Repair Runbook Summary</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>Create a staging Render PostgreSQL database.</li>
        <li>Export production tenant JSON and create a Render database backup.</li>
        <li>Restore/copy production data into staging.</li>
        <li>Run <code>pnpm prisma migrate status</code> against staging.</li>
        <li>Run <code>npx prisma migrate status</code> against staging.</li>
        <li>Run tenant, cross-tenant, backup, permissions, and forecast tests against staging.</li>
        <li>Click-test the app against staging data.</li>
        <li>Record each passing result as a SystemCheck.</li>
      </ol>
      <p className="mt-3 text-sm font-bold text-red-700">Do not onboard outside customers until staging tenant, backup, restore, forecast, and migration checks are recorded as passing.</p>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Support Markers</h2>
      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        <div><dt className="text-sm font-bold text-slate-500">Last audit event</dt><dd className="font-black">{lastAudit ? `${lastAudit.action} ${lastAudit.entity}` : '—'}</dd><dd className="text-sm text-slate-500">{fmt(lastAudit?.createdAt)}</dd></div>
        <div><dt className="text-sm font-bold text-slate-500">Backup exports logged</dt><dd className="font-black">{backupRunCount}</dd></div>
        <div><dt className="text-sm font-bold text-slate-500">Current tenant</dt><dd className="font-black">{restaurant.name}</dd></div>
        <div><dt className="text-sm font-bold text-slate-500">Database connection</dt><dd className="font-black text-emerald-700">Connected</dd></div>
      </dl>
    </section>
  </Shell>;
}
