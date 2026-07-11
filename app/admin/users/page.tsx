import { Shell } from '@/components/Shell';
import { prisma } from '@/lib/prisma';
import { requireRole, ROLE_LABELS, normalizeRole, APP_ROLES } from '@/lib/auth';
import { ensureDefaultData } from '@/lib/bootstrap';
import { createUser, resetUserPassword, updateUserAccess } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function UsersPage() {
  await requireRole(['ADMIN', 'OWNER']);
  await ensureDefaultData(prisma);
  const users = await prisma.user.findMany({ orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }] });

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">User Access</h1>
      <p className="mt-2 text-slate-600">Create individual logins and control access by job role. Admin and Owner have full access. Kitchen Manager can run operations but cannot edit admin settings. Kitchen Crew can use the basic dashboard and write End-of-Day logs.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Add User</h2>
      <form action={createUser} className="mt-4 grid gap-3 md:grid-cols-5">
        <div>
          <label className="label">Name</label>
          <input className="field mt-1" name="name" required placeholder="Jane Smith" />
        </div>
        <div>
          <label className="label">Username</label>
          <input className="field mt-1" name="username" required placeholder="jane" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field mt-1" name="email" type="email" placeholder="optional" />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="field mt-1" name="role" defaultValue="KITCHEN_CREW">
            {APP_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Temp Password</label>
          <input className="field mt-1" name="password" type="password" minLength={8} required />
        </div>
        <div className="md:col-span-5">
          <button className="btn-primary" type="submit">Create User</button>
        </div>
      </form>
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Existing Users</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">User</th><th className="py-2 pr-4">Role / Status</th><th className="py-2 pr-4">Update Access</th><th className="py-2 pr-4">Reset Password</th></tr></thead>
          <tbody>
            {users.map((user) => {
              const role = normalizeRole(String(user.role));
              return <tr key={user.id} className="border-b align-top">
                <td className="py-3 pr-4"><div className="font-bold">{user.name}</div><div className="text-slate-500">{user.username || 'no username'} · {user.email}</div><div className="text-xs text-slate-400">Created {fmtDate(user.createdAt)}</div></td>
                <td className="py-3 pr-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.active ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{user.active ? 'Active' : 'Inactive'}</span><div className="mt-2 font-bold">{ROLE_LABELS[role]}</div></td>
                <td className="py-3 pr-4">
                  <form action={updateUserAccess} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={user.id} />
                    <select className="field max-w-48" name="role" defaultValue={role}>{APP_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={user.active} /> Active</label>
                    <button className="btn-secondary" type="submit">Save</button>
                  </form>
                </td>
                <td className="py-3 pr-4">
                  <form action={resetUserPassword} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={user.id} />
                    <input className="field max-w-56" name="password" type="password" minLength={8} placeholder="new password" required />
                    <button className="btn-secondary" type="submit">Reset</button>
                  </form>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  </Shell>;
}
