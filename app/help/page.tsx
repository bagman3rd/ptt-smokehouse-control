export default function HelpPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com';
  return <main className="mx-auto max-w-4xl px-4 py-10">
    <h1 className="text-3xl font-black tracking-tight">Help & Support</h1>
    <p className="mt-3 text-slate-600">Support channel for Smokehouse Control customers and pilot users.</p>
    <section className="card mt-6 p-6">
      <h2 className="text-xl font-black">Contact</h2>
      <p className="mt-2 text-sm text-slate-700">Email: <a className="font-black text-slate-900 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
      <p className="mt-1 text-sm text-slate-600">Pilot response target: same business day for blocking production issues; 1-2 business days for non-critical questions.</p>
    </section>
    <section className="card mt-6 p-6">
      <h2 className="text-xl font-black">Common questions</h2>
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <p><strong>Why did my forecast change?</strong> Check Learning, Data Quality, prior EOD credit, and any approved recommendation/audit events.</p>
        <p><strong>What if Wi-Fi drops during EOD?</strong> Build 4.6.0 saves an unsaved EOD draft in this device browser until the log saves successfully.</p>
        <p><strong>Can kitchen crew edit settings?</strong> No. Kitchen crew can use Today, Cook Plan read-only, and EOD logging.</p>
        <p><strong>Where do I print the pit sheet?</strong> Open Cook Plan, then Print View.</p>
        <p><strong>How do I prove backups work?</strong> Admin/System tracks backup exports and restore-drill SystemChecks.</p>
      </div>
    </section>
    <div className="mt-6 flex gap-3 text-sm"><a className="underline" href="/terms">Terms</a><a className="underline" href="/privacy">Privacy</a></div>
  </main>;
}
