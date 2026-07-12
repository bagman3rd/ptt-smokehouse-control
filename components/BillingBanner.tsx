import { currentRestaurantForUser } from '@/lib/tenant';
import { latestSubscription, billingAccess, STATUS_LABELS } from '@/lib/billing';
import type { User } from '@prisma/client';

export async function BillingBanner({ user }: { user: User }) {
  const restaurant = await currentRestaurantForUser(user);
  const subscription = await latestSubscription(restaurant.id).catch(() => null);
  const access = billingAccess(subscription);
  if (!access.warning) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div><strong>Billing status:</strong> {subscription ? STATUS_LABELS[subscription.status] || subscription.status : 'No record'} — {access.warning}</div>
        <a className="font-black underline" href="/billing">Open Billing</a>
      </div>
    </div>
  );
}
