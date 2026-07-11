import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

export const DEFAULT_RESTAURANT_NAME = 'Pigeon Toed Tavern';
export const DEFAULT_RESTAURANT_SLUG = 'pigeon-toed-tavern';

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

export async function currentRestaurantForUser(user: Pick<User, 'id' | 'restaurantId' | 'role'>) {
  if (user.restaurantId) {
    const restaurant = await prisma.restaurant.findFirst({ where: { id: user.restaurantId, active: true } });
    if (restaurant) return restaurant;
  }

  const membership = await prisma.restaurantMembership.findFirst({
    where: { userId: user.id, active: true, restaurant: { active: true } },
    include: { restaurant: true },
    orderBy: { createdAt: 'asc' }
  });
  if (membership?.restaurant) return membership.restaurant;

  const fallback = await ensureDefaultRestaurant();
  await prisma.user.updateMany({ where: { id: user.id, restaurantId: null }, data: { restaurantId: fallback.id } });
  await prisma.restaurantMembership.create({ data: { userId: user.id, restaurantId: fallback.id, role: user.role, active: true } }).catch(() => null);
  return fallback;
}

export function tenantWhere(restaurantId: string) {
  return { restaurantId };
}

export function tenantOrLegacyWhere(restaurantId: string) {
  return { OR: [{ restaurantId }, { restaurantId: null }] };
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
  await prisma.auditLog.create({
    data: {
      restaurantId: args.restaurantId || null,
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
