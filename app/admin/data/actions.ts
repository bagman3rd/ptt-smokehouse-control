'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole, currentUser } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';

export async function createDataRequest(formData: FormData) {
  await requireRole(['ADMIN', 'OWNER']);
  const user = await currentUser();
  if (!user) return;
  const restaurant = await currentRestaurantForUser(user);
  const type = String(formData.get('type') || 'EXPORT').trim();
  const notes = String(formData.get('notes') || '').trim();
  const request = await prisma.customerDataRequest.create({ data: { restaurantId: restaurant.id, type, notes, requestedBy: user.name } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'CUSTOMER_DATA_REQUEST_CREATED', entity: 'CustomerDataRequest', entityId: request.id, afterJson: { type, notes } });
  revalidatePath('/admin/data');
}
