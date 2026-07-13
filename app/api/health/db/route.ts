import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: 'reachable', build: '7.8.4', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database health check failed', error);
    return NextResponse.json({ ok: false, database: 'unreachable', build: '7.8.4' }, { status: 503 });
  }
}
