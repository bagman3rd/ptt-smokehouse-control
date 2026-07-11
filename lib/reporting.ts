import { prisma } from '@/lib/prisma';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

export type ReportSource = 'eod' | 'cookPlan';
export type ReportMetric = 'wasteLb' | 'soldCookedLb' | 'leftoverUnits' | 'leftoverLb' | 'eightySixed' | 'loadedUnits' | 'recommendedUnits' | 'forecastUnits' | 'bbqSales' | 'totalSales';
export type ReportGroupBy = 'date' | 'dayOfWeek' | 'protein' | 'dateProtein' | 'dayOfWeekProtein';

export type ReportParams = {
  source: ReportSource;
  metric: ReportMetric;
  groupBy: ReportGroupBy;
  protein: string;
  start: string;
  end: string;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getDefaultRange(range = 'last30') {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === 'lastWeek') {
    const day = today.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const thisMonday = addUtcDays(today, -daysSinceMonday);
    const start = addUtcDays(thisMonday, -7);
    const end = addUtcDays(thisMonday, -1);
    return { start: isoDate(start), end: isoDate(end) };
  }
  if (range === 'thisWeek') {
    const day = today.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const start = addUtcDays(today, -daysSinceMonday);
    return { start: isoDate(start), end: isoDate(today) };
  }
  if (range === 'lastMonth') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
    return { start: isoDate(start), end: isoDate(end) };
  }
  if (range === 'thisMonth') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    return { start: isoDate(start), end: isoDate(today) };
  }
  const start = addUtcDays(today, -29);
  return { start: isoDate(start), end: isoDate(today) };
}

export function parseReportParams(searchParams: Record<string, string | string[] | undefined>): ReportParams {
  const range = valueOf(searchParams.range) || 'last30';
  const defaults = getDefaultRange(range);
  const source = cleanSource(valueOf(searchParams.source));
  const metric = cleanMetric(valueOf(searchParams.metric), source);
  const groupBy = cleanGroupBy(valueOf(searchParams.groupBy));
  const protein = valueOf(searchParams.protein) || 'all';
  const start = valueOf(searchParams.start) || defaults.start;
  const end = valueOf(searchParams.end) || defaults.end;
  return { source, metric, groupBy, protein, start, end };
}

