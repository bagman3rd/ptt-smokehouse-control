'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { addUtcDays } from '@/lib/date';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';

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
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const cookPlanId = String(formData.get('cookPlanId'));
  const plan = await prisma.cookPlan.findFirst({ where: { id: cookPlanId, restaurantId }, include: { items: true } });
  if (!plan) throw new Error('Cook plan not found for this restaurant.');
  const allowedItemIds = new Set(plan.items.map((item) => item.id));
  const itemIds = formData.getAll('itemId').map(String).filter((id) => allowedItemIds.has(id));
  const beforeItems = plan.items.map((item) => ({ id: item.id, approvedCookUnits: item.approvedCookUnits, overrideReason: item.overrideReason }));
  for (const itemId of itemIds) {
    const originalItem = plan.items.find((item) => item.id === itemId);
    if (!originalItem) continue;
    const approvedBaseUnits = numberField(formData, `approved-${itemId}`);
    const hotBoxAdjustment = signedNumberField(formData, `hotBoxAdjustment-${itemId}`, 0, -999, 999);
    const approvedCookUnits = Math.max(0, approvedBaseUnits + hotBoxAdjustment);
    const overrideReasonRaw = String(formData.get(`reason-${itemId}`) || '').trim();
    const changedFromRecommendation = Math.round(approvedCookUnits) !== Math.round(originalItem.recommendedCookUnits);
    if ((changedFromRecommendation || hotBoxAdjustment !== 0) && overrideReasonRaw.length < 4) {
      throw new Error('Manual cook-plan overrides require a manager reason. Add a reason for every protein where approved units differ from recommendation or hot-box adjustment is used.');
    }
    const adjustmentNote = hotBoxAdjustment !== 0 ? `Manual hot-box adjustment ${hotBoxAdjustment > 0 ? '+' : ''}${hotBoxAdjustment}` : '';
    const overrideReason = [overrideReasonRaw, adjustmentNote].filter(Boolean).join(' · ');
    await prisma.cookPlanItem.update({
      where: { id: itemId },
      data: { approvedCookUnits, overrideReason }
    });
  }
  await prisma.cookPlan.updateMany({ where: { id: cookPlanId, restaurantId }, data: { status: 'APPROVED' } });
  const afterItems = await prisma.cookPlanItem.findMany({ where: { cookPlanId }, select: { id: true, approvedCookUnits: true, overrideReason: true, recommendedCookUnits: true } });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'APPROVE', entity: 'CookPlan', entityId: cookPlanId, beforeJson: beforeItems, afterJson: afterItems });
  revalidatePath('/cook-plan');
  revalidatePath('/dashboard');
}

export async function updateScenario(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = String(formData.get('id'));
  const before = await prisma.forecastScenario.findFirst({ where: { id, restaurantId } });
  const data = {
      annualSales: numberField(formData, 'annualSales', 6000000, 1),
      bbqSalesPercent: numberField(formData, 'bbqSalesPercent', 40, 1, 100),
      safetyFactorPct: numberField(formData, 'safetyFactorPct', 8, 0, 50),
      brisketMixPct: numberField(formData, 'brisketMixPct', 30, 0, 100),
      porkMixPct: numberField(formData, 'porkMixPct', 40, 0, 100),
      ribsMixPct: numberField(formData, 'ribsMixPct', 15, 0, 100),
      chickenMixPct: numberField(formData, 'chickenMixPct', 15, 0, 100),
      updatedBy: user.name
    };
  await prisma.forecastScenario.updateMany({
    where: { id, restaurantId },
    data
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'ForecastScenario', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}

export async function updateProtein(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = String(formData.get('id'));
  const before = await prisma.protein.findFirst({ where: { id, restaurantId } });
  const data = {
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
      updatedBy: user.name
    };
  await prisma.protein.updateMany({
    where: { id, restaurantId },
    data
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'Protein', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}

export async function updateDayMultiplier(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = String(formData.get('id'));
  const before = await prisma.dayMultiplier.findFirst({ where: { id, restaurantId } });
  const data = { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3), updatedBy: user.name };
  await prisma.dayMultiplier.updateMany({ where: { id, restaurantId }, data });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'DayMultiplier', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/settings');
}

export async function updateMonthMultiplier(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = String(formData.get('id'));
  const before = await prisma.monthMultiplier.findFirst({ where: { id, restaurantId } });
  const data = { multiplier: numberField(formData, 'multiplier', 1, 0.1, 3), updatedBy: user.name };
  await prisma.monthMultiplier.updateMany({ where: { id, restaurantId }, data });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'MonthMultiplier', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/settings');
}

export async function deleteFutureCookPlans() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const cutoff = addUtcDays(todayUtc, 14);
  await prisma.cookPlan.deleteMany({ where: { restaurantId, serviceDate: { gt: cutoff } } });
  revalidatePath('/dashboard');
  revalidatePath('/cook-plan');
}
