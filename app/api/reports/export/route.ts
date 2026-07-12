import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dateBounds, getReportData, parseReportParams, toCsv } from '@/lib/reporting';
import { fmtDateWithDow } from '@/lib/date';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';

async function logReportRun(restaurantId: string, args: { source: string; metric: string; groupBy: string; protein: string; start: string; end: string; dataset: string; rowCount: number; totalValue?: number }) {
  try {
    await prisma.reportRun.create({ data: { ...args, restaurantId, totalValue: args.totalValue ?? 0, createdBy: 'User' } });
  } catch (error) {
    console.error('Report run logging failed:', error);
  }
}

function cell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}
function csv(rows: unknown[][]) { return rows.map(r => r.map(cell).join(',')).join('\n'); }
function responseCsv(filename: string, body: string) {
  return new NextResponse(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` } });
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, 'api:report-export', 40, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  if (authError) return authError;

  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;

  const url = req.nextUrl;
  const params = parseReportParams(Object.fromEntries(url.searchParams.entries()));
  const dataset = url.searchParams.get('dataset') || 'aggregate';
  const { startDate, endExclusive } = dateBounds(params.start, params.end);

  if (dataset === 'eodRaw') {
    const logs = await prisma.endOfDayLog.findMany({
      where: { restaurantId, serviceDate: { gte: startDate, lt: endExclusive } },
      orderBy: { serviceDate: 'asc' },
      include: { proteinLogs: { include: { protein: true } } }
    });
    const rows: unknown[][] = [['Service Date', 'Status', 'Entered By', 'Total Sales', 'BBQ Sales', 'Protein', 'Cooked Units', 'Sold Cooked Lb', 'Usable Leftover Units', 'Usable Leftover Lb', 'Waste Lb', '86', 'Waste Reason', 'Notes']];
    for (const log of logs) for (const p of log.proteinLogs) rows.push([fmtDateWithDow(log.serviceDate), log.status, log.enteredBy, log.totalSales, log.bbqSales, p.protein.name, p.cookedUnits, p.soldCookedLb, p.usableLeftoverUnits, p.usableLeftoverLb, p.wasteLb, p.eightySixed ? 'YES' : 'NO', p.wasteReason || '', log.notes || '']);
    await logReportRun(restaurantId, { ...params, dataset, rowCount: rows.length - 1 });
    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'REPORT_EXPORTED', entity: 'Report', afterJson: { dataset, rowCount: rows.length - 1, params } });
    return responseCsv(`eod-protein-logs-${params.start}-to-${params.end}.csv`, csv(rows));
  }

  if (dataset === 'cookPlanRaw') {
    const plans = await prisma.cookPlan.findMany({
      where: { restaurantId, serviceDate: { gte: startDate, lt: endExclusive } },
      orderBy: { serviceDate: 'asc' },
      include: { scenario: true, items: { include: { protein: true } } }
    });
    const rows: unknown[][] = [['Load Date', 'Scenario', 'Forecast Sales', 'Forecast BBQ Sales', 'Confidence', 'Status', 'Protein', 'Cooked Lb Needed', 'Usable Leftover Units', 'Forecast Cook Units', 'Recommended Cook Units', 'Approved Cook Units', 'Raw Lb Needed', 'Safety Factor %', 'Override Reason', 'Notes']];
    for (const plan of plans) for (const item of plan.items) rows.push([fmtDateWithDow(plan.serviceDate), plan.scenario.name, plan.forecastSales, plan.forecastBbqSales, plan.confidence, plan.status, item.protein.name, item.cookedLbNeeded, item.usableLeftoverUnits, item.forecastCookUnits, item.recommendedCookUnits, item.approvedCookUnits ?? '', item.rawLbNeeded, item.safetyFactorPct, item.overrideReason || '', item.notes || '']);
    await logReportRun(restaurantId, { ...params, dataset, rowCount: rows.length - 1 });
    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'REPORT_EXPORTED', entity: 'Report', afterJson: { dataset, rowCount: rows.length - 1, params } });
    return responseCsv(`cook-plan-items-${params.start}-to-${params.end}.csv`, csv(rows));
  }

  const { rows, total } = await getReportData(params, restaurantId);
  await logReportRun(restaurantId, { ...params, dataset, rowCount: rows.length, totalValue: total });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'REPORT_EXPORTED', entity: 'Report', afterJson: { dataset, rowCount: rows.length, totalValue: total, params } });
  return responseCsv(`report-${params.source}-${params.metric}-${params.start}-to-${params.end}.csv`, toCsv(rows, params));
}
