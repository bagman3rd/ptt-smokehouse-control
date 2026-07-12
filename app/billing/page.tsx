import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';

export default async function BillingPage() {
  await requireRole(['ADMIN', 'OWNER']);
  const configured = Boolean(process.env.STRIPE_PAYMENT_LINK || process.env.STRIPE_CHECKOUT_URL);
  return <Shell>
    <div className="mb-6"><h1 className="text-3xl font-black tracking-tight">Billing</h1><p className="mt-2 text-slate-600">Build 4.6.0 adds a lightweight Stripe-payment-link path for trial/subscription onboarding. Use Stripe-hosted checkout until full API billing is needed.</p></div>
    <section className="card p-5">
      <h2 className="text-xl font-black">Subscription status</h2>
      <p className="mt-2 text-sm text-slate-600">Stripe configured: <strong>{configured ? 'Yes' : 'No'}</strong></p>
      <p className="mt-1 text-sm text-slate-600">Recommended setup: 14-day trial, monthly subscription, cancellation through Stripe customer portal or support.</p>
      <form action="/api/billing/checkout" method="POST" className="mt-4"><button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white" type="submit">Start Stripe checkout</button></form>
      {!configured ? <p className="mt-3 text-sm font-bold text-amber-700">Set STRIPE_PAYMENT_LINK or STRIPE_CHECKOUT_URL in Render before using this with paying customers.</p> : null}
    </section>
  </Shell>;
}
