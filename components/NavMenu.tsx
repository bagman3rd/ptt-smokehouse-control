import Link from 'next/link';

type NavLink = [string, string];
type NavGroup = { label: string; links: NavLink[] };
type RestaurantOption = { id: string; name: string };

function MenuGroup({ label, links }: { label: string; links: NavLink[] }) {
  if (links.length === 0) return null;

  return (
    <details className="relative" data-testid={`nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        aria-label={`${label} menu`}
      >
        {label} <span aria-hidden="true" className="ml-1">▾</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
        {links.map(([itemLabel, href]) => (
          <Link
            key={href}
            href={href}
            className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
          >
            {itemLabel}
          </Link>
        ))}
      </div>
    </details>
  );
}

export function NavMenu({ groups, restaurants, currentRestaurantId }: { groups: NavGroup[]; restaurants: RestaurantOption[]; currentRestaurantId: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation">
      {restaurants.length > 1 ? (
        <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2">
          <label className="sr-only" htmlFor="restaurant-switcher">Restaurant</label>
          <select id="restaurant-switcher" name="restaurantId" defaultValue={currentRestaurantId} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold">
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">Switch</button>
        </form>
      ) : null}
      <Link href="/today" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white">Today</Link>
      {groups.map((group) => <MenuGroup key={group.label} label={group.label} links={group.links} />)}
      <form action="/api/logout" method="POST">
        <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">Logout</button>
      </form>
    </nav>
  );
}
