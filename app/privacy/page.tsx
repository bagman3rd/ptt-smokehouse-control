export default function PrivacyPage() {
  return <main className="mx-auto max-w-4xl px-4 py-10">
    <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
    <p className="mt-3 text-slate-600">Build 4.4.0 starter privacy policy for pilot/commercial review. Have local counsel review before selling to unrelated restaurants.</p>
    <section className="card mt-6 p-6 space-y-4 text-sm leading-6 text-slate-700">
      <p><strong>Data collected.</strong> The app stores restaurant profile data, user accounts, cook plans, end-of-day logs, waste data, reports, audit events, support/admin metadata, and optional imported sales-history data.</p>
      <p><strong>Use of data.</strong> Data is used to operate the service, generate forecasts/reports, provide support, improve recommendations, and maintain security/audit history.</p>
      <p><strong>Tenant isolation.</strong> Restaurant data is scoped by tenant. Users only receive access through active restaurant memberships and roles.</p>
      <p><strong>Exports and deletion.</strong> Admin/Owner users may export tenant data. Deactivation/deletion requests should be routed through support until self-service deletion is finalized.</p>
      <p><strong>Security.</strong> Passwords are hashed, sessions are versioned, access is role-based, and security events are audit logged.</p>
      <p><strong>Vendors.</strong> Hosting, database, email, billing, and monitoring vendors may process operational metadata needed to provide the service.</p>
    </section>
  </main>;
}
