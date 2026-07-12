import { Nav } from './Nav';
import { BillingBanner } from './BillingBanner';
import { requireAuth } from '@/lib/auth';

export async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  return (
    <>
      <Nav user={user} />
      <BillingBanner user={user} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
    </>
  );
}
