import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { StatCard } from '@/components/StatCard';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

function money(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

export default async function DashboardPage() {
  await ensureDefaultData(prisma);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const operationalStartDate = addUtcDays(todayUtc, -1);
  const operationalHorizonDate = addUtcDays(todayUtc, 14);

  const planInclude = { items: { include: { protein: true } }, scenario: true };
  const [latestOperationalPlan, latestAnyPlan, latestLog, scenarios, logs] = await Promise.all([
    prisma.cookPlan.findFirst({
      where: { serviceDate: { gte: operationalStartDate, lte: operationalHorizonDate } },
      orderBy: { createdAt: 'desc' },
      include: planInclude
    }),
    prisma.cookPlan.findFirst({ orderBy: { createdAt: 'desc' }, include: planInclude }),
    prisma.endOfDayLog.findFirst({ orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } }),
    prisma.endOfDayLog.findMany({ orderBy: { serviceDate: 'desc' }, take: 7, include: { proteinLogs: true } })
  ]);
  const latestPlan = latestOperationalPlan;
  const ignoredFuturePlan = latestAnyPlan && !latestOperationalPlan && latestAnyPlan.serviceDate > operationalHorizonDate ? latestAnyPlan : null;
  const wasteLb7 = logs.flatMap(l => l.proteinLogs).reduce((sum, l) => sum + l.wasteLb, 0);
  const leftoverLb = latestLog?.proteinLogs.reduce((sum, l) => sum + l.usableLeftoverLb, 0) ?? 0;
  const leftoverUnits = latestLog?.proteinLogs.reduce((sum, l) => sum + (l.usableLeftoverUnits || 0), 0) ?? 0;
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
      <StatCard label="Latest Forecast" value={latestPlan ? money(latestPlan.forecastSales) : 'No plan'} note={latestPlan ? `${fmtDateWithDow(latestPlan.serviceDate)} · ${latestPlan.scenario.name}` : 'Create first cook plan'} />
      <StatCard label="Smoked Meat Forecast" value={latestPlan ? money(latestPlan.forecastBbqSales) : '—'} note={latestPlan ? `Confidence: ${latestPlan.confidence}` : undefined} />
      <StatCard label="Usable Leftover" value={`${Math.round(leftoverUnits)} units`} note={`${Math.round(leftoverLb)} lb from latest EOD log`} />
      <StatCard label="7-Day Sellouts" value={`${sellouts7}`} note={`7-day waste: ${Math.round(wasteLb7)} lb`} />
    </div>


    {ignoredFuturePlan ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <strong>Future test plan ignored:</strong> A plan exists for {fmtDateWithDow(ignoredFuturePlan.serviceDate)}, but the dashboard now only treats plans from {fmtDateWithDow(operationalStartDate)} through {fmtDateWithDow(operationalHorizonDate)} as current operational plans. Open Cook Plan and generate a current date to replace the dashboard view.
    </div> : null}

    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-xl font-black">Current Operational Cook Recommendation</h2>
        {!latestPlan ? <p className="mt-3 text-slate-600">No operational cook plan in the current 14-day window.</p> : <div className="mt-4 space-y-3">
          {latestPlan.items.map(item => {
            const noPriorEodData = (item.notes ?? '').toLowerCase().includes('no data, check hot box');
            return <div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold">{item.protein.name}</div>
              <div className="text-2xl font-black">{item.approvedCookUnits ?? item.recommendedCookUnits}</div>
            </div>
            <div className="mt-1 text-sm text-slate-600">Forecast {item.forecastCookUnits || item.recommendedCookUnits} {displayUnit(item.protein.name, item.protein.inputUnit)} · Leftover {noPriorEodData ? 'no data, check hot box' : `${item.usableLeftoverUnits} ${displayUnit(item.protein.name, item.protein.inputUnit)} / ${item.usableLeftoverLb} lb`} · Load {(item.approvedCookUnits ?? item.recommendedCookUnits)} {displayUnit(item.protein.name, item.protein.inputUnit)}</div>
          </div>})}
        </div>}
      </div>
      <div className="card p-5">
        <h2 className="text-xl font-black">Forecast Scenarios</h2>
        <div className="mt-4 space-y-3">
          {scenarios.map(s => <div key={s.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between"><div className="font-bold">{s.name}</div><div className="font-black">{money(s.annualSales)}</div></div>
            <div className="mt-1 text-sm text-slate-600">Smoked meat {s.bbqSalesPercent}% · Safety {s.safetyFactorPct}% · Mix B/P/R/C {s.brisketMixPct}/{s.porkMixPct}/{s.ribsMixPct}/{s.chickenMixPct}</div>
          </div>)}
        </div>
      </div>
    </section>
  </Shell>;
}
