import Link from 'next/link';

const proofPoints = [
  ['Reduce BBQ waste', 'Turns daily forecast, prior EOD leftovers, and smoker capacity into a production plan instead of guessing from the calendar.'],
  ['Prevent sellouts', 'Tracks 86 events, underforecast streaks, and bias by protein so managers can see when the model is too tight.'],
  ['Standardize pitmaster decisions', 'Pork/brisket timing, chicken/rib same-day logic, smoker load schedule, and hot-box credits stay consistent even when staff changes.'],
  ['Prove improvement', 'Forecast Proof shows 7/30/90-day accuracy, leftovers, waste, sellouts, and actual demand by protein.'],
  ['Train from real data', 'POS item mapping and EOD logs create the history needed to tune mix, seasonality, and safety factors.'],
  ['Run multiple restaurants', 'Tenant isolation, restaurant switching, role-based access, backup exports, and audit logs support expansion beyond one BBQ operation.']
];

export default function SalesPage() {
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
      <div className="text-sm font-black uppercase tracking-wide text-orange-300">Smokehouse Control sales package</div>
      <h1 className="mt-2 max-w-4xl text-4xl font-black tracking-tight">BBQ production planning for restaurants that cannot afford to run out or throw away money.</h1>
      <p className="mt-4 max-w-3xl text-slate-200">The product connects forecast demand, smoker capacity, EOD leftovers, POS history, and learning recommendations into one daily kitchen workflow.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn-primary bg-white text-slate-900 hover:bg-slate-100" href="/demo">Launch Demo</Link>
        <Link className="btn-secondary border-white/30 text-white hover:bg-white/10" href="/tour">Guided Tour</Link>
        <Link className="btn-secondary border-white/30 text-white hover:bg-white/10" href="/signup">Create Account</Link>
      </div>
    </section>

    <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proofPoints.map(([title, body]) => <article key={title} className="card p-6">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
      </article>)}
    </section>

    <section className="card mt-8 p-6">
      <h2 className="text-2xl font-black tracking-tight">Sample weekly owner report</h2>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Forecast accuracy</strong><br />83–92% by protein after sufficient data.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Waste trend</strong><br />Pounds and dollars by protein/day.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Sellout risk</strong><br />86 count, underforecast bias, and capacity conflicts.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Data quality</strong><br />Missing EODs, draft logs, backups, POS coverage.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Recommendations</strong><br />Approved, rejected, rollback-ready forecast changes.</div>
      </div>
    </section>
  </main>;
}
