import Link from 'next/link';
import { authConfigErrors } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function SignupPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const errors = authConfigErrors();
  const error = typeof searchParams?.error === 'string' ? searchParams.error : '';
  return <main className="min-h-screen bg-slate-50 px-4 py-10">
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <div className="text-sm font-black uppercase tracking-wide text-emerald-700">Smokehouse Control</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Create your restaurant account</h1>
        <p className="mt-2 text-slate-600">Build 3.9.0 adds self-service signup with sensible generic BBQ defaults. Pigeon Forge/PTT assumptions are no longer forced onto new restaurants.</p>
      </div>
      {errors.length > 0 ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Server auth is not configured. Set ADMIN_PASSWORD and APP_SESSION_TOKEN first.</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{decodeURIComponent(error)}</div> : null}
      <form action="/api/signup" method="POST" className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><label className="label">Restaurant Name</label><input className="field mt-1" name="restaurantName" required placeholder="Example Smokehouse" /></div>
        <div><label className="label">City</label><input className="field mt-1" name="city" placeholder="Knoxville" /></div>
        <div><label className="label">State</label><input className="field mt-1" name="state" placeholder="TN" /></div>
        <div className="md:col-span-2"><label className="label">Timezone</label><input className="field mt-1" name="timezone" defaultValue="America/New_York" /></div>
        <div><label className="label">Owner Name</label><input className="field mt-1" name="ownerName" required placeholder="Jane Owner" /></div>
        <div><label className="label">Email</label><input className="field mt-1" name="email" type="email" required placeholder="owner@example.com" /></div>
        <div><label className="label">Username</label><input className="field mt-1" name="username" required placeholder="jane-owner" /></div>
        <div><label className="label">Password</label><input className="field mt-1" name="password" type="password" required minLength={12} placeholder="12+ characters" /></div>
        <div className="md:col-span-2 flex flex-wrap gap-3"><button className="btn-primary" type="submit">Create Restaurant</button><Link className="btn-secondary" href="/demo">Try Demo Data</Link><Link className="btn-secondary" href="/login">Back to Login</Link></div>
      </form>
    </div>
  </main>;
}
