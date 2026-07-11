import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiRole, currentUser } from '@/lib/auth';
import { ensureDefaultData } from '@/lib/bootstrap';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';
import { currentRestaurantForUser } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { dateOnlySchema } from '@/lib/validators';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid load date');
  return new Date(`${value}T00:00:00.000Z`);
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 'api:eod-status', 100, 60_000);
  if (limited) return limited;
  try {
    const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
    if (authError) return authError;
    await ensureDefaultData(prisma);
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    const restaurant = await currentRestaurantForUser(user);
    const restaurantId = restaurant.id;
    const url = new URL(request.url);
    const loadDateValue = dateOnlySchema.parse(String(url.searchParams.get('loadDate') || ''));
    const loadDate = toDateOnly(loadDateValue);
    const priorEodDate = addUtcDays(loadDate, -1);

    const [proteins, log] = await Promise.all([
      prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
      prisma.endOfDayLog.findFirst({
        where: { serviceDate: priorEodDate, restaurantId },
        include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      })
    ]);

    if (!log) {
      return NextResponse.json({
        ok: true,
        loadDate: loadDateValue,
        priorEodDate: priorEodDate.toISOString().slice(0, 10),
        priorEodDateLabel: fmtDateWithDow(priorEodDate),
        status: 'MISSING',
        message: `Prior EOD missing for ${fmtDateWithDow(priorEodDate)}. Generate can continue, but the cook plan will show no data, check hot box.`
      });
    }

    const proteinIdsWithRows = new Set(log.proteinLogs.map((row) => row.proteinId));
    const missingProteins = proteins.filter((protein) => !proteinIdsWithRows.has(protein.id)).map((protein) => protein.name);
    const totalLeftoverUnits = log.proteinLogs.reduce((sum, row) => sum + row.usableLeftoverUnits, 0);
    const totalWasteLb = log.proteinLogs.reduce((sum, row) => sum + row.wasteLb, 0);
    const hasAllZeros = log.proteinLogs.every((row) => row.cookedUnits === 0 && row.usableLeftoverUnits === 0 && row.usableLeftoverLb === 0 && row.wasteLb === 0 && row.soldCookedLb === 0);
    const logStatus = log.status || 'DRAFT';
    const status = missingProteins.length > 0 || logStatus === 'DRAFT' || hasAllZeros ? 'INCOMPLETE' : 'FOUND';
    const message = missingProteins.length > 0
      ? `Prior EOD exists for ${fmtDateWithDow(priorEodDate)}, but is missing protein rows: ${missingProteins.join(', ')}.`
      : logStatus === 'DRAFT'
        ? `Prior EOD exists for ${fmtDateWithDow(priorEodDate)}, but is still Draft. Check hot box before relying on leftover credit.`
        : hasAllZeros
          ? `Prior EOD exists for ${fmtDateWithDow(priorEodDate)}, but all protein values are zero. Check hot box.`
          : `Prior EOD ${logStatus} for ${fmtDateWithDow(priorEodDate)}.`;

    return NextResponse.json({
      ok: true,
      loadDate: loadDateValue,
      priorEodDate: priorEodDate.toISOString().slice(0, 10),
      priorEodDateLabel: fmtDateWithDow(priorEodDate),
      status,
      logStatus,
      locked: Boolean(log.lockedAt) || log.status === 'LOCKED',
      message,
      totalSales: log.totalSales,
      smokedMeatSales: log.bbqSales,
      totalLeftoverUnits,
      totalWasteLb,
      proteinLogs: log.proteinLogs.map((row) => ({
        protein: row.protein.name,
        cookedUnits: row.cookedUnits,
        usableLeftoverUnits: row.usableLeftoverUnits,
        usableLeftoverLb: row.usableLeftoverLb,
        wasteLb: row.wasteLb,
        eightySixed: row.eightySixed
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown EOD status error.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
