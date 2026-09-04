import { expect, type Locator, type Page } from '@playwright/test';
import { InsurancePlansPage } from './InsurancePlansPage';
import { PatientProfilePage } from './PatientProfilePage';

/**
 * The `/providers/:id/update-profile` page's own side nav — Patient Profile, Insurance Plans,
 * Manage Client Orgs and Stores — reached via the "Open profile" button in the patient's
 * persistent header widget (present across every patient sub-page). The route lives under
 * `/providers/`, shared with provider profile editing, but this class only models the
 * patient-specific tabs.
 *
 * Named `UpdateProfilePage` rather than something like `PatientEditProfilePage` specifically to
 * avoid colliding with `PatientProfileEditPage` (patients/onboarding) — a near-identical name
 * for a different class (that one models the Patient Profile tab's own fields directly, reached
 * via the patient avatar rather than this nav).
 */
export class UpdateProfilePage {
  readonly patientProfileNavButton: Locator;
  readonly insurancePlansNavButton: Locator;

  constructor(private readonly page: Page) {
    this.patientProfileNavButton = page.getByRole('button', { name: 'Patient Profile', exact: true });
    this.insurancePlansNavButton = page.getByRole('button', { name: 'Insurance Plans', exact: true });
  }

  /** Open a patient's edit-profile page from anywhere in their detail view. */
  static async openFromPatientPage(page: Page): Promise<UpdateProfilePage> {
    await page.getByRole('button', { name: 'Open profile' }).click();
    const profile = new UpdateProfilePage(page);
    await expect(profile.insurancePlansNavButton).toBeVisible();
    return profile;
  }

  async goToPatientProfile(): Promise<PatientProfilePage> {
    await this.patientProfileNavButton.click();
    const patientProfile = new PatientProfilePage(this.page);
    await patientProfile.expectOpen();
    return patientProfile;
  }

  async goToInsurancePlans(): Promise<InsurancePlansPage> {
    await this.insurancePlansNavButton.click();
    const insurance = new InsurancePlansPage(this.page);
    await insurance.expectOpen();
    return insurance;
  }
}
