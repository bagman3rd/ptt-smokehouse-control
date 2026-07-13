import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { authConfigErrors, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { auditLog, setCurrentRestaurantCookie } from '@/lib/tenant';
import { createDefaultRestaurantData, slugifyRestaurant } from '@/lib/starterData';
import { signupSchema } from '@/lib/validators';
import { enforceRateLimit } from '@/lib/rateLimit';
import { ensureTrialSubscription } from '@/lib/billing';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'signup', 8, 15 * 60_000);
  if (limited) return limited;
  const root = baseUrl(request);
  if (authConfigErrors().length > 0) return NextResponse.redirect(`${root}/signup?error=${encodeURIComponent('Server auth variables are not configured.')}`, 303);
  try {
    const form = await request.formData();
    const parsed = signupSchema.parse(Object.fromEntries(form.entries()));
    const existingUsername = await prisma.user.findFirst({ where: { username: parsed.username } });
    if (existingUsername) throw new Error('That username is already taken. Use another username.');

    const restaurant = await prisma.restaurant.create({ data: { name: parsed.restaurantName, slug: slugifyRestaurant(parsed.restaurantName), city: parsed.city || null, state: parsed.state || null, timezone: parsed.timezone, active: true } });
    await createDefaultRestaurantData(prisma, restaurant.id, 'generic');
    await ensureTrialSubscription(restaurant.id);
    const user = await prisma.user.create({ data: { name: parsed.ownerName, username: parsed.username, email: parsed.email, passwordHash: hashPassword(parsed.password), role: Role.OWNER, active: true, createdBy: 'Self-Service Signup', restaurantId: restaurant.id } });
    await prisma.restaurantMembership.create({ data: { restaurantId: restaurant.id, userId: user.id, role: Role.OWNER, active: true } });
    await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SELF_SERVICE_SIGNUP', entity: 'Restaurant', entityId: restaurant.id, afterJson: { restaurantName: restaurant.name, owner: user.username } });
    setCurrentRestaurantCookie(restaurant.id);
    setSessionCookie(user.id, user.sessionVersion || 1);
    return NextResponse.redirect(`${root}/admin/restaurants/setup?welcome=1`, 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed.';
    return NextResponse.redirect(`${root}/signup?error=${encodeURIComponent(message)}`, 303);
  }
}
