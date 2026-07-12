'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';

function text(formData: FormData, key: string, fallback = '') {
  return String(formData.get(key) || fallback).trim();
}

const LOCATION_OPTIONS = new Set(['Outdoor', 'Indoors under hood', 'In the wall', 'Outdoors in smoke house']);
const COOK_WINDOW_OPTIONS = new Set(['Overnight only', 'Same-day only', 'All day / flexible', 'Backup / overflow only', 'Not currently active']);

function selectedText(formData: FormData, key: string, allowed: Set<string>, fallback = '') {
  const value = text(formData, key, fallback);
  if (!allowed.has(value)) throw new Error(`Invalid ${key} selection.`);
  return value;
}

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = 99999) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function catalogFromForm(formData: FormData) {
  const catalogId = text(formData, 'catalogId');
  if (!catalogId) return null;
  return prisma.smokerCatalog.findUnique({ where: { id: catalogId } });
}

export async function createSmoker(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const name = text(formData, 'name');
  if (!name) throw new Error('Smoker Brand is required.');
  const catalog = await catalogFromForm(formData);
  const smoker = await prisma.smoker.create({
    data: {
      restaurantId,
      catalogId: catalog?.id || null,
      name,
      brand: catalog?.brand || text(formData, 'brand'),
      model: catalog ? catalog.model : text(formData, 'model'),
      location: selectedText(formData, 'location', LOCATION_OPTIONS),
      rackCount: numberField(formData, 'rackCount', catalog?.rackCount || 0, 0, 500),
      brisketCapacity: numberField(formData, 'brisketCapacity', catalog?.brisketCapacity || 0, 0, 1000),
      porkCapacity: numberField(formData, 'porkCapacity', catalog?.porkCapacity || 0, 0, 1000),
      ribCapacity: numberField(formData, 'ribCapacity', catalog?.ribCapacity || 0, 0, 5000),
      chickenCapacity: numberField(formData, 'chickenCapacity', catalog?.chickenCapacity || 0, 0, 5000),
      cookWindow: selectedText(formData, 'cookWindow', COOK_WINDOW_OPTIONS, catalog?.cookWindow || '')
    }
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'CREATE', entity: 'Smoker', entityId: smoker.id, afterJson: smoker });
  revalidatePath('/admin/smokers');
  revalidatePath('/admin/system');
}

export async function updateSmoker(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = text(formData, 'id');
  const before = await prisma.smoker.findFirst({ where: { id, restaurantId } });
  if (!before) throw new Error('Smoker not found for this restaurant.');
  const catalog = await catalogFromForm(formData);
  const data = {
    catalogId: catalog?.id || before.catalogId || null,
    name: text(formData, 'name', before.name),
    brand: catalog?.brand || text(formData, 'brand', before.brand || ''),
    model: catalog ? catalog.model : text(formData, 'model'),
    location: selectedText(formData, 'location', LOCATION_OPTIONS),
    rackCount: numberField(formData, 'rackCount', catalog?.rackCount || before.rackCount, 0, 500),
    brisketCapacity: numberField(formData, 'brisketCapacity', before.brisketCapacity, 0, 1000),
    porkCapacity: numberField(formData, 'porkCapacity', before.porkCapacity, 0, 1000),
    ribCapacity: numberField(formData, 'ribCapacity', before.ribCapacity, 0, 5000),
    chickenCapacity: numberField(formData, 'chickenCapacity', before.chickenCapacity, 0, 5000),
    cookWindow: selectedText(formData, 'cookWindow', COOK_WINDOW_OPTIONS),
    active: formData.get('active') === 'on'
  };
  await prisma.smoker.updateMany({ where: { id, restaurantId }, data });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'Smoker', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/admin/smokers');
  revalidatePath('/admin/system');
}
