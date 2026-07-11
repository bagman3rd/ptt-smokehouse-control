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
      <p className="mt-2 text-slate-600">Create and switch restaurants. Build 3.2.0 starts the onboarding flow by creating a tenant, giving you a role in that restaurant, and seeding starter BBQ production assumptions.</p><a href="/admin/restaurants/setup" className="btn-secondary mt-4 inline-flex">Open Setup Wizard</a>
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
  </Shell>;
}
