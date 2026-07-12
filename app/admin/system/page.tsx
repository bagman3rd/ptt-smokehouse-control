import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import pkg from '@/package.json';

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
  const [restaurantCount, userCount, smokerCount, lastEod, lastPlan, lastAudit, backupRunCount, recommendationCount] = await Promise.all([
    prisma.restaurant.count(),
    prisma.user.count({ where: { memberships: { some: { restaurantId, active: true } } } }),
    prisma.smoker.count({ where: { restaurantId, active: true } }),
    prisma.endOfDayLog.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' } }),
    prisma.cookPlan.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' } }),
    prisma.auditLog.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' } }),
    prisma.reportRun.count({ where: { restaurantId, dataset: { contains: 'backup', mode: 'insensitive' } } }).catch(() => 0),
    prisma.learningRecommendation.count({ where: { restaurantId, status: 'PENDING' } }).catch(() => 0)
  ]);

  const migrationMode = 'DB Push Recovery Mode';
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">System Health</h1>
      <p className="mt-2 text-slate-600">Admin-only operational health page for pilot support, staging checks, and commercial-readiness tracking.</p>
    </div>

    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
      <div className="text-lg font-black">Pilot Mode Warning</div>
      <p className="mt-1 text-sm">This deployment is intentionally running in <strong>{migrationMode}</strong>. It is appropriate for the controlled PTT pilot, but staging tenant tests, backup restore drills, and migration baselining must pass before paid outside customers are added.</p>
    </div>

    <section className="mt-6 grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">App Version</div><div className="mt-2 text-2xl font-black">{pkg.version}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Migration Mode</div><div className="mt-2 text-xl font-black">{migrationMode}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Restaurants</div><div className="mt-2 text-3xl font-black">{restaurantCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Active Smokers</div><div className="mt-2 text-3xl font-black">{smokerCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Users in Tenant</div><div className="mt-2 text-3xl font-black">{userCount}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Last EOD</div><div className="mt-2 text-lg font-black">{fmt(lastEod?.serviceDate)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Last Cook Plan</div><div className="mt-2 text-lg font-black">{fmt(lastPlan?.serviceDate)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Pending Learning Items</div><div className="mt-2 text-3xl font-black">{recommendationCount}</div></div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Staging Tests Required Before Outside Customers</h2>
      <div className="mt-3 rounded-xl bg-slate-950 p-4 font-mono text-sm text-white">
        <div>DATABASE_URL=&quot;postgres://...staging...&quot; pnpm run test:tenant</div>
        <div>DATABASE_URL=&quot;postgres://...staging...&quot; pnpm run test:backup</div>
        <div>pnpm run test:forecast</div>
      </div>
      <p className="mt-3 text-sm text-slate-600">The scripts exist in the repo. This page intentionally does not claim they passed until they are run against a real staging PostgreSQL database.</p>
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
