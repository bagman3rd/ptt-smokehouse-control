'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';
import { generateTotpSecret, verifyTotp } from '@/lib/totp';
import { hashPassword, verifyPassword } from '@/lib/password';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

export async function createTwoFactorSecret() {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const existing = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  if (!existing) throw new Error('User not found.');
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorSecret: secret, twoFactorEnabled: false } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_SECRET_CREATED', entity: 'User', entityId: current.id, afterJson: { enabled: false } });
  revalidatePath('/account/security');
}

export async function enableTwoFactor(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const code = clean(formData.get('code'));
  const user = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  const secret = (user as any)?.twoFactorSecret || '';
  if (!user || !secret || !verifyTotp(code, secret)) throw new Error('Invalid authenticator code.');
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorEnabled: true, sessionVersion: { increment: 1 } } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_ENABLED_REVOKE_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}

export async function disableTwoFactor(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const password = String(formData.get('password') || '');
  const user = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('Password is required to disable two-factor authentication.');
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, sessionVersion: { increment: 1 } } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_DISABLED_REVOKE_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}

export async function changeOwnPassword(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  if (newPassword.length < 12) throw new Error('New password must be at least 12 characters.');
  const user = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) throw new Error('Current password is incorrect.');
  await prisma.user.update({ where: { id: current.id }, data: { passwordHash: hashPassword(newPassword), sessionVersion: { increment: 1 }, passwordResetRequired: false } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'CHANGE_OWN_PASSWORD_REVOKE_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}

export async function revokeOtherSessions() {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  await prisma.user.update({ where: { id: current.id }, data: { sessionVersion: { increment: 1 } } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'REVOKE_OWN_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}
