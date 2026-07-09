import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { StatCard } from '@/components/StatCard';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';

function money(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function fmtDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function DashboardPage() {
  await ensureDefaultData(prisma);
  const [latestPlan, latestLog, scenarios, logs] = await Promise.all([
    prisma.cookPlan.findFirst({ orderBy: { serviceDate: 'desc' }, include: { items: { include: { protein: true } }, scenario: true } }),
    prisma.endOfDayLog.findFirst({ orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } }),
    prisma.endOfDayLog.findMany({ orderBy: { serviceDate: 'desc' }, take: 7, include: { proteinLogs: true } })
  ]);
  const wasteLb7 = logs.flatMap(l => l.proteinLogs).reduce((sum, l) => sum + l.wasteLb, 0);
  const leftoverLb = latestLog?.proteinLogs.reduce((sum, l) => sum + l.usableLeftoverLb, 0) ?? 0;
  const sellouts7 = logs.flatMap(l => l.proteinLogs).filter(l => l.eightySixed).length;

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Consultant Dashboard</h1>
        <p className="mt-2 text-slate-600">Private view for protein-load planning before KM/pitmaster rollout.</p>
      </div>
      <Link href="/cook-plan" className="btn-primary">Create / Review Cook Plan</Link>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="Latest Forecast" value={latestPlan ? money(latestPlan.forecastSales) : 'No plan'} note={latestPlan ? `${fmtDate(latestPlan.serviceDate)} · ${latestPlan.scenario.name}` : 'Create first cook plan'} />
      <StatCard label="BBQ Forecast" value={latestPlan ? money(latestPlan.forecastBbqSales) : '—'} note={latestPlan ? `Confidence: ${latestPlan.confidence}` : undefined} />
      <StatCard label="Usable Leftover" value={`${Math.round(leftoverLb)} lb`} note="From latest end-of-day log" />
      <StatCard label="7-Day Sellouts" value={`${sellouts7}`} note={`7-day waste: ${Math.round(wasteLb7)} lb`} />
    </div>

    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-xl font-black">Current Cook Recommendation</h2>
        {!latestPlan ? <p className="mt-3 text-slate-600">No cook plan yet.</p> : <div className="mt-4 space-y-3">
          {latestPlan.items.map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold">{item.protein.name}</div>
              <div className="text-2xl font-black">{item.approvedCookUnits ?? item.recommendedCookUnits}</div>
            </div>
            <div className="mt-1 text-sm text-slate-600">Cooked need {item.cookedLbNeeded} lb · Raw need {item.rawLbNeeded} lb · Leftover credit {item.usableLeftoverLb} lb</div>
          </div>)}
        </div>}
      </div>
      <div className="card p-5">
        <h2 className="text-xl font-black">Forecast Scenarios</h2>
        <div className="mt-4 space-y-3">
          {scenarios.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between"><div className="font-bold">{s.name}</div><div className="font-black">{money(s.annualSales)}</div></div>
            <div className="mt-1 text-sm text-slate-600">BBQ {s.bbqSalesPercent}% · Safety {s.safetyFactorPct}% · Mix B/P/R/C {s.brisketMixPct}/{s.porkMixPct}/{s.ribsMixPct}/{s.chickenMixPct}</div>
          </div>)}
        </div>
      </div>
    </section>
  </Shell>;
}
