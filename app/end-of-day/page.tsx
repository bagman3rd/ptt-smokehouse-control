import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { fmtDateWithDow } from '@/lib/date';
import { EndOfDayForm } from '@/app/end-of-day/EndOfDayForm';
import { QuickEndOfDayForm } from '@/app/end-of-day/QuickEndOfDayForm';
import { currentRestaurantForUser } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function toDateOnlyOrNull(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EndOfDayPage({ searchParams }: { searchParams?: { savedAt?: string; serviceDate?: string } }) {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
  noStore();
  await ensureDefaultData(prisma);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const selectedDate = toDateOnlyOrNull(searchParams?.serviceDate);
  const [proteins, selectedLog, latestLog, recentLogs] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
    selectedDate ? prisma.endOfDayLog.findFirst({ where: { serviceDate: selectedDate, restaurantId }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }) : Promise.resolve(null),
    prisma.endOfDayLog.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId }, take: 10, orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);

  const displayLog = selectedLog ?? latestLog;
  const proteinProps = proteins.map((protein) => ({ id: protein.id, name: protein.name, code: protein.code, inputUnit: protein.inputUnit }));
  const quickInitialLog = selectedLog ? {
    serviceDate: dateInputValue(selectedLog.serviceDate),
    lockedAt: selectedLog.lockedAt ? selectedLog.lockedAt.toISOString() : null,
    proteinLogs: selectedLog.proteinLogs.map((log) => ({
      proteinId: log.proteinId,
      sealedUnopenedUnits: log.sealedUnopenedUnits,
      openedMeatLb: log.openedMeatLb
    }))
  } : null;

  const initialLog = displayLog ? {
    serviceDate: dateInputValue(displayLog.serviceDate),
    totalSales: displayLog.totalSales,
    bbqSales: displayLog.bbqSales,
    status: displayLog.status,
    lockedAt: displayLog.lockedAt ? displayLog.lockedAt.toISOString() : null,
    notes: displayLog.notes,
    proteinLogs: displayLog.proteinLogs.map((log) => ({
      proteinId: log.proteinId,
      cookedUnits: log.cookedUnits,
      soldCookedLb: log.soldCookedLb,
      usableLeftoverUnits: log.usableLeftoverUnits,
      usableLeftoverLb: log.usableLeftoverLb,
      wasteLb: log.wasteLb,
      wasteReason: log.wasteReason,
      eightySixed: log.eightySixed,
      sealedUnopenedUnits: log.sealedUnopenedUnits,
      openedMeatLb: log.openedMeatLb
    }))
  } : null;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">End-of-Day Log</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · KM enters actual sales, cooked units, usable leftovers, waste, and 86 events.</p>
      {searchParams?.savedAt ? <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">End-of-day log saved. Saved values for that service date are loaded into the form and shown below.</p> : null}
    </div>

    <QuickEndOfDayForm proteins={proteinProps} initialLog={quickInitialLog} />

    <EndOfDayForm proteins={proteinProps} initialLog={initialLog} />

    {displayLog ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Saved Log Displayed</h2>
      <p className="mt-1 text-slate-600">{fmtDateWithDow(displayLog.serviceDate)} · Status {displayLog.status}{displayLog.lockedAt ? ' · LOCKED' : ''} · Total sales ${displayLog.totalSales.toLocaleString()} · smoked meat sales ${displayLog.bbqSales.toLocaleString()}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {displayLog.proteinLogs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{log.protein.name}</strong>: cooked {log.cookedUnits} {displayUnit(log.protein.name, log.protein.inputUnit)} · sold {log.soldCookedLb} lb · leftover {log.usableLeftoverUnits} {displayUnit(log.protein.name, log.protein.inputUnit)} / {log.usableLeftoverLb} lb · sealed unopened {log.sealedUnopenedUnits} · opened meat {log.openedMeatLb} lb · waste {log.wasteLb} lb {log.eightySixed ? '· 86' : ''}</div>)}
      </div>
    </section> : null}

    <section className="card mt-6 p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black">Last 10 End-of-Day Logs</h2>
          <p className="mt-1 text-sm text-slate-600">Most recent saved EOD logs, newest first. Use this to verify the prior-day leftover credit source before generating the next cook plan.</p>
        </div>
      </div>
      {recentLogs.length === 0 ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">No end-of-day logs saved yet.</p> : <div className="mt-4 space-y-3">
        {recentLogs.map((log) => <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div className="font-black">{fmtDateWithDow(log.serviceDate)} · {log.status}{log.lockedAt ? ' · LOCKED' : ''}</div>
            <div className="text-sm font-bold text-slate-600">Total sales ${log.totalSales.toLocaleString()} · smoked meat sales ${log.bbqSales.toLocaleString()}</div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {log.proteinLogs.map((proteinLog) => <div key={proteinLog.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <strong>{proteinLog.protein.name}</strong>: cooked {proteinLog.cookedUnits} {displayUnit(proteinLog.protein.name, proteinLog.protein.inputUnit)} · sold {proteinLog.soldCookedLb} lb · leftover credit {proteinLog.usableLeftoverUnits} {displayUnit(proteinLog.protein.name, proteinLog.protein.inputUnit)} / {proteinLog.usableLeftoverLb} lb · sealed unopened {proteinLog.sealedUnopenedUnits} · opened meat {proteinLog.openedMeatLb} lb · waste {proteinLog.wasteLb} lb {proteinLog.eightySixed ? '· 86' : ''}
            </div>)}
          </div>
        </div>)}
      </div>}
    </section>
  </Shell>;
}
