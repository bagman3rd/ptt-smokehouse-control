import Link from 'next/link';

const docs = [
  ['What is a load date?', 'The selected cook-plan date is the production/load date. Pork and brisket look ahead to tomorrow because their cook-and-hold cycle does not match the service calendar. Ribs and chicken usually stay same-day.'],
  ['Why does pork use tomorrow?', 'Pork butts load around 5 PM for the next day. The app credits yesterday’s EOD leftovers against today’s load, then plans pork against the next service day.'],
  ['Why does brisket use tomorrow?', 'Brisket is planned as a prior-day cook and overnight hold. The service day’s brisket demand should be matched to the previous production day.'],
  ['How do leftovers affect the plan?', 'Completed prior EOD logs become usable hot-box credit. Missing or draft EOD logs show as no data/check hot box instead of silently reducing the next load.'],
  ['What is forecast confidence?', 'Confidence increases when the app has matching cook plans, completed EOD logs, POS coverage, stable settings, and enough similar historical days.'],
  ['How do I import POS sales?', 'Open Admin → POS Import. Map item names to proteins, upload CSV with date/itemName/quantity/grossSales, preview unmapped rows, then confirm the import.'],
  ['How do I add smokers?', 'Open Admin → Smokers. Enter active smokers, rack capacity, protein compatibility, and notes. Then review Admin → Smoker Schedule before service.'],
  ['How do I add users?', 'Open Admin → Users. Create the user, assign role, and require password reset or 2FA where appropriate. Kitchen Crew should not receive Settings access.'],
  ['How do I read reports?', 'Use Reports for saved views and CSV exports. Use Learning → Forecast Proof for matched forecast-versus-actual accuracy by protein.'],
  ['What if Wi-Fi fails during EOD?', 'The EOD page keeps a local browser draft. Restore it before retyping the closeout. Do not clear the draft until the server save is confirmed.']
];

export default function HelpPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com';
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Help, Training, and Support</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Build 5.4.0 adds a practical operator guide, guided tour, sales package, and clearer troubleshooting for kitchen staff, managers, and owners.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/tour" className="btn-primary">Guided Tour</Link>
        <Link href="/support" className="btn-secondary">Submit Support Ticket</Link>
        <Link href="/sales" className="btn-secondary">Sales Package</Link>
      </div>
    </div>

    <section className="card mt-6 p-6">
      <h2 className="text-xl font-black">Contact</h2>
      <p className="mt-2 text-sm text-slate-700">Email: <a className="font-black text-slate-900 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
      <p className="mt-1 text-sm text-slate-600">Pilot response target: same business day for blocking production issues; 1-2 business days for non-critical questions.</p>
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-2">
      {docs.map(([question, answer]) => <article key={question} className="card p-6">
        <h2 className="text-lg font-black text-slate-900">{question}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{answer}</p>
      </article>)}
    </section>

    <section className="card mt-6 p-6">
      <h2 className="text-xl font-black">Troubleshooting</h2>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Bad forecast</strong><br />Check POS mappings, EOD completeness, event multipliers, prior leftover credit, and approved learning changes.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Wrong units</strong><br />Review Settings → Protein defaults for rack, breast, each, cooked weight, yield, and price assumptions.</div>
        <div className="rounded-2xl border border-slate-200 p-4"><strong>Printer issues</strong><br />Use Cook Plan → Print View. Disable headers/footers in the browser print dialog and print letter size.</div>
      </div>
    </section>

    <div className="mt-6 flex gap-3 text-sm"><a className="underline" href="/terms">Terms</a><a className="underline" href="/privacy">Privacy</a></div>
  </main>;
}
