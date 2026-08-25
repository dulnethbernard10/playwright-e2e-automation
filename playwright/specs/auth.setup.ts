import { test as setup } from '@playwright/test';
import path from 'path';

export const SESSION_FILE = path.join(__dirname, '../.auth/session.json');

setup('log in to QA portal - ', async ({ page }) => {
  await page.goto('/log-in');
  await page.getByLabel('Email').fill(process.env.PLAYWRIGHT_TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.PLAYWRIGHT_TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/patients/lookup');
  await page.context().storageState({ path: SESSION_FILE });
});
