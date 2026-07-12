import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function num(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return Math.round(value * 10) / 10;
}

function sourceClass(value: string) {
  if (value === 'OFFICIAL') return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  return 'bg-blue-50 text-blue-900 border-blue-200';
}

export default async function SmokerCatalogPage() {
  await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  noStore();
  const catalog = await prisma.smokerCatalog.findMany({ where: { active: true }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] });
  const brands = Array.from(new Set(catalog.map((item) => item.brand))).sort();
  const official = catalog.filter((item) => item.sourceConfidence === 'OFFICIAL').length;
  const partial = catalog.filter((item) => item.sourceConfidence === 'OFFICIAL_PARTIAL').length;

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Commercial Smoker Catalog</h1>
        <p className="mt-2 text-slate-600">Manufacturer-published smoker data for Ole Hickory, Southern Pride, J&amp;R Manufacturing, Cookshack, and M&amp;M BBQ Company. Count fields load only when the published unit matches the production-planning unit.</p>
      </div>
      <Link href="/admin/smokers" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Add Smoker</Link>
    </div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Active Models</div><div className="mt-2 text-3xl font-black">{catalog.length}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Brands</div><div className="mt-2 text-3xl font-black">{brands.length}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Full Count Rows</div><div className="mt-2 text-3xl font-black">{official}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Partial / Spec Rows</div><div className="mt-2 text-3xl font-black">{partial}</div></div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Capacity rules</h2>
      <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4"><b>Loaded counts</b><br />Briskets, pork butts, and rib racks/slabs load only when published as counts.</div>
        <div className="rounded-2xl bg-slate-50 p-4"><b>Reference specs</b><br />Pounds, ranges, whole chickens, and half chickens stay in official capacity text.</div>
        <div className="rounded-2xl bg-slate-50 p-4"><b>No estimates</b><br />Blank means the manufacturer did not publish a directly usable planning count.</div>
      </div>
    </section>

    {brands.map((brand) => <section key={brand} className="card mt-6 p-5">
      <h2 className="text-xl font-black">{brand}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Model</th><th>Type</th><th>Racks</th><th>Official capacity</th><th>Briskets</th><th>Pork</th><th>Ribs</th><th>Chicken breasts</th><th>Source</th></tr></thead>
          <tbody>{catalog.filter((item) => item.brand === brand).map((item) => <tr key={item.id} className="border-b align-top">
            <td className="py-3 font-black">{item.model}<div className="text-xs font-bold text-slate-500">{item.series || '—'}</div></td>
            <td className="py-3 font-bold">{item.smokerType}<div className="text-xs text-slate-500">{item.fuelType}</div></td>
            <td className="py-3">{item.rackCount || '—'}{item.rackWidthIn && item.rackDepthIn ? <div className="text-xs text-slate-500">{num(item.rackWidthIn)}x{num(item.rackDepthIn)}</div> : null}</td>
            <td className="py-3 max-w-sm text-slate-700">{item.officialCapacityText || 'Not published for every protein'}</td>
            <td className="py-3 font-black">{num(item.brisketCapacity)}</td>
            <td className="py-3 font-black">{num(item.porkCapacity)}</td>
            <td className="py-3 font-black">{num(item.ribCapacity)}</td>
            <td className="py-3 font-black">{num(item.chickenCapacity)}</td>
            <td className="py-3"><span className={`rounded-full border px-2 py-1 text-xs font-black ${sourceClass(item.sourceConfidence)}`}>{item.sourceConfidence === 'OFFICIAL' ? 'official counts' : 'official partial'}</span><div className="mt-2 max-w-xs text-xs font-bold text-slate-500">{item.sourceLabel || 'Manufacturer source'}</div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>)}
  </Shell>;
}
