'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { addUtcDays } from '@/lib/date';
import { requireAuth } from '@/lib/auth';

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function signedNumberField(formData: FormData, key: string, fallback = 0, min = -999, max = 999) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Build 2.2.0: cook-plan generation and EOD saving are API-only.
// These legacy server-action names intentionally fail fast if accidentally wired again.
export async function createCookPlan() {
  throw new Error('Legacy createCookPlan server action is disabled. Use POST /api/cook-plan.');
}

export async function saveEndOfDayLog() {
  throw new Error('Legacy saveEndOfDayLog server action is disabled. Use POST /api/end-of-day.');
}

export async function approveCookPlan(formData: FormData) {
  requireAuth();
  const cookPlanId = String(formData.get('cookPlanId'));
  const itemIds = formData.getAll('itemId').map(String);
  for (const itemId of itemIds) {
    const approvedBaseUnits = numberField(formData, `approved-${itemId}`);
    const hotBoxAdjustment = signedNumberField(formData, `hotBoxAdjustment-${itemId}`, 0, -999, 999);
    const approvedCookUnits = Math.max(0, approvedBaseUnits + hotBoxAdjustment);
    const overrideReasonRaw = String(formData.get(`reason-${itemId}`) || '').trim();
    const adjustmentNote = hotBoxAdjustment !== 0 ? `Manual hot-box adjustment ${hotBoxAdjustment > 0 ? '+' : ''}${hotBoxAdjustment}` : '';
    const overrideReason = [overrideReasonRaw, adjustmentNote].filter(Boolean).join(' · ');
    await prisma.cookPlanItem.update({
      where: { id: itemId },
      data: { approvedCookUnits, overrideReason }
    });
  }
  await prisma.cookPlan.update({ where: { id: cookPlanId }, data: { status: 'APPROVED' } });
  revalidatePath('/cook-plan');
  revalidatePath('/dashboard');
}

export async function updateScenario(formData: FormData) {
  requireAuth();
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
      chickenMixPct: numberField(formData, 'chickenMixPct', 15, 0, 100),
      updatedBy: 'Archer'
    }
  });
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}

export async function updateProtein(formData: FormData) {
  requireAuth();
  const id = String(formData.get('id'));
  await prisma.protein.update({
    where: { id },
    data: {
      rawWeightEachLb: numberField(formData, 'rawWeightEachLb', 1, 0.1),
      cookedWeightEachLb: numberField(formData, 'cookedWeightEachLb', 0, 0),
      cookedYieldPercent: numberField(formData, 'cookedYieldPercent', 50, 1, 100),
      avgSalesPerCookedLb: numberField(formData, 'avgSalesPerCookedLb', 22, 1),
      purchaseCostEach: numberField(formData, 'purchaseCostEach', 0, 0),
      salesPriceEach: numberField(formData, 'salesPriceEach', 0, 0),
      sandwichOz: numberField(formData, 'sandwichOz', 5, 0),
      plateOz: numberField(formData, 'plateOz', 7, 0),
      minCookUnits: numberField(formData, 'minCookUnits', 0, 0),
      maxCookUnits: numberField(formData, 'maxCookUnits', 999, 0),
      maxReuseHours: numberField(formData, 'maxReuseHours', 24, 0, 168),
      reusableLeftover: formData.get('reusableLeftover') === 'on',
      updatedBy: 'Archer'
    }
  });
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}

export async function updateDayMultiplier(formData: FormData) {
  requireAuth();
  const id = String(formData.get('id'));
  await prisma.dayMultiplier.update({
    where: { id },
    data: { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3), updatedBy: 'Archer' }
  });
  revalidatePath('/settings');
}

export async function updateMonthMultiplier(formData: FormData) {
  requireAuth();
  const id = String(formData.get('id'));
  await prisma.monthMultiplier.update({
    where: { id },
    data: { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3), updatedBy: 'Archer' }
  });
  revalidatePath('/settings');
}

export async function deleteFutureCookPlans() {
  requireAuth();
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const cutoff = addUtcDays(todayUtc, 14);
  await prisma.cookPlan.deleteMany({ where: { serviceDate: { gt: cutoff } } });
  revalidatePath('/dashboard');
  revalidatePath('/cook-plan');
}
