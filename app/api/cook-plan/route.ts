import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { getDayPatternByKey, getDayPatternMultiplier, inferDayPatternKey } from '@/lib/dayProfiles';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid load plan date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberValue(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = value === null || value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function latestEodBefore(targetDate: Date) {
  return prisma.endOfDayLog.findFirst({
    where: { serviceDate: { lt: targetDate } },
    orderBy: { serviceDate: 'desc' },
    include: { proteinLogs: true }
  });
}

export async function POST(request: Request) {
  try {
    await ensureDefaultData(prisma);

    const body = await request.json().catch(() => ({}));
    const loadDateStr = String(body.serviceDate || '');
    let scenarioId = String(body.scenarioId || '');
    const eventMultiplier = numberValue(body.eventMultiplier, 1, 0.5, 5);
    const requestedDayPatternKey = body.dayPatternKey ? String(body.dayPatternKey) : '';
    const loadDate = toDateOnly(loadDateStr);
    const nextDayServiceDate = addUtcDays(loadDate, 1);

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

    const [loadDateMonth, nextDayMonth, logsCount, sameDayLeftoverLog, nextDayLeftoverLog] = await Promise.all([
      prisma.monthMultiplier.findUnique({ where: { month: loadDate.getUTCMonth() + 1 } }),
      prisma.monthMultiplier.findUnique({ where: { month: nextDayServiceDate.getUTCMonth() + 1 } }),
      prisma.endOfDayLog.count(),
      latestEodBefore(loadDate),
      latestEodBefore(nextDayServiceDate)
    ]);

    const dayPatternKey = requestedDayPatternKey || inferDayPatternKey(scenario.name);
    const dayPattern = getDayPatternByKey(dayPatternKey);

    const loadDateDayMultiplier = getDayPatternMultiplier(dayPattern.key, loadDate.getUTCDay());
    const nextDayDayMultiplier = getDayPatternMultiplier(dayPattern.key, nextDayServiceDate.getUTCDay());

    const sameDayForecastSales = dailySalesForecast(
      scenario.annualSales,
      loadDateDayMultiplier,
      loadDateMonth?.multiplier ?? 1,
      eventMultiplier
    );
    const sameDayForecastBbqSales = Math.round(sameDayForecastSales * (scenario.bbqSalesPercent / 100));

    const nextDayForecastSales = dailySalesForecast(
      scenario.annualSales,
      nextDayDayMultiplier,
      nextDayMonth?.multiplier ?? 1,
      eventMultiplier
    );
    const nextDayForecastBbqSales = Math.round(nextDayForecastSales * (scenario.bbqSalesPercent / 100));

    const items = proteins.map((protein) => {
      const lower = protein.name.toLowerCase();
      const isPriorDayProtein = lower.includes('brisket') || lower.includes('pork');
      const targetServiceDate = isPriorDayProtein ? nextDayServiceDate : loadDate;
      const targetForecastBbqSales = isPriorDayProtein ? nextDayForecastBbqSales : sameDayForecastBbqSales;
      const leftoverLog = isPriorDayProtein ? nextDayLeftoverLog : sameDayLeftoverLog;
      const prior = leftoverLog?.proteinLogs.find((log) => log.proteinId === protein.id);
      const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
      const usableLeftoverUnits = prior?.usableLeftoverUnits ?? 0;
      const result = forecastProteinLoad({ protein, scenario, forecastBbqSales: targetForecastBbqSales, usableLeftoverLb, usableLeftoverUnits });
      const timingNote = lower.includes('brisket')
        ? `${fmtDateWithDow(loadDate)}: cook brisket 9:00 AM–9:00 PM using ${fmtDateWithDow(targetServiceDate)} service forecast, then hold overnight.`
        : lower.includes('pork')
          ? `${fmtDateWithDow(loadDate)}: load pork butts at 5:00 PM using ${fmtDateWithDow(targetServiceDate)} service forecast.`
          : lower.includes('rib')
            ? `${fmtDateWithDow(loadDate)}: cook/load ribs same day using ${fmtDateWithDow(targetServiceDate)} service forecast.`
            : lower.includes('chicken')
              ? `${fmtDateWithDow(loadDate)}: cook/load pulled chicken same day using ${fmtDateWithDow(targetServiceDate)} service forecast.`
              : `${fmtDateWithDow(loadDate)}: cook/load using ${fmtDateWithDow(targetServiceDate)} service forecast.`;
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
      await tx.cookPlan.deleteMany({ where: { serviceDate: loadDate } });
      return tx.cookPlan.create({
        data: {
          serviceDate: loadDate,
          scenarioId,
          forecastSales: sameDayForecastSales,
          forecastBbqSales: sameDayForecastBbqSales,
          confidence: confidenceForHistory(logsCount),
          status: 'DRAFT',
          notes: `Load plan date ${fmtDateWithDow(loadDate)} · brisket/pork use next-day service forecast ${fmtDateWithDow(nextDayServiceDate)} (${nextDayForecastSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} total / ${nextDayForecastBbqSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} BBQ) · ribs/chicken use same-day service forecast ${fmtDateWithDow(loadDate)} (${sameDayForecastSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} total / ${sameDayForecastBbqSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} BBQ) · ${dayPattern.name} day pattern · event multiplier ${eventMultiplier}`,
          items: { create: items }
        },
        include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      });
    });

    const stamp = Date.now();
    return NextResponse.json({
      ok: true,
      cookPlanId: plan.id,
      loadDate: loadDateStr,
      serviceDate: loadDateStr,
      nextDayServiceDate: nextDayServiceDate.toISOString().slice(0, 10),
      scenarioName: plan.scenario.name,
      eventMultiplier,
      dayPatternName: dayPattern.name,
      dayPatternKey: dayPattern.key,
      forecastSales: sameDayForecastSales,
      forecastBbqSales: sameDayForecastBbqSales,
      nextDayForecastSales,
      nextDayForecastBbqSales,
      items: plan.items.map((item) => ({
        protein: item.protein.name,
        forecastCookUnits: item.forecastCookUnits,
        recommendedCookUnits: item.recommendedCookUnits,
        cookedLbNeeded: item.cookedLbNeeded,
        rawLbNeeded: item.rawLbNeeded,
        usableLeftoverLb: item.usableLeftoverLb,
        usableLeftoverUnits: item.usableLeftoverUnits,
        notes: item.notes
      })),
      redirectUrl: `/cook-plan?planId=${encodeURIComponent(plan.id)}&generatedAt=${stamp}`,
      message: 'Load plan generated.'
    });
  } catch (error) {
    console.error('Generate cook plan failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error while generating cook plan.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
