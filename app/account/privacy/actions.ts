'use server';

// Build 10.0.0 — customer data-rights actions (GDPR Articles 15, 17, 20).

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { sendNotification } from '@/lib/notifications/dispatch';
import { signToken, verifyToken } from '@/lib/signedToken';
import { eraseRestaurantPersonalData } from '@/lib/retention';

const ALLOWED_RETENTION = [0, 7, 30, 90, 365, -1];

export async function updateRetentionSetting(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const days = Number(formData.get('aiLogRetentionDays'));
  if (!ALLOWED_RETENTION.includes(days)) return;

  await prisma.dataRetentionSetting.upsert({
    where: { restaurantId: restaurant.id },
    update: { aiLogRetentionDays: days },
    create: { restaurantId: restaurant.id, aiLogRetentionDays: days }
  });
  await auditLog({
    restaurantId: restaurant.id,
    actorUserId: user.id,
    actorName: user.name,
    action: 'UPDATE_RETENTION_SETTING',
    entity: 'DataRetentionSetting',
    entityId: restaurant.id,
    afterJson: { aiLogRetentionDays: days }
  }).catch(() => {});
  revalidatePath('/account/privacy');
}

/** Request account deletion — sends a signed 24h confirmation email. */
export async function requestAccountDeletion() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);

  const token = signToken(
    { purpose: 'delete_account', restaurantId: restaurant.id, userId: user.id },
    60 * 60 * 24 // 24 hours
  );
  const base = process.env.APP_BASE_URL || '';
  const confirmUrl = `${base}/account/privacy/confirm-delete?token=${encodeURIComponent(token)}`;

  await prisma.customerDataRequest.create({
    data: {
      restaurantId: restaurant.id,
      type: 'ERASURE_REQUESTED',
      status: 'PENDING',
      requestedBy: user.name,
      notes: 'Deletion requested; awaiting email confirmation.'
    }
  });

  await sendNotification({
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    templateKey: 'data_deletion_confirm',
    to: user.email,
    restaurantId: restaurant.id,
    data: { name: user.name, confirmUrl },
    idempotencyKey: `delete-confirm-${restaurant.id}-${Date.now()}`
  }).catch(() => {});

  revalidatePath('/account/privacy');
}

/**
 * Confirm and execute account deletion from the signed email link.
 * Verifies the token belongs to the current user's restaurant, performs GDPR
 * erasure (anonymize PII, preserve audit/financial), and signs the user out.
 */
export async function confirmAccountDeletion(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const token = String(formData.get('token') || '');

  const payload = verifyToken(token);
  if (
    !payload ||
    payload.purpose !== 'delete_account' ||
    payload.restaurantId !== restaurant.id ||
    payload.userId !== user.id
  ) {
    redirect('/account/privacy/confirm-delete?error=invalid');
  }

  await auditLog({
    restaurantId: restaurant.id,
    actorUserId: user.id,
    actorName: user.name,
    action: 'CONFIRM_ACCOUNT_DELETION',
    entity: 'Restaurant',
    entityId: restaurant.id
  }).catch(() => {});

  await eraseRestaurantPersonalData(restaurant.id, user.name);

  // The erasure bumped sessionVersion, so the current session is already invalid.
  redirect('/account/privacy/confirm-delete?done=1');
}
