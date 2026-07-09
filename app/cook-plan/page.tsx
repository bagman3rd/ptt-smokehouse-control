import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { approveCookPlan, createCookPlan } from '@/app/actions';
import { SubmitButton } from '@/components/SubmitButton';

function today() { return new Date().toISOString().slice(0,10); }
function money(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function fmtDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function CookPlanPage() {
  await ensureDefaultData(prisma);
  const [scenarios, plan] = await Promise.all([
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } }),
    prisma.cookPlan.findFirst({ orderBy: { serviceDate: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Daily Cook Plan</h1>
      <p className="mt-2 text-slate-600">Generate, review, and approve recommended loads for brisket, pork, ribs, and pulled chicken.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Create Forecast</h2>
      <form action={createCookPlan} className="mt-4 grid gap-4 md:grid-cols-4">
        <div>
          <label className="label">Service Date</label>
          <input className="field mt-1" name="serviceDate" type="date" defaultValue={today()} required />
        </div>
        <div>
          <label className="label">Scenario</label>
          <select className="field mt-1" name="scenarioId" required>
            {scenarios.length === 0 ? <option value="">No scenarios found — open Settings or run seed</option> : scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Event Multiplier</label>
          <input className="field mt-1" name="eventMultiplier" type="number" step="0.05" min="0.5" defaultValue="1" required />
        </div>
        <div className="flex items-end"><SubmitButton pendingText="Generating...">Generate Plan</SubmitButton></div>
      </form>
    </section>

    <section className="card mt-6 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Latest Plan</h2>
          {plan ? <p className="text-slate-600">{fmtDate(plan.serviceDate)} · {plan.scenario.name} · {money(plan.forecastSales)} total forecast · {money(plan.forecastBbqSales)} BBQ forecast · {plan.confidence} confidence</p> : null}
        </div>
        {plan ? <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">{plan.status}</div> : null}
      </div>
      {!plan ? <p className="mt-4 text-slate-600">No plan has been created yet.</p> : <form action={approveCookPlan} className="mt-5 space-y-4">
        <input type="hidden" name="cookPlanId" value={plan.id} />
        {plan.items.map(item => <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
          <input type="hidden" name="itemId" value={item.id} />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-black">{item.protein.name}</div>
              <div className="mt-1 text-sm text-slate-600">Recommended: <strong>{item.recommendedCookUnits}</strong> {item.protein.inputUnit.toLowerCase().replace('_', ' ')} · cooked need {item.cookedLbNeeded} lb · raw need {item.rawLbNeeded} lb</div>
              <div className="text-sm text-slate-600">Leftover credit: {item.usableLeftoverLb} lb · safety factor {item.safetyFactorPct}%</div>
            </div>
            <div className="grid gap-2 md:w-72">
              <label className="label">Approved Cook Units</label>
              <input className="field" name={`approved-${item.id}`} type="number" step="1" defaultValue={item.approvedCookUnits ?? item.recommendedCookUnits} />
              <input className="field" name={`reason-${item.id}`} placeholder="Override reason, if any" defaultValue={item.overrideReason ?? ''} />
            </div>
          </div>
        </div>)}
        <button className="btn-primary w-full md:w-auto" type="submit">Approve Cook Plan</button>
      </form>}
    </section>
  </Shell>;
}
