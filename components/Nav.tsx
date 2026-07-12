import Link from 'next/link';
import { hasRole, type AppRole } from '@/lib/auth';
import type { User } from '@prisma/client';
import { listRestaurantsForUser, currentRestaurantForUser } from '@/lib/tenant';

const links: Array<[string, string, AppRole[]]> = [
  ['Today', '/today', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['Dashboard', '/dashboard', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['Cook Plan', '/cook-plan', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['End of Day', '/end-of-day', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['Reports', '/reports', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
  ['Learning', '/learning', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
  ['Settings', '/settings', ['ADMIN', 'OWNER']],
  ['Users', '/admin/users', ['ADMIN', 'OWNER']],
  ['Restaurants', '/admin/restaurants', ['ADMIN', 'OWNER']],
  ['POS Import', '/admin/restaurants/pos', ['ADMIN', 'OWNER']],
  ['Audit Log', '/admin/audit', ['ADMIN', 'OWNER']],
  ['System', '/admin/system', ['ADMIN', 'OWNER']],
  ['Smokers', '/admin/smokers', ['ADMIN', 'OWNER']],
  ['Billing', '/billing', ['ADMIN', 'OWNER']]
];

export async function Nav({ user }: { user: User }) {
  const currentRestaurant = await currentRestaurantForUser(user);
  const restaurants = await listRestaurantsForUser(user.id);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/dashboard" className="text-xl font-black tracking-tight">PTT Smokehouse Control <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Build 4.6.0</span></Link>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {restaurants.length > 1 ? (
            <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2">
              <select name="restaurantId" defaultValue={currentRestaurant.id} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold">
                {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
              </select>
              <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100" type="submit">Switch</button>
            </form>
          ) : null}
          {links.filter(([, , roles]) => hasRole(user, roles)).map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100">
              {label}
            </Link>
          ))}
          <Link href="/help" className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100">Help</Link>
          <form action="/api/logout" method="POST"><button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100">Logout</button></form>
        </nav>
      </div>
    </header>
  );
}
