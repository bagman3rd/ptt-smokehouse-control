import Link from 'next/link';
import { authConfigErrors } from '@/lib/auth';

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; config?: string; locked?: string; otp?: string } }) {
  const configErrors = authConfigErrors();
  const hasConfigError = Boolean(searchParams?.config) || configErrors.length > 0;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6">
          <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Smokehouse Control</div>
          <h1 className="mt-2 text-3xl font-black">Smokehouse Control</h1>
          <p className="mt-2 text-slate-600">Role-based BBQ production planning and end-of-day logging.</p>
        </div>
        {hasConfigError ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Authentication is not configured correctly. Set ADMIN_PASSWORD and APP_SESSION_TOKEN in Render. Both must be at least 12 characters.</div> : null}
        {searchParams?.locked ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Account temporarily locked after repeated failed logins. Ask an Admin/Owner to reset access or wait for the lockout window.</div> : null}
        {searchParams?.error ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Invalid username, password, or verification code.</div> : null}
        {searchParams?.otp ? <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">This account requires a 6-digit authenticator code.</div> : null}
        <form action="/api/login" method="POST" className="space-y-4">
          <div>
            <label className="label">Username or Email</label>
            <input className="field mt-1" name="username" type="text" required autoFocus autoComplete="username" disabled={hasConfigError} placeholder="admin" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="field mt-1" name="password" type="password" required autoComplete="current-password" disabled={hasConfigError} />
          </div>
          <div>
            <label className="label">Authenticator Code <span className="text-slate-400">(Admin/Owner if enabled)</span></label>
            <input className="field mt-1" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="optional" disabled={hasConfigError} />
          </div>
          <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={hasConfigError}>Login</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/signup" className="btn-secondary">Create Account</Link><Link href="/demo" className="btn-secondary">Try Demo</Link></div>
        <p className="mt-4 text-xs text-slate-500">Initial admin user: <strong>admin</strong>. Password: your Render ADMIN_PASSWORD value.</p>
      </div>
    </main>
  );
}
