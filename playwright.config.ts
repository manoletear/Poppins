import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 40_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://poppins.tooxs-fperez.workers.dev',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
