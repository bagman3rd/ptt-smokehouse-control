import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { fmtDateWithDow } from '@/lib/date';
import { EndOfDayForm } from '@/app/end-of-day/EndOfDayForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'chicken';
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
  noStore();
  await ensureDefaultData(prisma);
  const selectedDate = toDateOnlyOrNull(searchParams?.serviceDate);
  const [proteins, selectedLog, latestLog] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    selectedDate ? prisma.endOfDayLog.findUnique({ where: { serviceDate: selectedDate }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }) : Promise.resolve(null),
    prisma.endOfDayLog.findFirst({ orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);

  const displayLog = selectedLog ?? latestLog;
  const proteinProps = proteins.map((protein) => ({ id: protein.id, name: protein.name, inputUnit: protein.inputUnit }));
  const initialLog = displayLog ? {
    serviceDate: dateInputValue(displayLog.serviceDate),
    totalSales: displayLog.totalSales,
    bbqSales: displayLog.bbqSales,
    notes: displayLog.notes,
    proteinLogs: displayLog.proteinLogs.map((log) => ({
      proteinId: log.proteinId,
      cookedUnits: log.cookedUnits,
      soldCookedLb: log.soldCookedLb,
      usableLeftoverUnits: log.usableLeftoverUnits,
      usableLeftoverLb: log.usableLeftoverLb,
      wasteLb: log.wasteLb,
      wasteReason: log.wasteReason,
      eightySixed: log.eightySixed
    }))
  } : null;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">End-of-Day Log</h1>
      <p className="mt-2 text-slate-600">KM enters actual sales, cooked units, usable leftovers, waste, and 86 events.</p>
      {searchParams?.savedAt ? <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">End-of-day log saved. Saved values for that service date are loaded into the form and shown below.</p> : null}
    </div>

    <EndOfDayForm proteins={proteinProps} initialLog={initialLog} />

    {displayLog ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Saved Log Displayed</h2>
      <p className="mt-1 text-slate-600">{fmtDateWithDow(displayLog.serviceDate)} · Total sales ${displayLog.totalSales.toLocaleString()} · BBQ sales ${displayLog.bbqSales.toLocaleString()}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {displayLog.proteinLogs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{log.protein.name}</strong>: cooked {log.cookedUnits} {displayUnit(log.protein.name, log.protein.inputUnit)} · sold {log.soldCookedLb} lb · leftover {log.usableLeftoverUnits} {displayUnit(log.protein.name, log.protein.inputUnit)} / {log.usableLeftoverLb} lb · waste {log.wasteLb} lb {log.eightySixed ? '· 86' : ''}</div>)}
      </div>
    </section> : null}
  </Shell>;
}
