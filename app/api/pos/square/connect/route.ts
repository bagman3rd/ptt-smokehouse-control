import { NextResponse } from 'next/server';
import { requireApiUserRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { createPosOAuthState } from '@/lib/pos/oauthState';
import { squareAppId, squareAppSecret, squareOAuthUrl } from '@/lib/pos/square';
export async function GET(){ const auth=await requireApiUserRole(['ADMIN','OWNER']); if(!auth.ok) return auth.response; if(!squareAppId()||!squareAppSecret()) return NextResponse.redirect(new URL('/admin/restaurants/pos?error=square-not-configured',process.env.APP_URL||'http://localhost:3000')); const r=await currentRestaurantForUser(auth.user); return NextResponse.redirect(squareOAuthUrl(createPosOAuthState({restaurantId:r.id,userId:auth.user.id,provider:'SQUARE'}))); }
