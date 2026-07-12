import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole, hasRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';
import { currentRestaurantForUser } from '@/lib/tenant';
import { decideLearningRecommendation, rollbackLearningRecommendation, saveLearningRecommendation } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function pct(value: number) { return Number.isFinite(value) ? `${Math.round(value * 10) / 10}%` : '—'; }
function one(value: number) { return Number.isFinite(value) ? Math.round(value * 10) / 10 : '—'; }
function money(value: number) { return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
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
function mixKeyForProtein(proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('brisket')) return 'brisketMixPct';
  if (lower.includes('pork')) return 'porkMixPct';
  if (lower.includes('rib')) return 'ribsMixPct';
  if (lower.includes('chicken')) return 'chickenMixPct';
  return '';
}
function confidence(sampleCount: number, minimum: number, errorPct: number, sellouts = 0) {
  if (sampleCount < minimum) return 'LOW';
  if (sampleCount >= minimum * 2 && (Math.abs(errorPct) >= 10 || sellouts >= 2)) return 'HIGH';
  return 'MEDIUM';
}
function recommendationText(args: { proteinName: string; sampleCount: number; minimum: number; avgErrorPct: number; wastePct: number; selloutCount: number; avgLeftoverUnits: number }) {
  if (args.sampleCount < args.minimum) return `Observe only. Need ${args.minimum} complete matched samples before applying a setting change.`;
  const pieces: string[] = [];
  if (args.selloutCount >= 2 || args.avgErrorPct > 15) pieces.push(`Increase ${args.proteinName} forecast mix. Actual demand is running above forecast.`);
  if (args.avgErrorPct < -15 && args.avgLeftoverUnits > 1) pieces.push(`Reduce ${args.proteinName} forecast mix. Forecast is running high and creating leftover load.`);
  if (args.wastePct > 10) pieces.push(`Waste is above 10%. Consider lowering the safety factor unless sellouts are also occurring.`);
  if (pieces.length === 0) pieces.push('Hold current settings. Forecast is inside tolerance.');
  return pieces.join(' ');
}
function proposedMixUpdate(scenario: any, mixKey: string, errorPct: number) {
  const keys = ['brisketMixPct', 'porkMixPct', 'ribsMixPct', 'chickenMixPct'];
  const current = Number(scenario[mixKey] ?? 0);
  const changeFactor = clamp(errorPct / 100 * 0.5, -0.15, 0.15);
  const target = clamp(current * (1 + changeFactor), 1, 95);
  const otherKeys = keys.filter((key) => key !== mixKey);
  const otherCurrentTotal = otherKeys.reduce((sum, key) => sum + Number(scenario[key] ?? 0), 0) || 1;
  const remaining = Math.max(0, 100 - target);
  const after: Record<string, number> = { [mixKey]: Math.round(target * 10) / 10 };
  for (const key of otherKeys) after[key] = Math.round((Number(scenario[key] ?? 0) / otherCurrentTotal) * remaining * 10) / 10;
  return after;
}
function proposedSafetyUpdate(scenario: any, wastePct: number, selloutCount: number, avgErrorPct: number) {
  const current = Number(scenario.safetyFactorPct ?? 8);
  let next = current;
  if (wastePct > 10 && selloutCount === 0) next = current - 1.5;
  if (selloutCount >= 2 || avgErrorPct > 20) next = current + 1.5;
  return { safetyFactorPct: Math.round(clamp(next, 0, 50) * 10) / 10 };
}
function accuracyLabel(errorPct: number) {
  if (Math.abs(errorPct) <= 8) return 'Good';
  return errorPct > 0 ? 'Underforecasting' : 'Overforecasting';
}

