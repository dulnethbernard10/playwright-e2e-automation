import { expect, test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { STORAGE_STATE } from './support/paths';

setup('authenticate against the QA portal', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;

  expect(
    email,
    'PLAYWRIGHT_TEST_EMAIL is not set — copy .env.example to .env and fill it in'
  ).toBeTruthy();
  expect(
    password,
    'PLAYWRIGHT_TEST_PASSWORD is not set — copy .env.example to .env and fill it in'
  ).toBeTruthy();

  await page.goto('/log-in');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Login' }).click();

  // The post-login landing route varies by account/role (e.g. /care-management/patients vs
  // /patients/lookup), so assert on authenticated chrome rather than a specific URL.
  await page.waitForURL((url) => !url.pathname.includes('/log-in'), { timeout: 45_000 });
  await expect(page.getByRole('textbox', { name: 'Search Patients' })).toBeVisible();

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
