import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { fmtDateWithDow } from '@/lib/date';

function pct(n: number) { return `${Math.round(n * 10) / 10}%`; }

export default async function ReportsPage() {
  const logs = await prisma.endOfDayLog.findMany({ orderBy: { serviceDate: 'desc' }, take: 30, include: { proteinLogs: { include: { protein: true } } } });
  const totalSales = logs.reduce((s,l)=>s+l.totalSales,0);
  const bbqSales = logs.reduce((s,l)=>s+l.bbqSales,0);
  const wasteLb = logs.flatMap(l=>l.proteinLogs).reduce((s,l)=>s+l.wasteLb,0);
  const soldLb = logs.flatMap(l=>l.proteinLogs).reduce((s,l)=>s+l.soldCookedLb,0);
  const sellouts = logs.flatMap(l=>l.proteinLogs).filter(l=>l.eightySixed).length;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Reports</h1>
      <p className="mt-2 text-slate-600">Early operating reports for waste, sellouts, smoked meat sales, and forecast tuning.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">30-Day Smoked Meat Sales</div><div className="mt-2 text-3xl font-black">${Math.round(bbqSales).toLocaleString()}</div><div className="mt-1 text-sm text-slate-500">Total sales ${Math.round(totalSales).toLocaleString()}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Smoked Meat Sales Mix</div><div className="mt-2 text-3xl font-black">{totalSales ? pct((bbqSales/totalSales)*100) : '—'}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Waste vs Sold lb</div><div className="mt-2 text-3xl font-black">{soldLb ? pct((wasteLb/soldLb)*100) : '—'}</div><div className="mt-1 text-sm text-slate-500">{Math.round(wasteLb)} lb waste</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">86 Events</div><div className="mt-2 text-3xl font-black">{sellouts}</div></div>
    </div>

    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-black">Recent Daily Logs</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Date</th><th className="p-3">Total Sales</th><th className="p-3">Smoked Meat Sales</th><th className="p-3">Sold lb</th><th className="p-3">Leftover Units</th><th className="p-3">Leftover lb</th><th className="p-3">Waste lb</th><th className="p-3">86s</th></tr></thead>
          <tbody>
            {logs.map(l => {
              const sold = l.proteinLogs.reduce((s,x)=>s+x.soldCookedLb,0);
              const leftover = l.proteinLogs.reduce((s,x)=>s+x.usableLeftoverLb,0);
              const leftoverUnits = l.proteinLogs.reduce((s,x)=>s+(x.usableLeftoverUnits || 0),0);
              const waste = l.proteinLogs.reduce((s,x)=>s+x.wasteLb,0);
              const x86 = l.proteinLogs.filter(x=>x.eightySixed).length;
              return <tr key={l.id} className="border-t border-slate-100"><td className="p-3 font-bold">{fmtDateWithDow(l.serviceDate)}</td><td className="p-3">${Math.round(l.totalSales).toLocaleString()}</td><td className="p-3">${Math.round(l.bbqSales).toLocaleString()}</td><td className="p-3">{sold}</td><td className="p-3">{leftoverUnits}</td><td className="p-3">{leftover}</td><td className="p-3">{waste}</td><td className="p-3">{x86}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  </Shell>;
}
