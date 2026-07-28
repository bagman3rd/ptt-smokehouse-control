import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'Smokehouse Control', build: '11.0.4', timestamp: new Date().toISOString() });
}
