import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiRole, currentUser } from '@/lib/auth';
import { ensureDefaultData } from '@/lib/bootstrap';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { eodSchema } from '@/lib/validators';

const allowedStatuses = new Set(['DRAFT', 'COMPLETE', 'REVIEWED', 'LOCKED']);

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid service date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberValue(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = value === null || value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hasBlank(value: unknown) {
  return value === null || value === undefined || value === '';
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'api:end-of-day', 80, 60_000);
  if (limited) return limited;
  try {
    const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);
    if (authError) return authError;
    await ensureDefaultData(prisma);
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    const restaurant = await currentRestaurantForUser(user);
    const restaurantId = restaurant.id;
    const body = eodSchema.parse(await request.json().catch(() => ({})));
    const serviceDateStr = body.serviceDate;
    const serviceDate = toDateOnly(serviceDateStr);
    const totalSales = numberValue(body.totalSales);
    const bbqSales = numberValue(body.bbqSales);
    const requestedStatus = String(body.status || 'DRAFT').toUpperCase();
    const lockLog = Boolean(body.lockLog);
    const status = lockLog ? 'LOCKED' : (allowedStatuses.has(requestedStatus) ? requestedStatus : 'DRAFT');
    const notes = String(body.notes || '');
    const entries = Array.isArray(body.proteins) ? body.proteins : [];

    const existing = await prisma.endOfDayLog.findFirst({ where: { serviceDate, restaurantId } });
    if (existing?.lockedAt || existing?.status === 'LOCKED') {
      throw new Error('This EOD log is locked and cannot be edited from the app.');
    }

    const proteins = await prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const byProteinId = new Map(entries.map((entry: any) => [String(entry.proteinId), entry]));
    const errors: string[] = [];
    let allProteinValuesZero = true;
    const proteinRows = proteins.map((protein) => {
      const entry: any = byProteinId.get(protein.id) || {};
      const cookedUnits = numberValue(entry.cookedUnits);
      const soldCookedLb = numberValue(entry.soldCookedLb);
      const wasteLb = numberValue(entry.wasteLb);
      const usableLeftoverUnits = numberValue(entry.usableLeftoverUnits);
      const usableLeftoverLb = numberValue(entry.usableLeftoverLb);

      if ([cookedUnits, soldCookedLb, wasteLb, usableLeftoverUnits, usableLeftoverLb].some((n) => n < 0)) {
        errors.push(`${protein.name}: negative values are not allowed.`);
      }
      if (cookedUnits > 0 || soldCookedLb > 0 || wasteLb > 0 || usableLeftoverUnits > 0 || usableLeftoverLb > 0) allProteinValuesZero = false;
      if (usableLeftoverUnits > cookedUnits && cookedUnits > 0) {
        errors.push(`${protein.name}: usable leftover units exceed cooked units.`);
      }
      if (['COMPLETE', 'REVIEWED', 'LOCKED'].includes(status) && cookedUnits > 0 && hasBlank(entry.usableLeftoverUnits)) {
        errors.push(`${protein.name}: usable leftover units are required before marking the EOD log ${status}. Enter 0 if none.`);
      }

      return {
        proteinId: protein.id,
        cookedUnits,
        soldCookedLb,
        usableLeftoverLb,
        usableLeftoverUnits,
        wasteLb,
        eightySixed: Boolean(entry.eightySixed),
        wasteReason: String(entry.wasteReason || '')
      };
    });

    if (allProteinValuesZero && ['COMPLETE', 'REVIEWED', 'LOCKED'].includes(status)) {
      errors.push('Cannot mark EOD Complete/Reviewed/Locked with all protein values at zero. Save as Draft or enter closing data.');
    }
    if (errors.length > 0) throw new Error(errors.join(' '));

    const now = new Date();
    const log = await prisma.$transaction(async (tx) => {
      const parent = existing
        ? await tx.endOfDayLog.update({
            where: { id: existing.id },
            data: {
              totalSales,
              bbqSales,
              status,
              notes,
              reviewedAt: ['REVIEWED', 'LOCKED'].includes(status) ? (existing.reviewedAt ?? now) : existing.reviewedAt,
              lockedAt: status === 'LOCKED' ? now : existing.lockedAt
            }
          })
        : await tx.endOfDayLog.create({
            data: {
              restaurantId,
              serviceDate,
              totalSales,
              bbqSales,
              status,
              notes,
              reviewedAt: ['REVIEWED', 'LOCKED'].includes(status) ? now : null,
              lockedAt: status === 'LOCKED' ? now : null
            }
          });

      await tx.endOfDayProteinLog.deleteMany({ where: { restaurantId, endOfDayLogId: parent.id } });
      await tx.endOfDayProteinLog.createMany({ data: proteinRows.map((row) => ({ restaurantId, endOfDayLogId: parent.id, ...row })) });

      return tx.endOfDayLog.findUniqueOrThrow({
        where: { id: parent.id },
        include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      });
    });

    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: status === 'LOCKED' ? 'LOCK' : 'SAVE', entity: 'EndOfDayLog', entityId: log.id, afterJson: { serviceDate: serviceDateStr, status } });

    revalidatePath('/end-of-day');
    revalidatePath('/cook-plan');
    revalidatePath('/dashboard');
    revalidatePath('/reports');

    return NextResponse.json({
      ok: true,
      endOfDayLogId: log.id,
      serviceDate: serviceDateStr,
      totalSales: log.totalSales,
      bbqSales: log.bbqSales,
      status: log.status,
      lockedAt: log.lockedAt,
      proteinLogs: log.proteinLogs.map((proteinLog) => ({
        protein: proteinLog.protein.name,
        cookedUnits: proteinLog.cookedUnits,
        soldCookedLb: proteinLog.soldCookedLb,
        usableLeftoverUnits: proteinLog.usableLeftoverUnits,
        usableLeftoverLb: proteinLog.usableLeftoverLb,
        wasteLb: proteinLog.wasteLb,
        eightySixed: proteinLog.eightySixed,
        wasteReason: proteinLog.wasteReason
      })),
      redirectUrl: `/end-of-day?serviceDate=${encodeURIComponent(serviceDateStr)}&savedAt=${Date.now()}`,
      message: 'End-of-day log saved.'
    });
  } catch (error) {
    console.error('Save end-of-day log failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error while saving end-of-day log.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
