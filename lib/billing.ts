import type { Restaurant, Subscription } from '@prisma/client';
import { prisma } from '@/lib/prisma';


export type BillingMode = 'MANUAL_INVOICE' | 'STRIPE';

export function billingMode(): BillingMode {
  return process.env.BILLING_MODE === 'STRIPE' ? 'STRIPE' : 'MANUAL_INVOICE';
}

export function manualInvoiceEmail() {
  return process.env.BILLING_CONTACT_EMAIL || supportEmail();
}

export const PLAN_LABELS: Record<string, string> = {
  PILOT: 'Pilot Trial',
  MONTHLY: 'Monthly Smokehouse Control',
  ANNUAL: 'Annual Smokehouse Control'
};

export const STATUS_LABELS: Record<string, string> = {
  TRIALING: 'Trialing',
  ACTIVE: 'Active',
  PAST_DUE: 'Past Due',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
  READ_EXPORT_ONLY: 'Read / Export Only'
};

export function trialEndDate(days = 14) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function ensureTrialSubscription(restaurantId: string) {
  const existing = await prisma.subscription.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
  if (existing) return existing;
  return prisma.subscription.create({
    data: {
      restaurantId,
      plan: 'PILOT',
      status: 'TRIALING',
      trialEndsAt: trialEndDate(14)
    }
  });
}

export async function latestSubscription(restaurantId: string) {
  return prisma.subscription.findFirst({ where: { restaurantId }, orderBy: { createdAt: 'desc' } });
}

export function billingAccess(subscription: Subscription | null) {
  if (!subscription) return { level: 'TRIALING', canOperate: true, readOnly: false, warning: 'No subscription record yet. A trial will be created during setup.' };
  if (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING') return { level: subscription.status, canOperate: true, readOnly: false, warning: '' };
  if (subscription.status === 'PAST_DUE') return { level: 'PAST_DUE', canOperate: true, readOnly: false, warning: 'Payment is past due. Please update billing to avoid read-only access.' };
  return { level: subscription.status, canOperate: false, readOnly: true, warning: 'Subscription is not active. Access is limited to read-only/export/billing until resolved.' };
}

export function checkoutUrlForPlan(plan: string) {
  const normalized = plan.toUpperCase();
  if (normalized === 'ANNUAL') return process.env.STRIPE_ANNUAL_PAYMENT_LINK || process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL || '';
  if (normalized === 'MONTHLY') return process.env.STRIPE_MONTHLY_PAYMENT_LINK || process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL || '';
  return process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL || '';
}

export function customerPortalUrl() {
  return process.env.STRIPE_CUSTOMER_PORTAL_URL || process.env.STRIPE_PORTAL_URL || '';
}

export function supportEmail() {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com';
}

export function planPriceCopy(plan: string) {
  if (plan === 'ANNUAL') return 'Annual plan - best for committed operators';
  if (plan === 'MONTHLY') return 'Monthly plan - flexible subscription';
  return 'Pilot trial - use for demos and controlled pilots';
}
