import { verifyToken } from '@/lib/signedToken';
import { confirmAccountDeletion } from '../actions';

export const dynamic = 'force-dynamic';

export default function ConfirmDeletePage({
  searchParams
}: {
  searchParams: { token?: string; done?: string };
}) {
  const token = searchParams.token || '';
  const done = searchParams.done === '1';
  const payload = verifyToken(token);
  const valid = payload && payload.purpose === 'delete_account';

  return (
    <main id="main-content" className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-8">
        {done ? (
          <>
            <h1 className="text-2xl font-black text-slate-900">Account deleted</h1>
            <p className="mt-3 text-sm text-slate-600">
              Your restaurant data has been deleted and personal information anonymized. Legally required financial and
              audit records are retained in anonymized form. You have been signed out.
            </p>
            <a href="/login" className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              Return to login
            </a>
          </>
        ) : valid ? (
          <>
            <h1 className="text-2xl font-black text-red-700">Confirm account deletion</h1>
            <p className="mt-3 text-sm text-slate-600">
              This permanently deletes your restaurant&rsquo;s data and anonymizes personal information. This cannot be
              undone.
            </p>
            <form action={confirmAccountDeletion} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-lg border-2 border-red-600 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                Yes, permanently delete my account
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-slate-900">Link expired</h1>
            <p className="mt-3 text-sm text-slate-600">
              This confirmation link is invalid or has expired (links are valid for 24 hours). Request deletion again
              from your Privacy &amp; Data settings.
            </p>
            <a
              href="/account/privacy"
              className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Back to Privacy &amp; Data
            </a>
          </>
        )}
      </div>
    </main>
  );
}
