import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { currentRestaurantForUser } from '@/lib/tenant';
import { fmtDateWithDow } from '@/lib/date';
import { buildForecastProofPoints, recentForecastProofRows, summarizeForecastProof } from '@/lib/forecastProof';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 10) / 10}%`;
}

function one(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value * 10) / 10;
}

function badgeClass(value: string) {
  if (value === 'HIGH') return 'bg-emerald-100 text-emerald-800';
  if (value === 'MEDIUM') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function biasClass(value: string) {
  if (value === 'Underforecasting') return 'font-black text-red-700';
  if (value === 'Overforecasting') return 'font-black text-amber-700';
  if (value === 'Balanced') return 'font-black text-emerald-700';
  return 'font-bold text-slate-500';
}

export default async function ForecastProofPage() {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  noStore();
  await ensureDefaultData(prisma);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;

  const [proteins, plans, logs] = await Promise.all([
    prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
    prisma.cookPlan.findMany({ where: { restaurantId }, orderBy: { serviceDate: 'desc' }, take: 240, include: { scenario: true, items: { include: { protein: true } } } }),
    prisma.endOfDayLog.findMany({ where: { restaurantId, status: { in: ['COMPLETE', 'REVIEWED', 'LOCKED'] } }, orderBy: { serviceDate: 'desc' }, take: 240, include: { proteinLogs: { include: { protein: true } } } })
  ]);

  const points = buildForecastProofPoints({ proteins, plans, logs });
  const summaries = summarizeForecastProof(points, proteins);
  const recentRows = recentForecastProofRows(points, 40);
  const totalSamples30 = summaries.reduce((sum, row) => sum + row.sampleCount30, 0);
  const weightedMape30 = totalSamples30 > 0
    ? summaries.reduce((sum, row) => sum + (row.mape30 ?? 0) * row.sampleCount30, 0) / totalSamples30
    : null;
  const readiness = totalSamples30 >= 120 ? 'Strong 30-day proof set' : totalSamples30 >= 56 ? 'Early proof set' : 'Still collecting proof data';

  return <Shell>
    <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Forecast Proof</h1>
        <p className="mt-2 max-w-3xl text-slate-600">This page is the evidence trail for the PTT pilot: forecasted units vs actual demand, 30-day MAPE, bias, sellouts, waste, and whether the data is strong enough to use in the sales pitch.</p>
      </div>
      <Link className="btn-secondary" href="/learning">Back to Learning</Link>
    </div>

    <section className="grid gap-4 md:grid-cols-4">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Matched proof rows</div><div className="mt-2 text-3xl font-black">{points.length}</div><div className="mt-1 text-xs text-slate-500">Cook plan + completed EOD match</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Trailing 30-day samples</div><div className="mt-2 text-3xl font-black">{totalSamples30}</div><div className="mt-1 text-xs text-slate-500">Across active proteins</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Weighted 30-day MAPE</div><div className="mt-2 text-3xl font-black">{pct(weightedMape30)}</div><div className="mt-1 text-xs text-slate-500">Lower is better</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Proof status</div><div className="mt-2 text-xl font-black">{readiness}</div><div className="mt-1 text-xs text-slate-500">60–90 days of live data is the real milestone</div></div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Trailing Accuracy by Protein</h2>
      <p className="mt-1 text-sm text-slate-600">MAPE means mean absolute percentage error. Accuracy is shown as 100% - MAPE, capped at zero. Bias tells you whether the app is generally underforecasting or overforecasting.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Protein</th><th className="p-3">7d samples</th><th className="p-3">7d MAPE</th><th className="p-3">30d samples</th><th className="p-3">30d MAPE</th><th className="p-3">30d accuracy</th><th className="p-3">90d MAPE</th><th className="p-3">Bias</th><th className="p-3">86s</th><th className="p-3">Avg leftover</th><th className="p-3">Confidence</th></tr></thead>
          <tbody>{summaries.map((row) => <tr key={row.proteinId} className="border-t border-slate-100 align-top"><td className="p-3 font-black">{row.proteinName}</td><td className="p-3">{row.sampleCount7}</td><td className="p-3">{pct(row.mape7)}</td><td className="p-3">{row.sampleCount30}</td><td className="p-3 font-bold">{pct(row.mape30)}</td><td className="p-3 font-bold">{pct(row.accuracy30)}</td><td className="p-3">{pct(row.mape90)}</td><td className={`p-3 ${biasClass(row.bias30)}`}>{row.bias30}</td><td className="p-3">{row.selloutCount30}</td><td className="p-3">{one(row.avgLeftoverUnits30)} {row.unit}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${badgeClass(row.confidence)}`}>{row.confidence}</span><div className="mt-1 text-xs text-slate-500">{row.proofStatus}</div></td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Forecast vs Actual Detail</h2>
      <p className="mt-1 text-sm text-slate-600">Recent matched rows used to prove accuracy and tune the learning rules.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Service date</th><th className="p-3">Plan date</th><th className="p-3">Protein</th><th className="p-3">Forecast</th><th className="p-3">Loaded</th><th className="p-3">Actual demand</th><th className="p-3">Error</th><th className="p-3">Leftover</th><th className="p-3">Waste lb</th><th className="p-3">86</th></tr></thead>
          <tbody>{recentRows.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={10}>No matched proof rows yet. Generate cook plans, complete EOD logs, then this page will populate.</td></tr> : recentRows.map((row, idx) => <tr key={`${row.serviceDate.toISOString()}-${row.proteinId}-${idx}`} className="border-t border-slate-100"><td className="p-3 font-bold">{fmtDateWithDow(row.serviceDate)}</td><td className="p-3">{fmtDateWithDow(row.planDate)}</td><td className="p-3 font-black">{row.proteinName}</td><td className="p-3">{one(row.forecastUnits)} {row.unit}</td><td className="p-3">{one(row.loadedUnits)} {row.unit}</td><td className="p-3">{one(row.actualDemandUnits)} {row.unit}</td><td className={row.signedErrorPct > 8 ? 'p-3 font-black text-red-700' : row.signedErrorPct < -8 ? 'p-3 font-black text-amber-700' : 'p-3 font-bold text-emerald-700'}>{pct(row.signedErrorPct)}</td><td className="p-3">{one(row.leftoverUnits)} {row.unit}</td><td className="p-3">{one(row.wasteLb)}</td><td className="p-3">{row.eightySixed ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 border-blue-200 bg-blue-50 p-5 text-blue-950">
      <h2 className="text-xl font-black">Pilot proof rule</h2>
      <p className="mt-2 text-sm font-semibold">The app can collect and report accuracy now, but the domain logic should be considered proven only after 60–90 days of live PTT data with consistent completed EOD logs. This page is the proof asset for Randy and future BBQ customers.</p>
    </section>
  </Shell>;
}
