'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenGroup(null);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <nav ref={navRef} className="flex flex-wrap items-center gap-2" aria-label="Primary navigation" data-testid="primary-navigation">
      {restaurants.length > 1 ? (
        <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2" data-testid="restaurant-switch-form">
          <label className="sr-only" htmlFor="restaurant-switcher">Restaurant</label>
          <select id="restaurant-switcher" name="restaurantId" defaultValue={currentRestaurantId} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold" data-testid="restaurant-switcher">
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400" type="submit" data-testid="restaurant-switch-submit">Switch</button>
        </form>
      ) : null}

      <Link href="/today" className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-slate-400" data-testid="nav-link-today">Today</Link>

      {groups.map((group) => {
        if (!group.links.length) return null;
        const groupSlug = slug(group.label);
        const isOpen = openGroup === group.label;
        return (
          <div key={group.label} className="relative" data-testid={`nav-group-${groupSlug}`}>
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              data-testid={`nav-menu-button-${groupSlug}`}
              aria-label={`${group.label} menu`}
              aria-haspopup="menu"
              aria-expanded={isOpen}
              aria-controls={`nav-menu-panel-${groupSlug}`}
              onClick={() => setOpenGroup(isOpen ? null : group.label)}
            >
              {group.label} <span aria-hidden="true" className={`inline-block transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {isOpen ? (
              <div
                id={`nav-menu-panel-${groupSlug}`}
                role="menu"
                className="absolute right-0 z-[100] mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                data-testid={`nav-menu-panel-${groupSlug}`}
              >
                {group.links.map(([itemLabel, href]) => (
                  <Link
                    key={href}
                    href={href}
                    role="menuitem"
                    className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    data-testid={`nav-link-${slug(itemLabel)}`}
                    onClick={() => setOpenGroup(null)}
                  >
                    {itemLabel}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <form action="/api/logout" method="POST" data-testid="logout-form">
        <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400" type="submit" data-testid="logout-button">Logout</button>
      </form>
    </nav>
  );
}
