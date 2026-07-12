import Link from 'next/link';

const tourSteps = [
  { title: 'Today Command Center', href: '/today', detail: 'Start here every morning. It shows the current cook plan, prior EOD status, data quality, confidence, smoker schedule, and the fastest path to production execution.' },
  { title: 'Cook Plan', href: '/cook-plan', detail: 'Generate and review the load plan. Brisket and pork are planned against tomorrow. Ribs and chicken are planned for the same service day.' },
  { title: 'Print Pit Sheet', href: '/cook-plan/print', detail: 'Print the smoker-ready production sheet with load times, smoker assignments, capacity warnings, hot-box checks, and signoff lines.' },
  { title: 'End of Day', href: '/end-of-day', detail: 'Close the day with explicit leftovers, waste, sold amounts, 86 events, and manager notes. Local draft protection helps survive bad Wi-Fi.' },
  { title: 'Reports', href: '/reports', detail: 'Use saved reports, CSV exports, and run history to review waste, sales, production, forecast errors, and execution trends.' },
  { title: 'Learning', href: '/learning', detail: 'Review recommendations. The app shows confidence and sample size before any forecast setting is changed.' },
  { title: 'Forecast Proof', href: '/learning/proof', detail: 'Show 7/30/90-day forecast accuracy by protein, bias, waste, sellouts, and matched cook-plan versus EOD results.' },
  { title: 'POS Import', href: '/admin/restaurants/pos', detail: 'Map POS menu items to proteins and import item-level CSV sales to reduce manual training data gaps.' },
  { title: 'Smoker Schedule', href: '/admin/smokers/schedule', detail: 'Verify whether the physical cook windows and smoker capacities can support the generated production plan.' },
  { title: 'System', href: '/admin/system', detail: 'Record staging tests, backup checks, restore drills, migration status, security checks, and pilot-readiness proof.' }
];

export default function TourPage() {
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
      <div className="text-sm font-black uppercase tracking-wide text-emerald-300">Guided tour</div>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Learn the smokehouse workflow in 10 minutes</h1>
      <p className="mt-4 max-w-3xl text-slate-200">This tour explains where to click, what each screen proves, and how the daily loop moves from forecast to production to EOD learning.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn-primary bg-white text-slate-900 hover:bg-slate-100" href="/today">Start at Today</Link>
        <Link className="btn-secondary border-white/30 text-white hover:bg-white/10" href="/demo">Open Demo</Link>
        <Link className="btn-secondary border-white/30 text-white hover:bg-white/10" href="/help">Read Help</Link>
      </div>
    </div>

    <section className="mt-8 grid gap-4 md:grid-cols-2">
      {tourSteps.map((step, index) => <article key={step.href} className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Step {index + 1}</div>
            <h2 className="mt-1 text-xl font-black text-slate-900">{step.title}</h2>
          </div>
          <Link href={step.href} className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-sm font-black hover:bg-slate-100">Open</Link>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-700">{step.detail}</p>
      </article>)}
    </section>

    <section className="card mt-8 p-6">
      <h2 className="text-2xl font-black tracking-tight">Daily operating loop</h2>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-4"><strong>1. Generate</strong><br />Create or review the cook plan.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>2. Execute</strong><br />Use Today and the printed pit sheet.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>3. Close</strong><br />Complete EOD with leftovers, waste, sales, and 86 notes.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>4. Learn</strong><br />Review proof, recommendations, and data quality.</div>
      </div>
    </section>
  </main>;
}
