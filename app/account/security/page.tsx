import { Shell } from '@/components/Shell';
import { requireAuth, ROLE_LABELS, normalizeRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { otpauthUrl } from '@/lib/totp';
import { decryptSecret } from '@/lib/secretEncryption';
import { changeOwnPassword, createTwoFactorSecret, disableTwoFactor, enableTwoFactor, revokeOtherSessions, revokeSession, regenerateRecoveryCodes, acknowledgeRecoveryCodes } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountSecurityPage() {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const user = await prisma.user.findUnique({ where: { id: current.id } });
  const sessions = await prisma.userSession.findMany({ where: { userId: current.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' } });
  const role = normalizeRole(String(current.role));
  const secret = decryptSecret(user?.twoFactorSecret || '');
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);
  let recoveryCodes: string[] = [];
  try { recoveryCodes = JSON.parse(decryptSecret(user?.twoFactorRecoveryDisplay || '') || '[]'); } catch { recoveryCodes = []; }
  const accountLabel = user?.email || user?.username || user?.name || 'account';
  const url = secret ? otpauthUrl({ issuer: 'Smokehouse Control', account: accountLabel, secret }) : '';

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Account Security</h1>
      <p className="mt-2 text-slate-600">Manage your password, active devices, and authenticator-code protection. Two-factor authentication is strongly recommended for Admin and Owner accounts. It can be enforced after enrollment is complete.</p>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="text-xl font-black">Current Account</h2>
        <div className="mt-3 text-sm text-slate-600">
          <div><strong>Name:</strong> {user?.name}</div>
          <div><strong>Username:</strong> {user?.username || 'none'}</div>
          <div><strong>Role:</strong> {ROLE_LABELS[role]}</div>
          <div><strong>Restaurant:</strong> {restaurant.name}</div>
          <div><strong>Session version:</strong> {user?.sessionVersion || 1}</div>
        </div>
        <form action={revokeOtherSessions} className="mt-4">
          <button className="btn-secondary" type="submit">Revoke Other Sessions</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-black">Change Password</h2>
        <form action={changeOwnPassword} className="mt-4 space-y-3">
          <div><label className="label">Current Password</label><input className="field mt-1" type="password" name="currentPassword" required /></div>
          <div><label className="label">New Password</label><input className="field mt-1" type="password" name="newPassword" minLength={12} required /></div>
          <button className="btn-primary" type="submit">Change Password</button>
        </form>
      </section>

      <section className="card p-5 lg:col-span-2">
        <h2 className="text-xl font-black">Two-Factor Authentication</h2>
        <p className="mt-2 text-sm text-slate-600">Required for Admin and Owner accounts. Use Google Authenticator, 1Password, Microsoft Authenticator, or another TOTP app.</p>
        <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${twoFactorEnabled ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</div>
        {!secret ? <form action={createTwoFactorSecret} className="mt-4"><button className="btn-primary" type="submit">Generate Setup Secret</button></form> : null}
        {secret && !twoFactorEnabled ? <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="text-sm font-bold text-slate-700">Manual secret</div>
          <div className="mt-2 break-all rounded-xl bg-slate-100 p-3 font-mono text-sm">{secret}</div>
          <div className="mt-3 text-sm font-bold text-slate-700">Authenticator setup URL</div>
          <div className="mt-2 break-all rounded-xl bg-slate-100 p-3 text-xs">{url}</div>
          <form action={enableTwoFactor} className="mt-4 flex flex-wrap items-end gap-3">
            <div><label className="label">6-digit Code</label><input className="field mt-1 max-w-44" name="code" inputMode="numeric" required /></div>
            <button className="btn-primary" type="submit">Confirm and Enable</button>
          </form>
        </div> : null}
        {twoFactorEnabled && role !== 'ADMIN' && role !== 'OWNER' ? <form action={disableTwoFactor} className="mt-4 flex flex-wrap items-end gap-3">
          <div><label className="label">Password to Disable</label><input className="field mt-1 max-w-72" type="password" name="password" required /></div>
          <button className="btn-secondary" type="submit">Disable 2FA</button>
        </form> : null}
      </section>

      {twoFactorEnabled ? <section className="card p-5 lg:col-span-2" data-testid="recovery-codes">
        <h2 className="text-xl font-black">Two-Factor Recovery Codes</h2>
        <p className="mt-2 text-sm text-slate-600">Store these offline. Each code works once. They are shown only until you acknowledge them.</p>
        {recoveryCodes.length ? <><div className="mt-4 grid gap-2 sm:grid-cols-2">{recoveryCodes.map(code => <code key={code} className="rounded-lg bg-slate-100 p-2 font-black">{code}</code>)}</div><form action={acknowledgeRecoveryCodes} className="mt-4"><button className="btn-primary">I saved these codes</button></form></> : <form action={regenerateRecoveryCodes} className="mt-4 flex flex-wrap items-end gap-3"><div><label className="label">Current password</label><input className="field mt-1" type="password" name="password" required /></div><button className="btn-secondary">Generate new recovery codes</button></form>}
      </section> : null}

      <section className="card p-5 lg:col-span-2">
        <h2 className="text-xl font-black">Active Sessions and Devices</h2>
        <p className="mt-2 text-sm text-slate-600">Review where this account is signed in. Revoke any session you do not recognize.</p>
        <div className="mt-4 space-y-3">
          {sessions.map((session) => <div key={session.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 text-sm">
              <div className="font-black">{session.id === current.sessionId ? 'Current session' : 'Active session'}</div>
              <div className="mt-1 truncate text-slate-600">{session.userAgent || 'Unknown device'}</div>
              <div className="text-xs text-slate-500">IP {session.ipAddress || 'unknown'} · Last seen {session.lastSeenAt.toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
            </div>
            {session.id !== current.sessionId ? <form action={revokeSession}><input type="hidden" name="sessionId" value={session.id} /><button className="btn-secondary" type="submit">Revoke</button></form> : null}
          </div>)}
        </div>
      </section>
    </div>
  </Shell>;
}
