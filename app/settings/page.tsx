import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { updateDayMultiplier, updateMonthMultiplier, updateProtein, updateScenario } from '@/app/actions';
import { dayPatternRows } from '@/lib/dayProfiles';

export default async function SettingsPage() {
  await ensureDefaultData(prisma);
  const dayProfiles = dayPatternRows();
  const [proteins, scenarios, days, months] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } }),
    prisma.dayMultiplier.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.monthMultiplier.findMany({ orderBy: { month: 'asc' } })
  ]);

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      <p className="mt-2 text-slate-600">Adjust assumptions as real Pigeon Forge operating data replaces the launch model.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Forecast Scenarios</h2>
      <div className="mt-4 grid gap-4">
        {scenarios.map(s => <form key={s.id} action={updateScenario} className="rounded-2xl border border-slate-200 p-4">
          <input type="hidden" name="id" value={s.id} />
          <div className="mb-3 text-lg font-black">{s.name}</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label">Annual Sales</label><input className="field mt-1" name="annualSales" type="number" defaultValue={s.annualSales} /></div>
            <div><label className="label">Smoked Meat % of Total Sales</label><input className="field mt-1" name="bbqSalesPercent" type="number" step="0.1" defaultValue={s.bbqSalesPercent} /></div>
            <div><label className="label">Safety %</label><input className="field mt-1" name="safetyFactorPct" type="number" step="0.1" defaultValue={s.safetyFactorPct} /></div>
            <div><label className="label">Brisket Mix %</label><input className="field mt-1" name="brisketMixPct" type="number" step="0.1" defaultValue={s.brisketMixPct} /></div>
            <div><label className="label">Pork Mix %</label><input className="field mt-1" name="porkMixPct" type="number" step="0.1" defaultValue={s.porkMixPct} /></div>
            <div><label className="label">Ribs Mix %</label><input className="field mt-1" name="ribsMixPct" type="number" step="0.1" defaultValue={s.ribsMixPct} /></div>
            <div><label className="label">Chicken Mix %</label><input className="field mt-1" name="chickenMixPct" type="number" step="0.1" defaultValue={s.chickenMixPct} /></div>
          </div>
          <button className="btn-secondary mt-4">Save Scenario</button>
        </form>})}
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Protein Assumptions</h2>
      <div className="mt-4 grid gap-4">
        {proteins.map(p => {
          const lower = p.name.toLowerCase();
          const unitName = lower.includes('chicken') ? 'breast' : lower.includes('rib') ? 'rack' : lower.includes('pork') ? 'butt' : lower.includes('brisket') ? 'brisket' : 'unit';
          return <form key={p.id} action={updateProtein} className="rounded-2xl border border-slate-200 p-4">
          <input type="hidden" name="id" value={p.id} />
          <div className="mb-3 text-lg font-black">{p.name}</div>
          {lower.includes('chicken') ? <p className="mb-3 text-sm font-bold text-slate-600">Chicken is now forecast as a clean number of breasts to load. Default: 1 breast ≈ 2.5 raw lb × 75% yield = 1.875 cooked lb.</p> : null}
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label">Raw Weight per {unitName} lb</label><input className="field mt-1" name="rawWeightEachLb" type="number" step="0.1" defaultValue={p.rawWeightEachLb} /></div>
            <div><label className="label">Cooked Weight per {unitName} lb</label><input className="field mt-1" name="cookedWeightEachLb" type="number" step="0.1" defaultValue={p.cookedWeightEachLb} /></div>
            <div><label className="label">Cooked Yield %</label><input className="field mt-1" name="cookedYieldPercent" type="number" step="0.1" defaultValue={p.cookedYieldPercent} /></div>
            <div><label className="label">Avg Sales $ / Cooked lb</label><input className="field mt-1" name="avgSalesPerCookedLb" type="number" step="0.1" defaultValue={p.avgSalesPerCookedLb} /></div>
            <div><label className="label">Purchase Cost Each</label><input className="field mt-1" name="purchaseCostEach" type="number" step="0.01" defaultValue={p.purchaseCostEach} /></div>
            <div><label className="label">Sales Price Each</label><input className="field mt-1" name="salesPriceEach" type="number" step="0.01" defaultValue={p.salesPriceEach} /></div>
            <div><label className="label">Sandwich oz</label><input className="field mt-1" name="sandwichOz" type="number" step="0.1" defaultValue={p.sandwichOz} /></div>
            <div><label className="label">Plate oz</label><input className="field mt-1" name="plateOz" type="number" step="0.1" defaultValue={p.plateOz} /></div>
            <div><label className="label">Min Cook Units</label><input className="field mt-1" name="minCookUnits" type="number" step="1" defaultValue={p.minCookUnits} /></div>
            <div><label className="label">Max Cook Units</label><input className="field mt-1" name="maxCookUnits" type="number" step="1" defaultValue={p.maxCookUnits} /></div>
            <div><label className="label">Max Reuse Hours</label><input className="field mt-1" name="maxReuseHours" type="number" step="1" defaultValue={p.maxReuseHours} /></div>
            <label className="flex items-center gap-2 pt-7 text-sm font-bold"><input name="reusableLeftover" type="checkbox" className="h-5 w-5" defaultChecked={p.reusableLeftover} /> Reusable leftover</label>
          </div>
          <button className="btn-secondary mt-4">Save Protein</button>
        </form>)}
      </div>
    </section>

    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-xl font-black">Day Pattern Profiles</h2>
        <p className="mt-2 text-sm text-slate-600">Cook Plan now uses selectable weekly sales patterns. Default Tourist is the global starting assumption.</p>
        <div className="mt-4 space-y-4">
          {dayProfiles.map(profile => <div key={profile.key} className="rounded-2xl border border-slate-200 p-4">
            <div className="text-lg font-black">{profile.name}</div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs md:text-sm">
              {profile.days.map(day => <div key={day.dayOfWeek} className="rounded-xl bg-slate-50 p-2">
                <div className="font-black">{day.label}</div>
                <div>{day.share}%</div>
                <div className="text-slate-500">×{day.multiplier.toFixed(2)}</div>
              </div>)}
            </div>
          </div>)}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-black text-slate-600">Legacy editable default multipliers</summary>
          <div className="mt-3 space-y-2">{days.map(d => <form key={d.id} action={updateDayMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><input type="hidden" name="id" value={d.id} /><span className="font-bold">{d.label}</span><div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={d.multiplier} /><button className="btn-secondary">Save</button></div></form>)}</div>
        </details>
      </div>
      <div className="card p-5">
        <h2 className="text-xl font-black">Month Multipliers</h2>
        <p className="mt-2 text-sm text-slate-600">Editable Pigeon Forge seasonality placeholders.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{months.map(m => <form key={m.id} action={updateMonthMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><input type="hidden" name="id" value={m.id} /><span className="font-bold">{m.label}</span><div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={m.multiplier} /><button className="btn-secondary">Save</button></div></form>)}</div>
      </div>
    </section>
  </Shell>;
}
