import Link from 'next/link';
import { hasRole, type AppRole } from '@/lib/auth';
import type { User } from '@prisma/client';
import { listRestaurantsForUser, currentRestaurantForUser } from '@/lib/tenant';

type NavLink = [string, string, AppRole[]];

const groups: Array<{ label: string; links: NavLink[] }> = [
  {
    label: 'Operations',
    links: [
      ['Dashboard', '/dashboard', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['Cook Plan', '/cook-plan', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['End of Day', '/end-of-day', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['Smoker Schedule', '/admin/smokers/schedule', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']]
    ]
  },
  {
    label: 'Insights',
    links: [
      ['Reports', '/reports', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
      ['Learning', '/learning', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
      ['Forecast Proof', '/learning/proof', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
      ['Tour', '/tour', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']]
    ]
  },
  {
    label: 'Admin',
    links: [
      ['Settings', '/settings', ['ADMIN', 'OWNER']],
      ['Users', '/admin/users', ['ADMIN', 'OWNER']],
      ['Restaurants', '/admin/restaurants', ['ADMIN', 'OWNER']],
      ['POS Import', '/admin/restaurants/pos', ['ADMIN', 'OWNER']],
      ['Smokers', '/admin/smokers', ['ADMIN', 'OWNER']],
      ['Smoker Catalog', '/admin/smokers/catalog', ['ADMIN', 'OWNER']],
      ['Audit Log', '/admin/audit', ['ADMIN', 'OWNER']],
      ['System', '/admin/system', ['ADMIN', 'OWNER']],
      ['Billing', '/billing', ['ADMIN', 'OWNER']],
      ['Data', '/admin/data', ['ADMIN', 'OWNER']]
    ]
  },
  {
    label: 'Help',
    links: [
      ['Support', '/support', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['Help Docs', '/help', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['Demo', '/demo', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
      ['Account', '/account/security', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']]
    ]
  }
];

function MenuGroup({ label, links, user }: { label: string; links: NavLink[]; user: User }) {
  const visible = links.filter(([, , roles]) => hasRole(user, roles));
  if (visible.length === 0) return null;
  return <details className="group relative">
    <summary className="list-none whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100">{label} ▾</summary>
    <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
      {visible.map(([itemLabel, href]) => <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">{itemLabel}</Link>)}
    </div>
  </details>;
}

export async function Nav({ user }: { user: User }) {
  const currentRestaurant = await currentRestaurantForUser(user);
  const restaurants = await listRestaurantsForUser(user.id);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/today" className="text-xl font-black tracking-tight">Smokehouse Control <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Build 5.9.0</span></Link>
        <nav className="flex flex-wrap items-center gap-2">
          {restaurants.length > 1 ? (
            <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2">
              <select name="restaurantId" defaultValue={currentRestaurant.id} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold">
                {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
              </select>
              <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">Switch</button>
            </form>
          ) : null}
          <Link href="/today" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white">Today</Link>
          {groups.map((group) => <MenuGroup key={group.label} label={group.label} links={group.links} user={user} />)}
          <form action="/api/logout" method="POST"><button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100">Logout</button></form>
        </nav>
      </div>
    </header>
  );
}
