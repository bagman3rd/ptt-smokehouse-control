import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { formatMetricValue, getReportData, metricLabel, parseReportParams, sourceLabel } from '@/lib/reporting';

function queryString(params: Record<string, string>) {
  const q = new URLSearchParams(params);
  return q.toString();
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
  const params = parseReportParams(searchParams);
  const { rows, total, proteins } = await getReportData(params);
  const csvHref = `/api/reports/export?${queryString({ ...params, dataset: 'aggregate' })}`;

  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Reports</h1>
      <p className="mt-2 text-slate-600">Saved operating history is now reportable by date, day of week, protein, and source data. Use this for questions like waste last month by day of week or briskets loaded last week.</p>
    </div>

    <section className="card p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black">Report Builder</h2>
          <p className="text-sm text-slate-500">Choose the data source, metric, range, protein, and grouping.</p>
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
          <select name="range" defaultValue={(searchParams.range as string) || 'last30'} className="mt-1 w-full rounded-xl border border-slate-300 p-2">
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
    </section>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Data Source</div><div className="mt-2 text-2xl font-black">{sourceLabel(params.source)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Metric</div><div className="mt-2 text-2xl font-black">{metricLabel(params.metric)}</div></div>
      <div className="card p-5"><div className="text-sm font-bold text-slate-500">Report Total</div><div className="mt-2 text-2xl font-black">{formatMetricValue(params.metric, total)}</div><div className="mt-1 text-sm text-slate-500">{rows.length} grouped rows</div></div>
    </div>

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
      <h2 className="text-xl font-black">Raw Data Exports</h2>
      <p className="mt-1 text-sm text-slate-500">Export saved data for Excel, accountant review, outside analysis, or backup. These exports use the selected date range above.</p>
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-center font-bold hover:bg-slate-50" href={`/api/reports/export?${queryString({ ...params, dataset: 'eodRaw' })}`}>Export EOD protein logs CSV</Link>
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-center font-bold hover:bg-slate-50" href={`/api/reports/export?${queryString({ ...params, dataset: 'cookPlanRaw' })}`}>Export cook-plan items CSV</Link>
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
