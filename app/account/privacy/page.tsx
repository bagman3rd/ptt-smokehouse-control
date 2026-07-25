import { Shell } from '@/components/Shell';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { currentRestaurantForUser } from '@/lib/tenant';
import { updateRetentionSetting, requestAccountDeletion } from './actions';
import { DEFAULT_AI_RETENTION_DAYS } from '@/lib/retention';

export const dynamic = 'force-dynamic';

const RETENTION_OPTIONS = [
  { value: 0, label: 'Do not store AI logs' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days (default)' },
  { value: 365, label: '1 year' },
  { value: -1, label: 'Never delete' }
];

export default async function AccountPrivacyPage() {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const setting = await prisma.dataRetentionSetting.findUnique({ where: { restaurantId: restaurant.id } });
  const current = setting?.aiLogRetentionDays ?? DEFAULT_AI_RETENTION_DAYS;

  return (
    <Shell>
      <div id="main-content" className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Privacy &amp; Your Data</h1>
        <p className="mt-2 text-slate-600">{restaurant.name} · Export your data, control retention, or delete your account.</p>
      </div>

      {/* Export */}
      <section className="card p-6">
        <h2 className="text-xl font-black">Export your data</h2>
        <p className="mt-2 text-sm text-slate-600">
          Download a machine-readable copy of your restaurant&rsquo;s data (JSON), including cook plans, end-of-day logs,
          reports, and settings.
        </p>
        <a
          href="/api/account/export"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
        >
          Download my data (JSON)
        </a>
      </section>

      {/* Retention */}
      <section className="card mt-6 p-6">
        <h2 className="text-xl font-black">AI conversation log retention</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose how long we keep your Archer assistant conversation logs. Logs are automatically purged on this schedule.
        </p>
        <form action={updateRetentionSetting} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Keep AI logs for</span>
            <select
              name="aiLogRetentionDays"
              defaultValue={current}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="AI log retention period"
            >
              {RETENTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            Save
          </button>
        </form>
      </section>

      {/* Deletion */}
      <section className="card mt-6 border-2 border-red-200 p-6">
        <h2 className="text-xl font-black text-red-700">Delete account</h2>
        <p className="mt-2 text-sm text-slate-600">
          This permanently deletes your restaurant&rsquo;s data and anonymizes personal information. Legally required
          financial and audit records are retained in anonymized form. We&rsquo;ll email a confirmation link that expires in
          24 hours; deletion only proceeds after you confirm.
        </p>
        <form action={requestAccountDeletion} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border-2 border-red-600 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            Request account deletion
          </button>
        </form>
      </section>
    </Shell>
  );
}
