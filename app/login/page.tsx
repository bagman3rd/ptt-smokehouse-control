import { authConfigErrors } from '@/lib/auth';

export default function LoginPage({ searchParams }: { searchParams?: { error?: string; config?: string } }) {
  const configErrors = authConfigErrors();
  const hasConfigError = Boolean(searchParams?.config) || configErrors.length > 0;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6">
          <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Pigeon Toed Tavern</div>
          <h1 className="mt-2 text-3xl font-black">Smokehouse Control</h1>
          <p className="mt-2 text-slate-600">Private consultant dashboard for BBQ production planning.</p>
        </div>
        {hasConfigError ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Authentication is not configured correctly. Set ADMIN_PASSWORD and APP_SESSION_TOKEN in Render. Both must be at least 12 characters. There is no default password.</div> : null}
        {searchParams?.error ? <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Invalid password.</div> : null}
        <form action="/api/login" method="POST" className="space-y-4">
          <div>
            <label className="label">Password</label>
            <input className="field mt-1" name="password" type="password" required autoFocus disabled={hasConfigError} />
          </div>
          <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={hasConfigError}>Login</button>
        </form>
      </div>
    </main>
  );
}
