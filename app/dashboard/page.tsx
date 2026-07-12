import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole, hasRole } from '@/lib/auth';
import { StatCard } from '@/components/StatCard';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';
import { deleteFutureCookPlans } from '@/app/actions';
import { currentRestaurantForUser } from '@/lib/tenant';
import { FOOD_SALES_PERCENT, LIQUOR_SALES_PERCENT, salesBreakdown, salesBreakdownLine } from '@/lib/salesModel';

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
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
  await ensureDefaultData(prisma);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const operationalStartDate = addUtcDays(todayUtc, -1);
  const operationalHorizonDate = addUtcDays(todayUtc, 14);

  const planInclude = { items: { include: { protein: true } }, scenario: true };
  const [latestOperationalPlan, latestAnyPlan, latestLog, scenarios, logs, smokers] = await Promise.all([
    prisma.cookPlan.findFirst({
      where: { restaurantId, serviceDate: { gte: operationalStartDate, lte: operationalHorizonDate } },
      orderBy: { createdAt: 'desc' },
      include: planInclude
    }),
    prisma.cookPlan.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' }, include: planInclude }),
    prisma.endOfDayLog.findFirst({ where: { restaurantId }, orderBy: { serviceDate: 'desc' }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(restaurantId), orderBy: { annualSales: 'asc' } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId }, orderBy: { serviceDate: 'desc' }, take: 7, include: { proteinLogs: true } }),
    prisma.smoker.findMany({ where: { restaurantId, active: true } })
  ]);
  const latestPlan = latestOperationalPlan;
  const ignoredFuturePlan = latestAnyPlan && !latestOperationalPlan && latestAnyPlan.serviceDate > operationalHorizonDate ? latestAnyPlan : null;
  const smokerCapacity = smokers.reduce((sum, smoker) => ({ brisket: sum.brisket + smoker.brisketCapacity, pork: sum.pork + smoker.porkCapacity, ribs: sum.ribs + smoker.ribCapacity, chicken: sum.chicken + smoker.chickenCapacity }), { brisket: 0, pork: 0, ribs: 0, chicken: 0 });
  const operationalAlerts: string[] = [];
  if (!latestPlan) operationalAlerts.push('No current operational cook plan exists in the active 14-day window.');
  if (latestPlan?.confidence === 'LOW') operationalAlerts.push('Forecast confidence is LOW because operating history is still thin.');
  latestPlan?.items.forEach((item) => {
    const unit = displayUnit(item.protein.name, item.protein.inputUnit);
    if ((item.notes ?? '').toLowerCase().includes('no data, check hot box')) operationalAlerts.push(`${item.protein.name}: exact prior-day EOD credit is missing or incomplete. Check hot box manually.`);
    if ((item.approvedCookUnits ?? item.recommendedCookUnits) >= item.protein.maxCookUnits) operationalAlerts.push(`${item.protein.name}: recommended load is at/above max setting (${item.protein.maxCookUnits} ${unit}). Check smoker capacity.`);
    const approvedOrRecommended = item.approvedCookUnits ?? item.recommendedCookUnits;
    const lower = item.protein.name.toLowerCase();
    const capacity = lower.includes('brisket') ? smokerCapacity.brisket : lower.includes('pork') ? smokerCapacity.pork : lower.includes('rib') ? smokerCapacity.ribs : lower.includes('chicken') ? smokerCapacity.chicken : 0;
    if (capacity > 0 && approvedOrRecommended > capacity) operationalAlerts.push(`${item.protein.name}: load ${approvedOrRecommended} ${unit} exceeds active smoker capacity of ${capacity} ${unit}.`);
    if (capacity === 0) operationalAlerts.push(`${item.protein.name}: no smoker capacity has been entered yet. Add smokers in Admin → Smokers.`);
  });
  const wasteLb7 = logs.flatMap(l => l.proteinLogs).reduce((sum, l) => sum + l.wasteLb, 0);
  const leftoverLb = latestLog?.proteinLogs.reduce((sum, l) => sum + l.usableLeftoverLb, 0) ?? 0;
  const leftoverUnits = latestLog?.proteinLogs.reduce((sum, l) => sum + (l.usableLeftoverUnits || 0), 0) ?? 0;
  const sellouts7 = logs.flatMap(l => l.proteinLogs).filter(l => l.eightySixed).length;

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Consultant Dashboard</h1>
        <p className="mt-2 text-slate-600">{restaurant.name} · Private view for protein-load planning before KM/pitmaster rollout.</p>
      </div>
      {hasRole(user, ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']) ? <Link href="/cook-plan" className="btn-primary">Create / Review Cook Plan</Link> : <Link href="/end-of-day" className="btn-primary">Enter End-of-Day Log</Link>}
    </div>

    <div className="grid gap-4 md:grid-cols-5">
      <StatCard label="Latest Forecast" value={latestPlan ? money(latestPlan.forecastSales) : 'No plan'} note={latestPlan ? `${fmtDateWithDow(latestPlan.serviceDate)} · ${latestPlan.scenario.name}` : 'Create first cook plan'} />
      <StatCard label="Smoked Meat Forecast" value={latestPlan ? money(latestPlan.forecastBbqSales) : '—'} note={latestPlan ? `20% liquor is excluded before meat demand · Confidence: ${latestPlan.confidence}` : undefined} />
      <StatCard label="Liquor/Food Split" value={`${LIQUOR_SALES_PERCENT}% / ${FOOD_SALES_PERCENT}%`} note={latestPlan ? `${money(latestPlan.forecastSales * 0.2)} liquor · ${money(latestPlan.forecastSales * 0.8)} food` : 'Total sales split before BBQ forecast'} />
      <StatCard label="Usable Leftover" value={`${Math.round(leftoverUnits)} units`} note={`${Math.round(leftoverLb)} lb from latest EOD log`} />
      <StatCard label="7-Day Sellouts" value={`${sellouts7}`} note={`7-day waste: ${Math.round(wasteLb7)} lb`} />
    </div>


    <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      <h2 className="text-lg font-black">Sales Model: liquor is factored out</h2>
      <p className="mt-1 font-semibold">The forecast starts with total restaurant sales, removes the 20% liquor/bar portion, then uses smoked-meat sales to drive brisket, pork, ribs, and chicken production.</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {scenarios.map((scenario) => {
          const breakdown = salesBreakdown(scenario.annualSales, scenario.bbqSalesPercent);
          return <div key={scenario.id} className="rounded-xl bg-white/70 p-3">
            <div className="font-black">{scenario.name}</div>
            <div className="text-xs font-bold text-blue-900">{salesBreakdownLine(scenario.annualSales, scenario.bbqSalesPercent)}</div>
            <div className="mt-1 text-xs text-blue-800">Non-smoked food: {money(breakdown.nonSmokedFoodSales)}. Meat production is based on smoked meat only, not liquor sales.</div>
          </div>;
        })}
      </div>
    </section>


    {ignoredFuturePlan ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <strong>Future test plan ignored:</strong> A plan exists for {fmtDateWithDow(ignoredFuturePlan.serviceDate)}, but the dashboard now only treats plans from {fmtDateWithDow(operationalStartDate)} through {fmtDateWithDow(operationalHorizonDate)} as current operational plans. Open Cook Plan and generate a current date to replace the dashboard view.
    </div> : null}

    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black">Operational Alerts</h2>
          <p className="text-sm text-slate-600">Quick exceptions before anyone loads the pit.</p>
        </div>
        {hasRole(user, ['ADMIN', 'OWNER']) ? <form action={deleteFutureCookPlans}>
          <button className="btn-secondary" type="submit">Delete future test plans beyond 14 days</button>
        </form> : null}
      </div>
      {operationalAlerts.length === 0 ? <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">No current alerts.</div> : <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-amber-900">
        {operationalAlerts.map((alert) => <li key={alert}>{alert}</li>)}
      </ul>}
    </section>

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
            <div className="mt-1 text-sm text-slate-600">20% liquor removed · smoked meat {s.bbqSalesPercent}% of total ({Math.round(s.bbqSalesPercent / 80 * 100)}% of food) · Safety {s.safetyFactorPct}% · Mix B/P/R/C {s.brisketMixPct}/{s.porkMixPct}/{s.ribsMixPct}/{s.chickenMixPct}</div>
          </div>)}
        </div>
      </div>
    </section>
  </Shell>;
}
