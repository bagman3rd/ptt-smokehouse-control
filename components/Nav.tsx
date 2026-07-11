import Link from 'next/link';
import { hasRole, normalizeRole, ROLE_LABELS, type AppRole } from '@/lib/auth';
import type { User } from '@prisma/client';

const links: Array<[string, string, AppRole[]]> = [
  ['Dashboard', '/dashboard', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['Cook Plan', '/cook-plan', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
  ['End of Day', '/end-of-day', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']],
  ['Reports', '/reports', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
  ['Learning', '/learning', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER']],
  ['Settings', '/settings', ['ADMIN', 'OWNER']],
  ['Users', '/admin/users', ['ADMIN', 'OWNER']]
];

export function Nav({ user }: { user: User }) {
  const role = normalizeRole(String(user.role));
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/dashboard" className="text-xl font-black tracking-tight">PTT Smokehouse Control <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Build 2.7.0</span></Link>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{user.name} · {ROLE_LABELS[role]}</span>
          {links.filter(([, , roles]) => hasRole(user, roles)).map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100">
              {label}
            </Link>
          ))}
          <form action="/api/logout" method="POST"><button className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100">Logout</button></form>
        </nav>
      </div>
    </header>
  );
}
