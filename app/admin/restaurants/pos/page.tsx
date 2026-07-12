import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { PosImportPreviewForm } from './PosImportPreviewForm';
import { saveMenuItemMapping } from './actions';
import { savePosConnection, syncPosConnection, disconnectPosConnection } from './integrationActions';
import { POS_PROVIDERS } from '@/lib/posProviders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PosImportPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const [proteins, mappings, batches, connections, syncRuns, orderSummary] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId: restaurant.id, active: true }, orderBy: { name: 'asc' } }),
    prisma.menuItemMapping.findMany({ where: { restaurantId: restaurant.id }, include: { protein: true }, orderBy: [{ active: 'desc' }, { posItemName: 'asc' }] }),
    prisma.posImportBatch.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.posConnection.findMany({ where: { restaurantId: restaurant.id }, include: { locations: true, _count: { select: { catalogItems: true, orderLines: true } } }, orderBy: { displayName: 'asc' } }),
    prisma.posSyncRun.findMany({ where: { restaurantId: restaurant.id }, include: { connection: true }, orderBy: { startedAt: 'desc' }, take: 10 }),
    prisma.posOrderLine.aggregate({ where: { restaurantId: restaurant.id }, _sum: { grossSales: true, netSales: true, estimatedCookedLb: true }, _count: true })
  ]);
  const liteMappings = mappings.map((row) => ({ normalizedName: row.normalizedName, proteinId: row.proteinId, proteinName: row.protein?.name || null, portionSizeLb: row.portionSizeLb, yieldFactor: row.yieldFactor, active: row.active }));
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">POS / Sales Import</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · Import item-level POS sales, map menu items to proteins, preview protein impact, and keep import history.</p>
    </div>

    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-black">Top 10 POS Connections</h2><p className="mt-2 text-sm text-slate-600">Connect each restaurant to one primary POS. Demo mode validates normalized locations, catalog items, item mix, modifiers, discounts, refunds, channels, duplicate protection, and protein mapping without vendor credentials.</p></div>
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white"><div className="text-xs font-bold uppercase tracking-wide text-slate-300">Imported POS lines</div><div className="text-2xl font-black">{orderSummary._count.toLocaleString()}</div><div className="text-xs text-slate-300">${Math.round(orderSummary._sum.netSales || 0).toLocaleString()} net sales</div></div>
      </div>
      <form action={savePosConnection} className="mt-4 grid gap-3 md:grid-cols-5">
        <select className="field md:col-span-2" name="provider" required defaultValue=""><option value="" disabled>Select POS provider</option>{POS_PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.access.replaceAll('_', ' ')}</option>)}</select>
        <select className="field" name="mode" defaultValue="DEMO"><option value="DEMO">Demo / validation mode</option><option value="LIVE">Live credentials</option></select>
        <input className="field" name="merchantExternalId" placeholder="Merchant or location ID" />
        <input className="field" name="credential" type="password" autoComplete="off" placeholder="API token / credential" />
        <button className="btn-primary md:col-span-5" type="submit">Save POS Connection</button>
      </form>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{POS_PROVIDERS.map((provider) => {
        const connection = connections.find((row) => row.provider === provider.id);
        return <div key={provider.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3"><div><div className="font-black">{provider.name}</div><div className="text-xs font-bold text-slate-500">{provider.access.replaceAll('_', ' ')} · {provider.supportsWebhooks ? 'Webhooks supported' : 'Scheduled sync'}</div></div><span className={`rounded-full px-2 py-1 text-xs font-black ${connection?.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{connection?.status || 'NOT CONFIGURED'}</span></div>
          {connection ? <><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-slate-50 p-2"><strong>{connection.locations.length}</strong><br/>locations</div><div className="rounded-xl bg-slate-50 p-2"><strong>{connection._count.catalogItems}</strong><br/>items</div><div className="rounded-xl bg-slate-50 p-2"><strong>{connection._count.orderLines}</strong><br/>sales lines</div></div><div className="mt-3 flex flex-wrap gap-2"><form action={syncPosConnection}><input type="hidden" name="connectionId" value={connection.id}/><button className="btn-secondary" type="submit">Sync Now</button></form><form action={disconnectPosConnection}><input type="hidden" name="connectionId" value={connection.id}/><button className="rounded-xl border border-red-200 px-3 py-2 text-sm font-black text-red-700" type="submit">Disconnect</button></form></div>{connection.lastError ? <div className="mt-2 text-xs font-bold text-red-700">{connection.lastError}</div> : null}</> : <div className="mt-3 text-sm text-slate-500">Ready to configure.</div>}
        </div>;
      })}</div>
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Recent API Sync Runs</h2>
      <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">Provider</th><th className="border-b p-2">Status</th><th className="border-b p-2">Read / written</th><th className="border-b p-2">Duplicates</th><th className="border-b p-2">Unmapped</th><th className="border-b p-2">Net sales</th></tr></thead><tbody>{syncRuns.map((run) => <tr key={run.id}><td className="border-b p-2 font-bold">{run.connection.displayName}</td><td className="border-b p-2">{run.status}</td><td className="border-b p-2">{run.recordsRead} / {run.recordsWritten}</td><td className="border-b p-2">{run.duplicateCount}</td><td className="border-b p-2">{run.unmappedCount}</td><td className="border-b p-2">${Math.round(run.netSales).toLocaleString()}</td></tr>)}</tbody></table></div>
      {!syncRuns.length ? <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No API sync runs yet.</div> : null}
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">1. Menu Item Mapping</h2>
      <p className="mt-2 text-sm text-slate-600">Map each POS item name to a smoked protein. Portion size is the estimated cooked pounds per unit sold. Example: 5 oz sandwich = 0.3125 lb.</p>
      <form action={saveMenuItemMapping} className="mt-4 grid gap-3 md:grid-cols-5">
        <input className="field md:col-span-2" name="posItemName" placeholder="Brisket Plate" required />
        <select className="field" name="proteinId" defaultValue=""><option value="">Unmapped / non-BBQ</option>{proteins.map((protein) => <option key={protein.id} value={protein.id}>{protein.name}</option>)}</select>
        <input className="field" name="portionSizeLb" type="number" step="0.0001" min="0" placeholder="0.4375" />
        <input className="field" name="yieldFactor" type="number" step="0.01" min="0.1" defaultValue="1" />
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="active" defaultChecked /> Active</label>
        <button className="btn-secondary md:col-span-4" type="submit">Save Menu Mapping</button>
      </form>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">POS item</th><th className="border-b p-2">Protein</th><th className="border-b p-2">Portion lb</th><th className="border-b p-2">Yield factor</th><th className="border-b p-2">Active</th></tr></thead><tbody>{mappings.slice(0, 20).map((row) => <tr key={row.id}><td className="border-b p-2 font-bold">{row.posItemName}</td><td className="border-b p-2">{row.protein?.name || 'Unmapped'}</td><td className="border-b p-2">{row.portionSizeLb}</td><td className="border-b p-2">{row.yieldFactor}</td><td className="border-b p-2">{row.active ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
        {!mappings.length ? <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No POS mappings yet. Add common menu items before the first import for the best learning value.</div> : null}
      </div>
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">2. POS Item-Sales CSV</h2>
      <p className="mt-2 text-sm text-slate-600">Required columns: <strong>date,itemName,quantity,grossSales</strong>. This creates a POS import batch, stores row-level item sales, updates draft daily sales totals, and feeds protein-level learning when items are mapped.</p>
      <PosImportPreviewForm mappings={liteMappings} />
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Recent POS Import Batches</h2>
      <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">Date</th><th className="border-b p-2">Status</th><th className="border-b p-2">Rows</th><th className="border-b p-2">Unmapped</th><th className="border-b p-2">Sales</th><th className="border-b p-2">BBQ sales</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td className="border-b p-2">{batch.createdAt.toLocaleDateString()}</td><td className="border-b p-2 font-bold">{batch.status}</td><td className="border-b p-2">{batch.validRowCount}/{batch.rowCount}</td><td className="border-b p-2">{batch.unmappedCount}</td><td className="border-b p-2">${Math.round(batch.totalSales).toLocaleString()}</td><td className="border-b p-2">${Math.round(batch.bbqSales).toLocaleString()}</td></tr>)}</tbody></table></div>
      {!batches.length ? <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">No POS imports recorded yet.</div> : null}
    </section>
  </Shell>;
}
