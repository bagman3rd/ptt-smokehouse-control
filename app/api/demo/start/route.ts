import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { setSessionCookie } from '@/lib/auth';
import { setCurrentRestaurantCookie, auditLog } from '@/lib/tenant';
import { createDefaultRestaurantData, createDemoHistory } from '@/lib/starterData';
import { enforceRateLimit } from '@/lib/rateLimit';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, 'demo', 5, 15 * 60_000);
  if (limited) return limited;
  const now = Date.now();
  const restaurant = await prisma.restaurant.create({ data: { name: `Demo Smokehouse ${new Date().toISOString().slice(0,10)}`, slug: `demo-${now}`, city: 'Demo City', state: 'US', timezone: 'America/New_York', active: true } });
  await createDefaultRestaurantData(prisma, restaurant.id, 'demo');
  const user = await prisma.user.create({ data: { name: 'Demo Owner', username: `demo-${now}`, email: `demo-${now}@smokehouse.local`, passwordHash: hashPassword(`demo-password-${now}`), role: Role.OWNER, active: true, createdBy: 'Demo Mode', restaurantId: restaurant.id } });
  await prisma.restaurantMembership.create({ data: { restaurantId: restaurant.id, userId: user.id, role: Role.OWNER, active: true } });
  await createDemoHistory(prisma, restaurant.id);
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'CREATE_DEMO_DATA', entity: 'Restaurant', entityId: restaurant.id, afterJson: { demo: true } });
  setCurrentRestaurantCookie(restaurant.id);
  setSessionCookie(user.id);
  return NextResponse.redirect(`${baseUrl(request)}/dashboard?demo=1`, 303);
}
