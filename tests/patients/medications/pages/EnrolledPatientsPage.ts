import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Care Management → Patients, "Enrolled" tab (selected by default). Medications/Triage is
 * only exercised against RPM-enrolled patients, and which patients are enrolled varies by
 * environment, so this picks one dynamically rather than hardcoding a patient name.
 *
 * Confirmed live: this grid is both MUI-virtualized (only ~10-15 of each page's 50 rows are
 * ever actually in the DOM at once) and paginated in its own right (330 enrolled patients
 * across ~7 pages of 50), with no "jump to page" control — only prev/next. Always opening the
 * first readings-capable row therefore pinned every single test run, for this suite's entire
 * history, to the exact same one patient, whose Triage Medications grid had grown to 268
 * unverified rows by the time this was caught — well past what that grid's own 100-row page
 * cap and date-only sort can reliably surface a fresh row within (see TriageMedicationsPage).
 * `openRandomReadingsCapablePatient()` picks a random page (via repeated "next" clicks from
 * page 1, since there's no direct jump) and a random readings-capable row on it, spreading
 * each run's test data across dozens of patients instead of concentrating it on one.
 *
 * This grid is properly owned by an RPM domain, but Medications (under patients/) is
 * currently its only consumer — per the "promote to support/ only on the second consumer"
 * rule, it stays here until e.g. a future tests/rpm/ spec needs it too.
 */
export class EnrolledPatientsPage {
  static readonly path = '/care-management/patients';
  private static readonly PAGE_SIZE = 50;

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(EnrolledPatientsPage.path);
    await expect(this.page.getByRole('tab', { name: 'Enrolled', selected: true })).toBeVisible();
  }

  private grid(): Locator {
    return this.page.getByRole('grid').first();
  }

  /**
   * Every currently-rendered readings-capable row link — filtered by a plain `href` CSS
   * attribute selector rather than reading each link's `href` one at a time via `nth(i)` in a
   * loop, which raced the grid's own virtualization (only ~10-15 of each page's 50 rows are
   * ever actually in the DOM at once, and MUI adds/removes them as it settles): confirmed
   * directly as `getByRole('link').nth(7)` timing out mid-loop because that index had already
   * been recycled out from under it. A single CSS-filtered locator queries the current DOM in
   * one shot instead.
   */
  private capableLinks(): Locator {
    return this.grid().locator('a[href*="/rpm/readings"]');
  }

  /** Waits for the grid's rows to actually render — see the class-level note on virtualization. */
  private async waitForRows(): Promise<void> {
    await expect(this.grid().getByRole('link').first()).toBeVisible({ timeout: 30_000 });
  }

  /** Reads the grid's own "1–50 of 330" footer to work out how many pages that implies. */
  private async pageCount(): Promise<number> {
    const footerText = (await this.page.getByText(/\d+[–-]\d+ of \d+/).first().textContent()) ?? '';
    const total = Number(footerText.match(/of (\d+)/)?.[1] ?? EnrolledPatientsPage.PAGE_SIZE);
    return Math.max(1, Math.ceil(total / EnrolledPatientsPage.PAGE_SIZE));
  }

  /** Navigates fresh to page 1, then clicks "next" `pageIndex` times (0 = stay on page 1). */
  private async openPage(pageIndex: number): Promise<void> {
    await this.goto();
    for (let i = 0; i < pageIndex; i++) {
      await this.page.getByRole('button', { name: 'Go to next page' }).click();
      await this.waitForRows();
    }
  }

  /**
   * Opens a randomly-chosen readings-capable (fully enrolled) patient from a randomly-chosen
   * page — see the class-level note on why concentrating every run's test data on one patient
   * became a real problem. Falls back to page 1's first readings-capable row (or failing that,
   * its very first row) if the randomly-picked page happens to have none.
   */
  async openRandomReadingsCapablePatient(): Promise<void> {
    await this.goto();
    const totalPages = await this.pageCount();
    await this.openPage(Math.floor(Math.random() * totalPages));
    await this.waitForRows();

    let capable = this.capableLinks();
    let count = await capable.count();
    if (count === 0) {
      await this.openPage(0);
      await this.waitForRows();
      capable = this.capableLinks();
      count = await capable.count();
    }

    if (count > 0) {
      await capable.nth(Math.floor(Math.random() * count)).click();
    } else {
      await this.grid().getByRole('link').first().click();
    }
  }
}
