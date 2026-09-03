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
 *
 * Notes on the real DOM (verified against the DEV portal, build 2026-09-01-2):
 *  - Each organization renders as a `<li>` containing a checkbox (no accessible name) and a
 *    button whose accessible name is the organization name UPPERCASED SERVER-SIDE (not a CSS
 *    text-transform) — e.g. an org created as "Organization 5" renders its button label as
 *    "ORGANIZATION 5". Rows are matched case-insensitively rather than upper-casing the name.
 *  - The row's other control is an icon-only chevron button (no accessible name) that expands
 *    or collapses that organization's stores. It's the row's only other button besides the
 *    name button, so `.last()` reliably picks it (`.first()` picks the name button).
 *  - A organization's stores render as sibling rows immediately *after* the organization's own
 *    `<li>` — not nested inside it — wrapped together with it in a common parent, so the
 *    stores are located via `xpath=following-sibling::*[1]` off the organization row rather
 *    than as a descendant of it.
 *  - A store's checkbox is disabled until its organization's own checkbox is checked, and only
 *    interactable once the organization is expanded — MUI's Collapse keeps a collapsed
 *    organization's stores in the DOM but at zero height, which Playwright treats as hidden.
 *  - An organization with no stores expands to a single text-only row reading
 *    "No Locations Available" (no checkbox), which the store-row locator's checkbox filter
 *    naturally excludes.
 *  - A store row's accessible text is the store name immediately followed by its subtitle with
 *    no separator (e.g. "Location 4Loc 4"), so store rows are matched by a name *prefix*
 *    rather than an exact string.
 *  - "Assign Items" persists every currently-checked organization/store pair in one call (not
 *    just newly-changed ones) and raises a MUI Snackbar alert confirming success; the same
 *    message also comes back in the `assignClientOrgsStoresToAccount` mutation response, so the
 *    alert is a reliable, immediate success signal — no networkidle or fixed wait needed.
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
    // The organization tree loads asynchronously after the heading renders — wait for its
    // first row so callers (e.g. pickOrganizationWithStore()) never count an empty list.
    await expect(this.page.getByRole('checkbox').first()).toBeVisible();
  }

  private orgRow(organization: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: new RegExp(`^${escapeRegex(organization)}$`, 'i') });
  }

  private orgCheckbox(organization: string): Locator {
    return this.orgRow(organization).getByRole('checkbox');
  }

  private orgExpandToggle(organization: string): Locator {
    return this.orgRow(organization).getByRole('button').last();
  }

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

  /** Requires the organization to already be checked and expanded — see the class-level notes. */
  async selectStore(store: string): Promise<void> {
    await this.storeCheckbox(store).check();
  }

  async deselectOrganization(organization: string): Promise<void> {
    await this.orgCheckbox(organization).uncheck();
  }

  /** Requires the organization to still be expanded — see the class-level notes. */
  async deselectStore(store: string): Promise<void> {
    await this.storeCheckbox(store).uncheck();
  }

  /**
   * Persists every currently-checked organization/store pair — and drops any that were
   * unchecked — in one call, then waits for the success alert.
   */
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

  /**
   * Expands organizations in list order until one has at least one available store, skipping
   * any organization whose checkbox is already checked (e.g. the one auto-assigned when the
   * patient was created). Returns that organization and one of its stores, picked but not yet
   * checked — mirrors AddPatientModal.pickOrganizationAndStore(), since which organizations
   * have stores varies by environment and must never be hardcoded.
   */
  async pickOrganizationWithStore(): Promise<OrganizationAndStore> {
    const orgRows = this.page.getByRole('listitem').filter({ has: this.page.getByRole('button') });
    const count = await orgRows.count();

    for (let i = 0; i < count; i++) {
      const row = orgRows.nth(i);
      if (await row.getByRole('checkbox').isChecked()) continue;

      const organization = ((await row.getByRole('button').first().textContent()) ?? '').trim();
      const expandToggle = row.getByRole('button').last();
      await expandToggle.click();

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

      await expandToggle.click(); // collapse — this organization has no stores, keep looking
    }

    throw new Error('No organization with an available store was found');
  }
}
