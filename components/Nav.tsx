import Link from 'next/link';

const links = [
  ['Dashboard', '/dashboard'],
  ['Cook Plan', '/cook-plan'],
  ['End of Day', '/end-of-day'],
  ['Reports', '/reports'],
  ['Settings', '/settings']
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/dashboard" className="text-xl font-black tracking-tight">PTT Smokehouse Control <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Build 1.5.3</span></Link>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {links.map(([label, href]) => (
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
