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

export async function importSalesHistoryCsv(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const csv = clean(formData.get('salesCsv'));
  if (!csv) throw new Error('Paste CSV rows first. Required columns: date,totalSales,bbqSales optional.');
  const rows = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: Array<{ date: Date; totalSales: number; bbqSales: number }> = [];
  for (const row of rows) {
    if (/^date\s*,/i.test(row)) continue;
    const [dateRaw, totalRaw, bbqRaw] = row.split(',').map((x) => x?.trim() || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) continue;
    const totalSales = Number(totalRaw);
    if (!Number.isFinite(totalSales) || totalSales <= 0) continue;
    const bbqSales = Number.isFinite(Number(bbqRaw)) ? Number(bbqRaw) : Math.round(totalSales * 0.38);
    parsed.push({ date: new Date(`${dateRaw}T00:00:00.000Z`), totalSales, bbqSales });
  }
  if (parsed.length < 7) throw new Error('At least 7 valid sales rows are required to build useful day/month curves.');

  const dayTotals = new Map<number, { total: number; count: number }>();
  const monthTotals = new Map<number, { total: number; count: number }>();
  for (const row of parsed) {
    const dow = row.date.getUTCDay();
    const month = row.date.getUTCMonth() + 1;
    const day = dayTotals.get(dow) || { total: 0, count: 0 };
    day.total += row.totalSales; day.count += 1; dayTotals.set(dow, day);
    const mon = monthTotals.get(month) || { total: 0, count: 0 };
    mon.total += row.totalSales; mon.count += 1; monthTotals.set(month, mon);
    const existing = await prisma.endOfDayLog.findFirst({ where: { restaurantId, serviceDate: row.date } });
    if (existing) {
      await prisma.endOfDayLog.update({ where: { id: existing.id }, data: { totalSales: row.totalSales, bbqSales: row.bbqSales, notes: 'Imported sales history only' } });
    } else {
      await prisma.endOfDayLog.create({ data: { restaurantId, serviceDate: row.date, totalSales: row.totalSales, bbqSales: row.bbqSales, status: 'DRAFT', enteredBy: user.name, notes: 'Imported sales history only' } });
    }
  }

  const overallDayAvg = Array.from(dayTotals.values()).reduce((s, x) => s + x.total / x.count, 0) / Math.max(1, dayTotals.size);
  for (const [dayOfWeek, value] of dayTotals.entries()) {
    const multiplier = Math.min(3, Math.max(0.1, (value.total / value.count) / overallDayAvg));
    await prisma.dayMultiplier.updateMany({ where: { restaurantId, dayOfWeek }, data: { multiplier, updatedBy: `${user.name} sales import` } });
  }
  const overallMonthAvg = Array.from(monthTotals.values()).reduce((s, x) => s + x.total / x.count, 0) / Math.max(1, monthTotals.size);
  for (const [month, value] of monthTotals.entries()) {
    const multiplier = Math.min(3, Math.max(0.1, (value.total / value.count) / overallMonthAvg));
    await prisma.monthMultiplier.updateMany({ where: { restaurantId, month }, data: { multiplier, updatedBy: `${user.name} sales import` } });
  }
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'IMPORT_SALES_HISTORY', entity: 'SalesHistory', afterJson: { rows: parsed.length, updatedDayMultipliers: dayTotals.size, updatedMonthMultipliers: monthTotals.size } });
  revalidatePath('/admin/restaurants/setup');
  revalidatePath('/admin/restaurants/pos');
  revalidatePath('/settings');
}
