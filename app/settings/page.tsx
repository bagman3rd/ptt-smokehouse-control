import { Shell } from '@/components/Shell';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { updateDayMultiplier, updateMonthMultiplier, updateProtein, updateScenario } from '@/app/actions';
import { dayPatternRows } from '@/lib/dayProfiles';

function unitNameForProtein(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('chicken')) return 'breast';
  if (lower.includes('rib')) return 'rack';
  if (lower.includes('pork')) return 'butt';
  if (lower.includes('brisket')) return 'brisket';
  return 'unit';
}

export default async function SettingsPage() {
    requireAuth();
await ensureDefaultData(prisma);

  const [proteins, scenarios, days, months] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } }),
    prisma.dayMultiplier.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.monthMultiplier.findMany({ orderBy: { month: 'asc' } })
  ]);
  const dayProfiles = dayPatternRows();

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="mt-2 text-slate-600">Adjust assumptions as real Pigeon Forge operating data replaces the launch model.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-xl font-black">Forecast Scenarios</h2>
        <p className="mt-2 text-sm text-slate-600">Total restaurant sales are reduced to smoked-meat demand using the Smoked Meat % of Total Sales field.</p>
        <div className="mt-4 grid gap-4">
          {scenarios.map((scenario) => (
            <form key={scenario.id} action={updateScenario} className="rounded-2xl border border-slate-200 p-4">
              <input type="hidden" name="id" value={scenario.id} />
              <div className="mb-1 text-lg font-black">{scenario.name}</div>
              <div className="mb-3 text-xs font-bold text-slate-500">Last updated {scenario.updatedAt.toLocaleString()} by {scenario.updatedBy}</div>
              <div className="grid gap-3 md:grid-cols-4">
                <div><label className="label">Annual Sales</label><input className="field mt-1" name="annualSales" type="number" defaultValue={scenario.annualSales} /></div>
                <div><label className="label">Smoked Meat % of Total Sales</label><input className="field mt-1" name="bbqSalesPercent" type="number" step="0.1" defaultValue={scenario.bbqSalesPercent} /></div>
                <div><label className="label">Safety %</label><input className="field mt-1" name="safetyFactorPct" type="number" step="0.1" defaultValue={scenario.safetyFactorPct} /></div>
                <div><label className="label">Brisket Mix %</label><input className="field mt-1" name="brisketMixPct" type="number" step="0.1" defaultValue={scenario.brisketMixPct} /></div>
                <div><label className="label">Pork Mix %</label><input className="field mt-1" name="porkMixPct" type="number" step="0.1" defaultValue={scenario.porkMixPct} /></div>
                <div><label className="label">Ribs Mix %</label><input className="field mt-1" name="ribsMixPct" type="number" step="0.1" defaultValue={scenario.ribsMixPct} /></div>
                <div><label className="label">Chicken Mix %</label><input className="field mt-1" name="chickenMixPct" type="number" step="0.1" defaultValue={scenario.chickenMixPct} /></div>
              </div>
              <button className="btn-secondary mt-4" type="submit">Save Scenario</button>
            </form>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-xl font-black">Protein Assumptions</h2>
        <p className="mt-2 text-sm text-slate-600">Ribs are rack-based. Chicken is breast-based. Brisket and pork are unit-based. Edit the pricing and yield assumptions here.</p>
        <div className="mt-4 grid gap-4">
          {proteins.map((protein) => {
            const lower = protein.name.toLowerCase();
            const unitName = unitNameForProtein(protein.name);
            const chickenNote = lower.includes('chicken') ? 'Chicken is forecast as breasts to load. Default: 1 breast is about 2.5 raw lb and 1.875 cooked lb.' : null;
            const ribNote = lower.includes('rib') ? 'Ribs are forecast as racks to load. Default: 1 rack costs $10, weighs 3.3 raw lb, yields 3.0 cooked lb, and sells for $33.' : null;
            return (
              <form key={protein.id} action={updateProtein} className="rounded-2xl border border-slate-200 p-4">
                <input type="hidden" name="id" value={protein.id} />
                <div className="mb-1 text-lg font-black">{protein.name}</div>
                <div className="mb-3 text-xs font-bold text-slate-500">Last updated {protein.updatedAt.toLocaleString()} by {protein.updatedBy}</div>
                {chickenNote ? <p className="mb-3 text-sm font-bold text-slate-600">{chickenNote}</p> : null}
                {ribNote ? <p className="mb-3 text-sm font-bold text-slate-600">{ribNote}</p> : null}
                <div className="grid gap-3 md:grid-cols-4">
                  <div><label className="label">Raw Weight per {unitName} lb</label><input className="field mt-1" name="rawWeightEachLb" type="number" step="0.1" defaultValue={protein.rawWeightEachLb} /></div>
                  <div><label className="label">Cooked Weight per {unitName} lb</label><input className="field mt-1" name="cookedWeightEachLb" type="number" step="0.1" defaultValue={protein.cookedWeightEachLb} /></div>
                  <div><label className="label">Cooked Yield %</label><input className="field mt-1" name="cookedYieldPercent" type="number" step="0.1" defaultValue={protein.cookedYieldPercent} /></div>
                  <div><label className="label">Avg Sales $ / Cooked lb</label><input className="field mt-1" name="avgSalesPerCookedLb" type="number" step="0.1" defaultValue={protein.avgSalesPerCookedLb} /></div>
                  <div><label className="label">Purchase Cost Each</label><input className="field mt-1" name="purchaseCostEach" type="number" step="0.01" defaultValue={protein.purchaseCostEach} /></div>
                  <div><label className="label">Sales Price Each</label><input className="field mt-1" name="salesPriceEach" type="number" step="0.01" defaultValue={protein.salesPriceEach} /></div>
                  <div><label className="label">Sandwich oz</label><input className="field mt-1" name="sandwichOz" type="number" step="0.1" defaultValue={protein.sandwichOz} /></div>
                  <div><label className="label">Plate oz</label><input className="field mt-1" name="plateOz" type="number" step="0.1" defaultValue={protein.plateOz} /></div>
                  <div><label className="label">Min Cook Units</label><input className="field mt-1" name="minCookUnits" type="number" step="1" defaultValue={protein.minCookUnits} /></div>
                  <div><label className="label">Max Cook Units</label><input className="field mt-1" name="maxCookUnits" type="number" step="1" defaultValue={protein.maxCookUnits} /></div>
                  <div><label className="label">Max Reuse Hours</label><input className="field mt-1" name="maxReuseHours" type="number" step="1" defaultValue={protein.maxReuseHours} /></div>
                  <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name="reusableLeftover" type="checkbox" className="h-5 w-5" defaultChecked={protein.reusableLeftover} /> Reusable leftover</label>
                </div>
                <button className="btn-secondary mt-4" type="submit">Save Protein</button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl font-black">Day Pattern Profiles</h2>
          <p className="mt-2 text-sm text-slate-600">Cook Plan uses selectable weekly sales patterns. Default Tourist is the global starting assumption.</p>
          <div className="mt-4 space-y-4">
            {dayProfiles.map((profile) => (
              <div key={profile.key} className="rounded-2xl border border-slate-200 p-4">
                <div className="text-lg font-black">{profile.name}</div>
                <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs md:text-sm">
                  {profile.days.map((day) => (
                    <div key={day.dayOfWeek} className="rounded-xl bg-slate-50 p-2">
                      <div className="font-black">{day.label}</div>
                      <div>{day.share}%</div>
                      <div className="text-slate-500">x{day.multiplier.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-black text-slate-600">Legacy editable default multipliers</summary>
            <div className="mt-3 space-y-2">
              {days.map((day) => (
                <form key={day.id} action={updateDayMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <input type="hidden" name="id" value={day.id} />
                  <span className="font-bold">{day.label}<span className="ml-2 text-xs text-slate-500">updated {day.updatedAt.toLocaleDateString()} by {day.updatedBy}</span></span>
                  <div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={day.multiplier} /><button className="btn-secondary" type="submit">Save</button></div>
                </form>
              ))}
            </div>
          </details>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-black">Month Multipliers</h2>
          <p className="mt-2 text-sm text-slate-600">Editable Pigeon Forge seasonality placeholders.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {months.map((month) => (
              <form key={month.id} action={updateMonthMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <input type="hidden" name="id" value={month.id} />
                <span className="font-bold">{month.label}<span className="ml-2 text-xs text-slate-500">updated {month.updatedAt.toLocaleDateString()} by {month.updatedBy}</span></span>
                <div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={month.multiplier} /><button className="btn-secondary" type="submit">Save</button></div>
              </form>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
