const fs = await import('node:fs');
const required = ['app/billing/page.tsx','app/api/billing/checkout/route.ts','app/terms/page.tsx','app/privacy/page.tsx','app/help/page.tsx'];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}
console.log('Billing/legal/support route check completed.');
