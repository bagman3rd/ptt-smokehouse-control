import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { apiAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseReportParams } from '@/lib/reporting';

function cleanName(value: FormDataEntryValue | null) {
  const name = String(value || '').trim();
  if (!name) throw new Error('Saved report name is required.');
  if (name.length > 80) throw new Error('Saved report name must be 80 characters or fewer.');
  return name;
}

export async function POST(req: NextRequest) {
  const authError = apiAuthError();
  if (authError) return NextResponse.json(authError, { status: 401 });

  try {
    const formData = await req.formData();
    const name = cleanName(formData.get('name'));
    const description = String(formData.get('description') || '').trim().slice(0, 240) || null;
    const range = String(formData.get('range') || 'last30');
    const params = parseReportParams({
      source: String(formData.get('source') || ''),
      metric: String(formData.get('metric') || ''),
      groupBy: String(formData.get('groupBy') || ''),
      protein: String(formData.get('protein') || 'all'),
      start: String(formData.get('start') || ''),
      end: String(formData.get('end') || ''),
      range
    });

    await prisma.savedReport.create({
      data: {
        name,
        description,
        source: params.source,
        metric: params.metric,
        groupBy: params.groupBy,
        protein: params.protein,
        range,
        start: params.start,
        end: params.end,
        createdBy: 'Archer'
      }
    });

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
