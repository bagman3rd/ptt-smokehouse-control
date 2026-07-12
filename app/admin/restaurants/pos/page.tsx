import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { PosImportPreviewForm } from './PosImportPreviewForm';
import { saveMenuItemMapping } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PosImportPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const [proteins, mappings, batches] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId: restaurant.id, active: true }, orderBy: { name: 'asc' } }),
    prisma.menuItemMapping.findMany({ where: { restaurantId: restaurant.id }, include: { protein: true }, orderBy: [{ active: 'desc' }, { posItemName: 'asc' }] }),
    prisma.posImportBatch.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: 'desc' }, take: 8 })
  ]);
  const liteMappings = mappings.map((row) => ({ normalizedName: row.normalizedName, proteinId: row.proteinId, proteinName: row.protein?.name || null, portionSizeLb: row.portionSizeLb, yieldFactor: row.yieldFactor, active: row.active }));
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">POS / Sales Import</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · Import item-level POS sales, map menu items to proteins, preview protein impact, and keep import history.</p>
    </div>

    <section className="card p-5">
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
