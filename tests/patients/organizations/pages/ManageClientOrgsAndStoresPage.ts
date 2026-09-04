import { expect, type Locator, type Page } from '@playwright/test';

export interface OrganizationAndStore {
  organization: string;
  store: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Assign/unassign Client Organizations and Stores for a patient account
 * (`/providers/:id/client-org-store`), reached from the Patient Profile Edit screen's
 * Administration side menu ("Manage Client Orgs and Stores").
 */
export class ManageClientOrgsAndStoresPage {
  readonly heading: Locator;
  readonly assignItemsButton: Locator;
  readonly successAlert: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByText('Client Organizations and Stores', { exact: true });
    this.assignItemsButton = page.getByRole('button', { name: 'Assign Items' });
    this.successAlert = page.getByRole('alert').filter({ hasText: 'assigned to Account successfully' });
  }

  /** Opens from the Administration side menu visible on the Patient Profile Edit screen. */
  static async openFromSideMenu(page: Page): Promise<ManageClientOrgsAndStoresPage> {
    await page.getByRole('button', { name: 'Manage Client Orgs and Stores' }).click();
    const orgStorePage = new ManageClientOrgsAndStoresPage(page);
    await orgStorePage.expectOpen();
    return orgStorePage;
  }

  async expectOpen(): Promise<void> {
    await this.page.waitForURL(/\/client-org-store/);
    await expect(this.heading).toBeVisible();
    // Org tree loads asynchronously — wait for the first row so callers never count an empty list.
    await expect(this.page.getByRole('checkbox').first()).toBeVisible();
  }

  // Org names render UPPERCASED server-side, so rows are matched case-insensitively.
  private orgRow(organization: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: new RegExp(`^${escapeRegex(organization)}$`, 'i') });
  }

  private orgCheckbox(organization: string): Locator {
    return this.orgRow(organization).getByRole('checkbox');
  }

  // The row's only other (icon-only) button is the expand/collapse chevron.
  private orgExpandToggle(organization: string): Locator {
    return this.orgRow(organization).getByRole('button').last();
  }

  // Store text runs straight into its subtitle with no separator (e.g. "Location 4Loc 4"), hence the prefix match.
  private storeCheckbox(store: string): Locator {
    return this.page
      .getByRole('listitem')
      .filter({ hasText: new RegExp(`^${escapeRegex(store)}`, 'i') })
      .getByRole('checkbox');
  }

  /** Expands an organization's row so its stores render (and become interactable). */
  async expandOrganization(organization: string): Promise<void> {
    await this.orgExpandToggle(organization).click();
  }

  async selectOrganization(organization: string): Promise<void> {
    await this.orgCheckbox(organization).check();
  }

  /** Requires the organization to already be checked and expanded. */
  async selectStore(store: string): Promise<void> {
    await this.storeCheckbox(store).check();
  }

  async deselectOrganization(organization: string): Promise<void> {
    await this.orgCheckbox(organization).uncheck();
  }

  /** Requires the organization to still be expanded. */
  async deselectStore(store: string): Promise<void> {
    await this.storeCheckbox(store).uncheck();
  }

  /** Persists every currently-checked organization/store pair (and drops unchecked ones) in one call. */
  async assignSelected(): Promise<void> {
    await this.assignItemsButton.click();
    await expect(this.successAlert).toBeVisible();
  }

  async expectOrganizationAssigned(organization: string): Promise<void> {
    await expect(this.orgCheckbox(organization)).toBeChecked();
  }

  async expectStoreAssigned(store: string): Promise<void> {
    await expect(this.storeCheckbox(store)).toBeChecked();
  }

  async expectOrganizationUnassigned(organization: string): Promise<void> {
    await expect(this.orgCheckbox(organization)).not.toBeChecked();
  }

  async expectStoreUnassigned(store: string): Promise<void> {
    await expect(this.storeCheckbox(store)).not.toBeChecked();
  }

  /** Tries organizations in list order until one has an available store; skips already-checked ones. */
  async pickOrganizationWithStore(): Promise<OrganizationAndStore> {
    const orgRows = this.page.getByRole('listitem').filter({ has: this.page.getByRole('button') });
    const count = await orgRows.count();

    for (let i = 0; i < count; i++) {
      const row = orgRows.nth(i);
      if (await row.getByRole('checkbox').isChecked()) continue;

      const organization = ((await row.getByRole('button').first().textContent()) ?? '').trim();
      const expandToggle = row.getByRole('button').last();
      await expandToggle.click();

      // Stores render as sibling rows right after the org's own <li>, not nested inside it.
      const storeRows = row
        .locator('xpath=following-sibling::*[1]')
        .getByRole('listitem')
        .filter({ has: this.page.getByRole('checkbox') });

      if ((await storeRows.count()) > 0) {
        const storeRow = storeRows.first();
        const [fullText, subtitle] = await Promise.all([
          storeRow.textContent(),
          storeRow.getByRole('paragraph').textContent()
        ]);
        const store = (fullText ?? '').slice(0, (fullText ?? '').length - (subtitle ?? '').length).trim();
        return { organization, store };
      }

      await expandToggle.click(); // collapse — no stores here, keep looking
    }

    throw new Error('No organization with an available store was found');
  }
}
