import { NextResponse } from 'next/server';
import { requireApiUserRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { createPosOAuthState } from '@/lib/pos/oauthState';
import { squareAppId, squareAppSecret, squareOAuthUrl } from '@/lib/pos/square';
import { requestOrigin, squareCallbackUrl } from '@/lib/pos/publicUrl';

export async function GET(request: Request) {
  const auth = await requireApiUserRole(['ADMIN', 'OWNER']);
  if (!auth.ok) return auth.response;

  const origin = requestOrigin(request);
  if (!squareAppId() || !squareAppSecret()) {
    return NextResponse.redirect(new URL('/admin/restaurants/pos?error=square-not-configured', origin));
  }

  const restaurant = await currentRestaurantForUser(auth.user);
  const state = createPosOAuthState({ restaurantId: restaurant.id, userId: auth.user.id, provider: 'SQUARE' });
  return NextResponse.redirect(squareOAuthUrl(state, squareCallbackUrl(request)));
}
