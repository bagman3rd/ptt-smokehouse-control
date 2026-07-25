// Build 10.0.0 — cost & usage tracking for unit economics at 1,000 restaurants.
//
// Two jobs:
//   1. Record spend per service (Stripe fees, Archer tokens, SMS, email, DB).
//   2. Enforce AI cost caps: per-conversation token ceiling + per-restaurant
//      daily spend cap with graceful handoff to human support.

import { prisma } from '@/lib/prisma';

// Approximate blended price per 1M tokens (USD cents). Tune to actual model pricing.
const AI_PROMPT_CENTS_PER_MTOK = Number(process.env.AI_PROMPT_CENTS_PER_MTOK || 300); // $3.00
const AI_COMPLETION_CENTS_PER_MTOK = Number(process.env.AI_COMPLETION_CENTS_PER_MTOK || 1500); // $15.00

// Guardrails (overridable by env).
export const AI_MAX_TOKENS_PER_CONVERSATION = Number(process.env.AI_MAX_TOKENS_PER_CONVERSATION || 8000);
export const AI_DAILY_CENTS_CAP_PER_RESTAURANT = Number(process.env.AI_DAILY_CENTS_CAP || 200); // $2.00/day
export const AI_DAILY_ALERT_CENTS = Number(process.env.AI_DAILY_ALERT_CENTS || 1000); // $10.00/day account-wide

export function estimateAiCents(promptTokens: number, completionTokens: number): number {
  const prompt = (promptTokens / 1_000_000) * AI_PROMPT_CENTS_PER_MTOK;
  const completion = (completionTokens / 1_000_000) * AI_COMPLETION_CENTS_PER_MTOK;
  return Math.ceil(prompt + completion);
}

function dateOnlyUtc(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Record a generic cost event. amountCents is authoritative (integer). */
export async function recordCost(params: {
  service:
    | 'STRIPE'
    | 'ARCHER_AI'
    | 'DATABASE'
    | 'STORAGE'
    | 'SMS'
    | 'EMAIL'
    | 'HOSTING'
    | 'OTHER';
  amountCents: number;
  quantity?: number;
  unit?: string;
  restaurantId?: string | null;
  notes?: string;
}) {
  return prisma.costEvent.create({
    data: {
      service: params.service,
      amountCents: Math.max(0, Math.round(params.amountCents)),
      quantity: params.quantity ?? 0,
      unit: params.unit,
      restaurantId: params.restaurantId ?? null,
      notes: params.notes
    }
  });
}

/** Record AI usage for a conversation turn and roll it up into the daily aggregate. */
export async function recordAiUsage(params: {
  restaurantId: string;
  promptTokens: number;
  completionTokens: number;
  newConversation?: boolean;
}) {
  const cents = estimateAiCents(params.promptTokens, params.completionTokens);
  const usageDate = dateOnlyUtc();

  await prisma.aiUsageDaily.upsert({
    where: { restaurantId_usageDate: { restaurantId: params.restaurantId, usageDate } },
    update: {
      conversations: { increment: params.newConversation ? 1 : 0 },
      promptTokens: { increment: params.promptTokens },
      completionTokens: { increment: params.completionTokens },
      estimatedCents: { increment: cents }
    },
    create: {
      restaurantId: params.restaurantId,
      usageDate,
      conversations: params.newConversation ? 1 : 0,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      estimatedCents: cents
    }
  });

  await recordCost({
    service: 'ARCHER_AI',
    amountCents: cents,
    quantity: params.promptTokens + params.completionTokens,
    unit: 'tokens',
    restaurantId: params.restaurantId
  });

  return cents;
}

/** Check whether a restaurant is under its daily AI spend cap. */
export async function aiSpendAllowed(restaurantId: string): Promise<{
  allowed: boolean;
  spentCents: number;
  capCents: number;
}> {
  const usageDate = dateOnlyUtc();
  const row = await prisma.aiUsageDaily.findUnique({
    where: { restaurantId_usageDate: { restaurantId, usageDate } }
  });
  const spent = row?.estimatedCents ?? 0;
  return {
    allowed: spent < AI_DAILY_CENTS_CAP_PER_RESTAURANT,
    spentCents: spent,
    capCents: AI_DAILY_CENTS_CAP_PER_RESTAURANT
  };
}

/** Account-wide spend for a day, used by the cost-alert digest. */
export async function accountAiSpendToday(): Promise<number> {
  const usageDate = dateOnlyUtc();
  const agg = await prisma.aiUsageDaily.aggregate({
    where: { usageDate },
    _sum: { estimatedCents: true }
  });
  return agg._sum.estimatedCents ?? 0;
}

/** Monthly cost breakdown by service (for the admin cost dashboard). */
export async function monthlyCostBreakdown(monthsBack = 0): Promise<
  Array<{ service: string; cents: number }>
> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack + 1, 1));
  const rows = await prisma.costEvent.groupBy({
    by: ['service'],
    where: { occurredOn: { gte: start, lt: end } },
    _sum: { amountCents: true }
  });
  return rows.map((r) => ({ service: String(r.service), cents: r._sum.amountCents ?? 0 }));
}
