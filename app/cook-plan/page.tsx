import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { approveCookPlan } from '@/app/actions';
import { CreateCookPlanForm } from '@/app/cook-plan/CreateCookPlanForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function fmtDate(d: Date) { return d.toISOString().slice(0,10); }
function unitLabel(value: string) { return value.toLowerCase().replace('_', ' '); }

export default async function CookPlanPage({ searchParams }: { searchParams?: { planId?: string; generatedAt?: string } }) {
  noStore();
  await ensureDefaultData(prisma);
  const [scenarios, selectedPlan, latestPlan] = await Promise.all([
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } }),
    searchParams?.planId ? prisma.cookPlan.findUnique({ where: { id: searchParams.planId }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }) : Promise.resolve(null),
    prisma.cookPlan.findFirst({ orderBy: { createdAt: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);
  const plan = selectedPlan ?? latestPlan;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Daily Cook Plan</h1>
      <p className="mt-2 text-slate-600">Generate, review, and approve recommended loads for brisket, pork, ribs, and pulled chicken.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Create Forecast</h2>
      <CreateCookPlanForm scenarios={scenarios} />
    </section>

    <section id="latest-plan" className="card mt-6 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Latest Plan</h2>
          {plan ? <p className="text-slate-600">{fmtDate(plan.serviceDate)} · {plan.scenario.name} · {money(plan.forecastSales)} total forecast · {money(plan.forecastBbqSales)} BBQ forecast · {plan.confidence} confidence</p> : null}
          {plan?.notes ? <p className="mt-1 text-sm font-bold text-slate-500">{plan.notes} · Created {plan.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}</p> : null}
          {searchParams?.generatedAt ? <p className="mt-1 text-sm font-black text-emerald-700">Showing newly generated plan.</p> : null}
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
              <div className="mt-1 text-sm text-slate-600">Recommended: <strong className="text-xl text-slate-950">{item.recommendedCookUnits}</strong> {unitLabel(item.protein.inputUnit)} · cooked need {item.cookedLbNeeded} lb · raw need {item.rawLbNeeded} lb</div>
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
