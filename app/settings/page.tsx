import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { updateDayMultiplier, updateMonthMultiplier, updateProtein, updateScenario } from '@/app/actions';

export default async function SettingsPage() {
  const [proteins, scenarios, days, months] = await Promise.all([
    prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } }),
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
            <div><label className="label">BBQ Sales %</label><input className="field mt-1" name="bbqSalesPercent" type="number" step="0.1" defaultValue={s.bbqSalesPercent} /></div>
            <div><label className="label">Safety %</label><input className="field mt-1" name="safetyFactorPct" type="number" step="0.1" defaultValue={s.safetyFactorPct} /></div>
            <div><label className="label">Avg $/Cooked lb</label><input className="field mt-1" name="averagePricePerLbCooked" type="number" step="0.1" defaultValue={s.averagePricePerLbCooked} /></div>
            <div><label className="label">Brisket Mix %</label><input className="field mt-1" name="brisketMixPct" type="number" step="0.1" defaultValue={s.brisketMixPct} /></div>
            <div><label className="label">Pork Mix %</label><input className="field mt-1" name="porkMixPct" type="number" step="0.1" defaultValue={s.porkMixPct} /></div>
            <div><label className="label">Ribs Mix %</label><input className="field mt-1" name="ribsMixPct" type="number" step="0.1" defaultValue={s.ribsMixPct} /></div>
            <div><label className="label">Chicken Mix %</label><input className="field mt-1" name="chickenMixPct" type="number" step="0.1" defaultValue={s.chickenMixPct} /></div>
          </div>
          <button className="btn-secondary mt-4">Save Scenario</button>
        </form>)}
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Protein Assumptions</h2>
      <div className="mt-4 grid gap-4">
        {proteins.map(p => <form key={p.id} action={updateProtein} className="rounded-2xl border border-slate-200 p-4">
          <input type="hidden" name="id" value={p.id} />
          <div className="mb-3 text-lg font-black">{p.name}</div>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label">Raw Weight Each lb</label><input className="field mt-1" name="rawWeightEachLb" type="number" step="0.1" defaultValue={p.rawWeightEachLb} /></div>
            <div><label className="label">Cooked Yield %</label><input className="field mt-1" name="cookedYieldPercent" type="number" step="0.1" defaultValue={p.cookedYieldPercent} /></div>
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
        <h2 className="text-xl font-black">Day Multipliers</h2>
        <p className="mt-2 text-sm text-slate-600">Editable launch assumptions for day-of-week demand.</p>
        <div className="mt-3 space-y-2">{days.map(d => <form key={d.id} action={updateDayMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><input type="hidden" name="id" value={d.id} /><span className="font-bold">{d.label}</span><div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={d.multiplier} /><button className="btn-secondary">Save</button></div></form>)}</div>
      </div>
      <div className="card p-5">
        <h2 className="text-xl font-black">Month Multipliers</h2>
        <p className="mt-2 text-sm text-slate-600">Editable Pigeon Forge seasonality placeholders.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{months.map(m => <form key={m.id} action={updateMonthMultiplier} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><input type="hidden" name="id" value={m.id} /><span className="font-bold">{m.label}</span><div className="flex items-center gap-2"><input className="field w-24" name="multiplier" type="number" min="0.1" max="3" step="0.01" defaultValue={m.multiplier} /><button className="btn-secondary">Save</button></div></form>)}</div>
      </div>
    </section>
  </Shell>;
}
