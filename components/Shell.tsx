import { Nav } from './Nav';
import { requireAuth } from '@/lib/auth';

export function Shell({ children }: { children: React.ReactNode }) {
  requireAuth();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
    </>
  );
}
