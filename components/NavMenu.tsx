import Link from 'next/link';

type NavLink = [string, string];
type NavGroup = { label: string; links: NavLink[] };
type RestaurantOption = { id: string; name: string };

function DirectGroup({ label, links }: { label: string; links: NavLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1" data-testid={`nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="px-2 text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      {links.map(([itemLabel, href]) => (
        <Link
          key={href}
          href={href}
          className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
          data-testid={`nav-link-${itemLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        >
          {itemLabel}
        </Link>
      ))}
    </div>
  );
}

export function NavMenu({ groups, restaurants, currentRestaurantId }: { groups: NavGroup[]; restaurants: RestaurantOption[]; currentRestaurantId: string }) {
  return (
    <nav className="flex w-full flex-col gap-2" aria-label="Primary navigation">
      <div className="flex flex-wrap items-center gap-2">
        {restaurants.length > 1 ? (
          <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2">
            <label className="sr-only" htmlFor="restaurant-switcher">Restaurant</label>
            <select id="restaurant-switcher" name="restaurantId" defaultValue={currentRestaurantId} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold">
              {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
            </select>
            <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">Switch</button>
          </form>
        ) : null}
        <Link href="/today" className="whitespace-nowrap rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white" data-testid="nav-link-today">Today</Link>
        <form action="/api/logout" method="POST">
          <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">Logout</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => <DirectGroup key={group.label} label={group.label} links={group.links} />)}
      </div>
    </nav>
  );
}
