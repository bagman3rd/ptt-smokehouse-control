import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid service date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberValue(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = value === null || value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function POST(request: Request) {
  try {
    await ensureDefaultData(prisma);
    const body = await request.json().catch(() => ({}));
    const serviceDateStr = String(body.serviceDate || '');
    const serviceDate = toDateOnly(serviceDateStr);
    const totalSales = numberValue(body.totalSales);
    const bbqSales = numberValue(body.bbqSales);
    const notes = String(body.notes || '');
    const entries = Array.isArray(body.proteins) ? body.proteins : [];

    const proteins = await prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const byProteinId = new Map(entries.map((entry: any) => [String(entry.proteinId), entry]));
    const proteinRows = proteins.map((protein) => {
      const entry: any = byProteinId.get(protein.id) || {};
      const cookedUnits = numberValue(entry.cookedUnits);
      const soldCookedLb = numberValue(entry.soldCookedLb);
      const wasteLb = numberValue(entry.wasteLb);
      let usableLeftoverUnits = numberValue(entry.usableLeftoverUnits);
      const usableLeftoverLb = numberValue(entry.usableLeftoverLb);

      // Operational guardrail: during testing and rushed closes, users often enter
      // leftover pieces in Cooked Units and leave the explicit leftover field blank.
      // If nothing was sold and nothing was wasted, treat cooked units as usable leftover
      // so the next cook plan receives the intended credit instead of silently saving 0.
      if (usableLeftoverUnits === 0 && cookedUnits > 0 && soldCookedLb === 0 && wasteLb === 0) {
        usableLeftoverUnits = cookedUnits;
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

    const log = await prisma.$transaction(async (tx) => {
      const existing = await tx.endOfDayLog.findUnique({ where: { serviceDate } });
      const parent = existing
        ? await tx.endOfDayLog.update({ where: { id: existing.id }, data: { totalSales, bbqSales, notes } })
        : await tx.endOfDayLog.create({ data: { serviceDate, totalSales, bbqSales, notes } });

      await tx.endOfDayProteinLog.deleteMany({ where: { endOfDayLogId: parent.id } });
      await tx.endOfDayProteinLog.createMany({
        data: proteinRows.map((row) => ({ endOfDayLogId: parent.id, ...row }))
      });

      return tx.endOfDayLog.findUniqueOrThrow({
        where: { id: parent.id },
        include: { proteinLogs: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      });
    });

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
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
