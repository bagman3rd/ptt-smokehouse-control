import Link from 'next/link';

type NavLink = [string, string];
type NavGroup = { label: string; links: NavLink[] };
type RestaurantOption = { id: string; name: string };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function NavMenu({
  groups,
  restaurants,
  currentRestaurantId
}: {
  groups: NavGroup[];
  restaurants: RestaurantOption[];
  currentRestaurantId: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation" data-testid="primary-navigation">
      {restaurants.length > 1 ? (
        <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2">
          <label className="sr-only" htmlFor="restaurant-switcher">Restaurant</label>
          <select id="restaurant-switcher" name="restaurantId" defaultValue={currentRestaurantId} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold">
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400" type="submit">Switch</button>
        </form>
      ) : null}

      <Link href="/today" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-slate-400" data-testid="nav-link-today">Today</Link>

      {groups.map((group) => group.links.length ? (
        <details key={group.label} className="group relative" data-testid={`nav-group-${slug(group.label)}`}>
          <summary
            className="cursor-pointer list-none whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 [&::-webkit-details-marker]:hidden"
            data-testid={`nav-menu-button-${slug(group.label)}`}
            aria-label={`${group.label} menu`}
          >
            {group.label} <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" data-testid={`nav-menu-panel-${slug(group.label)}`}>
            {group.links.map(([itemLabel, href]) => (
              <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none" data-testid={`nav-link-${slug(itemLabel)}`}>
                {itemLabel}
              </Link>
            ))}
          </div>
        </details>
      ) : null)}

      <form action="/api/logout" method="POST">
        <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400" type="submit">Logout</button>
      </form>
    </nav>
  );
}
