import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiRole, currentUser } from '@/lib/auth';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { addUtcDays } from '@/lib/date';
import { currentRestaurantForUser } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { dateOnlySchema } from '@/lib/validators';
import { dailySalesForecast, forecastProteinLoad } from '@/lib/forecast';
import { getDayPatternByKey, getDayPatternMultiplier, inferDayPatternKey } from '@/lib/dayProfiles';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid load date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberParam(value: string | null, fallback = 1, min = 0.1, max = 10) {
  const n = value === null || value === '' ? fallback : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function capacityForProtein(name: string, totals: { brisket: number; pork: number; ribs: number; chicken: number }) {
  const lower = name.toLowerCase();
  if (lower.includes('brisket')) return totals.brisket;
  if (lower.includes('pork')) return totals.pork;
  if (lower.includes('rib')) return totals.ribs;
  if (lower.includes('chicken')) return totals.chicken;
  return 0;
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, 'api:cook-plan-preview', 80, 60_000);
  if (limited) return limited;
  try {
    const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
    if (authError) return authError;
    await ensureDefaultData(prisma);
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
    const restaurant = await currentRestaurantForUser(user);
    const restaurantId = restaurant.id;

    const url = new URL(request.url);
    const loadDateValue = dateOnlySchema.parse(String(url.searchParams.get('loadDate') || ''));
    const loadDate = toDateOnly(loadDateValue);
    const nextDay = addUtcDays(loadDate, 1);
    const eventMultiplier = numberParam(url.searchParams.get('eventMultiplier'), 1, 0.5, 10);
    const requestedDayPatternKey = String(url.searchParams.get('dayPatternKey') || '');
    const scenarioId = String(url.searchParams.get('scenarioId') || '');

    const scenario = scenarioId
      ? await prisma.forecastScenario.findFirst({ where: { id: scenarioId, restaurantId } })
      : await prisma.forecastScenario.findFirst({ where: activeScenarioWhere(restaurantId), orderBy: { annualSales: 'asc' } });
    if (!scenario) throw new Error('No scenario found for capacity preview.');

    const [proteins, loadMonth, nextMonth, smokers] = await Promise.all([
      prisma.protein.findMany({ where: { restaurantId, active: true }, orderBy: { name: 'asc' } }),
      prisma.monthMultiplier.findFirst({ where: { restaurantId, month: loadDate.getUTCMonth() + 1 } }),
      prisma.monthMultiplier.findFirst({ where: { restaurantId, month: nextDay.getUTCMonth() + 1 } }),
      prisma.smoker.findMany({ where: { restaurantId, active: true } })
    ]);

    const dayPattern = getDayPatternByKey(requestedDayPatternKey || inferDayPatternKey(scenario.name));
    const loadForecastSales = dailySalesForecast(scenario.annualSales, getDayPatternMultiplier(dayPattern.key, loadDate.getUTCDay()), loadMonth?.multiplier ?? 1, eventMultiplier);
    const nextForecastSales = dailySalesForecast(scenario.annualSales, getDayPatternMultiplier(dayPattern.key, nextDay.getUTCDay()), nextMonth?.multiplier ?? 1, eventMultiplier);
    const loadBbqSales = Math.round(loadForecastSales * (scenario.bbqSalesPercent / 100));
    const nextBbqSales = Math.round(nextForecastSales * (scenario.bbqSalesPercent / 100));

    const totals = smokers.reduce((sum, smoker) => ({
      brisket: sum.brisket + smoker.brisketCapacity,
      pork: sum.pork + smoker.porkCapacity,
      ribs: sum.ribs + smoker.ribCapacity,
      chicken: sum.chicken + smoker.chickenCapacity
    }), { brisket: 0, pork: 0, ribs: 0, chicken: 0 });

    const items = proteins.map((protein) => {
      const lower = protein.name.toLowerCase();
      const priorDayProtein = lower.includes('brisket') || lower.includes('pork');
      const forecastBbqSales = priorDayProtein ? nextBbqSales : loadBbqSales;
      const forecast = forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb: 0, usableLeftoverUnits: 0 });
      const capacity = capacityForProtein(protein.name, totals);
      const overBy = Math.max(0, forecast.recommendedCookUnits - capacity);
      return {
        protein: protein.name,
        projectedUnits: forecast.recommendedCookUnits,
        activeCapacity: capacity,
        overCapacity: capacity > 0 && overBy > 0,
        overBy
      };
    });

    const warnings = items
      .filter((item) => item.overCapacity)
      .map((item) => `${item.protein}: projected ${item.projectedUnits} exceeds active smoker capacity ${item.activeCapacity} by ${item.overBy}.`);
    if (smokers.length === 0) warnings.push('No active smoker capacity has been entered. Capacity preview cannot validate this cook plan.');

    return NextResponse.json({ ok: true, warnings, items, smokerCount: smokers.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown capacity preview error.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
