import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Patients Management → Patients Lookup ("Patient Lookup" tab).
 *
 * Promoted to support/ because two domains need it: adding a new patient
 * (patients/onboarding) and locating an existing one to act on (patients/notes). Anything
 * feature-specific — like what the "Add Patient" button opens — stays with the feature
 * that owns it; this class only knows how to search and open a patient's context.
 *
 * Unlike the companies grid, this list isn't paginated in a way that hides recent records
 * behind sort order — searching by First Name / Last Name is enough to confirm a patient
 * exists.
 */
export class PatientsLookupPage {
  static readonly path = '/patients/lookup';

  readonly addPatientButton: Locator;
  readonly firstNameFilter: Locator;
  readonly lastNameFilter: Locator;
  readonly lookupButton: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.addPatientButton = page.getByRole('button', { name: 'Add Patient' });
    this.firstNameFilter = page.getByRole('textbox', { name: 'First Name', exact: true });
    this.lastNameFilter = page.getByRole('textbox', { name: 'Last Name', exact: true });
    this.lookupButton = page.getByRole('button', { name: 'Lookup' });
    this.grid = page.getByRole('grid').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(PatientsLookupPage.path);
    await expect(this.addPatientButton).toBeEnabled({ timeout: 30_000 });
  }

  /** Search the Patient Lookup tab by first/last name. */
  async searchByName(firstName: string, lastName: string): Promise<void> {
    await this.firstNameFilter.fill(firstName);
    await this.lastNameFilter.fill(lastName);
    await this.lookupButton.click();
  }

  private nameLocator(fullName: string): Locator {
    const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.grid.getByRole('link', { name: new RegExp(`^${escaped}$`, 'i') });
  }

  /**
   * Assert a patient with the given full name is returned by the current search.
   *
   * Case-insensitive: the grid re-cases the name it displays (e.g. "ZZ E2E Onboard" renders
   * as "Zz e2e onboard"), so an exact-case match against the name we typed would false-negative.
   */
  async expectPatientFound(fullName: string): Promise<void> {
    await expect(this.nameLocator(fullName)).toBeVisible();
  }

  /** Click into a patient's detail context from the current search results. */
  async openPatient(fullName: string): Promise<void> {
    await this.nameLocator(fullName).click();
  }
}