export default async function LearningPage() {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  noStore();
  await ensureDefaultData(prisma);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;

  const [proteins, plans, logs, scenarios, dayMultipliers] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.cookPlan.findMany({ where: { restaurantId }, orderBy: { serviceDate: 'desc' }, take: 180, include: { scenario: true, items: { include: { protein: true } } } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId, status: { in: ['COMPLETE', 'REVIEWED', 'LOCKED'] } }, orderBy: { serviceDate: 'desc' }, take: 180, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.forecastScenario.findMany({ where: { restaurantId }, orderBy: { annualSales: 'asc' } }),
    prisma.dayMultiplier.findMany({ where: { restaurantId }, orderBy: { dayOfWeek: 'asc' } })
  ]);

  const primaryScenario = scenarios[0];
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
      const cookedUnitLb = protein.cookedWeightEachLb > 0 ? protein.cookedWeightEachLb : protein.rawWeightEachLb * (protein.cookedYieldPercent / 100);
      const actualSoldUnits = cookedUnitLb > 0 ? proteinLog.soldCookedLb / cookedUnitLb : 0;
      const actualDemandUnits = actualSoldUnits + (proteinLog.eightySixed ? Math.max(1, item.recommendedCookUnits * 0.08) : 0);
      const forecastUnits = item.forecastCookUnits || item.recommendedCookUnits || 0;
      const errorPct = forecastUnits > 0 ? ((actualDemandUnits - forecastUnits) / forecastUnits) * 100 : 0;
      return [{ serviceDate: log.serviceDate, planDate: matchingPlanDate, forecastUnits, actualDemandUnits, errorPct, leftoverUnits: proteinLog.usableLeftoverUnits, wasteLb: proteinLog.wasteLb, soldLb: proteinLog.soldCookedLb, eightySixed: proteinLog.eightySixed }];
    });
    const sampleCount = matchedRows.length;
    const minimum = 7;
    const avgErrorPct = sampleCount ? matchedRows.reduce((sum, row) => sum + row.errorPct, 0) / sampleCount : 0;
    const avgForecastUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.forecastUnits, 0) / sampleCount : 0;
    const avgActualDemandUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.actualDemandUnits, 0) / sampleCount : 0;
    const avgLeftoverUnits = sampleCount ? matchedRows.reduce((sum, row) => sum + row.leftoverUnits, 0) / sampleCount : 0;
    const totalWasteLb = matchedRows.reduce((sum, row) => sum + row.wasteLb, 0);
    const totalSoldLb = matchedRows.reduce((sum, row) => sum + row.soldLb, 0);
    const wastePct = totalSoldLb + totalWasteLb > 0 ? (totalWasteLb / (totalSoldLb + totalWasteLb)) * 100 : 0;
    const selloutCount = matchedRows.filter((row) => row.eightySixed).length;
    const action = recommendationText({ proteinName: protein.name, sampleCount, minimum, avgErrorPct, wastePct, selloutCount, avgLeftoverUnits });
    const conf = confidence(sampleCount, minimum, avgErrorPct, selloutCount);
    const mixKey = mixKeyForProtein(protein.name);
    const beforeScenario = primaryScenario && mixKey ? { id: primaryScenario.id, safetyFactorPct: primaryScenario.safetyFactorPct, brisketMixPct: primaryScenario.brisketMixPct, porkMixPct: primaryScenario.porkMixPct, ribsMixPct: primaryScenario.ribsMixPct, chickenMixPct: primaryScenario.chickenMixPct } : null;
    const mixAfter = primaryScenario && mixKey ? proposedMixUpdate(primaryScenario, mixKey, avgErrorPct) : null;
    const safetyAfter = primaryScenario ? proposedSafetyUpdate(primaryScenario, wastePct, selloutCount, avgErrorPct) : null;
    const afterScenario = beforeScenario ? { id: primaryScenario.id, ...(Math.abs(avgErrorPct) > 15 ? mixAfter : {}), ...(wastePct > 10 || selloutCount >= 2 ? safetyAfter : {}) } : null;
    const actionable = sampleCount >= minimum && primaryScenario && (Math.abs(avgErrorPct) > 15 || wastePct > 10 || selloutCount >= 2) && afterScenario;
    return { protein, unit, sampleCount, minimum, avgErrorPct, avgForecastUnits, avgActualDemandUnits, avgLeftoverUnits, wastePct, selloutCount, action, confidence: conf, matchedRows, mixKey, beforeScenario, afterScenario, actionable };
  });

  const dayRows = Array.from({ length: 7 }, (_, day) => {
    const rows = logs.flatMap((log) => {
      if (log.serviceDate.getUTCDay() !== day) return [];
      const plan = planByDate.get(iso(log.serviceDate));
      if (!plan || !plan.forecastSales) return [];
      return [{ actualSales: log.totalSales, forecastSales: plan.forecastSales }];
    });
    const count = rows.length;
    const minimum = 4;
    const avgActual = count ? rows.reduce((sum, row) => sum + row.actualSales, 0) / count : 0;
    const avgForecast = count ? rows.reduce((sum, row) => sum + row.forecastSales, 0) / count : 0;
    const errorPct = avgForecast > 0 ? ((avgActual - avgForecast) / avgForecast) * 100 : 0;
    const label = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    const daySetting = dayMultipliers.find((row) => row.dayOfWeek === day);
    const currentMultiplier = daySetting?.multiplier ?? 1;
    const proposedMultiplier = Math.round(clamp(currentMultiplier * (1 + clamp(errorPct / 100 * 0.5, -0.15, 0.15)), 0.1, 3) * 100) / 100;
    const conf = confidence(count, minimum, errorPct);
    const suggestion = count < minimum ? `Need ${minimum} matching weekdays before changing this day pattern.` : errorPct > 12 ? 'Actual sales are above forecast. Raise this day-of-week multiplier.' : errorPct < -12 ? 'Actual sales are below forecast. Lower this day-of-week multiplier.' : 'Hold current day-of-week setting.';
    const actionable = Boolean(daySetting && count >= minimum && Math.abs(errorPct) > 12);
    return { day, label, count, minimum, avgActual, avgForecast, errorPct, suggestion, daySetting, currentMultiplier, proposedMultiplier, confidence: conf, actionable };
  });

  const matchedSampleCount = proteinSummaries.reduce((sum, row) => sum + row.sampleCount, 0);
  const actionableProteinRows = proteinSummaries.filter((row) => row.actionable);
  const actionableDayRows = dayRows.filter((row) => row.actionable);
  const pendingRecommendations = await prisma.learningRecommendation.findMany({ where: { restaurantId, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 25 });
  const appliedRecommendations = await prisma.learningRecommendation.findMany({ where: { restaurantId, status: 'ACCEPTED', appliedAt: { not: null }, rolledBackAt: null }, orderBy: { appliedAt: 'desc' }, take: 10 });
  const canDecideRecommendations = hasRole(user, ['ADMIN', 'OWNER']);
  const dataQuality = matchedSampleCount >= 80 ? 'HIGH' : matchedSampleCount >= 24 ? 'MEDIUM' : 'LOW';

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Learning & Adjustment Recommendations</h1>
      <p className="mt-2 text-slate-600">Build 4.3.3 applies accepted recommendations safely: preview before/after, enforce sample-size rules, audit the setting change, and keep rollback available.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Learning Data Quality</div><div className="mt-2 text-3xl font-black">{dataQuality}</div><div className="mt-1 text-sm text-slate-500">{matchedSampleCount} matched protein samples</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Completed EOD Logs</div><div className="mt-2 text-3xl font-black">{logs.length}</div><div className="mt-1 text-sm text-slate-500">Complete / reviewed / locked only</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Pending Decisions</div><div className="mt-2 text-3xl font-black">{pendingRecommendations.length}</div><div className="mt-1 text-sm text-slate-500">Admin/Owner approval</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Actionable Items</div><div className="mt-2 text-3xl font-black">{actionableProteinRows.length + actionableDayRows.length}</div><div className="mt-1 text-sm text-slate-500">Meet sample-size threshold</div></div>
    </div>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Forecast Accuracy Report</h2>
      <p className="mt-1 text-sm text-slate-600">Accuracy uses matched cook-plan vs EOD demand. Positive error means actual demand exceeded forecast; negative error means the forecast was high.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Protein</th><th className="p-3">Samples</th><th className="p-3">Accuracy</th><th className="p-3">Bias</th><th className="p-3">Confidence</th><th className="p-3">Minimum</th></tr></thead>
          <tbody>{proteinSummaries.map((row) => {
            const accuracy = row.sampleCount ? Math.max(0, 100 - Math.abs(row.avgErrorPct)) : 0;
            return <tr key={row.protein.id} className="border-t border-slate-100"><td className="p-3 font-black">{row.protein.name}</td><td className="p-3">{row.sampleCount}</td><td className="p-3 font-black">{row.sampleCount ? pct(accuracy) : '—'}</td><td className="p-3">{row.sampleCount ? accuracyLabel(row.avgErrorPct) : 'No data'}</td><td className="p-3 font-black">{row.confidence}</td><td className="p-3">{row.minimum} complete matches</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Protein Forecast Learning</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Protein</th><th className="p-3">Samples</th><th className="p-3">Avg forecast</th><th className="p-3">Avg actual demand</th><th className="p-3">Forecast error</th><th className="p-3">Avg leftover</th><th className="p-3">Waste %</th><th className="p-3">86s</th><th className="p-3">Confidence</th><th className="p-3">Recommendation</th></tr></thead>
          <tbody>{proteinSummaries.map((row) => <tr key={row.protein.id} className="border-t border-slate-100 align-top"><td className="p-3 font-black">{row.protein.name}</td><td className="p-3">{row.sampleCount}</td><td className="p-3">{one(row.avgForecastUnits)} {row.unit}</td><td className="p-3">{one(row.avgActualDemandUnits)} {row.unit}</td><td className={row.avgErrorPct > 15 ? 'p-3 font-black text-red-700' : row.avgErrorPct < -15 ? 'p-3 font-black text-amber-700' : 'p-3 font-bold text-emerald-700'}>{pct(row.avgErrorPct)}</td><td className="p-3">{one(row.avgLeftoverUnits)} {row.unit}</td><td className={row.wastePct > 10 ? 'p-3 font-black text-red-700' : 'p-3'}>{pct(row.wastePct)}</td><td className="p-3">{row.selloutCount}</td><td className="p-3 font-black">{row.confidence}</td><td className="p-3 max-w-sm font-semibold text-slate-700">{row.action}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Day-of-Week Learning</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Day</th><th className="p-3">Samples</th><th className="p-3">Avg actual sales</th><th className="p-3">Avg forecast sales</th><th className="p-3">Error</th><th className="p-3">Confidence</th><th className="p-3">Recommendation</th></tr></thead><tbody>{dayRows.map((row) => <tr key={row.day} className="border-t border-slate-100"><td className="p-3 font-black">{row.label}</td><td className="p-3">{row.count}</td><td className="p-3">{row.count ? money(row.avgActual) : '—'}</td><td className="p-3">{row.count ? money(row.avgForecast) : '—'}</td><td className={row.errorPct > 12 ? 'p-3 font-black text-red-700' : row.errorPct < -12 ? 'p-3 font-black text-amber-700' : 'p-3 font-bold text-emerald-700'}>{row.count ? pct(row.errorPct) : '—'}</td><td className="p-3 font-black">{row.confidence}</td><td className="p-3 font-semibold text-slate-700">{row.suggestion}</td></tr>)}</tbody></table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Recommendation Approval Queue</h2>
      <p className="mt-1 text-sm text-slate-600">Save candidates to the queue. Admin/Owner sees before/after values and must confirm before settings are changed. Accepted recommendations can be rolled back.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="font-black">Save current adjustment candidates</div>
          <div className="mt-3 space-y-3">
            {actionableProteinRows.length === 0 && actionableDayRows.length === 0 ? <p className="text-sm text-slate-500">No actionable candidates meet minimum sample-size rules yet.</p> : null}
            {actionableProteinRows.map((row) => <form key={row.protein.id} action={saveLearningRecommendation} className="rounded-xl bg-slate-50 p-3">
              <input type="hidden" name="type" value="PROTEIN_MIX_OR_SAFETY_CHANGE" /><input type="hidden" name="title" value={`${row.protein.name} forecast setting adjustment`} /><input type="hidden" name="recommendation" value={row.action} /><input type="hidden" name="targetEntity" value="ForecastScenario" /><input type="hidden" name="targetId" value={primaryScenario?.id || ''} /><input type="hidden" name="settingKey" value={row.mixKey || 'safetyFactorPct'} /><input type="hidden" name="beforeJson" value={JSON.stringify(row.beforeScenario)} /><input type="hidden" name="afterJson" value={JSON.stringify(row.afterScenario)} /><input type="hidden" name="confidence" value={row.confidence} /><input type="hidden" name="sampleCount" value={row.sampleCount} /><input type="hidden" name="minimumSampleCount" value={row.minimum} />
              <div className="text-sm font-black">{row.protein.name} · {row.confidence} confidence</div><div className="mt-1 text-sm text-slate-700">{row.action}</div><div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 text-xs"><div className="font-black">Before/after preview</div><pre className="mt-1 whitespace-pre-wrap">{JSON.stringify({ before: row.beforeScenario, after: row.afterScenario }, null, 2)}</pre></div><div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-bold text-blue-900">Forecast-change impact preview: recent average load {one(row.avgForecastUnits)} {row.unit}; recent actual demand {one(row.avgActualDemandUnits)} {row.unit}; current bias {pct(row.avgErrorPct)}. Check smoker capacity before applying.</div><button className="btn-secondary mt-3" type="submit">Save to review queue</button>
            </form>)}
            {actionableDayRows.map((row) => <form key={row.day} action={saveLearningRecommendation} className="rounded-xl bg-slate-50 p-3">
              <input type="hidden" name="type" value="DAY_MULTIPLIER_CHANGE" /><input type="hidden" name="title" value={`${row.label} day multiplier adjustment`} /><input type="hidden" name="recommendation" value={row.suggestion} /><input type="hidden" name="targetEntity" value="DayMultiplier" /><input type="hidden" name="targetId" value={row.daySetting?.id || ''} /><input type="hidden" name="settingKey" value="multiplier" /><input type="hidden" name="beforeJson" value={JSON.stringify({ id: row.daySetting?.id, dayOfWeek: row.day, label: row.label, multiplier: row.currentMultiplier })} /><input type="hidden" name="afterJson" value={JSON.stringify({ id: row.daySetting?.id, multiplier: row.proposedMultiplier })} /><input type="hidden" name="confidence" value={row.confidence} /><input type="hidden" name="sampleCount" value={row.count} /><input type="hidden" name="minimumSampleCount" value={row.minimum} />
              <div className="text-sm font-black">{row.label} · {row.confidence} confidence</div><div className="mt-1 text-sm text-slate-700">{row.suggestion}</div><div className="mt-2 text-xs font-bold">Multiplier: {row.currentMultiplier} → {row.proposedMultiplier}</div><button className="btn-secondary mt-3" type="submit">Save to review queue</button>
            </form>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="font-black">Pending decisions</div>
          <div className="mt-3 space-y-3">
            {pendingRecommendations.length === 0 ? <p className="text-sm text-slate-500">No pending recommendations.</p> : pendingRecommendations.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-sm font-black">{item.title}</div><div className="mt-1 text-sm text-slate-700">{item.recommendation}</div><div className="mt-1 text-xs text-slate-500">{item.confidence} confidence · {item.sampleCount}/{item.minimumSampleCount} samples · created {item.createdAt.toLocaleDateString()} by {item.createdBy}</div><details className="mt-2"><summary className="cursor-pointer text-xs font-black text-slate-600">Before/after setting preview + impact review</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 text-xs">{JSON.stringify({ before: item.beforeJson ? JSON.parse(item.beforeJson) : null, after: item.afterJson ? JSON.parse(item.afterJson) : null }, null, 2)}</pre><div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs font-bold text-blue-900">Review operational impact before applying: changes can alter future cook-plan loads and may create smoker-capacity conflicts. Confirm only after checking current capacity and recent EOD quality.</div></details>{canDecideRecommendations ? <div className="mt-3 flex gap-2"><form action={decideLearningRecommendation}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="ACCEPTED" /><button className="btn-primary" type="submit">Confirm Apply</button></form><form action={decideLearningRecommendation}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="REJECTED" /><button className="btn-secondary" type="submit">Reject</button></form></div> : <div className="mt-2 text-xs font-bold text-slate-500">Admin/Owner approval required.</div>}</div>)}
          </div>
        </div>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Rollback Available</h2>
      <p className="mt-1 text-sm text-slate-600">Accepted setting changes keep prior values. Admin/Owner can roll back a recommendation if the change performs poorly.</p>
      <div className="mt-3 space-y-3">{appliedRecommendations.length === 0 ? <p className="text-sm text-slate-500">No applied recommendations available for rollback.</p> : appliedRecommendations.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="font-black">{item.title}</div><div className="text-sm text-slate-600">Applied {item.appliedAt?.toLocaleString()} by {item.decidedBy}</div>{canDecideRecommendations ? <form className="mt-2" action={rollbackLearningRecommendation}><input type="hidden" name="id" value={item.id} /><button className="btn-secondary" type="submit">Rollback Change</button></form> : null}</div>)}</div>
    </section>
  </Shell>;
}
