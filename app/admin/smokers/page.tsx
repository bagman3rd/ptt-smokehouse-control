import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { createSmoker, deleteSmoker, updateSmoker } from './actions';
import { AddSmokerForm, EditSmokerForm } from '@/components/smokers/SmokerCatalogForms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(value: number) { return Math.round(value * 10) / 10; }

export default async function SmokersPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  noStore();
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const [smokers, catalog] = await Promise.all([
    prisma.smoker.findMany({ where: { restaurantId }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.smokerCatalog.findMany({ where: { active: true }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] })
  ]);
  const totals = smokers.filter(s => s.active).reduce((sum, s) => ({
    brisket: sum.brisket + s.brisketCapacity,
    pork: sum.pork + s.porkCapacity,
    ribs: sum.ribs + s.ribCapacity,
    chicken: sum.chicken + s.chickenCapacity
  }), { brisket: 0, pork: 0, ribs: 0, chicken: 0 });

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Smoker Capacity</h1>
      <p className="mt-2 text-slate-600">Build the physical production model. Pick a brand/model to load manufacturer-published count capacities. Pound capacities, ranges, and whole-chicken capacities are shown for reference and are not converted into planning counts.</p>
    </div>
    <div className="mb-6 flex gap-2"><a href="/admin/smokers/schedule" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Open Smoker Schedule</a><a href="/today" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">Today</a></div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Brisket Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.brisket)}</div><div className="text-sm text-slate-500">briskets / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Pork Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.pork)}</div><div className="text-sm text-slate-500">butts / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Rib Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.ribs)}</div><div className="text-sm text-slate-500">racks / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Chicken Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.chicken)}</div><div className="text-sm text-slate-500">breasts / cook</div></div>
    </section>

    <section className="card mt-6 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black">Add Smoker From Catalog</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">Catalog contains {catalog.length} active manufacturer rows. Count fields auto-load only when the manufacturer publishes that exact planning unit.</p>
        </div>
        <a href="/admin/smokers/catalog" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black hover:bg-slate-100">View Catalog</a>
      </div>
      <AddSmokerForm catalog={catalog} action={createSmoker} />
    </section>

    <section className="mt-6 space-y-4">
      {smokers.map((smoker) => <EditSmokerForm key={smoker.id} smoker={smoker} catalog={catalog} action={updateSmoker} deleteAction={deleteSmoker} />)}
    </section>
  </Shell>;
}
