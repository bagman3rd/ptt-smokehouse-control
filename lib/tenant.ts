import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export const DEFAULT_RESTAURANT_NAME = 'Pigeon Toed Tavern';
export const DEFAULT_RESTAURANT_SLUG = 'pigeon-toed-tavern';
export const RESTAURANT_COOKIE = 'ptt_restaurant_id';

export async function ensureDefaultRestaurant() {
  const existing = await prisma.restaurant.findFirst({
    where: { OR: [{ slug: DEFAULT_RESTAURANT_SLUG }, { name: DEFAULT_RESTAURANT_NAME }] }
  });
  if (existing) return existing;
  return prisma.restaurant.create({
    data: {
      name: DEFAULT_RESTAURANT_NAME,
      slug: DEFAULT_RESTAURANT_SLUG,
      city: 'Pigeon Forge',
      state: 'TN',
      timezone: 'America/New_York'
    }
  });
}

export async function listRestaurantsForUser(userId: string) {
  return prisma.restaurant.findMany({
    where: { active: true, memberships: { some: { userId, active: true } } },
    orderBy: [{ name: 'asc' }]
  });
}

export async function membershipForUserRestaurant(userId: string, restaurantId: string) {
  return prisma.restaurantMembership.findFirst({
    where: { userId, restaurantId, active: true, restaurant: { active: true } },
    include: { restaurant: true }
  });
}

export async function currentMembershipForUser(user: Pick<User, 'id' | 'restaurantId'>) {
  const selectedId = cookies().get(RESTAURANT_COOKIE)?.value || user.restaurantId || '';
  if (selectedId) {
    const selected = await membershipForUserRestaurant(user.id, selectedId);
    if (selected) return selected;
  }

  return prisma.restaurantMembership.findFirst({
    where: { userId: user.id, active: true, restaurant: { active: true } },
    include: { restaurant: true },
    orderBy: { createdAt: 'asc' }
  });
}

export async function currentRestaurantForUser(user: Pick<User, 'id' | 'restaurantId'>) {
  const membership = await currentMembershipForUser(user);
  if (membership?.restaurant) return membership.restaurant;
  return ensureDefaultRestaurant();
}

export function setCurrentRestaurantCookie(restaurantId: string) {
  cookies().set(RESTAURANT_COOKIE, restaurantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
}


export async function auditLog(args: {
  restaurantId?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}) {
  // AuditLog is tenant-owned and restaurantId is non-null beginning in Build 6.3.0.
  // Authentication attempts that cannot be tied to a restaurant are intentionally
  // not written to this tenant-scoped table.
  if (!args.restaurantId) return;

  await prisma.auditLog.create({
    data: {
      restaurantId: args.restaurantId,
      actorUserId: args.actorUserId || null,
      actorName: args.actorName || 'System',
      action: args.action,
      entity: args.entity,
      entityId: args.entityId || null,
      beforeJson: args.beforeJson == null ? null : JSON.stringify(args.beforeJson),
      afterJson: args.afterJson == null ? null : JSON.stringify(args.afterJson)
    }
  }).catch(() => null);
}

export async function securityEvent(args: { userId?: string | null; identifier?: string | null; action: string; reason?: string | null; ipAddress?: string | null; userAgent?: string | null; }) {
  await prisma.securityEvent.create({ data: { userId: args.userId || null, identifier: args.identifier || null, action: args.action, reason: args.reason || null, ipAddress: args.ipAddress || null, userAgent: args.userAgent || null } }).catch(() => null);
}
