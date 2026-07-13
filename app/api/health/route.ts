import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'Smokehouse Control', build: '8.0.1', timestamp: new Date().toISOString() });
}
