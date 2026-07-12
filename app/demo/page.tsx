import Link from 'next/link';

export const dynamic = 'force-dynamic';

const demoFeatures = [
  '90 days of fake EOD history',
  'BBQ proteins and forecast scenarios',
  'Waste, leftovers, and sample 86 events',
  'Forecast Proof and Learning pages populated',
  'Reports, POS import, smoker schedule, and data-quality workflow ready to inspect'
];

export default function DemoPage() {
  return <main className="min-h-screen bg-slate-50 px-4 py-10">
    <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="text-sm font-black uppercase tracking-wide text-emerald-700">Demo workspace</div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Launch a sample smokehouse</h1>
      <p className="mt-3 text-slate-600">This creates a demo restaurant with enough fake operating history to show the full sales story: daily production planning, EOD closeout, reports, learning, forecast proof, data quality, smoker scheduling, and support workflows.</p>
      <ul className="mt-5 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        {demoFeatures.map((feature) => <li key={feature} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 font-semibold">{feature}</li>)}
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action="/api/demo/start" method="POST"><button className="btn-primary" type="submit">Start Demo</button></form>
        <Link href="/tour" className="btn-secondary">Guided Tour</Link>
        <Link href="/sales" className="btn-secondary">Sales Package</Link>
        <Link href="/signup" className="btn-secondary">Create Real Account</Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">Demo data is intentionally synthetic. Use a real staging database for migration, backup, and tenant-isolation verification.</p>
    </div>
  </main>;
}
