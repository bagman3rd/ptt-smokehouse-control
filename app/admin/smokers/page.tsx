import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { createSmoker, updateSmoker } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(value: number) { return Math.round(value * 10) / 10; }

export default async function SmokersPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  noStore();
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const smokers = await prisma.smoker.findMany({ where: { restaurantId }, orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  const totals = smokers.filter(s => s.active).reduce((sum, s) => ({
    brisket: sum.brisket + s.brisketCapacity,
    pork: sum.pork + s.porkCapacity,
    ribs: sum.ribs + s.ribCapacity,
    chicken: sum.chicken + s.chickenCapacity
  }), { brisket: 0, pork: 0, ribs: 0, chicken: 0 });

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Smoker Capacity</h1>
      <p className="mt-2 text-slate-600">Build the physical production model. The next forecast step is comparing recommended loads against actual smoker capacity.</p>
    </div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Brisket Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.brisket)}</div><div className="text-sm text-slate-500">briskets / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Pork Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.pork)}</div><div className="text-sm text-slate-500">butts / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Rib Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.ribs)}</div><div className="text-sm text-slate-500">racks / cook</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Chicken Capacity</div><div className="mt-2 text-3xl font-black">{num(totals.chicken)}</div><div className="text-sm text-slate-500">breasts / cook</div></div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Add Smoker</h2>
      <form action={createSmoker} className="mt-4 grid gap-3 md:grid-cols-4">
        <input className="field" name="name" placeholder="Smoker name" required />
        <input className="field" name="model" placeholder="Model" />
        <input className="field" name="location" placeholder="Indoor / outdoor / pit room" />
        <input className="field" name="cookWindow" placeholder="Cook window" />
        <input className="field" name="rackCount" type="number" min="0" step="1" placeholder="Rack count" />
        <input className="field" name="brisketCapacity" type="number" min="0" step="0.1" placeholder="Brisket capacity" />
        <input className="field" name="porkCapacity" type="number" min="0" step="0.1" placeholder="Pork butt capacity" />
        <input className="field" name="ribCapacity" type="number" min="0" step="0.1" placeholder="Rib rack capacity" />
        <input className="field" name="chickenCapacity" type="number" min="0" step="0.1" placeholder="Chicken breast capacity" />
        <button className="btn-primary md:col-span-4" type="submit">Add smoker</button>
      </form>
    </section>

    <section className="mt-6 space-y-4">
      {smokers.map((smoker) => <form key={smoker.id} action={updateSmoker} className="card grid gap-3 p-5 md:grid-cols-4">
        <input type="hidden" name="id" value={smoker.id} />
        <input className="field" name="name" defaultValue={smoker.name} />
        <input className="field" name="model" defaultValue={smoker.model || ''} />
        <input className="field" name="location" defaultValue={smoker.location || ''} />
        <input className="field" name="cookWindow" defaultValue={smoker.cookWindow || ''} />
        <label className="text-sm font-bold">Racks<input className="field mt-1" name="rackCount" type="number" min="0" step="1" defaultValue={smoker.rackCount} /></label>
        <label className="text-sm font-bold">Briskets<input className="field mt-1" name="brisketCapacity" type="number" min="0" step="0.1" defaultValue={smoker.brisketCapacity} /></label>
        <label className="text-sm font-bold">Pork butts<input className="field mt-1" name="porkCapacity" type="number" min="0" step="0.1" defaultValue={smoker.porkCapacity} /></label>
        <label className="text-sm font-bold">Rib racks<input className="field mt-1" name="ribCapacity" type="number" min="0" step="0.1" defaultValue={smoker.ribCapacity} /></label>
        <label className="text-sm font-bold">Chicken breasts<input className="field mt-1" name="chickenCapacity" type="number" min="0" step="0.1" defaultValue={smoker.chickenCapacity} /></label>
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={smoker.active} /> Active</label>
        <button className="btn-secondary md:col-span-2" type="submit">Save smoker</button>
      </form>)}
    </section>
  </Shell>;
}
