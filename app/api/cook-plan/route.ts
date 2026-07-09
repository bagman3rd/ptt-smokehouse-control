import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';
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
    let scenarioId = String(body.scenarioId || '');
    const eventMultiplier = numberValue(body.eventMultiplier, 1, 0.5, 5);
    const serviceDate = toDateOnly(serviceDateStr);

    let scenario = scenarioId
      ? await prisma.forecastScenario.findUnique({ where: { id: scenarioId } })
      : null;

    if (!scenario) {
      scenario = await prisma.forecastScenario.findFirst({ orderBy: { annualSales: 'asc' } });
      if (!scenario) throw new Error('No forecast scenarios exist. Seed data was not created.');
      scenarioId = scenario.id;
    }

    const proteins = await prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const [day, month, logsCount, lastLog] = await Promise.all([
      prisma.dayMultiplier.findUnique({ where: { dayOfWeek: serviceDate.getUTCDay() } }),
      prisma.monthMultiplier.findUnique({ where: { month: serviceDate.getUTCMonth() + 1 } }),
      prisma.endOfDayLog.count(),
      prisma.endOfDayLog.findFirst({
        where: { serviceDate: { lt: serviceDate } },
        orderBy: { serviceDate: 'desc' },
        include: { proteinLogs: true }
      })
    ]);

    const forecastSales = dailySalesForecast(
      scenario.annualSales,
      day?.multiplier ?? 1,
      month?.multiplier ?? 1,
      eventMultiplier
    );
    const forecastBbqSales = Math.round(forecastSales * (scenario.bbqSalesPercent / 100));

    const items = proteins.map((protein) => {
      const prior = lastLog?.proteinLogs.find((log) => log.proteinId === protein.id);
      const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
      const result = forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb });
      return {
        proteinId: protein.id,
        cookedLbNeeded: result.cookedLbNeeded,
        usableLeftoverLb,
        safetyFactorPct: scenario.safetyFactorPct,
        rawLbNeeded: result.rawLbNeeded,
        recommendedCookUnits: result.recommendedCookUnits,
        approvedCookUnits: null,
        overrideReason: null
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
          notes: `Generated with event multiplier ${eventMultiplier}`,
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
      forecastSales,
      forecastBbqSales,
      items: plan.items.map((item) => ({
        protein: item.protein.name,
        recommendedCookUnits: item.recommendedCookUnits,
        cookedLbNeeded: item.cookedLbNeeded,
        rawLbNeeded: item.rawLbNeeded,
        usableLeftoverLb: item.usableLeftoverLb
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
