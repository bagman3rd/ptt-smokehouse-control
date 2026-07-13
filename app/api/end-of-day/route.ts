import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiRole, currentUser } from '@/lib/auth';
import { ensureDefaultData } from '@/lib/bootstrap';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { eodSchema } from '@/lib/validators';
import { inferCoreProteinCode, PROTEIN_CODE } from '@/lib/domainCodes';

const allowedStatuses = new Set(['DRAFT', 'COMPLETE', 'REVIEWED', 'LOCKED']);

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid service date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberValue(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('A numeric field contains an invalid value.');
  if (n < min || n > max) throw new Error(`Numeric value must be between ${min} and ${max}.`);
  return n;
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
    const isQuickMode = body.mode === 'QUICK';
    const serviceDateStr = body.serviceDate;
    const serviceDate = toDateOnly(serviceDateStr);
    const totalSales = numberValue(body.totalSales);
    const bbqSales = numberValue(body.bbqSales);
    const requestedStatus = String(body.status || 'DRAFT').toUpperCase();
    const lockLog = Boolean(body.lockLog);
    const status = lockLog ? 'LOCKED' : (allowedStatuses.has(requestedStatus) ? requestedStatus : 'DRAFT');
    const notes = String(body.notes || '');
    const entries = Array.isArray(body.proteins) ? body.proteins : [];

    const existing = await prisma.endOfDayLog.findFirst({
      where: { serviceDate, restaurantId },
      include: { proteinLogs: true }
    });
    if (existing?.lockedAt || existing?.status === 'LOCKED') {
      throw new Error('This EOD log is locked and cannot be edited from the app.');
    }

    const proteins = await prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const byProteinId = new Map(entries.map((entry) => [String(entry.proteinId), entry]));
    const existingByProteinId = new Map((existing?.proteinLogs || []).map((entry) => [entry.proteinId, entry]));
    const errors: string[] = [];
    let allProteinValuesZero = true;
    const proteinRows = proteins.map((protein) => {
      const entry = byProteinId.get(protein.id) || { proteinId: protein.id, cookedUnits: 0, soldCookedLb: 0, usableLeftoverLb: 0, usableLeftoverUnits: 0, wasteLb: 0, eightySixed: false, wasteReason: '' };
      const previous = existingByProteinId.get(protein.id);
      const proteinCode = inferCoreProteinCode(protein.code, protein.name);
      const sealedUnopenedUnits = numberValue(entry.sealedUnopenedUnits, previous?.sealedUnopenedUnits ?? 0, 0, 500);
      const openedMeatLb = numberValue(entry.openedMeatLb, previous?.openedMeatLb ?? 0, 0, 5000);
      if (isQuickMode && !Number.isInteger(sealedUnopenedUnits)) {
        errors.push(`${protein.name}: sealed, unopened quantity must be a whole number.`);
      }
      const cookedUnits = isQuickMode ? (previous?.cookedUnits ?? 0) : numberValue(entry.cookedUnits);
      const soldCookedLb = isQuickMode ? (previous?.soldCookedLb ?? 0) : numberValue(entry.soldCookedLb);
      const wasteLb = isQuickMode ? (previous?.wasteLb ?? 0) : numberValue(entry.wasteLb);
      const usableLeftoverUnits = isQuickMode
        ? (proteinCode === PROTEIN_CODE.PORK || proteinCode === PROTEIN_CODE.CHICKEN || proteinCode === PROTEIN_CODE.RIBS ? sealedUnopenedUnits : 0)
        : numberValue(entry.usableLeftoverUnits);
      const usableLeftoverLb = isQuickMode ? 0 : numberValue(entry.usableLeftoverLb);

      if ([cookedUnits, soldCookedLb, wasteLb, usableLeftoverUnits, usableLeftoverLb].some((n) => n < 0)) {
        errors.push(`${protein.name}: negative values are not allowed.`);
      }
      if (cookedUnits > 0 || soldCookedLb > 0 || wasteLb > 0 || usableLeftoverUnits > 0 || usableLeftoverLb > 0) allProteinValuesZero = false;
      if (usableLeftoverUnits > cookedUnits && cookedUnits > 0) {
        errors.push(`${protein.name}: usable leftover units exceed cooked units.`);
      }
      if (!isQuickMode && ['COMPLETE', 'REVIEWED', 'LOCKED'].includes(status) && cookedUnits > 0 && hasBlank(entry.usableLeftoverUnits)) {
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
        wasteReason: isQuickMode ? String(previous?.wasteReason || '') : String(entry.wasteReason || ''),
        sealedUnopenedUnits,
        openedMeatLb
      };
    });

    if (!isQuickMode && allProteinValuesZero && ['COMPLETE', 'REVIEWED', 'LOCKED'].includes(status)) {
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

      for (const row of proteinRows) {
        await tx.endOfDayProteinLog.upsert({
          where: { endOfDayLogId_proteinId: { endOfDayLogId: parent.id, proteinId: row.proteinId } },
          update: row,
          create: { restaurantId, endOfDayLogId: parent.id, ...row }
        });
      }

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
        wasteReason: proteinLog.wasteReason,
        sealedUnopenedUnits: proteinLog.sealedUnopenedUnits,
        openedMeatLb: proteinLog.openedMeatLb
      })),
      redirectUrl: `/end-of-day?serviceDate=${encodeURIComponent(serviceDateStr)}&savedAt=${Date.now()}`,
      message: isQuickMode ? 'Quick EOD report submitted.' : 'End-of-day log saved.'
    });
  } catch (error) {
    console.error('Save end-of-day log failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error while saving end-of-day log.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
