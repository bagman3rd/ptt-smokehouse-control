import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /tenant-guard-contract\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report-guard' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'pnpm exec next dev -p 3001',
    url: 'http://127.0.0.1:3001/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, DISABLE_TENANT_GUARD: '0' }
  },
  projects: [{ name: 'guard-chromium', use: { ...devices['Desktop Chrome'] } }]
});
