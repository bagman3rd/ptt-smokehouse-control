import { test, expect } from '@playwright/test';

// Build 11.0.0 — automated WCAG 2.1 AA scanning with axe-core (v3.0 §25).
// Loads axe-core from CDN at runtime (no build-time dependency required) and
// asserts zero critical/serious violations on key public and authenticated
// screens. Serious/critical are release-blocking; moderate/minor are reported.

const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
const password = process.env.ADMIN_PASSWORD || 'ci-admin-password';

async function runAxe(page: import('@playwright/test').Page) {
  await page.addScriptTag({ url: AXE_CDN });
  // @ts-expect-error axe is injected globally
  return page.evaluate(async () => await window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
  }));
}

function blocking(results: any) {
  return (results.violations || []).filter((v: any) => v.impact === 'critical' || v.impact === 'serious');
}

for (const path of ['/login', '/signup', '/privacy', '/terms']) {
  test(`a11y: ${path} has no critical/serious WCAG violations`, async ({ page }) => {
    await page.goto(path);
    const results = await runAxe(page);
    const serious = blocking(results);
    if (serious.length) {
      console.log(`AXE ${path}:`, JSON.stringify(serious.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(serious, `critical/serious a11y violations on ${path}`).toEqual([]);
  });
}

test('a11y: authenticated dashboard has no critical/serious WCAG violations', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username or Email').fill('admin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/today/);
  const results = await runAxe(page);
  const serious = blocking(results);
  if (serious.length) {
    console.log('AXE /today:', JSON.stringify(serious.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
  }
  expect(serious, 'critical/serious a11y violations on /today').toEqual([]);
});
