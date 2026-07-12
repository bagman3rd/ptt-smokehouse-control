import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { requireRole, ROLE_LABELS, normalizeRole } from '@/lib/auth';
import { listRestaurantsForUser } from '@/lib/tenant';
import { createRestaurant, updateRestaurantStatus } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RestaurantsPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const memberships = await prisma.restaurantMembership.findMany({
    where: { userId: user.id },
    include: { restaurant: true },
    orderBy: [{ restaurant: { name: 'asc' } }]
  });
  const restaurants = await listRestaurantsForUser(user.id);

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Restaurants</h1>
      <p className="mt-2 text-slate-600">Create and switch restaurants. Build 4.1.0 supports self-service onboarding, demo data, per-tenant exports, and tenant deletion controls. It starts the onboarding flow by creating a tenant, giving you a role in that restaurant, and seeding starter BBQ production assumptions.</p><div className="mt-4 flex flex-wrap gap-2"><a href="/admin/restaurants/setup" className="btn-secondary inline-flex">Open Setup Wizard</a><a href="/admin/restaurants/pos" className="btn-secondary inline-flex">POS / Sales Import</a><a href="/api/admin/tenant/export" className="btn-secondary inline-flex">Export Active Tenant</a></div>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Create Restaurant</h2>
      <form action={createRestaurant} className="mt-4 grid gap-3 md:grid-cols-5">
        <div><label className="label">Restaurant Name</label><input className="field mt-1" name="name" required placeholder="Smokehouse Control Demo" /></div>
        <div><label className="label">City</label><input className="field mt-1" name="city" placeholder="Pigeon Forge" /></div>
        <div><label className="label">State</label><input className="field mt-1" name="state" placeholder="TN" /></div>
        <div><label className="label">Timezone</label><input className="field mt-1" name="timezone" defaultValue="America/New_York" /></div>
        <div><label className="label">Your Role</label><select className="field mt-1" name="role" defaultValue="OWNER"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option></select></div>
        <div className="md:col-span-5"><button className="btn-primary" type="submit">Create and Seed Restaurant</button></div>
      </form>
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Your Restaurant Access</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">Restaurant</th><th className="py-2 pr-4">Your Role</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Action</th></tr></thead>
          <tbody>{memberships.map((membership) => {
            const role = normalizeRole(String(membership.role));
            return <tr key={membership.id} className="border-b align-top"><td className="py-3 pr-4"><div className="font-bold">{membership.restaurant.name}</div><div className="text-slate-500">{membership.restaurant.city || '—'}, {membership.restaurant.state || '—'} · {membership.restaurant.timezone}</div></td><td className="py-3 pr-4 font-bold">{ROLE_LABELS[role]}</td><td className="py-3 pr-4">{membership.restaurant.active ? 'Active' : 'Inactive'}</td><td className="py-3 pr-4"><form action={updateRestaurantStatus} className="flex items-center gap-2"><input type="hidden" name="restaurantId" value={membership.restaurantId} /><label className="flex items-center gap-2 font-semibold"><input name="active" type="checkbox" defaultChecked={membership.restaurant.active} /> Active</label><button className="btn-secondary" type="submit">Save</button></form></td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-500">Switcher-ready restaurants: {restaurants.length}</p>
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black text-red-700">Tenant Export and Deletion</h2>
      <p className="mt-2 text-sm text-slate-600">Before canceling or deleting a restaurant, export the tenant JSON. Build 4.1.0 soft-deletes tenant access instead of hard-deleting rows so there is a safety window for restore.</p>
      <div className="mt-4 flex flex-wrap gap-2"><a href="/api/admin/tenant/export" className="btn-secondary">Download Tenant Export</a></div>
      <form action="/api/admin/tenant/delete" method="POST" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
        <label className="label text-red-800">Type the active restaurant name to deactivate tenant</label>
        <input className="field mt-1" name="confirm" placeholder="Exact restaurant name" />
        <button className="mt-3 rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800" type="submit">Deactivate Tenant</button>
      </form>
    </section>

  </Shell>;
}
