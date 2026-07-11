'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';
import { ensureDefaultData, activeScenarioWhere } from '@/lib/bootstrap';
import { getDayPatternByKey, getDayPatternMultiplier, inferDayPatternKey } from '@/lib/dayProfiles';

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
  await ensureDefaultData(prisma);

  const serviceDateStr = String(formData.get('serviceDate') || '');
  let scenarioId = String(formData.get('scenarioId') || '');
  const eventMultiplier = numberField(formData, 'eventMultiplier', 1, 0.5, 5);
  const requestedDayPatternKey = String(formData.get('dayPatternKey') || '');
  const serviceDate = toDateOnly(serviceDateStr);

  let scenario = scenarioId
    ? await prisma.forecastScenario.findUnique({ where: { id: scenarioId } })
    : null;

  if (!scenario) {
    scenario = await prisma.forecastScenario.findFirst({ where: activeScenarioWhere(), orderBy: { annualSales: 'asc' } });
    if (!scenario) throw new Error('No forecast scenarios exist. Open Settings or run seed data.');
    scenarioId = scenario.id;
  }

  const proteins = await prisma.protein.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  if (proteins.length === 0) throw new Error('No active proteins exist. Open Settings or run seed data.');

  const month = await prisma.monthMultiplier.findUnique({ where: { month: serviceDate.getUTCMonth() + 1 } });
  const logsCount = await prisma.endOfDayLog.count();
  const dayPatternKey = requestedDayPatternKey || inferDayPatternKey(scenario.name);
  const dayPattern = getDayPatternByKey(dayPatternKey);
  const dayMultiplier = getDayPatternMultiplier(dayPattern.key, serviceDate.getUTCDay());
  const forecastSales = dailySalesForecast(scenario.annualSales, dayMultiplier, month?.multiplier ?? 1, eventMultiplier);
  const forecastBbqSales = Math.round(forecastSales * (scenario.bbqSalesPercent / 100));

  const lastLog = await prisma.endOfDayLog.findFirst({
    where: { serviceDate: { lt: serviceDate } },
    orderBy: { serviceDate: 'desc' },
    include: { proteinLogs: true }
  });

  const items = proteins.map((protein) => {
    const prior = lastLog?.proteinLogs.find((log) => log.proteinId === protein.id);
    const usableLeftoverLb = prior?.usableLeftoverLb ?? 0;
    const usableLeftoverUnits = prior?.usableLeftoverUnits ?? 0;
    const result = forecastProteinLoad({ protein, scenario, forecastBbqSales, usableLeftoverLb, usableLeftoverUnits });
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
      overrideReason: null
    };
  });

  await prisma.$transaction(async (tx) => {
    // Regeneration should be idempotent. Delete/recreate avoids nested upsert edge cases
    // and makes repeated Generate Plan clicks reliable for the same service date.
    await tx.cookPlan.deleteMany({ where: { serviceDate } });
    await tx.cookPlan.create({
      data: {
        serviceDate,
        scenarioId,
        forecastSales,
        forecastBbqSales,
        confidence: confidenceForHistory(logsCount),
        status: 'DRAFT',
        notes: `Generated with ${dayPattern.name} day pattern · event multiplier ${eventMultiplier}`,
        items: { create: items }
      }
    });
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
          usableLeftoverUnits: numberField(formData, `usableLeftoverUnits-${protein.id}`),
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
          usableLeftoverUnits: numberField(formData, `usableLeftoverUnits-${protein.id}`),
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
      bbqSalesPercent: numberField(formData, 'bbqSalesPercent', 40, 1, 100),
      safetyFactorPct: numberField(formData, 'safetyFactorPct', 8, 0, 50),
      brisketMixPct: numberField(formData, 'brisketMixPct', 30, 0, 100),
      porkMixPct: numberField(formData, 'porkMixPct', 40, 0, 100),
      ribsMixPct: numberField(formData, 'ribsMixPct', 15, 0, 100),
      chickenMixPct: numberField(formData, 'chickenMixPct', 15, 0, 100)
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
      avgSalesPerCookedLb: numberField(formData, 'avgSalesPerCookedLb', 22, 1),
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
