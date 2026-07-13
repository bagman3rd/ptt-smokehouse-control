import Link from 'next/link';
import { hasRole, type AppRole } from '@/lib/auth';
import { NavMenu } from '@/components/NavMenu';
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

export async function Nav({ user }: { user: User }) {
  const currentRestaurant = await currentRestaurantForUser(user);
  const restaurants = await listRestaurantsForUser(user.id);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/today" className="text-xl font-black tracking-tight">Smokehouse Control <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Build 9.7.0</span></Link>
        <NavMenu
          groups={groups.map((group) => ({
            label: group.label,
            links: group.links.filter(([, , roles]) => hasRole(user, roles)).map(([itemLabel, href]) => [itemLabel, href] as [string, string])
          }))}
          restaurants={restaurants.map((restaurant) => ({ id: restaurant.id, name: restaurant.name }))}
          currentRestaurantId={currentRestaurant.id}
        />
      </div>
    </header>
  );
}
