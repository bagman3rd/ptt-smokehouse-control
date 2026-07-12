import { Shell } from '@/components/Shell';
import { requireRole, currentUser } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { createDataRequest } from './actions';

export const dynamic = 'force-dynamic';

export default async function DataManagementPage() {
  await requireRole(['ADMIN', 'OWNER']);
  const user = await currentUser();
  if (!user) return null;
  const restaurant = await currentRestaurantForUser(user);
  const requests = await prisma.customerDataRequest.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 20 });
  return <Shell>
    <div className="mb-6"><h1 className="text-3xl font-black tracking-tight">Data Export & Cancellation</h1><p className="mt-2 text-slate-600">Commercial customer flow for export, cancellation, retention, and deletion requests.</p></div>
    <section className="card p-5">
      <h2 className="text-xl font-black">Export before cancellation</h2>
      <p className="mt-2 text-sm text-slate-600">Download the tenant JSON before canceling or deactivating a restaurant. This is the customer handoff copy of their operating history.</p>
      <div className="mt-4 flex flex-wrap gap-2"><a href="/api/reports/backup" className="btn-secondary">Download Tenant Backup JSON</a><a href="/billing" className="btn-secondary">Open Billing</a></div>
    </section>
    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Create data request</h2>
      <form action={createDataRequest} className="mt-4 grid gap-4 md:grid-cols-3">
        <div><label className="label">Request Type</label><select className="field mt-1" name="type"><option value="EXPORT">Export</option><option value="DEACTIVATE">Deactivate</option><option value="DELETE_AFTER_RETENTION">Delete after retention</option><option value="RESTORE">Restore</option></select></div>
        <div className="md:col-span-2"><label className="label">Notes</label><input className="field mt-1" name="notes" placeholder="Reason / customer request / retention note" /></div>
        <div className="md:col-span-3"><button className="btn-primary" type="submit">Record Data Request</button></div>
      </form>
    </section>
    <section className="mt-6 card p-5"><h2 className="text-xl font-black">Recent requests</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Requested By</th><th className="py-2 pr-4">Notes</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-b"><td className="py-3 pr-4">{request.createdAt.toLocaleString()}</td><td className="py-3 pr-4 font-bold">{request.type}</td><td className="py-3 pr-4">{request.status}</td><td className="py-3 pr-4">{request.requestedBy}</td><td className="py-3 pr-4 text-slate-600">{request.notes || '—'}</td></tr>)}</tbody></table></div></section>
  </Shell>;
}
