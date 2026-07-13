'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type NavLink = [string, string];
type NavGroup = { label: string; links: NavLink[] };
type RestaurantOption = { id: string; name: string };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function MenuGroup({
  label,
  links,
  openGroup,
  setOpenGroup
}: {
  label: string;
  links: NavLink[];
  openGroup: string | null;
  setOpenGroup: (label: string | null) => void;
}) {
  const isOpen = openGroup === label;
  if (links.length === 0) return null;

  return (
    <div className="relative" data-testid={`nav-group-${slug(label)}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`nav-menu-${slug(label)}`}
        className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        onClick={(event) => {
          event.stopPropagation();
          setOpenGroup(isOpen ? null : label);
        }}
        data-testid={`nav-menu-button-${slug(label)}`}
      >
        {label} <span aria-hidden="true">▾</span>
      </button>

      {isOpen ? (
        <div
          id={`nav-menu-${slug(label)}`}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
          data-testid={`nav-menu-panel-${slug(label)}`}
        >
          {links.map(([itemLabel, href]) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
              onClick={() => setOpenGroup(null)}
              data-testid={`nav-link-${slug(itemLabel)}`}
            >
              {itemLabel}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function closeOutside(event: MouseEvent | TouchEvent) {
      if (navRef.current && event.target instanceof Node && navRef.current.contains(event.target)) return;
      setOpenGroup(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenGroup(null);
    }

    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <nav
      ref={navRef}
      className="flex flex-wrap items-center gap-2"
      aria-label="Primary navigation"
      onClick={(event) => event.stopPropagation()}
    >
      {restaurants.length > 1 ? (
        <form action="/api/restaurants/switch" method="POST" className="flex items-center gap-2" onSubmit={() => setOpenGroup(null)}>
          <label className="sr-only" htmlFor="restaurant-switcher">Restaurant</label>
          <select
            id="restaurant-switcher"
            name="restaurantId"
            defaultValue={currentRestaurantId}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
          <button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100" type="submit">
            Switch
          </button>
        </form>
      ) : null}

      <Link
        href="/today"
        className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 text-sm font-black text-white"
        onClick={() => setOpenGroup(null)}
        data-testid="nav-link-today"
      >
        Today
      </Link>

      {groups.map((group) => (
        <MenuGroup
          key={group.label}
          label={group.label}
          links={group.links}
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
        />
      ))}

      <form action="/api/logout" method="POST" onSubmit={() => setOpenGroup(null)}>
        <button
          className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100"
          type="submit"
        >
          Logout
        </button>
      </form>
    </nav>
  );
}
