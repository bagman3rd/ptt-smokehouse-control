import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { PosImportPreviewForm } from './PosImportPreviewForm';
import { saveMenuItemMapping } from './actions';
import { disconnectPos, savePosConnectionSettings, selectSquareLocation, syncPosNow } from './integrationActions';
import { POS_PROVIDERS } from '@/lib/pos/registry';
import { SquareConnector } from '@/lib/pos/square';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(value:Date|null){ return value ? value.toLocaleString() : 'Never'; }
export default async function PosImportPage({searchParams}:{searchParams?:Record<string,string|undefined>}) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const [proteins, mappings, batches, connections, syncRuns, posMenuItems] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId: restaurant.id, active: true }, orderBy: { name: 'asc' } }),
    prisma.menuItemMapping.findMany({ where: { restaurantId: restaurant.id }, include: { protein: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.posImportBatch.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.posConnection.findMany({ where: { restaurantId: restaurant.id }, orderBy: { updatedAt: 'desc' } }),
    prisma.posSyncRun.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 12, include:{connection:true} }),
    prisma.posMenuItem.findMany({ where:{restaurantId:restaurant.id,active:true}, orderBy:{lastSeenAt:'desc'}, take:100 })
  ]);
  const square=connections.find(c=>c.provider==='SQUARE');
  let squareLocations:Array<{id:string;name:string}> = [];
  if(square?.status==='CONNECTING' && square.encryptedAccessToken){ try{ squareLocations=await new SquareConnector(square).listLocations(); }catch{} }
  const liteMappings = mappings.map((row) => ({ normalizedName: row.normalizedName, proteinId: row.proteinId, proteinName: row.protein?.name || null, portionSizeLb: row.portionSizeLb, yieldFactor: row.yieldFactor, active: row.active }));
  return <Shell>
    <div className="mb-6"><h1 className="text-3xl font-black tracking-tight">POS Integrations</h1><p className="mt-2 text-slate-600">{restaurant.name} · Connect live POS accounts, schedule automatic synchronization, reconcile item-level sales, and map menu items to smoked-protein consumption.</p></div>
    {searchParams?.error ? <div className="mb-4 rounded-xl bg-red-50 p-4 font-bold text-red-800">POS connection could not be completed: {searchParams.error}</div>:null}
    {searchParams?.connected ? <div className="mb-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800">Authorization received. Select the restaurant location below.</div>:null}

    <section className="card p-5"><h2 className="text-xl font-black">Live Connections</h2><p className="mt-2 text-sm text-slate-600">Square is enabled in Build 9.4.0. The other provider adapters share the same data model and will be activated in later 8.x builds after partner access is available.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{POS_PROVIDERS.map(p=>{ const c=connections.find(x=>x.provider===p.provider); return <article key={p.provider} className="rounded-2xl border border-slate-200 p-4" data-testid={`pos-card-${p.provider.toLowerCase()}`}>
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{p.name}</h3><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Wave {p.wave} · {p.connectMode}</div></div><span className={`rounded-full px-2 py-1 text-xs font-black ${c?.status==='CONNECTED'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-700'}`}>{c?.status.replaceAll('_',' ')||'NOT CONNECTED'}</span></div>
        {c ? <div className="mt-3 space-y-1 text-sm"><div><strong>Location:</strong> {c.externalLocationName||'Select location'}</div><div><strong>Last success:</strong> {fmt(c.lastSuccessfulSyncAt)}</div><div><strong>Last attempt:</strong> {fmt(c.lastAttemptedSyncAt)}</div>{c.lastError?<div className="rounded-lg bg-red-50 p-2 text-red-800">{c.lastError}</div>:null}</div>:<p className="mt-3 text-sm text-slate-600">No account connected.</p>}
        <div className="mt-4 flex flex-wrap gap-2">{p.provider==='SQUARE' && !c ? <a className="btn-primary" href="/api/pos/square/connect" data-testid="connect-square">Connect Square</a>:null}{!p.enabled?<button className="btn-secondary" type="button" disabled>Partner access required</button>:null}{c?.status==='CONNECTED'?<form action={syncPosNow}><input type="hidden" name="connectionId" value={c.id}/><button className="btn-primary" type="submit" data-testid={`sync-${p.provider.toLowerCase()}`}>Sync Now</button></form>:null}{c?<form action={disconnectPos}><input type="hidden" name="connectionId" value={c.id}/><button className="btn-secondary" type="submit">Disconnect</button></form>:null}</div>
        {c?.status==='CONNECTED'?<form action={savePosConnectionSettings} className="mt-4 grid gap-2 border-t pt-4"><input type="hidden" name="connectionId" value={c.id}/><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="automaticSyncEnabled" defaultChecked={c.automaticSyncEnabled}/> Automatic daily sync</label><label className="text-xs font-bold">Daily time<input className="field mt-1" name="dailySyncTime" type="time" defaultValue={c.dailySyncTime}/></label><label className="text-xs font-bold">Timezone<input className="field mt-1" name="syncTimezone" defaultValue={c.syncTimezone}/></label><button className="btn-secondary" type="submit">Save Sync Schedule</button></form>:null}
      </article>})}</div>
      {square?.status==='CONNECTING' && squareLocations.length?<form action={selectSquareLocation} className="mt-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><input type="hidden" name="connectionId" value={square.id}/><h3 className="font-black">Choose the Square location</h3><select className="field mt-3" name="locationId" required>{squareLocations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><input type="hidden" name="locationName" value={squareLocations[0]?.name||''}/><button className="btn-primary mt-3" type="submit">Use This Location</button></form>:null}
    </section>

    <section className="mt-6 card p-5"><h2 className="text-xl font-black">Sync History</h2><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">Started</th><th className="border-b p-2">Provider</th><th className="border-b p-2">Trigger</th><th className="border-b p-2">Status</th><th className="border-b p-2">Orders</th><th className="border-b p-2">Items</th><th className="border-b p-2">Message</th></tr></thead><tbody>{syncRuns.map(r=><tr key={r.id}><td className="border-b p-2">{r.createdAt.toLocaleString()}</td><td className="border-b p-2">{r.connection.provider}</td><td className="border-b p-2">{r.trigger}</td><td className="border-b p-2 font-bold">{r.status}</td><td className="border-b p-2">{r.ordersRead}</td><td className="border-b p-2">{r.lineItemsRead}</td><td className="border-b p-2">{r.errorMessage||''}</td></tr>)}</tbody></table></div>{!syncRuns.length?<p className="mt-3 text-sm text-slate-600">No synchronization runs yet.</p>:null}</section>

    <section className="mt-6 card p-5"><h2 className="text-xl font-black">Item-to-Protein Mapping</h2><p className="mt-2 text-sm text-slate-600">Map each POS item to the cooked protein quantity it consumes. Live-discovered items: {posMenuItems.length}. Unmapped names remain in the review queue and do not silently affect cook quantities.</p><form action={saveMenuItemMapping} className="mt-4 grid gap-3 md:grid-cols-5"><input className="field md:col-span-2" name="posItemName" placeholder="Brisket Plate" required/><select className="field" name="proteinId" defaultValue=""><option value="">Unmapped / non-BBQ</option>{proteins.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input className="field" name="portionSizeLb" type="number" step="0.0001" min="0" placeholder="0.4375"/><input className="field" name="yieldFactor" type="number" step="0.01" min="0.1" defaultValue="1"/><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="active" defaultChecked/> Active</label><button className="btn-secondary md:col-span-4" type="submit">Save Menu Mapping</button></form>
      <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">POS item</th><th className="border-b p-2">Protein</th><th className="border-b p-2">Portion lb</th><th className="border-b p-2">Active</th></tr></thead><tbody>{mappings.slice(0,50).map(row=><tr key={row.id}><td className="border-b p-2 font-bold">{row.posItemName}</td><td className="border-b p-2">{row.protein?.name||'Unmapped'}</td><td className="border-b p-2">{row.portionSizeLb}</td><td className="border-b p-2">{row.active?'Yes':'No'}</td></tr>)}</tbody></table></div>
    </section>

    <section className="mt-6 card p-5"><h2 className="text-xl font-black">CSV Fallback Import</h2><p className="mt-2 text-sm text-slate-600">Retained for providers not yet connected and emergency reconciliation. Required columns: date,itemName,quantity,grossSales.</p><PosImportPreviewForm mappings={liteMappings}/></section>
    <section className="mt-6 card p-5"><h2 className="text-xl font-black">Recent CSV Batches</h2><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr><th className="border-b p-2">Date</th><th className="border-b p-2">Status</th><th className="border-b p-2">Rows</th><th className="border-b p-2">Unmapped</th><th className="border-b p-2">Sales</th></tr></thead><tbody>{batches.map(b=><tr key={b.id}><td className="border-b p-2">{b.createdAt.toLocaleDateString()}</td><td className="border-b p-2 font-bold">{b.status}</td><td className="border-b p-2">{b.validRowCount}/{b.rowCount}</td><td className="border-b p-2">{b.unmappedCount}</td><td className="border-b p-2">${Math.round(b.totalSales).toLocaleString()}</td></tr>)}</tbody></table></div></section>
  </Shell>;
}
