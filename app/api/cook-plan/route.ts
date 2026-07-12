import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiRole, currentUser } from '@/lib/auth';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { getDayPatternByKey, getDayPatternMultiplier, inferDayPatternKey } from '@/lib/dayProfiles';
import { addUtcDays, fmtDateWithDow } from '@/lib/date';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { cookPlanSchema } from '@/lib/validators';
import { FOOD_SALES_PERCENT, LIQUOR_SALES_PERCENT } from '@/lib/salesModel';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid load plan date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberValue(value: unknown, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = value === null || value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function exactEodFor(serviceDate: Date, restaurantId: string) {
  return prisma.endOfDayLog.findFirst({
    where: { serviceDate, restaurantId },
    include: { proteinLogs: true }
  });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'api:cook-plan', 40, 60_000);
  if (limited) return limited;
  try {
    const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
    if (authError) return authError;
    await ensureDefaultData(prisma);
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    const restaurant = await currentRestaurantForUser(user);
    const restaurantId = restaurant.id;

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = cookPlanSchema.parse(rawBody);
    const loadDateStr = parsedBody.serviceDate;
    let scenarioId = parsedBody.scenarioId || '';
    const eventMultiplier = parsedBody.eventMultiplier;
    const requestedDayPatternKey = parsedBody.dayPatternKey || '';
    const loadDate = toDateOnly(loadDateStr);
    const nextDayServiceDate = addUtcDays(loadDate, 1);
    const priorEodDate = addUtcDays(loadDate, -1);

    let scenario = scenarioId
      ? await prisma.forecastScenario.findFirst({ where: { id: scenarioId, restaurantId } })
      : null;

    if (!scenario) {
      scenario = await prisma.forecastScenario.findFirst({ where: activeScenarioWhere(restaurantId), orderBy: { annualSales: 'asc' } });
      if (!scenario) throw new Error('No forecast scenarios exist. Seed data was not created.');
      scenarioId = scenario.id;
    }

    const proteins = await prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } });
    if (proteins.length === 0) throw new Error('No active proteins exist. Seed data was not created.');

    const [loadDateMonth, nextDayMonth, logsCount, priorEodLog] = await Promise.all([
      prisma.monthMultiplier.findFirst({ where: { restaurantId, month: loadDate.getUTCMonth() + 1 } }),
      prisma.monthMultiplier.findFirst({ where: { restaurantId, month: nextDayServiceDate.getUTCMonth() + 1 } }),
      prisma.endOfDayLog.count({ where: { restaurantId } }),
      exactEodFor(priorEodDate, restaurantId)
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
      const leftoverLog = priorEodLog;
      const prior = leftoverLog?.proteinLogs.find((log) => log.proteinId === protein.id);
      const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
      const usableLeftoverUnits = prior?.usableLeftoverUnits ?? 0;
      const missingPriorEod = !leftoverLog;
      const missingProteinData = !!leftoverLog && !prior;
      const incompletePriorEod = !!leftoverLog && (leftoverLog.status === 'DRAFT' || leftoverLog.proteinLogs.length === 0);
      const lockedFlag = leftoverLog?.lockedAt || leftoverLog?.status === 'LOCKED' ? ' locked' : '';
      const leftoverSourceNote = missingPriorEod
        ? `Prior EOD leftover credit source: no data, check hot box. Expected EOD log ${fmtDateWithDow(priorEodDate)} only.`
        : missingProteinData
          ? `Prior EOD leftover credit source: no ${protein.name} row in EOD ${fmtDateWithDow(priorEodDate)}; no data, check hot box.`
          : incompletePriorEod
            ? `Prior EOD leftover credit source: EOD ${fmtDateWithDow(priorEodDate)} is ${leftoverLog.status}; saved but incomplete — check hot box.`
            : `Prior EOD leftover credit source: EOD ${fmtDateWithDow(priorEodDate)} (${leftoverLog.status}${lockedFlag}) only.`;
      const result = forecastProteinLoad({ protein, scenario, forecastBbqSales: targetForecastBbqSales, usableLeftoverLb, usableLeftoverUnits });
      const timingNote = lower.includes('brisket')
        ? `${fmtDateWithDow(loadDate)}: cook brisket 9:00 AM–9:00 PM using ${fmtDateWithDow(targetServiceDate)} service forecast, then hold overnight. ${leftoverSourceNote}`
        : lower.includes('pork')
          ? `${fmtDateWithDow(loadDate)}: load pork butts at 5:00 PM using ${fmtDateWithDow(targetServiceDate)} service forecast. ${leftoverSourceNote}`
          : lower.includes('rib')
            ? `${fmtDateWithDow(loadDate)}: cook/load ribs same day using ${fmtDateWithDow(targetServiceDate)} service forecast. ${leftoverSourceNote}`
            : lower.includes('chicken')
              ? `${fmtDateWithDow(loadDate)}: cook/load pulled chicken breasts same day using ${fmtDateWithDow(targetServiceDate)} service forecast. Default assumption is 1 breast ≈ 2.5 raw lb and 1.875 cooked lb. ${leftoverSourceNote}`
              : `${fmtDateWithDow(loadDate)}: cook/load using ${fmtDateWithDow(targetServiceDate)} service forecast. ${leftoverSourceNote}`;
      return {
        restaurantId,
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
      await tx.cookPlan.deleteMany({ where: { restaurantId, serviceDate: loadDate } });
      return tx.cookPlan.create({
        data: {
          restaurantId,
          serviceDate: loadDate,
          scenarioId,
          forecastSales: sameDayForecastSales,
          forecastBbqSales: sameDayForecastBbqSales,
          confidence: confidenceForHistory(logsCount),
          status: 'DRAFT',
          notes: `Load plan date ${fmtDateWithDow(loadDate)} · brisket/pork use next-day service forecast ${fmtDateWithDow(nextDayServiceDate)} (${nextDayForecastSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} total / ${nextDayForecastBbqSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} smoked meat) · ribs/chicken use same-day service forecast ${fmtDateWithDow(loadDate)} (${sameDayForecastSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} total / ${sameDayForecastBbqSales.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} smoked meat) · liquor/bar ${LIQUOR_SALES_PERCENT}% excluded / food ${FOOD_SALES_PERCENT}% before smoked-meat demand · ${dayPattern.name} day pattern · event multiplier ${eventMultiplier}`,
          items: { create: items }
        },
        include: { scenario: true, items: { include: { protein: true }, orderBy: { protein: { name: 'asc' } } } }
      });
    });

    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'GENERATE', entity: 'CookPlan', entityId: plan.id, afterJson: { serviceDate: loadDateStr, scenarioId } });

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
      priorEodDate: priorEodDate.toISOString().slice(0, 10),
      priorEodStatus: priorEodLog ? (priorEodLog.status === 'DRAFT' ? 'INCOMPLETE' : 'FOUND') : 'MISSING',
      priorEodLogStatus: priorEodLog?.status ?? null,
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
