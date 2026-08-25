import { expect, type Locator, type Page } from '@playwright/test';
import { AddCompanyWizard } from './AddCompanyWizard';

/**
 * Administration → System → All Companies.
 *
 * The grid is server-paginated at 100 rows and sorted by Name ascending by default, so a
 * freshly created company is usually NOT on page 1. Use `sortByNewestFirst()` before
 * asserting that a new record exists.
 */
export class CompaniesListPage {
  static readonly path = '/administration/system/companies';

  readonly heading: Locator;
  readonly addCompanyButton: Locator;
  readonly grid: Locator;
  readonly pagination: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByText('All Companies', { exact: true });
    this.addCompanyButton = page.getByRole('button', { name: /add company/i });
    this.grid = page.getByRole('grid').first();
    this.pagination = page.getByText(/\d+[–-]\d+ of \d+/);
  }

  /**
   * Navigate and wait until the page is interactive. "Add Company" is rendered disabled
   * while the grid loads, so waiting for *enabled* is what actually gates readiness.
   */
  async goto(): Promise<void> {
    await this.page.goto(CompaniesListPage.path);
    await expect(this.addCompanyButton).toBeEnabled({ timeout: 30_000 });
  }

  async openAddCompanyWizard(): Promise<AddCompanyWizard> {
    await this.addCompanyButton.click();
    const wizard = new AddCompanyWizard(this.page);
    await wizard.expectOpenOnCompanyDetails();
    return wizard;
  }

  /** Toggle the "Created On" column to descending so the newest company is the first row. */
  async sortByNewestFirst(): Promise<void> {
    const header = this.grid.getByRole('columnheader', { name: /created on/i });
    // First click sorts ascending (oldest first), second flips to descending.
    await header.click();
    await this.waitForGridSettle();
    await header.click();
    await this.waitForGridSettle();
  }

  /** Assert a company is the most recently created record. */
  async expectNewestCompany(name: string): Promise<void> {
    await this.sortByNewestFirst();
    await expect(this.grid.getByRole('row').nth(1)).toContainText(name);
  }

  /** Assert a company is absent from the newest page — i.e. it was never created. */
  async expectNotAmongNewest(name: string): Promise<void> {
    await this.sortByNewestFirst();
    await expect(this.grid.getByRole('gridcell', { name, exact: true })).toHaveCount(0);
  }

  /** Total record count reported by the pager. */
  async totalCount(): Promise<number> {
    const text = (await this.pagination.first().innerText()).trim();
    const match = text.match(/of\s+(\d+)/);
    expect(match, `could not parse pagination text: "${text}"`).toBeTruthy();
    return Number(match![1]);
  }

  private async waitForGridSettle(): Promise<void> {
    // The grid swaps in a progressbar while re-fetching; wait for it to clear.
    const progress = this.grid.getByRole('progressbar');
    await progress.first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {
      // Fast responses may never render a progressbar at all.
    });
    await expect(this.grid.getByRole('row').nth(1)).toBeVisible();
  }
}
