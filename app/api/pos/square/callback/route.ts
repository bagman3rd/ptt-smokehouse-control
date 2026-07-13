import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptSecret } from '@/lib/secretEncryption';
import { verifyPosOAuthState } from '@/lib/pos/oauthState';
import { exchangeSquareCode } from '@/lib/pos/square';
import { requestOrigin, squareCallbackUrl } from '@/lib/pos/publicUrl';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const state = verifyPosOAuthState(url.searchParams.get('state') || '');
  const code = url.searchParams.get('code') || '';

  if (!state || state.provider !== 'SQUARE' || !code) {
    return NextResponse.redirect(new URL('/admin/restaurants/pos?error=square-authorization', origin));
  }

  try {
    const token = await exchangeSquareCode(code, squareCallbackUrl(request));
    const existing = await prisma.posConnection.findFirst({ where: { restaurantId: state.restaurantId, provider: 'SQUARE' } });
    const data = {
      status: 'CONNECTING' as const,
      externalMerchantId: token.merchant_id || null,
      encryptedAccessToken: encryptSecret(token.access_token),
      encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      tokenExpiresAt: token.expires_at ? new Date(token.expires_at) : null,
      lastError: null,
      lastErrorAt: null
    };

    if (existing) await prisma.posConnection.update({ where: { id: existing.id }, data });
    else await prisma.posConnection.create({ data: { restaurantId: state.restaurantId, provider: 'SQUARE', externalLocationId: null, createdBy: state.userId, ...data } });

    return NextResponse.redirect(new URL('/admin/restaurants/pos?connected=square', origin));
  } catch {
    return NextResponse.redirect(new URL('/admin/restaurants/pos?error=square-callback', origin));
  }
}
