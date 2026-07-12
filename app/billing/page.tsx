import { Shell } from '@/components/Shell';
import { requireRole, currentUser } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { ensureTrialSubscription, latestSubscription, billingAccess, STATUS_LABELS, PLAN_LABELS, planPriceCopy, customerPortalUrl } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  await requireRole(['ADMIN', 'OWNER']);
  const user = await currentUser();
  if (!user) return null;
  const restaurant = await currentRestaurantForUser(user);
  await ensureTrialSubscription(restaurant.id);
  const subscription = await latestSubscription(restaurant.id);
  const access = billingAccess(subscription);
  const monthlyConfigured = Boolean(process.env.STRIPE_MONTHLY_PAYMENT_LINK || process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL);
  const annualConfigured = Boolean(process.env.STRIPE_ANNUAL_PAYMENT_LINK || process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL);
  const portalConfigured = Boolean(customerPortalUrl());
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">Billing</h1>
      <p className="mt-2 text-slate-600">Manage subscription status, hosted checkout, trial status, customer portal access, and data export access.</p>
    </div>

    <section className="card p-5">
      <h2 className="text-xl font-black">Subscription status</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black uppercase text-slate-500">Restaurant</div><div className="mt-1 font-black">{restaurant.name}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black uppercase text-slate-500">Plan</div><div className="mt-1 font-black">{subscription ? PLAN_LABELS[subscription.plan] || subscription.plan : 'None'}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black uppercase text-slate-500">Status</div><div className="mt-1 font-black">{subscription ? STATUS_LABELS[subscription.status] || subscription.status : 'No record'}</div></div>
        <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-black uppercase text-slate-500">Trial Ends</div><div className="mt-1 font-black">{subscription?.trialEndsAt ? subscription.trialEndsAt.toLocaleDateString() : '—'}</div></div>
      </div>
      {access.warning ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{access.warning}</p> : <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Billing is active for normal operations.</p>}
    </section>

    <section className="mt-6 grid gap-4 md:grid-cols-2">
      {(['MONTHLY', 'ANNUAL'] as const).map((plan) => <div key={plan} className="card p-5">
        <h2 className="text-xl font-black">{PLAN_LABELS[plan]}</h2>
        <p className="mt-2 text-sm text-slate-600">{planPriceCopy(plan)}</p>
        <form action="/api/billing/checkout" method="POST" className="mt-4">
          <input type="hidden" name="plan" value={plan} />
          <button className="btn-primary" type="submit">Start {plan.toLowerCase()} checkout</button>
        </form>
        {plan === 'MONTHLY' && !monthlyConfigured ? <p className="mt-3 text-sm font-bold text-amber-700">Set STRIPE_MONTHLY_PAYMENT_LINK or STRIPE_PAYMENT_LINK in Render.</p> : null}
        {plan === 'ANNUAL' && !annualConfigured ? <p className="mt-3 text-sm font-bold text-amber-700">Set STRIPE_ANNUAL_PAYMENT_LINK or STRIPE_PAYMENT_LINK in Render.</p> : null}
      </div>)}
    </section>

    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Manage payment method / cancellation</h2>
      <p className="mt-2 text-sm text-slate-600">Use Stripe customer portal for card updates, cancellation, and invoices. If the portal URL is not configured yet, contact support.</p>
      <form action="/api/billing/portal" method="POST" className="mt-4"><button className="btn-secondary" type="submit">Open Stripe customer portal</button></form>
      {!portalConfigured ? <p className="mt-3 text-sm font-bold text-amber-700">Set STRIPE_CUSTOMER_PORTAL_URL or STRIPE_PORTAL_URL in Render before self-service cancellation.</p> : null}
    </section>
  </Shell>;
}
