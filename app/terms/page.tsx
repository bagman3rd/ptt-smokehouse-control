import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Smokehouse Control',
  robots: { index: true, follow: true }
};

const COMPANY = process.env.NEXT_PUBLIC_APP_NAME || 'Smokehouse Control';
const ADDRESS = process.env.COMPANY_POSTAL_ADDRESS || 'Smokehouse Control, 937 N Central St, Knoxville, TN 37917';
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com';
const EFFECTIVE = 'August 1, 2026';

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Effective {EFFECTIVE}</p>
      <section className="card mt-6 p-6 space-y-5 text-sm leading-6 text-slate-700">
        <div>
          <h2 className="font-bold text-slate-900">1. The service</h2>
          <p>{COMPANY} provides forecasting, cook-plan, end-of-day logging, reporting, and AI-assistant tools for BBQ restaurant operations. Contact: {SUPPORT}, {ADDRESS}.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">2. Accounts</h2>
          <p>Owners and Admins are responsible for managing users, roles, and account security for their restaurant, and for keeping credentials confidential.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">3. Free trial &amp; billing</h2>
          <p>New accounts include a 14-day free trial. After the trial, the service is $99 per restaurant per month unless a different written plan applies. Subscriptions renew automatically until canceled. You may cancel any time; access continues through the paid period. Fees are non-refundable except where required by law.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">4. Customer data &amp; accuracy</h2>
          <p>Each restaurant is responsible for the accuracy of the sales, production, waste, user, and configuration data it enters. You retain ownership of your data and may export it.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">5. Decision-support only</h2>
          <p>Forecasts and recommendations are decision-support tools. Operators remain solely responsible for final production, food-safety, labor, and inventory decisions.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">6. Communications</h2>
          <p>By providing a phone number and opting in, you consent to receive SMS as described in the Privacy Policy; reply STOP to opt out. By creating an account you agree to receive transactional email necessary to operate the service.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">7. Acceptable use</h2>
          <p>You agree not to misuse the service, attempt to access other tenants&rsquo; data, probe or bypass security, or use the AI assistant to extract confidential configuration or generate unauthorized commitments.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">8. Availability</h2>
          <p>The service is provided on a commercially reasonable basis and may be interrupted by maintenance, hosting outages, or network issues. We target high availability but do not guarantee uninterrupted service unless a separate SLA applies.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">9. Warranty &amp; liability</h2>
          <p>The service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted by law, {COMPANY}&rsquo;s aggregate liability is limited to the fees you paid in the 12 months before the claim. We are not liable for indirect or consequential damages.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">10. Termination</h2>
          <p>You may cancel any time. We may suspend or terminate accounts that violate these terms or create risk to the service or other customers. On termination you may export your data for 30 days.</p>
        </div>
        <div>
          <h2 className="font-bold text-slate-900">11. Changes</h2>
          <p>We may update these terms; material changes will be communicated by email and posted here with a new effective date.</p>
        </div>
      </section>
      <p className="mt-4 text-xs text-slate-400">These terms are provided for commercial use. Have local counsel review before relying on them for a specific jurisdiction.</p>
    </main>
  );
}
