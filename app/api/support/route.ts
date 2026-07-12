import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/rateLimit';
import { supportTicketSchema } from '@/lib/validators';

function baseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'support', 10, 15 * 60_000);
  if (limited) return limited;
  const root = baseUrl(request);
  const form = await request.formData();
  const parsed = supportTicketSchema.parse(Object.fromEntries(form.entries()));
  const user = await currentUser().catch(() => null);
  const restaurant = user ? await currentRestaurantForUser(user).catch(() => null) : null;
  const ticket = await prisma.supportTicket.create({ data: { restaurantId: restaurant?.id || null, name: parsed.name, email: parsed.email, subject: parsed.subject, message: parsed.message, priority: parsed.priority || 'NORMAL' } });
  if (restaurant) await auditLog({ restaurantId: restaurant.id, actorUserId: user?.id || null, actorName: user?.name || parsed.name, action: 'SUPPORT_TICKET_CREATED', entity: 'SupportTicket', entityId: ticket.id, afterJson: { subject: parsed.subject, priority: parsed.priority } });
  return NextResponse.redirect(`${root}/support?sent=1`, 303);
}