function valueOf(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function cleanSource(v?: string): ReportSource {
  return v === 'cookPlan' ? 'cookPlan' : 'eod';
}

function cleanMetric(v: string | undefined, source: ReportSource): ReportMetric {
  const eodMetrics: ReportMetric[] = ['wasteLb', 'soldCookedLb', 'leftoverUnits', 'leftoverLb', 'eightySixed', 'bbqSales', 'totalSales'];
  const cookMetrics: ReportMetric[] = ['loadedUnits', 'recommendedUnits', 'forecastUnits'];
  if (source === 'cookPlan') return cookMetrics.includes(v as ReportMetric) ? v as ReportMetric : 'loadedUnits';
  return eodMetrics.includes(v as ReportMetric) ? v as ReportMetric : 'wasteLb';
}

function cleanGroupBy(v?: string): ReportGroupBy {
  const allowed: ReportGroupBy[] = ['date', 'dayOfWeek', 'protein', 'dateProtein', 'dayOfWeekProtein'];
  return allowed.includes(v as ReportGroupBy) ? v as ReportGroupBy : 'dayOfWeekProtein';
}

export function dateBounds(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endExclusive = new Date(`${end}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { startDate, endExclusive };
}

export async function getReportData(params: ReportParams, restaurantId: string) {
  const { startDate, endExclusive } = dateBounds(params.start, params.end);
  const proteins = await prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } });
  const rows: Array<{ group: string; date?: string; dayOfWeek?: string; protein?: string; value: number; records: number }> = [];
  const buckets = new Map<string, { group: string; date?: string; dayOfWeek?: string; protein?: string; value: number; records: number }>();

  function add(row: { date: Date; protein?: string; value: number }) {
    const day = row.date.getUTCDay();
    const dateLabel = fmtDateWithDow(row.date);
    const dayLabel = `${DAY_LABELS[day]} (${day})`;
    let key = dateLabel;
    let group = dateLabel;
    let date: string | undefined;
    let dayOfWeek: string | undefined;
    let protein: string | undefined;

    if (params.groupBy === 'date') {
      key = dateLabel;
      group = dateLabel;
      date = dateLabel;
    } else if (params.groupBy === 'dayOfWeek') {
      key = dayLabel;
      group = DAY_LABELS[day];
      dayOfWeek = DAY_LABELS[day];
    } else if (params.groupBy === 'protein') {
      key = row.protein || 'All proteins';
      group = key;
      protein = row.protein;
    } else if (params.groupBy === 'dateProtein') {
      key = `${dateLabel}|${row.protein || 'All proteins'}`;
      group = `${dateLabel} — ${row.protein || 'All proteins'}`;
      date = dateLabel;
      protein = row.protein;
    } else {
      key = `${dayLabel}|${row.protein || 'All proteins'}`;
      group = `${DAY_LABELS[day]} — ${row.protein || 'All proteins'}`;
      dayOfWeek = DAY_LABELS[day];
      protein = row.protein;
    }

    const current = buckets.get(key) || { group, date, dayOfWeek, protein, value: 0, records: 0 };
    current.value += Number.isFinite(row.value) ? row.value : 0;
    current.records += 1;
    buckets.set(key, current);
  }

  if (params.source === 'eod') {
    const logs = await prisma.endOfDayLog.findMany({
      where: { restaurantId, serviceDate: { gte: startDate, lt: endExclusive } },
      orderBy: { serviceDate: 'asc' },
      include: { proteinLogs: { include: { protein: true } } }
    });
    for (const log of logs) {
      if (params.metric === 'totalSales' || params.metric === 'bbqSales') {
        add({ date: log.serviceDate, value: params.metric === 'totalSales' ? log.totalSales : log.bbqSales });
        continue;
      }
      for (const item of log.proteinLogs) {
        if (params.protein !== 'all' && item.proteinId !== params.protein) continue;
        const value = eodMetricValue(item, params.metric);
        add({ date: log.serviceDate, protein: item.protein.name, value });
      }
    }
  } else {
    const plans = await prisma.cookPlan.findMany({
      where: { restaurantId, serviceDate: { gte: startDate, lt: endExclusive } },
      orderBy: { serviceDate: 'asc' },
      include: { items: { include: { protein: true } } }
    });
    for (const plan of plans) {
      for (const item of plan.items) {
        if (params.protein !== 'all' && item.proteinId !== params.protein) continue;
        const value = cookPlanMetricValue(item, params.metric);
        add({ date: plan.serviceDate, protein: item.protein.name, value });
      }
    }
  }

  const result = Array.from(buckets.values()).sort((a, b) => a.group.localeCompare(b.group));
  const total = result.reduce((s, r) => s + r.value, 0);
  return { rows: result, total, proteins };
}

function eodMetricValue(item: any, metric: ReportMetric) {
  if (metric === 'soldCookedLb') return item.soldCookedLb || 0;
  if (metric === 'leftoverUnits') return item.usableLeftoverUnits || 0;
  if (metric === 'leftoverLb') return item.usableLeftoverLb || 0;
  if (metric === 'eightySixed') return item.eightySixed ? 1 : 0;
  return item.wasteLb || 0;
}

function cookPlanMetricValue(item: any, metric: ReportMetric) {
  if (metric === 'recommendedUnits') return item.recommendedCookUnits || 0;
  if (metric === 'forecastUnits') return item.forecastCookUnits || 0;
  return item.approvedCookUnits ?? item.recommendedCookUnits ?? 0;
}

export function metricLabel(metric: ReportMetric) {
  const labels: Record<ReportMetric, string> = {
    wasteLb: 'Waste lb',
    soldCookedLb: 'Sold cooked lb',
    leftoverUnits: 'Usable leftover units',
    leftoverLb: 'Usable leftover lb',
    eightySixed: '86 events',
    loadedUnits: 'Loaded / approved units',
    recommendedUnits: 'Recommended cook units',
    forecastUnits: 'Forecast cook units',
    bbqSales: 'Smoked meat sales',
    totalSales: 'Total sales'
  };
  return labels[metric] || metric;
}

export function sourceLabel(source: ReportSource) {
  return source === 'cookPlan' ? 'Cook Plans' : 'End-of-Day Logs';
}

export function formatMetricValue(metric: ReportMetric, value: number) {
  if (metric === 'bbqSales' || metric === 'totalSales') return `$${Math.round(value).toLocaleString()}`;
  if (metric === 'eightySixed') return String(Math.round(value));
  return (Math.round(value * 10) / 10).toLocaleString();
}

export function toCsv(rows: Array<{ group: string; date?: string; dayOfWeek?: string; protein?: string; value: number; records: number }>, params: ReportParams) {
  const header = ['Group', 'Date', 'Day Of Week', 'Protein', metricLabel(params.metric), 'Records'];
  const csvRows = rows.map(r => [r.group, r.date || '', r.dayOfWeek || '', r.protein || '', String(Math.round(r.value * 100) / 100), String(r.records)]);
  return [header, ...csvRows].map(cols => cols.map(csvCell).join(',')).join('\n');
}

function csvCell(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
