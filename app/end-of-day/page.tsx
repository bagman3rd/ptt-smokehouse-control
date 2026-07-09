import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { saveEndOfDayLog } from '@/app/actions';

function today() { return new Date().toISOString().slice(0,10); }
function fmtDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function EndOfDayPage() {
  await ensureDefaultData(prisma);
  const [proteins, latestLog] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.endOfDayLog.findFirst({ orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true } } } })
  ]);

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">End-of-Day Log</h1>
      <p className="mt-2 text-slate-600">KM enters actual sales, cooked units, usable leftovers, waste, and 86 events.</p>
    </div>

    <form action={saveEndOfDayLog} className="space-y-6">
      <section className="card p-5">
        <h2 className="text-xl font-black">Service Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div><label className="label">Service Date</label><input className="field mt-1" type="date" name="serviceDate" defaultValue={today()} required /></div>
          <div><label className="label">Total Sales</label><input className="field mt-1" type="number" step="1" name="totalSales" placeholder="0" /></div>
          <div><label className="label">BBQ Sales</label><input className="field mt-1" type="number" step="1" name="bbqSales" placeholder="0" /></div>
          <div><label className="label">Notes</label><input className="field mt-1" name="notes" placeholder="Weather, events, service issues" /></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-black">Protein Results</h2>
        <div className="mt-4 space-y-4">
          {proteins.map(p => <div key={p.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-lg font-black">{p.name}</div>
            <div className="grid gap-3 md:grid-cols-6">
              <div><label className="label">Cooked Units</label><input className="field mt-1" name={`cookedUnits-${p.id}`} type="number" step="0.1" /></div>
              <div><label className="label">Sold Cooked lb</label><input className="field mt-1" name={`soldCookedLb-${p.id}`} type="number" step="0.1" /></div>
              <div><label className="label">Usable Leftover lb</label><input className="field mt-1" name={`usableLeftoverLb-${p.id}`} type="number" step="0.1" /></div>
              <div><label className="label">Waste lb</label><input className="field mt-1" name={`wasteLb-${p.id}`} type="number" step="0.1" /></div>
              <div><label className="label">Waste Reason</label><select className="field mt-1" name={`wasteReason-${p.id}`}><option value="">None</option><option>Overproduced</option><option>Dried out</option><option>Quality reject</option><option>Dropped/spoiled</option><option>Other</option></select></div>
              <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name={`eightySixed-${p.id}`} type="checkbox" className="h-5 w-5" /> 86?</label>
            </div>
          </div>)}
        </div>
        <button className="btn-primary mt-5 w-full md:w-auto">Save End-of-Day Log</button>
      </section>
    </form>

    {latestLog ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Latest Saved Log</h2>
      <p className="mt-1 text-slate-600">{fmtDate(latestLog.serviceDate)} · Total sales ${latestLog.totalSales.toLocaleString()} · BBQ sales ${latestLog.bbqSales.toLocaleString()}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {latestLog.proteinLogs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm"><strong>{log.protein.name}</strong>: sold {log.soldCookedLb} lb · leftover {log.usableLeftoverLb} lb · waste {log.wasteLb} lb {log.eightySixed ? '· 86' : ''}</div>)}
      </div>
    </section> : null}
  </Shell>;
}
