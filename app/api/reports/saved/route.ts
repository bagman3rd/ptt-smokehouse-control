import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireApiRole, currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseReportParams } from '@/lib/reporting';
import { currentRestaurantForUser, auditLog } from '@/lib/tenant';
import { enforceRateLimit } from '@/lib/rateLimit';
import { savedReportSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'api:saved-reports', 40, 60_000);
  if (limited) return limited;
  const authError = await requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  if (authError) return authError;

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
    const restaurant = await currentRestaurantForUser(user);
    const restaurantId = restaurant.id;
    const formData = await req.formData();
    const clean = savedReportSchema.parse(Object.fromEntries(formData.entries()));
    const name = clean.name;
    const description = clean.description || null;
    const range = clean.range;
    const params = parseReportParams(clean);

    await prisma.savedReport.create({
      data: {
        restaurantId,
        name,
        description,
        source: params.source,
        metric: params.metric,
        groupBy: params.groupBy,
        protein: params.protein,
        range,
        start: params.start,
        end: params.end,
        createdBy: user.name
      }
    });
    await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'CREATE', entity: 'SavedReport', afterJson: { name, params } });

    revalidatePath('/reports');
    const redirectUrl = new URL('/reports', req.url);
    redirectUrl.search = new URLSearchParams({ ...params, range, saved: '1' }).toString();
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save report.';
    const redirectUrl = new URL('/reports', req.url);
    redirectUrl.searchParams.set('error', message);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
