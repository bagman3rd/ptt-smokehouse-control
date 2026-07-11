import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DemoPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10">
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-black uppercase tracking-wide text-emerald-700">Demo Mode</div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Launch a sample smokehouse</h1>
      <p className="mt-3 text-slate-600">This creates a temporary demo restaurant with generic BBQ proteins, four weeks of fake EOD history, waste, 86 events, and learning/reporting data. Use it to click around without touching a real restaurant account.</p>
      <form action="/api/demo/start" method="POST" className="mt-6"><button className="btn-primary" type="submit">Start Demo</button></form>
      <Link href="/signup" className="btn-secondary mt-3 inline-flex">Create Real Account</Link>
    </div>
  </main>;
}
