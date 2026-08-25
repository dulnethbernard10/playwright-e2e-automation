import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { STORAGE_STATE } from './tests/support/paths';

// .env is the canonical local file; .env.playwright is kept for backwards compatibility.
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.playwright' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://portal.qa.truentity.net',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 20_000,
    navigationTimeout: 45_000
  },
  projects: [
    {
      // Logs in once and writes tests/.auth/session.json.
      name: 'setup',
      testMatch: /auth\.setup\.ts/
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE }
    }
  ]
});
