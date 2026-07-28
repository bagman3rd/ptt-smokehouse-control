// Build 11.0.3 — Web Vitals summary (v3.0 §27.1 evidence).
// Admin-only. Computes p75 per Core Web Vital over a window and evaluates
// against the Google "good" thresholds — the field-data half of the R-PERF
// evidence that Lighthouse lab runs cannot provide (esp. INP).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GOOD: Record<string, number> = { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };

function p75(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.75 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export async function GET(req: NextRequest) {
  const authError = await requireApiRole(['ADMIN']);
  if (authError) return authError;

  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days') || 28)));
  const since = new Date(Date.now() - days * 86400_000);

  const samples = await prisma.webVitalSample.findMany({
    where: { createdAt: { gte: since } },
    select: { metric: true, value: true }
  });

  const byMetric: Record<string, number[]> = {};
  for (const s of samples) (byMetric[s.metric] ||= []).push(s.value);

  const result = Object.keys(GOOD).map((metric) => {
    const vals = byMetric[metric] || [];
    const val = p75(vals);
    const pass = Number.isFinite(val) ? val <= GOOD[metric] : null;
    return {
      metric,
      p75: Number.isFinite(val) ? +val.toFixed(metric === 'CLS' ? 3 : 0) : null,
      threshold: GOOD[metric],
      samples: vals.length,
      pass
    };
  });

  const core = result.filter((r) => ['LCP', 'INP', 'CLS'].includes(r.metric));
  const allCorePass = core.every((r) => r.pass === true);
  const anyCoreData = core.some((r) => (r.samples || 0) > 0);

  return NextResponse.json({
    windowDays: days,
    totalSamples: samples.length,
    metrics: result,
    coreWebVitalsPass: anyCoreData ? allCorePass : null,
    note: anyCoreData
      ? 'p75 of Core Web Vitals evaluated against Google "good" thresholds.'
      : 'No field samples yet — browse the live site to generate Web Vitals data.'
  });
}
