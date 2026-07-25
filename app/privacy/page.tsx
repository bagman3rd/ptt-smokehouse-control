import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Smokehouse Control',
  robots: { index: true, follow: true }
};

const COMPANY = process.env.NEXT_PUBLIC_APP_NAME || 'Smokehouse Control';
const ADDRESS = process.env.COMPANY_POSTAL_ADDRESS || 'Smokehouse Control, 937 N Central St, Knoxville, TN 37917';
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com';
const EFFECTIVE = 'August 1, 2026';

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Effective {EFFECTIVE}</p>
      <section className="card mt-6 p-6 space-y-5 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="font-bold text-slate-900">1. Who we are</h2>
          <p>{COMPANY} provides BBQ production-planning software to restaurants. Our mailing address is {ADDRESS}. Questions: {SUPPORT}.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">2. Data we collect</h2>
          <p>Account details (name, email, phone), restaurant profile and configuration, cook plans, end-of-day and waste logs, forecasts and reports, audit events, support messages, billing metadata held by our payment processor, optional imported point-of-sale sales history, and AI assistant conversation logs.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">3. How we use it</h2>
          <p>To operate the service, generate forecasts and reports, provide support, secure accounts, send account and (with your consent) marketing communications, and improve the product. We do not sell personal data.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">4. Communications &amp; consent</h2>
          <p><strong>Email.</strong> Account and billing emails are transactional and necessary to provide the service. Marketing email is sent only with your consent; every marketing email includes an unsubscribe link honored promptly.</p>
          <p><strong>SMS.</strong> We send SMS only to numbers that have opted in. Reply STOP to unsubscribe at any time or START to re-subscribe; reply HELP for help. Message and data rates may apply. We do not send marketing SMS outside 8:00 AM – 9:00 PM in your local time zone.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">5. Tenant isolation</h2>
          <p>Restaurant data is scoped to your organization. Users only reach data through active memberships and roles. Cross-tenant access is blocked at the database layer.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">6. Data retention</h2>
          <p>Active customer records are retained while your account is open. AI conversation logs are retained for the period you choose in Settings (default 90 days). Notification logs are retained up to 12 months. Consent and audit records are retained at least 4 years to meet legal obligations. Financial records follow our processor&rsquo;s schedule.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">7. Your rights</h2>
          <p>You may request a copy of your data (export) or deletion of your account from Settings, or by emailing {SUPPORT}. Deletion anonymizes personal identifiers while preserving legally required financial and audit records. EU/UK users have rights under GDPR/UK GDPR, including access, correction, erasure, and portability.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">8. Security</h2>
          <p>Passwords are hashed, sessions are versioned and signed, access is role-based, optional two-factor authentication is available, and security events are audit logged. Payment card data is handled entirely by our PCI-compliant processor and never touches our servers.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">9. Service providers</h2>
          <p>We share limited operational data with vendors that host our infrastructure, process payments (Stripe), send email and SMS (e.g. SendGrid, Twilio), power the AI assistant, and monitor errors. Each processes data only to provide its service.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">10. Cookies</h2>
          <p>We use essential cookies for login and security, and optional analytics cookies with your consent. Manage choices in the cookie banner.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">11. Changes</h2>
          <p>We will post updates here with a new effective date. Material changes affecting your rights will be communicated by email.</p>
        </div>
      </section>
      <p className="mt-4 text-xs text-slate-400">This policy is provided for commercial use. Have local counsel review before relying on it for a specific jurisdiction.</p>
    </main>
  );
}
