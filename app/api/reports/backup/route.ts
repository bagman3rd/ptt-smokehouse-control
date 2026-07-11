import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const authError = await requireApiRole(['ADMIN', 'OWNER']);
  if (authError) return authError;

  const [proteins, scenarios, days, months, cookPlans, eodLogs, savedReports, reportRuns] = await Promise.all([
    prisma.protein.findMany({ orderBy: { name: 'asc' } }),
    prisma.forecastScenario.findMany({ orderBy: { annualSales: 'asc' } }),
    prisma.dayMultiplier.findMany({ orderBy: { dayOfWeek: 'asc' } }),
    prisma.monthMultiplier.findMany({ orderBy: { month: 'asc' } }),
    prisma.cookPlan.findMany({ orderBy: { serviceDate: 'asc' }, include: { scenario: true, items: { include: { protein: true } } } }),
    prisma.endOfDayLog.findMany({ orderBy: { serviceDate: 'asc' }, include: { proteinLogs: { include: { protein: true } } } }),
    prisma.savedReport.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.reportRun.findMany({ orderBy: { createdAt: 'asc' }, take: 1000 })
  ]);

  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({
    app: 'PTT Smokehouse Control',
    build: '2.7.1',
    exportedAt,
    counts: { proteins: proteins.length, scenarios: scenarios.length, cookPlans: cookPlans.length, eodLogs: eodLogs.length, savedReports: savedReports.length, reportRuns: reportRuns.length },
    proteins,
    scenarios,
    dayMultipliers: days,
    monthMultipliers: months,
    cookPlans,
    endOfDayLogs: eodLogs,
    savedReports,
    reportRuns
  }, null, 2);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="smokehouse-control-backup-${exportedAt.slice(0,10)}.json"`
    }
  });
}
