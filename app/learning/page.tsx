import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function pct(value: number) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

function one(value: number) {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value * 10) / 10;
}

function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function planDateForProtein(serviceDate: Date, proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('brisket') || lower.includes('pork')) return addUtcDays(serviceDate, -1);
  return serviceDate;
}

function recommendationText(args: {
  proteinName: string;
  sampleCount: number;
  avgErrorPct: number;
  wastePct: number;
  selloutCount: number;
  avgLeftoverUnits: number;
}) {
  if (args.sampleCount < 3) {
    return 'Keep collecting data. Need at least 3 matched cook-plan/EOD days before making automatic forecast adjustments.';
  }
  const pieces: string[] = [];
  if (args.selloutCount >= 2 || args.avgErrorPct > 15) {
    pieces.push(`Increase ${args.proteinName} forecast weight or safety factor. Actual demand is running above forecast.`);
  }
  if (args.avgErrorPct < -15 && args.avgLeftoverUnits > 1) {
    pieces.push(`Reduce ${args.proteinName} forecast weight or safety factor. Forecast is running high and creating leftover load.`);
  }
  if (args.wastePct > 10) {
    pieces.push(`Waste is above 10%. Review holding quality and lower the safety factor unless sellouts are also occurring.`);
  }
  if (args.selloutCount === 0 && args.wastePct < 6 && Math.abs(args.avgErrorPct) <= 15) {
    pieces.push('Hold current settings. Forecast is inside a reasonable early-stage tolerance band.');
  }
  return pieces.join(' ');
}

