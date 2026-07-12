import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { currentRestaurantForUser } from '@/lib/tenant';
import { PosImportPreviewForm } from './PosImportPreviewForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PosImportPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  return <Shell>
    <div className="mb-6">
      <h1 className="text-3xl font-black tracking-tight">POS / Sales Import</h1>
      <p className="mt-2 text-slate-600">{restaurant.name} · Build 4.3.2 adds a first POS-ready CSV path. Toast API should come later; this closes the first onboarding friction point without locking us to one POS vendor.</p>
    </div>
    <section className="card p-5">
      <h2 className="text-xl font-black">Sales History CSV</h2>
      <p className="mt-2 text-sm text-slate-600">Paste rows from Toast/Square/Clover or a spreadsheet. Columns: <strong>date,totalSales,bbqSales</strong>. The import updates operating curves and creates draft sales-history EOD records.</p>
      <PosImportPreviewForm />
    </section>
    <section className="mt-6 card p-5">
      <h2 className="text-xl font-black">Toast API Roadmap</h2>
      <p className="mt-2 text-slate-600">Next commercial step: OAuth connection to Toast, menu item mapping to proteins, and nightly item-sales import. Until then, CSV import provides a sellable bridge.</p>
    </section>
  </Shell>;
}
