import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function timing(proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('brisket')) return 'Cook 9 AM–9 PM, hold overnight for next-day service';
  if (lower.includes('pork')) return 'Load at 5 PM for next-day service';
  if (lower.includes('rib')) return 'Same-day rib cook';
  if (lower.includes('chicken')) return 'Same-day chicken breast cook';
  return 'Cook per kitchen manager instructions';
}

export default async function CookPlanPrintPage({ searchParams }: { searchParams?: { planId?: string } }) {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
  const restaurant = await currentRestaurantForUser(user);
  const plan = searchParams?.planId
    ? await prisma.cookPlan.findFirst({ where: { id: searchParams.planId, restaurantId: restaurant.id }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } })
    : await prisma.cookPlan.findFirst({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } } });

  if (!plan) return <main className="p-8"><h1>No cook plan found.</h1></main>;
  const nextDay = addUtcDays(plan.serviceDate, 1);

  return (
    <main className="print-big-type mx-auto max-w-5xl bg-white p-8 text-slate-950 print:p-4">
      <style>{`@media print { .no-print { display: none; } body { background: white; } table { page-break-inside: avoid; font-size: 15px; } th,td { vertical-align: top; } .one-page-note { font-size: 12px; } }`}</style>
      <div className="no-print mb-4 flex gap-2"><PrintButton /><a href="/cook-plan" className="rounded-lg border px-4 py-2 font-bold">Back</a></div>
      <header className="border-b-4 border-slate-900 pb-4">
        <h1 className="text-4xl font-black print:text-3xl">Smokehouse Daily Load Plan</h1>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
          <div><strong>Restaurant:</strong> {restaurant.name}</div>
          <div><strong>Status:</strong> {plan.status}</div>
          <div><strong>Load Date:</strong> {fmtDateWithDow(plan.serviceDate)}</div>
          <div><strong>Tomorrow Service Date:</strong> {fmtDateWithDow(nextDay)}</div>
          <div><strong>Scenario:</strong> {plan.scenario.name}</div>
          <div><strong>Printed:</strong> {new Date().toLocaleString()}</div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-900 p-4"><div className="text-sm font-black uppercase">Prior-day loads</div><div className="mt-1 text-sm">Brisket and pork loaded today for {fmtDateWithDow(nextDay)} service.</div></div>
        <div className="rounded-xl border-2 border-slate-900 p-4"><div className="text-sm font-black uppercase">Same-day loads</div><div className="mt-1 text-sm">Ribs and chicken loaded today for {fmtDateWithDow(plan.serviceDate)} service.</div></div>
      </section>

      <table className="print-one-page mt-6 w-full border-collapse text-base">
        <thead><tr className="border-b-2 border-slate-900 text-left"><th className="p-2">Protein</th><th className="p-2">Load</th><th className="p-2">Prior EOD Credit</th><th className="p-2">Cook / Hold Instruction</th><th className="p-2">Manager Notes</th></tr></thead>
        <tbody>{plan.items.map((item) => <tr key={item.id} className="border-b border-slate-300 align-top"><td className="p-2 font-black">{item.protein.name}</td><td className="p-2 text-xl font-black">{item.approvedCookUnits ?? item.recommendedCookUnits} {displayUnit(item.protein.name, item.protein.inputUnit)}</td><td className="p-2">{item.usableLeftoverUnits} {displayUnit(item.protein.name, item.protein.inputUnit)} / {item.usableLeftoverLb} lb</td><td className="p-2 font-bold">{timing(item.protein.name)}</td><td className="p-2">{item.overrideReason || item.notes || '—'}</td></tr>)}</tbody>
      </table>

      <section className="print-signoff mt-8 rounded-xl border-2 border-slate-900 p-4">
        <div className="font-black">Manager Signoff / Hot Box Verified / Load Count Confirmed</div>
        <div className="mt-6 grid gap-8 md:grid-cols-3"><div>KM: __________________________</div><div>Time: __________________________</div><div>Phone/initials: __________________</div></div><p className="one-page-note mt-4 text-sm font-bold">Close the day at /end-of-day. Enter actual cooked, sold, waste, 86 events, and usable hot-box leftovers before locking.</p>
      </section>
    </main>
  );
}
