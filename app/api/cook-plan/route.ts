import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { getDayPatternByKey, getDayPatternMultiplier, inferDayPatternKey } from '@/lib/dayProfiles';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

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
    let scenarioId = String(body.scenarioId || '');
    const eventMultiplier = numberValue(body.eventMultiplier, 1, 0.5, 5);
    const requestedDayPatternKey = body.dayPatternKey ? String(body.dayPatternKey) : '';
    const serviceDate = toDateOnly(serviceDateStr);

    let scenario = scenarioId
      ? await prisma.forecastScenario.findUnique({ where: { id: scenarioId } })
      : null;

    if (!scenario) {
      scenario = await prisma.forecastScenario.findFirst({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } });
      if (!scenario) throw new Error('No forecast scenarios exist. Seed data was not created.');
      scenarioId = scenario.id;
    }

    const proteins = await prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const [month, logsCount, lastLog] = await Promise.all([
      prisma.monthMultiplier.findUnique({ where: { month: serviceDate.getUTCMonth() + 1 } }),
      prisma.endOfDayLog.count(),
      prisma.endOfDayLog.findFirst({
        where: { serviceDate: { lt: serviceDate } },
        orderBy: { serviceDate: 'desc' },
        include: { proteinLogs: true }
      })
    ]);

    const dayPatternKey = requestedDayPatternKey || inferDayPatternKey(scenario.name);
    const dayPattern = getDayPatternByKey(dayPatternKey);
    const dayMultiplier = getDayPatternMultiplier(dayPattern.key, serviceDate.getUTCDay());

    const forecastSales = dailySalesForecast(
      scenario.annualSales,
      dayMultiplier,
      month?.multiplier ?? 1,
      eventMultiplier
    );
    const forecastBbqSales = Math.round(forecastSales * (scenario.bbqSalesPercent / 100));

    const priorProductionDate = addUtcDays(serviceDate, -1);

    const items = proteins.map((protein) => {
      const lower = protein.name.toLowerCase();
      const prior = lastLog?.proteinLogs.find((log) => log.proteinId === protein.id);
      const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
      const usableLeftoverUnits = prior?.usableLeftoverUnits ?? 0;
      const result = forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb, usableLeftoverUnits });
      const timingNote = lower.includes('brisket')
        ? `${fmtDateWithDow(priorProductionDate)}: cook 9:00 AM–9:00 PM, then hold overnight for ${fmtDateWithDow(serviceDate)} service.`
        : lower.includes('pork')
          ? `${fmtDateWithDow(priorProductionDate)}: load pork butts at 5:00 PM for ${fmtDateWithDow(serviceDate)} service.`
          : lower.includes('rib')
            ? `${fmtDateWithDow(serviceDate)}: cook/load ribs same day for service.`
            : lower.includes('chicken')
              ? `${fmtDateWithDow(serviceDate)}: cook/load pulled chicken same day for service.`
              : `${fmtDateWithDow(serviceDate)}: cook/load for service.`;
      return {
        proteinId: protein.id,
        cookedLbNeeded: result.cookedLbNeeded,
        usableLeftoverLb,
        usableLeftoverUnits,
        forecastCookUnits: result.forecastCookUnits,
        safetyFactorPct: scenario.safetyFactorPct,
        rawLbNeeded: result.rawLbNeeded,
        recommendedCookUnits: result.recommendedCookUnits,
        approvedCookUnits: null,
        overrideReason: null,
        notes: timingNote
      };
    });

    const plan = await prisma.$transaction(async (tx) => {
      await tx.cookPlan.deleteMany({ where: { serviceDate } });
      return tx.cookPlan.create({
        data: {
          serviceDate,
          scenarioId,
          forecastSales,
          forecastBbqSales,
          confidence: confidenceForHistory(logsCount),
          status: 'DRAFT',
          notes: `Service ${fmtDateWithDow(serviceDate)} · prior-day brisket/pork production ${fmtDateWithDow(addUtcDays(serviceDate, -1))} · same-day ribs/chicken with leftover credits · ${dayPattern.name} day pattern · event multiplier ${eventMultiplier}`,
          items: { create: items }
        },
        include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      });
    });

    const stamp = Date.now();
    return NextResponse.json({
      ok: true,
      cookPlanId: plan.id,
      serviceDate: serviceDateStr,
      scenarioName: plan.scenario.name,
      eventMultiplier,
      dayPatternName: dayPattern.name,
      dayPatternKey: dayPattern.key,
      forecastSales,
      forecastBbqSales,
      items: plan.items.map((item) => ({
        protein: item.protein.name,
        forecastCookUnits: item.forecastCookUnits,
        recommendedCookUnits: item.recommendedCookUnits,
        cookedLbNeeded: item.cookedLbNeeded,
        rawLbNeeded: item.rawLbNeeded,
        usableLeftoverLb: item.usableLeftoverLb,
        usableLeftoverUnits: item.usableLeftoverUnits
      })),
      redirectUrl: `/cook-plan?planId=${encodeURIComponent(plan.id)}&generatedAt=${stamp}`,
      message: 'Cook plan generated.'
    });
  } catch (error) {
    console.error('Generate cook plan failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error while generating cook plan.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
