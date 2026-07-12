'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';

function text(formData: FormData, key: string, fallback = '') {
  return String(formData.get(key) || fallback).trim();
}

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = 99999) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function createSmoker(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const name = text(formData, 'name');
  if (!name) throw new Error('Smoker name is required.');
  const smoker = await prisma.smoker.create({
    data: {
      restaurantId,
      name,
      model: text(formData, 'model'),
      location: text(formData, 'location'),
      rackCount: numberField(formData, 'rackCount', 0, 0, 500),
      brisketCapacity: numberField(formData, 'brisketCapacity', 0, 0, 1000),
      porkCapacity: numberField(formData, 'porkCapacity', 0, 0, 1000),
      ribCapacity: numberField(formData, 'ribCapacity', 0, 0, 5000),
      chickenCapacity: numberField(formData, 'chickenCapacity', 0, 0, 5000),
      cookWindow: text(formData, 'cookWindow')
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
  const data = {
    name: text(formData, 'name', before.name),
    model: text(formData, 'model'),
    location: text(formData, 'location'),
    rackCount: numberField(formData, 'rackCount', before.rackCount, 0, 500),
    brisketCapacity: numberField(formData, 'brisketCapacity', before.brisketCapacity, 0, 1000),
    porkCapacity: numberField(formData, 'porkCapacity', before.porkCapacity, 0, 1000),
    ribCapacity: numberField(formData, 'ribCapacity', before.ribCapacity, 0, 5000),
    chickenCapacity: numberField(formData, 'chickenCapacity', before.chickenCapacity, 0, 5000),
    cookWindow: text(formData, 'cookWindow'),
    active: formData.get('active') === 'on'
  };
  await prisma.smoker.updateMany({ where: { id, restaurantId }, data });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'UPDATE', entity: 'Smoker', entityId: id, beforeJson: before, afterJson: data });
  revalidatePath('/admin/smokers');
  revalidatePath('/admin/system');
}
