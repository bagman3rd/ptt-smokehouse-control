import { test, expect, type APIRequestContext } from '@playwright/test';

const adminPassword = process.env.ADMIN_PASSWORD || 'ci-admin-password';
const concurrency = Number(process.env.LOAD_SMOKE_CONCURRENCY || 200);

async function login(request: APIRequestContext) {
  const response = await request.post('/api/login', { form: { username: 'admin', password: adminPassword, otp: process.env.CI_ADMIN_OTP || '' }, maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(response.status());
}

test(`${concurrency} concurrent authenticated kitchen requests remain responsive`, async ({ request }) => {
  await login(request);
  const endpoints = ['/today', '/end-of-day', '/cook-plan', '/reports'];
  const started = Date.now();
  const responses = await Promise.all(Array.from({ length: concurrency }, (_, index) => request.get(endpoints[index % endpoints.length], { timeout: 30_000 })));
  const elapsed = Date.now() - started;
  const failures = responses.filter((response) => response.status() !== 200);
  expect(failures, `Expected all ${concurrency} requests to succeed; ${failures.length} failed`).toHaveLength(0);
  expect(elapsed, `${concurrency}-request smoke test took ${elapsed}ms`).toBeLessThan(30_000);
});
