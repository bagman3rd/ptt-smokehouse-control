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

export default async function EndOfDayPage({ searchParams }: { searchParams?: { savedAt?: string } }) {
  noStore();
  await ensureDefaultData(prisma);
  const [proteins, latestLog] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.endOfDayLog.findFirst({ orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);

  const proteinProps = proteins.map((protein) => ({ id: protein.id, name: protein.name, inputUnit: protein.inputUnit }));

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">End-of-Day Log</h1>
      <p className="mt-2 text-slate-600">KM enters actual sales, cooked units, usable leftovers, waste, and 86 events.</p>
      {searchParams?.savedAt ? <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">End-of-day log saved. Latest saved values are shown below.</p> : null}
    </div>

    <EndOfDayForm proteins={proteinProps} />

    {latestLog ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Latest Saved Log</h2>
      <p className="mt-1 text-slate-600">{fmtDateWithDow(latestLog.serviceDate)} · Total sales ${latestLog.totalSales.toLocaleString()} · BBQ sales ${latestLog.bbqSales.toLocaleString()}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {latestLog.proteinLogs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{log.protein.name}</strong>: sold {log.soldCookedLb} lb · leftover {log.usableLeftoverUnits} {displayUnit(log.protein.name, log.protein.inputUnit)} / {log.usableLeftoverLb} lb · waste {log.wasteLb} lb {log.eightySixed ? '· 86' : ''}</div>)}
      </div>
    </section> : null}
  </Shell>;
}
