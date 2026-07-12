import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { prisma } from '@/lib/prisma';
import { saveRestaurantProfile, saveSetupCurve, saveSetupForecast, saveSetupProtein, importSalesHistoryCsv } from './actions';
import { setupCompletionScore, setupWarnings } from '@/lib/setupStatus';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function unitName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('chicken')) return 'breast';
  if (lower.includes('rib')) return 'rack';
  if (lower.includes('pork')) return 'butt';
  if (lower.includes('brisket')) return 'brisket';
  return 'unit';
}

export default async function RestaurantSetupWizardPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  await ensureDefaultData(prisma);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const [scenarios, proteins, days, months, memberships, smokerCount, cookPlanCount, completeEodCount, reportRunCount, restoreCheck] = await Promise.all([
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(restaurantId), orderBy: { annualSales: 'asc' } }),
    prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.dayMultiplier.findMany({ where: { restaurantId }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.monthMultiplier.findMany({ where: { restaurantId }, orderBy: { month: 'asc' } }),
    prisma.restaurantMembership.findMany({ where: { restaurantId, active: true }, include: { user: true }, orderBy: { role: 'asc' } }),
    prisma.smoker.count({ where: { restaurantId, active: true } }),
    prisma.cookPlan.count({ where: { restaurantId } }),
    prisma.endOfDayLog.count({ where: { restaurantId, status: { in: ['COMPLETE', 'REVIEWED', 'LOCKED'] } } }),
    prisma.reportRun.count({ where: { restaurantId } }),
    prisma.systemCheck.findFirst({ where: { restaurantId, type: 'RESTORE_DRILL', status: 'PASS' }, orderBy: { createdAt: 'desc' } }).catch(() => null)
  ]);
  const scenario = scenarios[0];
  const setupChecks = [
    { key: 'profile', label: 'Restaurant profile complete', complete: Boolean(restaurant.name && restaurant.timezone), warning: 'Restaurant profile is incomplete.' },
    { key: 'owner', label: 'Owner/Admin account active', complete: memberships.some((m) => ['ADMIN', 'OWNER'].includes(String(m.role))), warning: 'No active owner/admin membership exists.' },
    { key: 'proteins', label: 'Proteins reviewed', complete: proteins.length >= 4 && proteins.every((p) => p.rawWeightEachLb > 0 && p.cookedWeightEachLb >= 0 && p.cookedYieldPercent > 0), warning: 'Protein specs still need review.' },
    { key: 'forecast', label: 'Sales model reviewed', complete: Boolean(scenario && scenario.annualSales > 0 && scenario.bbqSalesPercent > 0), warning: 'Sales model is missing or still invalid.' },
    { key: 'dayCurve', label: 'Day curve reviewed', complete: days.length === 7, warning: 'Day-of-week curve is incomplete.' },
    { key: 'monthCurve', label: 'Month curve reviewed', complete: months.length === 12, warning: 'Monthly curve is incomplete.' },
    { key: 'smokers', label: 'Smoker capacity entered', complete: smokerCount > 0, warning: 'No smoker capacity entered. Cook-plan alerts may be incomplete.' },
    { key: 'cookPlan', label: 'First cook plan generated', complete: cookPlanCount > 0, warning: 'No cook plan has been generated.' },
    { key: 'eod', label: 'First completed EOD log', complete: completeEodCount > 0, warning: 'No completed EOD log exists.' },
    { key: 'reports', label: 'Report/export reviewed', complete: reportRunCount > 0, warning: 'No report or export has been run.' },
    { key: 'restore', label: 'Backup restore drill recorded', complete: Boolean(restoreCheck), warning: 'No passing backup restore drill has been recorded.' }
  ];
  const completionScore = setupCompletionScore(setupChecks);
  const warnings = setupWarnings(setupChecks);

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Restaurant Setup Wizard</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · Build 3.8.0 adds self-service setup, generic BBQ defaults, sales-history import, and audit-backed onboarding. Each save writes tenant-scoped settings and audit entries.</p>
    </div>



    <section className="card mb-6 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Setup Completion: {completionScore}%</h2>
          <p className="mt-1 text-sm text-slate-600">This score helps owners know whether forecasts are still running on default assumptions or real operating setup.</p>
        </div>
        <div className="h-4 rounded-full bg-slate-100 md:w-80"><div className="h-4 rounded-full bg-emerald-600" style={{ width: `${completionScore}%` }} /></div>
      </div>
      {warnings.length ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><div className="font-black">Setup warnings</div><ul className="mt-2 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Core setup looks complete. Keep verifying with real EOD logs and reports.</div>}
      <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{setupChecks.map((check) => <div key={check.key} className={check.complete ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900' : 'rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900'}>{check.complete ? '✓' : '!'} {check.label}</div>)}</div>
    </section>

    <div className="grid gap-4">
      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 1</div>
        <h2 className="mt-1 text-xl font-black">Restaurant Profile</h2>
        <form action={saveRestaurantProfile} className="mt-4 grid gap-3 md:grid-cols-4">
          <div><label className="label">Restaurant Name</label><input className="field mt-1" name="name" required defaultValue={restaurant.name} /></div>
          <div><label className="label">City</label><input className="field mt-1" name="city" defaultValue={restaurant.city || ''} /></div>
          <div><label className="label">State</label><input className="field mt-1" name="state" defaultValue={restaurant.state || ''} /></div>
          <div><label className="label">Timezone</label><input className="field mt-1" name="timezone" defaultValue={restaurant.timezone} /></div>
          <div className="md:col-span-4"><button className="btn-primary" type="submit">Save Profile</button></div>
        </form>
      </section>

      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 2</div>
        <h2 className="mt-1 text-xl font-black">Users and Access</h2>
        <p className="mt-2 text-slate-600">Current active memberships for this restaurant. User creation remains on the User Access page.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {memberships.map((membership) => <div key={membership.id} className="rounded-2xl border border-slate-200 p-3"><div className="font-black">{membership.user.name}</div><div className="text-sm text-slate-600">{membership.user.username || membership.user.email}</div><div className="mt-1 text-xs font-bold text-slate-500">{membership.role}</div></div>)}
        </div>
        <Link href="/admin/users" className="btn-secondary mt-4 inline-flex">Open User Access</Link>
      </section>

      {scenario ? <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 3</div>
        <h2 className="mt-1 text-xl font-black">Sales Forecast Model</h2>
        <form action={saveSetupForecast} className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="hidden" name="scenarioId" value={scenario.id} />
          <div><label className="label">Scenario</label><input className="field mt-1" disabled value={scenario.name} /></div>
          <div><label className="label">Annual Sales</label><input className="field mt-1" name="annualSales" type="number" defaultValue={scenario.annualSales} /></div>
          <div><label className="label">Smoked Meat % of Total Sales</label><input className="field mt-1" name="bbqSalesPercent" type="number" step="0.1" defaultValue={scenario.bbqSalesPercent} /></div>
          <div><label className="label">Safety %</label><input className="field mt-1" name="safetyFactorPct" type="number" step="0.1" defaultValue={scenario.safetyFactorPct} /></div>
          <div><label className="label">Brisket Mix %</label><input className="field mt-1" name="brisketMixPct" type="number" step="0.1" defaultValue={scenario.brisketMixPct} /></div>
          <div><label className="label">Pork Mix %</label><input className="field mt-1" name="porkMixPct" type="number" step="0.1" defaultValue={scenario.porkMixPct} /></div>
          <div><label className="label">Ribs Mix %</label><input className="field mt-1" name="ribsMixPct" type="number" step="0.1" defaultValue={scenario.ribsMixPct} /></div>
          <div><label className="label">Chicken Mix %</label><input className="field mt-1" name="chickenMixPct" type="number" step="0.1" defaultValue={scenario.chickenMixPct} /></div>
          <div className="md:col-span-4"><button className="btn-primary" type="submit">Save Forecast Model</button></div>
        </form>
      </section> : null}


      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 3B</div>
        <h2 className="mt-1 text-xl font-black">Import Sales History / POS CSV</h2>
        <p className="mt-2 text-slate-600">Paste CSV rows from Toast/Square/Clover export or a spreadsheet. Required columns: <strong>date,totalSales</strong>. Optional third column: <strong>bbqSales</strong>. Imported data updates day/month multipliers so new restaurants do not inherit Smoky Mountain seasonality.</p>
        <form action={importSalesHistoryCsv} className="mt-4 grid gap-3">
          <textarea className="field min-h-40 font-mono text-xs" name="salesCsv" placeholder={'date,totalSales,bbqSales\n2026-07-01,8750,3325\n2026-07-02,9220,3504'} />
          <button className="btn-primary" type="submit">Import and Recalculate Curves</button>
        </form>
      </section>

      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 4</div>
        <h2 className="mt-1 text-xl font-black">Protein Specs</h2>
        <div className="mt-4 grid gap-4">
          {proteins.map((protein) => <form key={protein.id} action={saveSetupProtein} className="rounded-2xl border border-slate-200 p-4">
            <input type="hidden" name="proteinId" value={protein.id} />
            <h3 className="text-lg font-black">{protein.name}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div><label className="label">Raw lb / {unitName(protein.name)}</label><input className="field mt-1" name="rawWeightEachLb" type="number" step="0.1" defaultValue={protein.rawWeightEachLb} /></div>
              <div><label className="label">Cooked lb / {unitName(protein.name)}</label><input className="field mt-1" name="cookedWeightEachLb" type="number" step="0.1" defaultValue={protein.cookedWeightEachLb} /></div>
              <div><label className="label">Yield %</label><input className="field mt-1" name="cookedYieldPercent" type="number" step="0.1" defaultValue={protein.cookedYieldPercent} /></div>
              <div><label className="label">Avg Sales $ / Cooked lb</label><input className="field mt-1" name="avgSalesPerCookedLb" type="number" step="0.1" defaultValue={protein.avgSalesPerCookedLb} /></div>
              <div><label className="label">Min Cook Units</label><input className="field mt-1" name="minCookUnits" type="number" step="1" defaultValue={protein.minCookUnits} /></div>
              <div><label className="label">Max Cook Units</label><input className="field mt-1" name="maxCookUnits" type="number" step="1" defaultValue={protein.maxCookUnits} /></div>
              <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name="reusableLeftover" type="checkbox" className="h-5 w-5" defaultChecked={protein.reusableLeftover} /> Reusable leftover</label>
            </div>
            <button className="btn-secondary mt-4" type="submit">Save {protein.name}</button>
          </form>)}
        </div>
      </section>

      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 5</div>
        <h2 className="mt-1 text-xl font-black">Weekly and Monthly Curves</h2>
        <form action={saveSetupCurve} className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-black">Day-of-week multipliers</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {days.map((day) => <label key={day.id} className="rounded-xl border border-slate-200 p-3 text-sm font-bold">{day.label}<input className="field mt-1" name={`day-${day.id}`} type="number" step="0.01" min="0.1" max="3" defaultValue={day.multiplier} /></label>)}
            </div>
          </div>
          <div>
            <h3 className="font-black">Month multipliers</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {months.map((month) => <label key={month.id} className="rounded-xl border border-slate-200 p-3 text-sm font-bold">{month.label}<input className="field mt-1" name={`month-${month.id}`} type="number" step="0.01" min="0.1" max="3" defaultValue={month.multiplier} /></label>)}
            </div>
          </div>
          <div className="lg:col-span-2"><button className="btn-primary" type="submit">Save Curves</button></div>
        </form>
      </section>

      <section className="card p-5">
        <div className="text-sm font-black text-slate-400">Step 6</div>
        <h2 className="mt-1 text-xl font-black">Operational Validation</h2>
        <p className="mt-2 text-slate-600">Generate a test cook plan, save a test EOD log, review Learning, then run a report export. This confirms tenant-scoped data is moving through the full workflow.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/cook-plan" className="btn-secondary">Generate Test Cook Plan</Link><Link href="/end-of-day" className="btn-secondary">Save Test EOD</Link><Link href="/learning" className="btn-secondary">Review Learning</Link><Link href="/reports" className="btn-secondary">Run Reports</Link></div>
      </section>
    </div>
  </Shell>;
}
