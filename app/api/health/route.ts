import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'Smokehouse Control', build: '9.5.0', timestamp: new Date().toISOString() });
}
