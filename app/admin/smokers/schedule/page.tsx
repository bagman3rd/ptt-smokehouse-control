import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { fmtDateWithDow } from '@/lib/date';
import { buildSmokerLoadSchedule, scheduleWarnings } from '@/lib/smokerSchedule';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function statusClass(status: string) {
  if (status === 'OK') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'WARNING') return 'bg-red-50 text-red-900 border-red-200';
  return 'bg-amber-50 text-amber-900 border-amber-200';
}

export default async function SmokerSchedulePage() {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  noStore();
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const [plan, smokers] = await Promise.all([
    prisma.cookPlan.findFirst({
      where: { restaurantId },
      orderBy: { serviceDate: 'desc' },
      include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
    }),
    prisma.smoker.findMany({ where: { restaurantId }, orderBy: [{ active: 'desc' }, { name: 'asc' }] })
  ]);
  const rows = buildSmokerLoadSchedule(smokers, plan);
  const warnings = scheduleWarnings(rows);
  const activeSmokers = smokers.filter((smoker) => smoker.active);

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Smoker Schedule</h1>
        <p className="mt-2 text-slate-600">Assign overnight and same-day loads only to eligible smokers, split loads across equipment, and reserve backup capacity until needed.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/smokers" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">Edit Smokers</Link>
        <Link href="/today" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">Today</Link>
        <Link href="/cook-plan" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Cook Plan</Link>
      </div>
    </div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Restaurant</div><div className="mt-2 text-lg font-black">{restaurant.name}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Plan Date</div><div className="mt-2 text-lg font-black">{plan ? fmtDateWithDow(plan.serviceDate) : 'No plan'}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Active Smokers</div><div className="mt-2 text-3xl font-black">{activeSmokers.length}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Schedule Warnings</div><div className="mt-2 text-3xl font-black">{warnings.length}</div></div>
    </section>

    {warnings.length ? <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950">
      <h2 className="text-lg font-black">Capacity conflicts to resolve</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold">
        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </section> : <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
      <h2 className="text-lg font-black">No smoker-capacity conflicts detected</h2>
      <p className="mt-1 text-sm font-bold">This only checks entered smoker capacity. KM still verifies actual racks, hot-box condition, staffing, and timing.</p>
    </section>}

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Production Schedule</h2>
      {!plan ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No cook plan exists yet. Generate a cook plan first.</p> : null}
      {rows.length ? <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Time</th><th>Protein</th><th>Load</th><th>Smoker</th><th>Capacity</th><th>Status</th><th>Instruction</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={`${row.proteinName}-${row.startTime}`} className="border-b align-top">
            <td className="py-3 font-black">{row.startTime}<div className="text-xs font-bold text-slate-500">to {row.endTime}</div></td>
            <td className="py-3 font-black">{row.proteinName}<div className="text-xs font-bold text-slate-500">{row.phase}</div></td>
            <td className="py-3 text-lg font-black">{row.units} {row.unitLabel}</td>
            <td className="py-3 font-bold">{row.smokerName}<div className="mt-1 text-xs text-slate-500">{row.allocationSummary}</div></td>
            <td className="py-3 font-bold">{row.capacity || 'Not set'}</td>
            <td className="py-3"><span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(row.capacityStatus)}`}>{row.capacityStatus.replace('_', ' ')}</span></td>
            <td className="py-3"><div className="font-bold text-slate-700">{row.instruction}</div>{row.suggestedFix ? <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">Suggested fix: {row.suggestedFix}</div> : null}</td>
          </tr>)}</tbody>
        </table>
      </div> : null}
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Active Smoker Matrix</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Smoker</th><th>Window</th><th>Racks</th><th>Brisket</th><th>Pork</th><th>Ribs</th><th>Chicken</th></tr></thead>
          <tbody>{smokers.map((smoker) => <tr key={smoker.id} className={!smoker.active ? 'border-b bg-slate-50 text-slate-400' : 'border-b'}>
            <td className="py-3 font-black">{smoker.name}<div className="text-xs font-bold text-slate-500">{smoker.model || 'No model'} · {smoker.location || 'No location'} {smoker.active ? '' : '· inactive'}</div></td>
            <td>{smoker.cookWindow || 'Not entered'}</td>
            <td>{smoker.rackCount}</td>
            <td>{smoker.brisketCapacity}</td>
            <td>{smoker.porkCapacity}</td>
            <td>{smoker.ribCapacity}</td>
            <td>{smoker.chickenCapacity}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </Shell>;
}
