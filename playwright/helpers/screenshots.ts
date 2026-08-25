import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const SCREENSHOTS_BASE = path.join(__dirname, '../screenshots');

export function screenshotDir(ticketId: string) {
  const dir = path.join(SCREENSHOTS_BASE, ticketId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function shot(page: Page, dir: string, name: string) {
  return page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
}
