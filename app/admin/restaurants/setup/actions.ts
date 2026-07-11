'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function saveRestaurantProfile(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const before = restaurant;
  const data = {
    name: clean(formData.get('name')) || restaurant.name,
    city: clean(formData.get('city')) || null,
    state: clean(formData.get('state')) || null,
    timezone: clean(formData.get('timezone')) || 'America/New_York'
  };
  await prisma.restaurant.update({ where: { id: restaurant.id }, data });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SETUP_PROFILE', entity: 'Restaurant', entityId: restaurant.id, beforeJson: before, afterJson: data });
  revalidatePath('/admin/restaurants/setup');
  revalidatePath('/dashboard');
}

export async function saveSetupForecast(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const scenarioId = clean(formData.get('scenarioId'));
  const before = await prisma.forecastScenario.findFirst({ where: { id: scenarioId, restaurantId: restaurant.id } });
  if (!before) throw new Error('Scenario not found for this restaurant.');
  const data = {
    annualSales: numberField(formData, 'annualSales', before.annualSales, 1),
    bbqSalesPercent: numberField(formData, 'bbqSalesPercent', before.bbqSalesPercent, 1, 100),
    safetyFactorPct: numberField(formData, 'safetyFactorPct', before.safetyFactorPct, 0, 50),
    brisketMixPct: numberField(formData, 'brisketMixPct', before.brisketMixPct, 0, 100),
    porkMixPct: numberField(formData, 'porkMixPct', before.porkMixPct, 0, 100),
    ribsMixPct: numberField(formData, 'ribsMixPct', before.ribsMixPct, 0, 100),
    chickenMixPct: numberField(formData, 'chickenMixPct', before.chickenMixPct, 0, 100),
    updatedBy: user.name
  };
  await prisma.forecastScenario.updateMany({ where: { id: scenarioId, restaurantId: restaurant.id }, data });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SETUP_FORECAST', entity: 'ForecastScenario', entityId: scenarioId, beforeJson: before, afterJson: data });
  revalidatePath('/admin/restaurants/setup');
  revalidatePath('/settings');
}

export async function saveSetupProtein(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const proteinId = clean(formData.get('proteinId'));
  const before = await prisma.protein.findFirst({ where: { id: proteinId, restaurantId: restaurant.id } });
  if (!before) throw new Error('Protein not found for this restaurant.');
  const data = {
    rawWeightEachLb: numberField(formData, 'rawWeightEachLb', before.rawWeightEachLb, 0.1),
    cookedWeightEachLb: numberField(formData, 'cookedWeightEachLb', before.cookedWeightEachLb, 0),
    cookedYieldPercent: numberField(formData, 'cookedYieldPercent', before.cookedYieldPercent, 1, 100),
    avgSalesPerCookedLb: numberField(formData, 'avgSalesPerCookedLb', before.avgSalesPerCookedLb, 1),
    minCookUnits: numberField(formData, 'minCookUnits', before.minCookUnits, 0),
    maxCookUnits: numberField(formData, 'maxCookUnits', before.maxCookUnits, 0),
    reusableLeftover: formData.get('reusableLeftover') === 'on',
    updatedBy: user.name
  };
  await prisma.protein.updateMany({ where: { id: proteinId, restaurantId: restaurant.id }, data });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SETUP_PROTEIN', entity: 'Protein', entityId: proteinId, beforeJson: before, afterJson: data });
  revalidatePath('/admin/restaurants/setup');
  revalidatePath('/settings');
}

export async function saveSetupCurve(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const updates: Array<{ kind: string; id: string; multiplier: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('day-')) updates.push({ kind: 'day', id: key.slice(4), multiplier: Number(value) });
    if (key.startsWith('month-')) updates.push({ kind: 'month', id: key.slice(6), multiplier: Number(value) });
  }
  for (const update of updates) {
    if (!Number.isFinite(update.multiplier)) continue;
    const multiplier = Math.min(3, Math.max(0.1, update.multiplier));
    if (update.kind === 'day') await prisma.dayMultiplier.updateMany({ where: { id: update.id, restaurantId }, data: { multiplier, updatedBy: user.name } });
    if (update.kind === 'month') await prisma.monthMultiplier.updateMany({ where: { id: update.id, restaurantId }, data: { multiplier, updatedBy: user.name } });
  }
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'SETUP_CURVE', entity: 'Seasonality', afterJson: { updated: updates.length } });
  revalidatePath('/admin/restaurants/setup');
  revalidatePath('/settings');
}
