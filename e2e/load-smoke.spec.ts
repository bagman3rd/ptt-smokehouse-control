import { test, expect, type APIRequestContext } from '@playwright/test';

const adminPassword = process.env.ADMIN_PASSWORD || 'ci-admin-password';

async function login(request: APIRequestContext) {
  const response = await request.post('/api/login', {
    form: { username: 'admin', password: adminPassword },
    maxRedirects: 0
  });
  expect([302, 303, 307, 308]).toContain(response.status());
}

test('50 concurrent authenticated kitchen sessions remain responsive', async ({ request }) => {
  await login(request);
  const started = Date.now();
  const responses = await Promise.all(Array.from({ length: 50 }, () => request.get('/today', { timeout: 20_000 })));
  const elapsed = Date.now() - started;
  const failures = responses.filter((response) => response.status() !== 200);
  expect(failures, `Expected all 50 requests to succeed; ${failures.length} failed`).toHaveLength(0);
  expect(elapsed, `50-request smoke test took ${elapsed}ms`).toBeLessThan(15_000);
});
