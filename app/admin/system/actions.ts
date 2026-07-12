'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

export async function recordSystemCheck(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const type = clean(formData.get('type')) || 'GENERAL_SYSTEM_CHECK';
  const status = clean(formData.get('status')) || 'PASS';
  const notes = clean(formData.get('notes')) || null;
  const created = await prisma.systemCheck.create({
    data: { restaurantId: restaurant.id, type, status, notes, verifiedBy: user.name }
  });
  await auditLog({
    restaurantId: restaurant.id,
    actorUserId: user.id,
    actorName: user.name,
    action: 'RECORD_SYSTEM_CHECK',
    entity: 'SystemCheck',
    entityId: created.id,
    afterJson: created
  });
  revalidatePath('/admin/system');
}
