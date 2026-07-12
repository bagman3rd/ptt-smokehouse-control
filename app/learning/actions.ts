'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';

export async function saveLearningRecommendation(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const title = String(formData.get('title') || '').trim();
  const recommendation = String(formData.get('recommendation') || '').trim();
  if (!title || !recommendation) throw new Error('Recommendation title and detail are required.');
  const saved = await prisma.learningRecommendation.create({
    data: {
      restaurantId,
      type: String(formData.get('type') || 'FORECAST'),
      title,
      recommendation,
      targetEntity: String(formData.get('targetEntity') || ''),
      targetId: String(formData.get('targetId') || ''),
      beforeJson: String(formData.get('beforeJson') || ''),
      afterJson: String(formData.get('afterJson') || ''),
      createdBy: user.name
    }
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'CREATE', entity: 'LearningRecommendation', entityId: saved.id, afterJson: saved });
  revalidatePath('/learning');
}

export async function decideLearningRecommendation(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = String(formData.get('id') || '');
  const decision = String(formData.get('decision') || '').toUpperCase() === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
  const before = await prisma.learningRecommendation.findFirst({ where: { id, restaurantId } });
  if (!before) throw new Error('Recommendation not found for this restaurant.');
  await prisma.learningRecommendation.updateMany({
    where: { id, restaurantId },
    data: { status: decision, decidedBy: user.name, decidedAt: new Date() }
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: decision, entity: 'LearningRecommendation', entityId: id, beforeJson: before });
  revalidatePath('/learning');
}
