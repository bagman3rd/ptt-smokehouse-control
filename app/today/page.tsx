import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole, hasRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { fmtDateWithDow, addUtcDays } from '@/lib/date';
import { computeDataQuality, confidenceFromDataQuality } from '@/lib/dataQuality';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function startOfUtcDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function timing(proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return '5:00 PM prior-day pork butt load; hold for next-day service.';
  if (lower.includes('brisket')) return '9:00 AM–9:00 PM cook, then overnight hot hold for next-day service.';
  if (lower.includes('rib')) return 'Same-day rib cook; load against today’s service demand.';
  if (lower.includes('chicken')) return 'Same-day chicken cook; load against today’s service demand.';
  return 'Cook per kitchen manager direction.';
}

function capacityFor(smokers: Array<any>, proteinName: string) {
  const lower = proteinName.toLowerCase();
  return smokers.reduce((sum, smoker) => {
    if (lower.includes('brisket')) return sum + (smoker.brisketCapacity || 0);
    if (lower.includes('pork')) return sum + (smoker.porkCapacity || 0);
    if (lower.includes('rib')) return sum + (smoker.ribCapacity || 0);
    if (lower.includes('chicken')) return sum + (smoker.chickenCapacity || 0);
    return sum;
  }, 0);
}

export default async function TodayPage() {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
  noStore();
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const today = startOfUtcDay();
  const tomorrow = addUtcDays(today, 1);
  const yesterday = addUtcDays(today, -1);
  const canManagePlan = hasRole(user, ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);

  const [todayPlan, nextPlan, todayEod, priorEod, smokers, dataQuality] = await Promise.all([
    prisma.cookPlan.findFirst({ where: { restaurantId, serviceDate: today }, orderBy: { createdAt: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }),
    prisma.cookPlan.findFirst({ where: { restaurantId, serviceDate: tomorrow }, orderBy: { createdAt: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }),
    prisma.endOfDayLog.findFirst({ where: { restaurantId, serviceDate: today }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.endOfDayLog.findFirst({ where: { restaurantId, serviceDate: yesterday }, include: { proteinLogs: true } }),
    prisma.smoker.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }).catch(() => []),
    computeDataQuality(prisma, restaurantId)
  ]);

  const operationalPlan = todayPlan ?? nextPlan;
  const confidence = confidenceFromDataQuality(dataQuality.score);
  const capacityWarnings = operationalPlan?.items.map((item) => {
    const units = item.approvedCookUnits ?? item.recommendedCookUnits;
    const capacity = capacityFor(smokers, item.protein.name);
    return capacity > 0 && units > capacity ? `${item.protein.name}: load ${units} ${displayUnit(item.protein.name, item.protein.inputUnit)} exceeds active smoker capacity ${capacity}.` : null;
  }).filter(Boolean) ?? [];

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Today</h1>
        <p className="mt-2 text-slate-600">{restaurant.name} · daily command center for the KM and pit crew.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/cook-plan" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">Cook Plan</Link>
        <Link href={`/end-of-day?serviceDate=${today.toISOString().slice(0,10)}`} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Start EOD Log</Link>
        {operationalPlan ? <Link href={`/cook-plan/print?planId=${operationalPlan.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">Print Cook Plan</Link> : null}
      </div>
    </div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Today</div><div className="mt-2 text-lg font-black">{fmtDateWithDow(today)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">EOD Status</div><div className="mt-2 text-2xl font-black">{todayEod?.status || 'Not started'}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Prior EOD</div><div className="mt-2 text-2xl font-black">{priorEod ? priorEod.status : 'Missing'}</div><div className="text-xs font-bold text-slate-500">{fmtDateWithDow(yesterday)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Data Quality</div><div className="mt-2 text-3xl font-black">{dataQuality.score}%</div><div className="text-xs font-black text-slate-500">{dataQuality.label} · forecast confidence {confidence}</div></div>
    </section>

    {dataQuality.warnings.length ? <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="text-lg font-black">Data-quality warnings</div>
      <ul className="mt-2 list-disc pl-5 text-sm font-bold">{dataQuality.warnings.slice(0, 5).map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section> : null}

    {capacityWarnings.length ? <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950">
      <div className="text-lg font-black">Smoker capacity warnings</div>
      <ul className="mt-2 list-disc pl-5 text-sm font-bold">{capacityWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section> : null}

    <section className="card mt-6 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Daily Load Plan</h2>
          <p className="mt-1 text-sm text-slate-600">Shows today’s load plan when available; otherwise shows tomorrow’s next load plan.</p>
        </div>
        {operationalPlan ? <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">{operationalPlan.status} · {operationalPlan.confidence} model confidence · {confidence} data confidence</div> : null}
      </div>
      {!operationalPlan ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No current cook plan found. Generate one from Cook Plan.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2">
        {operationalPlan.items.map((item) => {
          const units = item.approvedCookUnits ?? item.recommendedCookUnits;
          return <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3"><div className="text-lg font-black">{item.protein.name}</div><div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{units} {displayUnit(item.protein.name, item.protein.inputUnit)}</div></div>
            <div className="mt-2 text-sm font-bold text-slate-600">{timing(item.protein.name)}</div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-black text-slate-500">Forecast</span>{item.forecastCookUnits} units</div>
              <div className="rounded-xl bg-amber-50 p-3"><span className="block text-xs font-black text-amber-700">Prior EOD Credit</span>{item.usableLeftoverUnits} units</div>
              <div className="rounded-xl bg-blue-50 p-3"><span className="block text-xs font-black text-blue-700">Capacity</span>{capacityFor(smokers, item.protein.name) || 'Not set'}</div>
            </div>
            {item.overrideReason ? <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Override/manager note: {item.overrideReason}</div> : null}
          </div>;
        })}
      </div>}
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Smoker Load Schedule</h2>
      {smokers.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No active smoker capacity entered. Add smokers in Admin → Smokers.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">
        {smokers.map((smoker) => <div key={smoker.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="text-lg font-black">{smoker.name}</div>
          <div className="text-sm text-slate-600">{smoker.model || 'No model'} · {smoker.location || 'No location'} · {smoker.cookWindow || 'No cook window entered'}</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-slate-700">
            <li>5:00 PM — pork butt load if pork is on the next-day plan.</li>
            <li>9:00 AM — brisket cook start for next-day service.</li>
            <li>Same day — ribs and chicken after hot-box and prior EOD check.</li>
          </ul>
        </div>)}
      </div>}
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Manager Notes</h2>
      <p className="mt-2 text-sm text-slate-600">Use this screen for execution. Generate/approve plans from Cook Plan. Close actual results from End of Day.</p>
      {!canManagePlan ? <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">Kitchen Crew access is read-only for cook plans and write-enabled for End-of-Day logs.</p> : null}
    </section>
  </Shell>;
}
