'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';

function toDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid service date');
  return new Date(`${value}T00:00:00.000Z`);
}

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function createCookPlan(formData: FormData) {
  const serviceDateStr = String(formData.get('serviceDate'));
  const scenarioId = String(formData.get('scenarioId'));
  const eventMultiplier = numberField(formData, 'eventMultiplier', 1, 0.5, 5);
  const serviceDate = toDateOnly(serviceDateStr);
  const scenario = await prisma.forecastScenario.findUniqueOrThrow({ where: { id: scenarioId } });
  const proteins = await prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const day = await prisma.dayMultiplier.findUnique({ where: { dayOfWeek: serviceDate.getUTCDay() } });
  const month = await prisma.monthMultiplier.findUnique({ where: { month: serviceDate.getUTCMonth() + 1 } });
  const logsCount = await prisma.endOfDayLog.count();
  const forecastSales = dailySalesForecast(scenario.annualSales, day?.multiplier ?? 1, month?.multiplier ?? 1, eventMultiplier);
  const forecastBbqSales = Math.round(forecastSales * (scenario.bbqSalesPercent / 100));

  const lastLog = await prisma.endOfDayLog.findFirst({
    where: { serviceDate: { lt: serviceDate } },
    orderBy: { serviceDate: 'desc' },
    include: { proteinLogs: true }
  });

  await prisma.cookPlan.upsert({
    where: { serviceDate },
    update: {
      scenarioId,
      forecastSales,
      forecastBbqSales,
      confidence: confidenceForHistory(logsCount),
      status: 'DRAFT',
      items: {
        deleteMany: {},
        create: proteins.map((protein) => {
          const prior = lastLog?.proteinLogs.find((log) => log.proteinId === protein.id);
          const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
          const result = forecastProteinLoad({
            protein,
            scenario,
            forecastBbqSales,
            usableLeftoverLb
          });
          return {
            proteinId: protein.id,
            cookedLbNeeded: result.cookedLbNeeded,
            usableLeftoverLb,
            safetyFactorPct: scenario.safetyFactorPct,
            rawLbNeeded: result.rawLbNeeded,
            recommendedCookUnits: result.recommendedCookUnits
          };
        })
      }
    },
    create: {
      serviceDate,
      scenarioId,
      forecastSales,
      forecastBbqSales,
      confidence: confidenceForHistory(logsCount),
      items: {
        create: proteins.map((protein) => {
          const prior = lastLog?.proteinLogs.find((log) => log.proteinId === protein.id);
          const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
          const result = forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb });
          return {
            proteinId: protein.id,
            cookedLbNeeded: result.cookedLbNeeded,
            usableLeftoverLb,
            safetyFactorPct: scenario.safetyFactorPct,
            rawLbNeeded: result.rawLbNeeded,
            recommendedCookUnits: result.recommendedCookUnits
          };
        })
      }
    }
  });
  revalidatePath('/cook-plan');
  revalidatePath('/dashboard');
  redirect('/cook-plan');
}

export async function approveCookPlan(formData: FormData) {
  const cookPlanId = String(formData.get('cookPlanId'));
  const itemIds = formData.getAll('itemId').map(String);
  for (const itemId of itemIds) {
    const approvedCookUnits = numberField(formData, `approved-${itemId}`);
    const overrideReason = String(formData.get(`reason-${itemId}`) || '');
    await prisma.cookPlanItem.update({ where: { id: itemId }, data: { approvedCookUnits, overrideReason } });
  }
  await prisma.cookPlan.update({ where: { id: cookPlanId }, data: { status: 'APPROVED' } });
  revalidatePath('/cook-plan');
  revalidatePath('/dashboard');
}

export async function saveEndOfDayLog(formData: FormData) {
  const serviceDate = toDateOnly(String(formData.get('serviceDate')));
  const totalSales = numberField(formData, 'totalSales');
  const bbqSales = numberField(formData, 'bbqSales');
  const notes = String(formData.get('notes') || '');
  const proteins = await prisma.protein.findMany({ where: { active: true } });
  await prisma.endOfDayLog.upsert({
    where: { serviceDate },
    update: {
      totalSales,
      bbqSales,
      notes,
      proteinLogs: {
        deleteMany: {},
        create: proteins.map((protein) => ({
          proteinId: protein.id,
          cookedUnits: numberField(formData, `cookedUnits-${protein.id}`),
          soldCookedLb: numberField(formData, `soldCookedLb-${protein.id}`),
          usableLeftoverLb: numberField(formData, `usableLeftoverLb-${protein.id}`),
          wasteLb: numberField(formData, `wasteLb-${protein.id}`),
          eightySixed: formData.get(`eightySixed-${protein.id}`) === 'on',
          wasteReason: String(formData.get(`wasteReason-${protein.id}`) || '')
        }))
      }
    },
    create: {
      serviceDate,
      totalSales,
      bbqSales,
      notes,
      proteinLogs: {
        create: proteins.map((protein) => ({
          proteinId: protein.id,
          cookedUnits: numberField(formData, `cookedUnits-${protein.id}`),
          soldCookedLb: numberField(formData, `soldCookedLb-${protein.id}`),
          usableLeftoverLb: numberField(formData, `usableLeftoverLb-${protein.id}`),
          wasteLb: numberField(formData, `wasteLb-${protein.id}`),
          eightySixed: formData.get(`eightySixed-${protein.id}`) === 'on',
          wasteReason: String(formData.get(`wasteReason-${protein.id}`) || '')
        }))
      }
    }
  });
  revalidatePath('/end-of-day');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
}

export async function updateScenario(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.forecastScenario.update({
    where: { id },
    data: {
      annualSales: numberField(formData, 'annualSales', 6000000, 1),
      bbqSalesPercent: numberField(formData, 'bbqSalesPercent', 55, 1, 100),
      safetyFactorPct: numberField(formData, 'safetyFactorPct', 8, 0, 50),
      brisketMixPct: numberField(formData, 'brisketMixPct', 30, 0, 100),
      porkMixPct: numberField(formData, 'porkMixPct', 40, 0, 100),
      ribsMixPct: numberField(formData, 'ribsMixPct', 15, 0, 100),
      chickenMixPct: numberField(formData, 'chickenMixPct', 15, 0, 100),
      averagePricePerLbCooked: numberField(formData, 'averagePricePerLbCooked', 31, 1)
    }
  });
  revalidatePath('/settings');
}

export async function updateProtein(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.protein.update({
    where: { id },
    data: {
      rawWeightEachLb: numberField(formData, 'rawWeightEachLb', 1, 0.1),
      cookedYieldPercent: numberField(formData, 'cookedYieldPercent', 50, 1, 100),
      sandwichOz: numberField(formData, 'sandwichOz', 5, 0),
      plateOz: numberField(formData, 'plateOz', 7, 0),
      minCookUnits: numberField(formData, 'minCookUnits', 0, 0),
      maxCookUnits: numberField(formData, 'maxCookUnits', 999, 0),
      maxReuseHours: numberField(formData, 'maxReuseHours', 24, 0, 168),
      reusableLeftover: formData.get('reusableLeftover') === 'on'
    }
  });
  revalidatePath('/settings');
}


export async function updateDayMultiplier(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.dayMultiplier.update({
    where: { id },
    data: { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3) }
  });
  revalidatePath('/settings');
}

export async function updateMonthMultiplier(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.monthMultiplier.update({
    where: { id },
    data: { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3) }
  });
  revalidatePath('/settings');
}
