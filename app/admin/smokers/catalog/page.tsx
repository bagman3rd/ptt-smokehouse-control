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

function confidenceClass(value: string) {
  if (value === 'OFFICIAL') return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  if (value === 'RESEARCHED') return 'bg-blue-50 text-blue-900 border-blue-200';
  return 'bg-amber-50 text-amber-900 border-amber-200';
}

export default async function SmokerCatalogPage() {
  await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  noStore();
  const catalog = await prisma.smokerCatalog.findMany({ where: { active: true }, orderBy: [{ brand: 'asc' }, { model: 'asc' }] });
  const brands = Array.from(new Set(catalog.map((item) => item.brand))).sort();
  const official = catalog.filter((item) => item.sourceConfidence === 'OFFICIAL').length;
  const researched = catalog.filter((item) => item.sourceConfidence === 'RESEARCHED').length;
  const estimated = catalog.filter((item) => item.sourceConfidence === 'OFFICIAL_PARTIAL').length;

  return <Shell>
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Commercial Smoker Catalog</h1>
        <p className="mt-2 text-slate-600">Build 5.7.0 preload table for Ole Hickory, Southern Pride, J&amp;R Manufacturing, Cookshack, and M&amp;M BBQ Company. Use this as a planning baseline, then verify exact rack package and model-year spec before purchase.</p>
      </div>
      <Link href="/admin/smokers" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Add Smoker</Link>
    </div>

    <section className="grid gap-4 md:grid-cols-5">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Models</div><div className="mt-2 text-3xl font-black">{catalog.length}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Brands</div><div className="mt-2 text-3xl font-black">{brands.length}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Official</div><div className="mt-2 text-3xl font-black">{official}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Researched</div><div className="mt-2 text-3xl font-black">{researched}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Official partial</div><div className="mt-2 text-3xl font-black">{estimated}</div></div>
    </section>

    {brands.map((brand) => <section key={brand} className="card mt-6 p-5">
      <h2 className="text-xl font-black">{brand}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Model</th><th>Type</th><th>Fuel</th><th>Racks</th><th>Area</th><th>Brisket</th><th>Pork</th><th>Ribs</th><th>Chicken</th><th>Source</th></tr></thead>
          <tbody>{catalog.filter((item) => item.brand === brand).map((item) => <tr key={item.id} className="border-b align-top">
            <td className="py-3 font-black">{item.model}<div className="text-xs font-bold text-slate-500">{item.series || '—'}</div></td>
            <td className="py-3 font-bold">{item.smokerType}</td>
            <td className="py-3 font-bold">{item.fuelType}</td>
            <td className="py-3">{item.rackCount || '—'}{item.rackWidthIn && item.rackDepthIn ? <div className="text-xs text-slate-500">{num(item.rackWidthIn)}x{num(item.rackDepthIn)}</div> : null}</td>
            <td className="py-3">{item.cookingAreaSqIn ? `${num(item.cookingAreaSqIn)} sq.in.` : '—'}</td>
            <td className="py-3 font-black">{num(item.brisketCapacity)}</td>
            <td className="py-3 font-black">{num(item.porkCapacity)}</td>
            <td className="py-3 font-black">{num(item.ribCapacity)}</td>
            <td className="py-3 font-black">{num(item.chickenCapacity)}</td>
            <td className="py-3"><span className={`rounded-full border px-2 py-1 text-xs font-black ${confidenceClass(item.sourceConfidence)}`}>{item.sourceConfidence}</span><div className="mt-2 max-w-md text-xs font-bold text-slate-500">{item.sourceLabel || 'Research source'}{item.notes ? ` — ${item.notes}` : ''}</div></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>)}
  </Shell>;
}
