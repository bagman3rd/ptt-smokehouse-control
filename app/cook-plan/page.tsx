import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { approveCookPlan } from '@/app/actions';
import { CreateCookPlanForm } from '@/app/cook-plan/CreateCookPlanForm';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function unitLabel(value: string) { return value.toLowerCase().replace('_', ' '); }
function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return unitLabel(inputUnit);
}

function timingCategory(proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('brisket')) return { label: 'Prior-day cook', badge: '9 AM–9 PM + overnight hold', usesCredit: true };
  if (lower.includes('pork')) return { label: 'Prior-day load', badge: '5 PM butt load', usesCredit: true };
  if (lower.includes('rib')) return { label: 'Same-day load after leftover credit', badge: 'Same-day ribs', usesCredit: true };
  if (lower.includes('chicken')) return { label: 'Same-day load after leftover credit', badge: 'Same-day chicken', usesCredit: true };
  return { label: 'Cook/load', badge: 'Service-day production', usesCredit: false };
}

export default async function CookPlanPage({ searchParams }: { searchParams?: { planId?: string; generatedAt?: string } }) {
  requireAuth();
  noStore();
  await ensureDefaultData(prisma);
  const [scenarios, selectedPlan, latestPlan] = await Promise.all([
    prisma.forecastScenario.findMany({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } }),
    searchParams?.planId ? prisma.cookPlan.findUnique({ where: { id: searchParams.planId }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } }) : Promise.resolve(null),
    prisma.cookPlan.findFirst({ orderBy: { createdAt: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
  ]);
  const plan = selectedPlan ?? latestPlan;
  const loadDate = plan?.serviceDate ?? null;
  const nextDayServiceDate = loadDate ? addUtcDays(loadDate, 1) : null;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Daily Load Plan</h1>
      <p className="mt-2 text-slate-600">Generate, review, and approve the actual smoker load for the selected production date. Brisket and pork use next-day service estimates; ribs and chicken use same-day estimates.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Create Forecast</h2>
      <CreateCookPlanForm scenarios={scenarios} />
    </section>

    {plan && loadDate && nextDayServiceDate ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Production Timing Summary</h2>
      <p className="mt-2 text-slate-600">This is a <strong>load plan for {fmtDateWithDow(loadDate)}</strong>, not a single service-day forecast. Brisket and pork are loaded/cooked today from <strong>{fmtDateWithDow(nextDayServiceDate)}</strong> demand. Ribs and chicken are cooked today from <strong>{fmtDateWithDow(loadDate)}</strong> demand.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-black uppercase text-amber-800">Load today for tomorrow</div>
          <div className="mt-1 text-lg font-black">{fmtDateWithDow(loadDate)} → {fmtDateWithDow(nextDayServiceDate)}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
            <li>Brisket: cook 9:00 AM–9:00 PM today, then hold overnight for next-day service.</li>
            <li>Pulled pork: load butts at 5:00 PM today for next-day service.</li>
            <li>These loads use tomorrow’s sales curve, not today’s sales curve.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-black uppercase text-emerald-800">Load today for today</div>
          <div className="mt-1 text-lg font-black">{fmtDateWithDow(loadDate)}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-950">
            <li>Ribs: cook/load same day using today’s demand.</li>
            <li>Pulled chicken: cook/load same day using today’s demand, shown as number of 2.5 lb raw boneless skinless breasts.</li>
            <li>Usable leftover ribs and chicken breasts are credited before calculating same-day load.</li>
          </ul>
        </div>
      </div>
    </section> : null}

    <section id="latest-plan" className="card mt-6 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Latest Plan</h2>
          {plan ? <p className="text-slate-600">Load date {fmtDateWithDow(plan.serviceDate)} · {plan.scenario.name} · same-day ribs/chicken forecast {money(plan.forecastSales)} total / {money(plan.forecastBbqSales)} BBQ · {plan.confidence} confidence</p> : null}
          {plan?.notes ? <p className="mt-1 text-sm font-bold text-slate-500">{plan.notes} · Created {plan.createdAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}</p> : null}
          {searchParams?.generatedAt ? <p className="mt-1 text-sm font-black text-emerald-700">Showing newly generated plan.</p> : null}
        </div>
        {plan ? <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black">{plan.status}</div> : null}
      </div>
      {!plan ? <p className="mt-4 text-slate-600">No plan has been created yet.</p> : <form action={approveCookPlan} className="mt-5 space-y-4">
        <input type="hidden" name="cookPlanId" value={plan.id} />
        {plan.items.map(item => {
          const timing = timingCategory(item.protein.name);
          const noPriorEodData = (item.notes ?? '').toLowerCase().includes('no data, check hot box');
          return <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
          <input type="hidden" name="itemId" value={item.id} />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-lg font-black">{item.protein.name}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{timing.badge}</span></div>
              <div className="mt-1 text-sm font-bold text-slate-600">{item.notes}</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-black uppercase text-slate-500">Gross forecast need</span><strong className="text-xl text-slate-950">{item.forecastCookUnits || item.recommendedCookUnits}</strong> {displayUnit(item.protein.name, item.protein.inputUnit)}</div>
                <div className={timing.usesCredit ? "rounded-xl bg-amber-50 p-3" : "rounded-xl bg-slate-50 p-3"}>
                  <span className={timing.usesCredit ? "block text-xs font-black uppercase text-amber-700" : "block text-xs font-black uppercase text-slate-500"}>{timing.usesCredit ? 'Prior EOD leftover credit' : 'Leftover credit not used'}</span>
                  {noPriorEodData ? <strong className="text-base text-amber-900">no data, check hot box</strong> : <><strong className={timing.usesCredit ? "text-xl text-amber-900" : "text-xl text-slate-500"}>{item.usableLeftoverUnits}</strong> {displayUnit(item.protein.name, item.protein.inputUnit)} <span className="text-xs">/ {item.usableLeftoverLb} lb</span></>}
                </div>
                <div className="rounded-xl bg-emerald-50 p-3"><span className="block text-xs font-black uppercase text-emerald-700">{timing.label}</span><strong className="text-xl text-emerald-900">{item.recommendedCookUnits}</strong> {displayUnit(item.protein.name, item.protein.inputUnit)}</div>
              </div>
              <div className="mt-2 text-sm text-slate-600">Net cooked production need {item.cookedLbNeeded} lb · net raw need {item.rawLbNeeded} lb · safety factor {item.safetyFactorPct}%</div>
            </div>
            <div className="grid gap-2 md:w-72">
              <label className="label">Approved Cook Units</label>
              <input className="field" name={`approved-${item.id}`} type="number" step="1" defaultValue={item.approvedCookUnits ?? item.recommendedCookUnits} />
              <label className="label">Manual Hot Box Adjustment</label>
              <input className="field" name={`hotBoxAdjustment-${item.id}`} type="number" step="1" defaultValue={0} placeholder="-1, 0, +2" />
              <p className="text-xs font-bold text-slate-500">Adjustment applies on approve. Use this after visually checking the hot box.</p>
              <input className="field" name={`reason-${item.id}`} placeholder="Override reason, if any" defaultValue={item.overrideReason ?? ''} />
            </div>
          </div>
        </div>})}
        <button className="btn-primary w-full md:w-auto" type="submit">Approve Cook Plan</button>
      </form>}
    </section>
  </Shell>;
}
