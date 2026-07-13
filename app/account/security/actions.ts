'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, normalizeRole } from '@/lib/auth';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';
import { generateTotpSecret, verifyTotp } from '@/lib/totp';
import { hashPassword, verifyPassword } from '@/lib/password';
import { encryptSecret, decryptSecret } from '@/lib/secretEncryption';
import { generateRecoveryCodes, serializeRecoveryCodes } from '@/lib/recoveryCodes';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

export async function createTwoFactorSecret() {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const existing = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  if (!existing) throw new Error('User not found.');
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_SECRET_CREATED', entity: 'User', entityId: current.id, afterJson: { enabled: false } });
  revalidatePath('/account/security');
}

export async function enableTwoFactor(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const code = clean(formData.get('code'));
  const user = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  const secret = decryptSecret((user as any)?.twoFactorSecret || '');
  if (!user || !secret || !verifyTotp(code, secret)) throw new Error('Invalid authenticator code.');
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorEnabled: true, twoFactorRecoveryCodes: serializeRecoveryCodes(recoveryCodes), twoFactorRecoveryDisplay: encryptSecret(JSON.stringify(recoveryCodes)), sessionVersion: { increment: 1 } } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_ENABLED_REVOKE_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}

export async function disableTwoFactor(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const password = String(formData.get('password') || '');
  const user = await prisma.user.findFirst({ where: { id: current.id, restaurantId: restaurant.id } });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('Password is required to disable two-factor authentication.');
  const role = normalizeRole(String(current.role));
  if (role === 'ADMIN' || role === 'OWNER') throw new Error('Two-factor authentication is mandatory for Admin and Owner accounts.');
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
  await prisma.userSession.updateMany({ where: { userId: current.id, id: { not: (current as any).sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'REVOKE_OWN_SESSIONS', entity: 'User', entityId: current.id, afterJson: { sessionRevoked: true } });
  revalidatePath('/account/security');
}

export async function revokeSession(formData: FormData) {
  const current = await requireAuth();
  const restaurant = await currentRestaurantForUser(current);
  const sessionId = clean(formData.get('sessionId'));
  if (!sessionId) return;
  await prisma.userSession.updateMany({ where: { id: sessionId, userId: current.id }, data: { revokedAt: new Date() } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'SESSION_REVOKED', entity: 'UserSession', entityId: sessionId });
  revalidatePath('/account/security');
}

export async function regenerateRecoveryCodes(formData: FormData) {
  const current = await requireAuth(); const restaurant = await currentRestaurantForUser(current);
  const password = String(formData.get('password') || '');
  const user = await prisma.user.findUnique({ where: { id: current.id } });
  if (!user || !verifyPassword(password, user.passwordHash)) throw new Error('Current password is incorrect.');
  const codes = generateRecoveryCodes();
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorRecoveryCodes: serializeRecoveryCodes(codes), twoFactorRecoveryDisplay: encryptSecret(JSON.stringify(codes)) } as any });
  await auditLog({ restaurantId: restaurant.id, actorUserId: current.id, actorName: current.name, action: 'TWO_FACTOR_RECOVERY_CODES_REGENERATED', entity: 'User', entityId: current.id });
  revalidatePath('/account/security');
}

export async function acknowledgeRecoveryCodes() {
  const current = await requireAuth();
  await prisma.user.update({ where: { id: current.id }, data: { twoFactorRecoveryDisplay: null } as any });
  revalidatePath('/account/security');
}
