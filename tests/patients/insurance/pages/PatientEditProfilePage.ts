import { expect, type Locator, type Page } from '@playwright/test';
import { InsurancePlansPage } from './InsurancePlansPage';
import { PatientProfilePage } from './PatientProfilePage';

/**
 * A patient's edit-profile page (`/providers/:id/update-profile`), reached via the "Open
 * profile" button in the patient's persistent header widget (present across every patient
 * sub-page). It lives under a `/providers/` route — shared with provider profile editing —
 * but hosts a patient-specific side nav: Patient Profile, Insurance Plans, Manage Client Orgs
 * and Stores.
 */
export class PatientEditProfilePage {
  readonly patientProfileNavButton: Locator;
  readonly insurancePlansNavButton: Locator;

  constructor(private readonly page: Page) {
    this.patientProfileNavButton = page.getByRole('button', { name: 'Patient Profile', exact: true });
    this.insurancePlansNavButton = page.getByRole('button', { name: 'Insurance Plans', exact: true });
  }

  /** Open a patient's edit-profile page from anywhere in their detail view. */
  static async openFromPatientPage(page: Page): Promise<PatientEditProfilePage> {
    await page.getByRole('button', { name: 'Open profile' }).click();
    const profile = new PatientEditProfilePage(page);
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
