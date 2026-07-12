'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser, auditLog, setCurrentRestaurantCookie } from '@/lib/tenant';
import { createDefaultRestaurantData, slugifyRestaurant } from '@/lib/starterData';
import { ProteinUnit, ScenarioType, Role } from '@prisma/client';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

async function createStarterData(restaurantId: string) {
  const proteins = [
    { name: 'Brisket', code: 'BRISKET', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 13, cookedWeightEachLb: 6.5, cookedYieldPercent: 50, avgSalesPerCookedLb: 40, minCookUnits: 1, maxCookUnits: 88, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'Restaurant Setup' },
    { name: 'Pulled Pork', code: 'PORK', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 9, cookedWeightEachLb: 4.95, cookedYieldPercent: 55, avgSalesPerCookedLb: 22, minCookUnits: 2, maxCookUnits: 84, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'Restaurant Setup' },
    { name: 'Ribs', code: 'RIBS', inputUnit: ProteinUnit.RACK, rawWeightEachLb: 3.3, cookedWeightEachLb: 3.0, cookedYieldPercent: 90.9, avgSalesPerCookedLb: 11, purchaseCostEach: 10, salesPriceEach: 33, minCookUnits: 6, maxCookUnits: 240, reusableLeftover: true, maxReuseHours: 24, updatedBy: 'Restaurant Setup' },
    { name: 'Pulled Chicken', code: 'CHICKEN', inputUnit: ProteinUnit.EACH, rawWeightEachLb: 2.5, cookedWeightEachLb: 1.875, cookedYieldPercent: 75, avgSalesPerCookedLb: 22, minCookUnits: 8, maxCookUnits: 220, reusableLeftover: true, maxReuseHours: 36, updatedBy: 'Restaurant Setup' }
  ];
  for (const protein of proteins) await prisma.protein.create({ data: { ...protein, restaurantId } }).catch(() => null);

  const scenarios = [
    { name: 'Base $6M', type: ScenarioType.BASE, annualSales: 6000000, bbqSalesPercent: 40, safetyFactorPct: 8, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'Restaurant Setup' },
    { name: 'Aggressive $8M', type: ScenarioType.AGGRESSIVE, annualSales: 8000000, bbqSalesPercent: 40, safetyFactorPct: 10, brisketMixPct: 30, porkMixPct: 40, ribsMixPct: 15, chickenMixPct: 15, updatedBy: 'Restaurant Setup' }
  ];
  for (const scenario of scenarios) await prisma.forecastScenario.create({ data: { ...scenario, restaurantId } }).catch(() => null);

  const days = [[0,'Sunday',1.33], [1,'Monday',0.63], [2,'Tuesday',0.56], [3,'Wednesday',0.70], [4,'Thursday',0.84], [5,'Friday',1.19], [6,'Saturday',1.75]] as const;
  for (const [dayOfWeek,label,multiplier] of days) await prisma.dayMultiplier.create({ data: { restaurantId, dayOfWeek, label, multiplier, updatedBy: 'Restaurant Setup' } }).catch(() => null);

  const months = [[1,'January',0.584],[2,'February',0.555],[3,'March',0.808],[4,'April',0.935],[5,'May',0.954],[6,'June',1.320],[7,'July',1.506],[8,'August',1.163],[9,'September',0.890],[10,'October',1.232],[11,'November',0.821],[12,'December',1.232]] as const;
  for (const [month,label,multiplier] of months) await prisma.monthMultiplier.create({ data: { restaurantId, month, label, multiplier, updatedBy: 'Restaurant Setup' } }).catch(() => null);
}

export async function createRestaurant(formData: FormData) {
  const current = await requireRole(['ADMIN', 'OWNER']);
  const currentRestaurant = await currentRestaurantForUser(current);
  const name = clean(formData.get('name'));
  const city = clean(formData.get('city'));
  const state = clean(formData.get('state'));
  const timezone = clean(formData.get('timezone')) || 'America/New_York';
  const role = String(formData.get('role') || 'OWNER') === 'ADMIN' ? Role.ADMIN : Role.OWNER;
  if (!name) throw new Error('Restaurant name is required.');
  const restaurant = await prisma.restaurant.create({ data: { name, slug: slugifyRestaurant(name), city, state, timezone, active: true } });
  await createDefaultRestaurantData(prisma, restaurant.id, 'generic');
  await prisma.restaurantMembership.create({ data: { restaurantId: restaurant.id, userId: current.id, role, active: true } });
  await auditLog({ restaurantId: currentRestaurant.id, actorUserId: current.id, actorName: current.name, action: 'CREATE_RESTAURANT', entity: 'Restaurant', entityId: restaurant.id, afterJson: { name, city, state, role } });
  setCurrentRestaurantCookie(restaurant.id);
  revalidatePath('/admin/restaurants');
  revalidatePath('/dashboard');
}

export async function updateRestaurantStatus(formData: FormData) {
  const current = await requireRole(['ADMIN', 'OWNER']);
  const currentRestaurant = await currentRestaurantForUser(current);
  const restaurantId = clean(formData.get('restaurantId'));
  const active = formData.get('active') === 'on';
  await prisma.restaurant.updateMany({ where: { id: restaurantId }, data: { active } });
  await auditLog({ restaurantId: currentRestaurant.id, actorUserId: current.id, actorName: current.name, action: 'UPDATE_RESTAURANT_STATUS', entity: 'Restaurant', entityId: restaurantId, afterJson: { active } });
  revalidatePath('/admin/restaurants');
}
