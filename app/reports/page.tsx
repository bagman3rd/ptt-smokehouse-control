import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { formatMetricValue, getReportData, metricLabel, parseReportParams, sourceLabel } from '@/lib/reporting';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';

function queryString(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return q.toString();
}

function valueOf(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const rangeOptions = [
  ['last30', 'Last 30 days'],
  ['thisWeek', 'This week'],
  ['lastWeek', 'Last week'],
  ['thisMonth', 'This month'],
  ['lastMonth', 'Last month'],
  ['custom', 'Custom dates']
];

export default async function ReportsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const params = parseReportParams(searchParams);
  const selectedRange = valueOf(searchParams.range) || 'last30';
  const { rows, total, proteins } = await getReportData(params, restaurantId);
  const [savedReports, recentRuns] = await Promise.all([
    prisma.savedReport.findMany({ where: { restaurantId }, orderBy: { updatedAt: 'desc' }, take: 12 }),
    prisma.reportRun.findMany({ where: { restaurantId }, orderBy: { createdAt: 'desc' }, take: 8 })
  ]);
  const csvHref = `/api/reports/export?${queryString({ ...params, range: selectedRange, dataset: 'aggregate' })}`;
  const chartRows = [...rows].sort((a, b) => b.value - a.value).slice(0, 12);
  const chartMax = Math.max(...chartRows.map((r) => Math.abs(r.value)), 0);
  const savedMessage = valueOf(searchParams.saved) ? 'Report saved.' : valueOf(searchParams.deleted) ? 'Saved report deleted.' : '';
  const error = valueOf(searchParams.error) || '';

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Reports</h1>
      <p className="mt-2 text-slate-600">Saved operating history is reportable by date, day of week, protein, source data, exports, and operating trends. {restaurant.name}</p>
    </div>

    {(savedMessage || error) ? <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-black ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>{error || savedMessage}</div> : null}

    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black">Report Builder</h2>
          <p className="text-sm text-slate-500">Choose the data source, metric, range, protein, and grouping. Save recurring reports for weekly review.</p>
        </div>
        <Link href={csvHref} className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-black text-white hover:bg-slate-700">Export current report CSV</Link>
      </div>

      <form className="grid gap-4 md:grid-cols-3 lg:grid-cols-6" action="/reports" method="GET">
        <label className="text-sm font-bold">Source
          <select name="source" defaultValue={params.source} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
            <option value="eod">End-of-Day Logs</option>
            <option value="cookPlan">Cook Plans</option>
          </select>
        </label>
        <label className="text-sm font-bold">Metric
          <select name="metric" defaultValue={params.metric} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
            <optgroup label="End-of-Day metrics">
              <option value="wasteLb">Waste lb</option>
              <option value="soldCookedLb">Sold cooked lb</option>
              <option value="leftoverUnits">Usable leftover units</option>
              <option value="leftoverLb">Usable leftover lb</option>
              <option value="eightySixed">86 events</option>
              <option value="bbqSales">Smoked meat sales</option>
              <option value="totalSales">Total sales</option>
            </optgroup>
            <optgroup label="Cook-plan metrics">
              <option value="loadedUnits">Loaded / approved units</option>
              <option value="recommendedUnits">Recommended cook units</option>
              <option value="forecastUnits">Forecast cook units</option>
            </optgroup>
          </select>
        </label>
        <label className="text-sm font-bold">Group by
          <select name="groupBy" defaultValue={params.groupBy} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
            <option value="dayOfWeekProtein">Day of week + protein</option>
            <option value="dayOfWeek">Day of week</option>
            <option value="dateProtein">Date + protein</option>
            <option value="date">Date</option>
            <option value="protein">Protein</option>
          </select>
        </label>
        <label className="text-sm font-bold">Protein
          <select name="protein" defaultValue={params.protein} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
            <option value="all">All proteins</option>
            {proteins.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Range
          <select name="range" defaultValue={selectedRange} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
            {rangeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 md:col-span-2 lg:col-span-2">
          <label className="text-sm font-bold">Start
            <input type="date" name="start" defaultValue={params.start} className="mt-1 w-full rounded-xl border border-slate-300 p-2" />
          </label>
          <label className="text-sm font-bold">End
            <input type="date" name="end" defaultValue={params.end} className="mt-1 w-full rounded-xl border border-slate-300 p-2" />
          </label>
        </div>
        <div className="flex items-end lg:col-span-2">
          <button className="w-full rounded-xl bg-orange-600 px-4 py-2 font-black text-white hover:bg-orange-700">Run Report</button>
        </div>
      </form>

      <form className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" action="/api/reports/saved" method="POST">
        <div className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="source" value={params.source} />
          <input type="hidden" name="metric" value={params.metric} />
          <input type="hidden" name="groupBy" value={params.groupBy} />
          <input type="hidden" name="protein" value={params.protein} />
          <input type="hidden" name="range" value={selectedRange} />
          <input type="hidden" name="start" value={params.start} />
          <input type="hidden" name="end" value={params.end} />
          <label className="text-sm font-bold md:col-span-2">Save current report as
            <input name="name" className="mt-1 w-full rounded-xl border border-slate-300 p-2" placeholder="Weekly waste by day of week" required maxLength={80} />
          </label>
          <label className="text-sm font-bold">Description
            <input name="description" className="mt-1 w-full rounded-xl border border-slate-300 p-2" placeholder="Optional" maxLength={240} />
          </label>
          <div className="flex items-end"><button className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 font-black hover:bg-slate-100">Save Report</button></div>
        </div>
      </form>
    </section>

    {savedReports.length > 0 ? <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Saved Reports</h2>
      <p className="mt-1 text-sm text-slate-500">One-click recurring report templates for the reports you run every week or month.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {savedReports.map((report) => {
          const href = `/reports?${queryString({ source: report.source, metric: report.metric, groupBy: report.groupBy, protein: report.protein, range: report.range, start: report.start, end: report.end })}`;
          return <div key={report.id} className="rounded-2xl border border-slate-200 p-4">
            <Link href={href} className="font-black text-slate-900 hover:underline">{report.name}</Link>
            <div className="mt-1 text-xs font-bold text-slate-500">{report.source} · {report.metric} · {report.groupBy}</div>
            {report.description ? <p className="mt-2 text-sm text-slate-600">{report.description}</p> : null}
            <form className="mt-3" action="/api/reports/saved/delete" method="POST"><input type="hidden" name="id" value={report.id} /><button className="text-xs font-black text-red-700 hover:underline">Delete saved report</button></form>
          </div>;
        })}
      </div>
    </section> : null}

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Data Source</div><div className="mt-2 text-2xl font-black">{sourceLabel(params.source)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Metric</div><div className="mt-2 text-2xl font-black">{metricLabel(params.metric)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Report Total</div><div className="mt-2 text-2xl font-black">{formatMetricValue(params.metric, total)}</div><div className="mt-1 text-sm text-slate-500">{rows.length} grouped rows</div></div>
    </div>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Chart View</h2>
      <p className="mt-1 text-sm text-slate-500">Top grouped results by value. Use this to spot waste spikes, heavy load days, and 86 patterns quickly.</p>
      <div className="mt-4 space-y-3">
        {chartRows.length === 0 ? <div className="text-sm text-slate-500">No chart data for this report.</div> : chartRows.map((row) => {
          const width = chartMax > 0 ? Math.max(4, Math.round((Math.abs(row.value) / chartMax) * 100)) : 0;
          return <div key={row.group}>
            <div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-bold">{row.group}</span><span className="font-black">{formatMetricValue(params.metric, row.value)}</span></div>
            <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-orange-500" style={{ width: `${width}%` }} /></div>
          </div>;
        })}
      </div>
    </section>

    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-xl font-black">Report Results</h2>
        <p className="mt-1 text-sm text-slate-500">{params.start} through {params.end}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Group</th><th className="p-3">Date</th><th className="p-3">Day</th><th className="p-3">Protein</th><th className="p-3 text-right">{metricLabel(params.metric)}</th><th className="p-3 text-right">Records</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={6}>No records found for this report.</td></tr>}
            {rows.map((r) => <tr key={r.group} className="border-t border-slate-100"><td className="p-3 font-bold">{r.group}</td><td className="p-3">{r.date || '—'}</td><td className="p-3">{r.dayOfWeek || '—'}</td><td className="p-3">{r.protein || '—'}</td><td className="p-3 text-right font-black">{formatMetricValue(params.metric, r.value)}</td><td className="p-3 text-right">{r.records}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Raw Data Exports & Backup</h2>
      <p className="mt-1 text-sm text-slate-500">Export saved data for Excel, accountant review, outside analysis, backup, or transfer into a future multi-restaurant version.</p>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-center font-bold hover:bg-slate-50" href={`/api/reports/export?${queryString({ ...params, range: selectedRange, dataset: 'eodRaw' })}`}>Export EOD protein logs CSV</Link>
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-center font-bold hover:bg-slate-50" href={`/api/reports/export?${queryString({ ...params, range: selectedRange, dataset: 'cookPlanRaw' })}`}>Export cook-plan items CSV</Link>
        <Link className="rounded-xl bg-slate-900 px-4 py-2 text-center font-bold text-white hover:bg-slate-700" href="/api/reports/backup">Download full data backup JSON</Link>
      </div>
    </section>

    <section className="card mt-6 p-5">
      <h2 className="text-xl font-black">Recent Report Exports</h2>
      <p className="mt-1 text-sm text-slate-500">Export activity is logged so you know which reports were pulled and when.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">When</th><th className="p-3">Dataset</th><th className="p-3">Metric</th><th className="p-3">Range</th><th className="p-3 text-right">Rows</th></tr></thead>
          <tbody>{recentRuns.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={5}>No export history yet.</td></tr> : recentRuns.map((run) => <tr key={run.id} className="border-t border-slate-100"><td className="p-3 font-bold">{run.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td><td className="p-3">{run.dataset}</td><td className="p-3">{run.metric}</td><td className="p-3">{run.start} to {run.end}</td><td className="p-3 text-right">{run.rowCount}</td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-black text-amber-900">Recommended report examples</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Link className="rounded-xl bg-white p-3 text-sm font-bold shadow-sm hover:bg-amber-100" href="/reports?source=eod&metric=wasteLb&groupBy=dayOfWeekProtein&protein=all&range=lastMonth">Waste last month by day of week</Link>
        <Link className="rounded-xl bg-white p-3 text-sm font-bold shadow-sm hover:bg-amber-100" href="/reports?source=cookPlan&metric=loadedUnits&groupBy=dateProtein&protein=all&range=lastWeek">Proteins loaded last week by date</Link>
        <Link className="rounded-xl bg-white p-3 text-sm font-bold shadow-sm hover:bg-amber-100" href="/reports?source=eod&metric=eightySixed&groupBy=protein&protein=all&range=last30">86 events by protein</Link>
      </div>
    </section>
  </Shell>;
}
