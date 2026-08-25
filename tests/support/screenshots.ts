import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { EVIDENCE_ROOT } from './paths';

/** Directory for a ticket's screenshot evidence, e.g. evidence/DEMO-52/. */
export function screenshotDir(ticket: string): string {
  const dir = path.join(EVIDENCE_ROOT, ticket);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Capture a named, numbered screenshot into a ticket directory.
 * Evidence capture must never fail a test, so errors are swallowed.
 */
export async function shot(page: Page, dir: string, name: string): Promise<void> {
  try {
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
  } catch {
    // Ignore — a screenshot is diagnostic only.
  }
}
