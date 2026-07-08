'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { dailySalesForecast, forecastProteinLoad, confidenceForHistory } from '@/lib/forecast';

function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function createCookPlan(formData: FormData) {
  const serviceDateStr = String(formData.get('serviceDate'));
  const scenarioId = String(formData.get('scenarioId'));
  const eventMultiplier = Number(formData.get('eventMultiplier') || 1);
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
    const approvedCookUnits = Number(formData.get(`approved-${itemId}`) || 0);
    const overrideReason = String(formData.get(`reason-${itemId}`) || '');
    await prisma.cookPlanItem.update({ where: { id: itemId }, data: { approvedCookUnits, overrideReason } });
  }
  await prisma.cookPlan.update({ where: { id: cookPlanId }, data: { status: 'APPROVED' } });
  revalidatePath('/cook-plan');
  revalidatePath('/dashboard');
}

export async function saveEndOfDayLog(formData: FormData) {
  const serviceDate = toDateOnly(String(formData.get('serviceDate')));
  const totalSales = Number(formData.get('totalSales') || 0);
  const bbqSales = Number(formData.get('bbqSales') || 0);
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
          cookedUnits: Number(formData.get(`cookedUnits-${protein.id}`) || 0),
          soldCookedLb: Number(formData.get(`soldCookedLb-${protein.id}`) || 0),
          usableLeftoverLb: Number(formData.get(`usableLeftoverLb-${protein.id}`) || 0),
          wasteLb: Number(formData.get(`wasteLb-${protein.id}`) || 0),
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
          cookedUnits: Number(formData.get(`cookedUnits-${protein.id}`) || 0),
          soldCookedLb: Number(formData.get(`soldCookedLb-${protein.id}`) || 0),
          usableLeftoverLb: Number(formData.get(`usableLeftoverLb-${protein.id}`) || 0),
          wasteLb: Number(formData.get(`wasteLb-${protein.id}`) || 0),
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
      annualSales: Number(formData.get('annualSales')),
      bbqSalesPercent: Number(formData.get('bbqSalesPercent')),
      safetyFactorPct: Number(formData.get('safetyFactorPct')),
      brisketMixPct: Number(formData.get('brisketMixPct')),
      porkMixPct: Number(formData.get('porkMixPct')),
      ribsMixPct: Number(formData.get('ribsMixPct')),
      chickenMixPct: Number(formData.get('chickenMixPct')),
      averagePricePerLbCooked: Number(formData.get('averagePricePerLbCooked'))
    }
  });
  revalidatePath('/settings');
}

export async function updateProtein(formData: FormData) {
  const id = String(formData.get('id'));
  await prisma.protein.update({
    where: { id },
    data: {
      rawWeightEachLb: Number(formData.get('rawWeightEachLb')),
      cookedYieldPercent: Number(formData.get('cookedYieldPercent')),
      sandwichOz: Number(formData.get('sandwichOz')),
      plateOz: Number(formData.get('plateOz')),
      minCookUnits: Number(formData.get('minCookUnits')),
      maxCookUnits: Number(formData.get('maxCookUnits')),
      maxReuseHours: Number(formData.get('maxReuseHours')),
      reusableLeftover: formData.get('reusableLeftover') === 'on'
    }
  });
  revalidatePath('/settings');
}
