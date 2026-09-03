import { expect, type Locator, type Page } from '@playwright/test';
import { DemographicProfileFields } from './DemographicProfileFields';

/**
 * The "Patient Profile" tab of a patient's edit-profile page
 * (`/providers/:id/update-profile`) — shown by default, and reachable explicitly via
 * PatientEditProfilePage.goToPatientProfile().
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - The page's own "Demographic Profile:" section starts with every field disabled; checking
 *    "Add Demographic Profile" enables them. Same fields, same quirks as the reactive modal
 *    Insurance Plans opens for a patient with no profile yet — both share
 *    DemographicProfileFields.
 *  - **Saving here navigates away** from `/update-profile` to `/patients/:id/details` — unlike
 *    the modal, which just closes and leaves you wherever you were. Callers that need to get
 *    back to Insurance Plans afterwards should re-open the edit-profile page via
 *    `PatientEditProfilePage.openFromPatientPage()`.
 */
export class PatientProfilePage {
  readonly addDemographicProfileCheckbox: Locator;
  readonly demographicFields: DemographicProfileFields;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.addDemographicProfileCheckbox = page.getByRole('checkbox', { name: 'Add Demographic Profile' });
    this.demographicFields = new DemographicProfileFields(page, page.locator('body'));
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.addDemographicProfileCheckbox).toBeVisible();
  }

  /**
   * Checks "Add Demographic Profile", fills every required field with a valid (if arbitrary)
   * choice, and saves. Ends on the patient's general details page — see class docs.
   */
  async addDemographicProfile(): Promise<void> {
    await this.addDemographicProfileCheckbox.check();
    await this.demographicFields.fillMinimalRequired();
    await this.saveButton.click();
    await expect(this.page).not.toHaveURL(/\/update-profile/);
  }
}
