import { Shell } from '@/components/Shell';
import { currentUser } from '@/lib/auth';
import { supportEmail } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export default async function SupportPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await currentUser();
  const success = searchParams?.sent === '1';
  if (!user) {
    return <main className="mx-auto max-w-3xl px-4 py-10"><SupportContent success={Boolean(success)} /></main>;
  }
  return <Shell><SupportContent success={Boolean(success)} defaultName={user.name} defaultEmail={user.email} /></Shell>;
}

function SupportContent({ success, defaultName = '', defaultEmail = '' }: { success: boolean; defaultName?: string; defaultEmail?: string }) {
  return <div>
    <div className="mb-6"><h1 className="text-3xl font-black tracking-tight">Support</h1><p className="mt-2 text-slate-600">Dedicated support channel for Smokehouse Control customers. Blocking production issues get priority.</p></div>
    {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Support ticket submitted. We will respond through {supportEmail()}.</div> : null}
    <section className="card p-5">
      <h2 className="text-xl font-black">Open a support ticket</h2>
      <form action="/api/support" method="POST" className="mt-4 grid gap-4 md:grid-cols-2">
        <div><label className="label">Name</label><input className="field mt-1" name="name" defaultValue={defaultName} required /></div>
        <div><label className="label">Email</label><input className="field mt-1" name="email" type="email" defaultValue={defaultEmail} required /></div>
        <div><label className="label">Priority</label><select className="field mt-1" name="priority" defaultValue="NORMAL"><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="PRODUCTION_BLOCKED">Production blocked</option></select></div>
        <div><label className="label">Subject</label><input className="field mt-1" name="subject" required placeholder="EOD log issue / forecast question / billing" /></div>
        <div className="md:col-span-2"><label className="label">Message</label><textarea className="field mt-1 min-h-36" name="message" required placeholder="Tell us what page you were on, what you expected, and what happened." /></div>
        <div className="md:col-span-2"><button className="btn-primary" type="submit">Submit ticket</button></div>
      </form>
    </section>
    <section className="card mt-6 p-5"><h2 className="text-xl font-black">Response window</h2><p className="mt-2 text-sm text-slate-700">Production-blocking issues: same business day target during pilot. Normal support: 1-2 business days.</p><p className="mt-2 text-sm text-slate-600">Support email: <a className="font-black underline" href={`mailto:${supportEmail()}`}>{supportEmail()}</a></p></section>
  </div>;
}
