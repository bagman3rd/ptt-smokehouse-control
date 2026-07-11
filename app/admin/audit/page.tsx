import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(date: Date) {
  return date.toLocaleString('en-US', { timeZone: 'America/New_York' });
}

function compactJson(value: string | null) {
  if (!value) return '—';
  try { return JSON.stringify(JSON.parse(value)).slice(0, 220); } catch { return value.slice(0, 220); }
}

export default async function AuditPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const logs = await prisma.auditLog.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Audit Log</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · Last 100 audited actions. This is the control log for settings, users, restaurants, reports, cook plans, and EOD activity.</p>
    </div>
    <section className="card p-5 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Actor</th><th className="py-2 pr-4">Action</th><th className="py-2 pr-4">Entity</th><th className="py-2 pr-4">Details</th></tr></thead>
        <tbody>{logs.map((log) => <tr key={log.id} className="border-b align-top"><td className="py-3 pr-4 whitespace-nowrap">{fmt(log.createdAt)}</td><td className="py-3 pr-4 font-semibold">{log.actorName}</td><td className="py-3 pr-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{log.action}</span></td><td className="py-3 pr-4">{log.entity}<div className="text-xs text-slate-400">{log.entityId || ''}</div></td><td className="py-3 pr-4 text-xs text-slate-600"><div>Before: {compactJson(log.beforeJson)}</div><div className="mt-1">After: {compactJson(log.afterJson)}</div></td></tr>)}</tbody>
      </table>
      {logs.length === 0 ? <p className="py-8 text-center text-slate-500">No audit entries yet for this restaurant.</p> : null}
    </section>
  </Shell>;
}