export default async function LearningPage() {
    await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
noStore();
  await ensureDefaultData(prisma);

  const [proteins, plans, logs, scenarios] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.cookPlan.findMany({
      orderBy: { serviceDate: 'desc' },
      take: 120,
      include: { scenario: true, items: { include: { protein: true } } }
    }),
    prisma.endOfDayLog.findMany({
      where: { status: { in: ['COMPLETE', 'REVIEWED', 'LOCKED'] } },
      orderBy: { serviceDate: 'desc' },
      take: 120,
      include: { proteinLogs: { include: { protein: true } } }
    }),
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } })
  ]);

  const planByDate = new Map(plans.map((plan) => [iso(plan.serviceDate), plan]));
  const proteinSummaries = proteins.map((protein) => {
    const unit = displayUnit(protein.name, protein.inputUnit);
    const matchedRows = logs.flatMap((log) => {
      const proteinLog = log.proteinLogs.find((row) => row.proteinId === protein.id);
      if (!proteinLog) return [];
      const matchingPlanDate = planDateForProtein(log.serviceDate, protein.name);
      const plan = planByDate.get(iso(matchingPlanDate));
      const item = plan?.items.find((row) => row.proteinId === protein.id);
      if (!plan || !item) return [];
      const cookedUnitLb = protein.cookedWeightEachLb > 0
        ? protein.cookedWeightEachLb
        : protein.rawWeightEachLb * (protein.cookedYieldPercent / 100);
      const actualSoldUnits = cookedUnitLb > 0 ? proteinLog.soldCookedLb / cookedUnitLb : 0;
      const actualDemandUnits = actualSoldUnits + (proteinLog.eightySixed ? Math.max(1, item.recommendedCookUnits * 0.08) : 0);
      const forecastUnits = item.forecastCookUnits || item.recommendedCookUnits || 0;
      const errorPct = forecastUnits > 0 ? ((actualDemandUnits - forecastUnits) / forecastUnits) * 100 : 0;
      return [{
        serviceDate: log.serviceDate,
        planDate: matchingPlanDate,
        forecastUnits,
        recommendedUnits: item.recommendedCookUnits,
        actualSoldUnits,
        actualDemandUnits,
        errorPct,
        leftoverUnits: proteinLog.usableLeftoverUnits,
        wasteLb: proteinLog.wasteLb,
        soldLb: proteinLog.soldCookedLb,
        eightySixed: proteinLog.eightySixed
      }];
    });

    const sampleCount = matchedRows.length;
    const avgErrorPct = sampleCount ? matchedRows.reduce((sum, row) => sum + row.errorPct, 0) / sampleCount : 0;
    const avgForecastUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.forecastUnits, 0) / sampleCount : 0;
    const avgActualDemandUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.actualDemandUnits, 0) / sampleCount : 0;
    const avgLeftoverUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.leftoverUnits, 0) / sampleCount : 0;
    const totalWasteLb = matchedRows.reduce((sum, row) => sum + row.wasteLb, 0);
    const totalSoldLb = matchedRows.reduce((sum, row) => sum + row.soldLb, 0);
    const wastePct = totalSoldLb + totalWasteLb > 0 ? (totalWasteLb / (totalSoldLb + totalWasteLb)) * 100 : 0;
    const selloutCount = matchedRows.filter((row) => row.eightySixed).length;
    const action = recommendationText({ proteinName: protein.name, sampleCount, avgErrorPct, wastePct, selloutCount, avgLeftoverUnits });

    return { protein, unit, sampleCount, avgErrorPct, avgForecastUnits, avgActualDemandUnits, avgLeftoverUnits, wastePct, selloutCount, action, matchedRows };
  });

  const dayRows = Array.from({ length: 7 }, (_, day) => {
    const rows = logs.flatMap((log) => {
      if (log.serviceDate.getUTCDay() !== day) return [];
      const plan = planByDate.get(iso(log.serviceDate));
      if (!plan || !plan.forecastSales) return [];
      return [{ actualSales: log.totalSales, forecastSales: plan.forecastSales }];
    });
    const count = rows.length;
    const avgActual = count ? rows.reduce((sum, row) => sum + row.actualSales, 0) / count : 0;
    const avgForecast = count ? rows.reduce((sum, row) => sum + row.forecastSales, 0) / count : 0;
    const errorPct = avgForecast > 0 ? ((avgActual - avgForecast) / avgForecast) * 100 : 0;
    const label = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    const suggestion = count < 3
      ? 'Need more matched days before changing this day pattern.'
      : errorPct > 12
        ? 'Actual sales are above forecast. Consider raising this day-of-week share.'
        : errorPct < -12
          ? 'Actual sales are below forecast. Consider lowering this day-of-week share.'
          : 'Hold current day-of-week setting.';
    return { day, label, count, avgActual, avgForecast, errorPct, suggestion };
  });

  const matchedSampleCount = proteinSummaries.reduce((sum, row) => sum + row.sampleCount, 0);
  const actionableCount = proteinSummaries.filter((row) => row.sampleCount >= 3 && (Math.abs(row.avgErrorPct) > 15 || row.wastePct > 10 || row.selloutCount >= 2)).length;
  const dataQuality = matchedSampleCount >= 80 ? 'HIGH' : matchedSampleCount >= 24 ? 'MEDIUM' : 'LOW';

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Learning & Adjustment Recommendations</h1>
      <p className="mt-2 text-slate-600">The app now compares generated cook plans against completed EOD logs and recommends forecast adjustments as operating history accumulates.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Learning Data Quality</div><div className="mt-2 text-3xl font-black">{dataQuality}</div><div className="mt-1 text-sm text-slate-500">{matchedSampleCount} matched protein samples</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Completed EOD Logs</div><div className="mt-2 text-3xl font-black">{logs.length}</div><div className="mt-1 text-sm text-slate-500">Complete / reviewed / locked only</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Cook Plans Checked</div><div className="mt-2 text-3xl font-black">{plans.length}</div><div className="mt-1 text-sm text-slate-500">Latest 120 plans</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Actionable Items</div><div className="mt-2 text-3xl font-black">{actionableCount}</div><div className="mt-1 text-sm text-slate-500">Adjustment candidates</div></div>
    </div>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Protein Forecast Learning</h2>
      <p className="mt-1 text-sm text-slate-600">Compares forecast units to actual sold demand. For brisket and pork, the matching plan is the prior-day load plan. For ribs and chicken, the matching plan is the same-day plan.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Protein</th><th className="p-3">Samples</th><th className="p-3">Avg forecast</th><th className="p-3">Avg actual demand</th><th className="p-3">Forecast error</th><th className="p-3">Avg leftover</th><th className="p-3">Waste %</th><th className="p-3">86s</th><th className="p-3">Recommendation</th></tr></thead>
          <tbody>
            {proteinSummaries.map((row) => <tr key={row.protein.id} className="border-t border-slate-100 align-top">
              <td className="p-3 font-black">{row.protein.name}</td>
              <td className="p-3">{row.sampleCount}</td>
              <td className="p-3">{one(row.avgForecastUnits)} {row.unit}</td>
              <td className="p-3">{one(row.avgActualDemandUnits)} {row.unit}</td>
              <td className={row.avgErrorPct > 15 ? 'p-3 font-black text-red-700' : row.avgErrorPct < -15 ? 'p-3 font-black text-amber-700' : 'p-3 font-bold text-emerald-700'}>{pct(row.avgErrorPct)}</td>
              <td className="p-3">{one(row.avgLeftoverUnits)} {row.unit}</td>
              <td className={row.wastePct > 10 ? 'p-3 font-black text-red-700' : 'p-3'}>{pct(row.wastePct)}</td>
              <td className="p-3">{row.selloutCount}</td>
              <td className="p-3 max-w-sm font-semibold text-slate-700">{row.action}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Day-of-Week Learning</h2>
      <p className="mt-1 text-sm text-slate-600">Compares actual EOD total sales to same-day forecast sales when a matching plan exists. This will become more useful after several weeks of live service.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Day</th><th className="p-3">Samples</th><th className="p-3">Avg actual sales</th><th className="p-3">Avg forecast sales</th><th className="p-3">Error</th><th className="p-3">Recommendation</th></tr></thead>
          <tbody>
            {dayRows.map((row) => <tr key={row.day} className="border-t border-slate-100">
              <td className="p-3 font-black">{row.label}</td>
              <td className="p-3">{row.count}</td>
              <td className="p-3">{row.count ? money(row.avgActual) : '—'}</td>
              <td className="p-3">{row.count ? money(row.avgForecast) : '—'}</td>
              <td className={row.errorPct > 12 ? 'p-3 font-black text-red-700' : row.errorPct < -12 ? 'p-3 font-black text-amber-700' : 'p-3 font-bold text-emerald-700'}>{row.count ? pct(row.errorPct) : '—'}</td>
              <td className="p-3 font-semibold text-slate-700">{row.suggestion}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">How the app learns</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="font-black">Current learning loop</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Generate a cook/load plan.</li>
            <li>Complete the End-of-Day log.</li>
            <li>Match the EOD log back to the correct cook plan by protein timing.</li>
            <li>Compare forecast units, sold demand, leftovers, waste, and 86 events.</li>
            <li>Surface adjustment recommendations.</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="font-black">Next commercial step</div>
          <p className="mt-2 text-sm text-slate-700">The next step is an approval workflow: review a recommendation, accept it, then write the suggested change into Settings with an audit log. For now, this page recommends adjustments but does not automatically change assumptions.</p>
          <p className="mt-2 text-sm text-slate-700">Active scenarios: {scenarios.map((s) => s.name).join(', ') || 'none'}</p>
        </div>
      </div>
    </section>
  </Shell>;
}
