import { test as base } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { AddPatientModal } from '../onboarding/pages/AddPatientModal';
import { PatientEditProfilePage } from './pages/PatientEditProfilePage';
import { InsurancePlansPage } from './pages/InsurancePlansPage';
import {
  randomDateOfBirth,
  randomFirstName,
  randomZipcode,
  uniqueInsuranceMemberId,
  uniquePatientEmail,
  uniquePatientLastName
} from '../../support/test-data';

/**
 * Shared setup for every Insurance Plans spec: create a patient, add a Demographic Profile via
 * the Patient Profile tab (Insurance Plans refuses to manage insurance without one), then
 * navigate to Insurance Plans. Saving the Demographic Profile navigates away, so the
 * edit-profile page is reopened afterwards to reach Insurance Plans — see
 * PatientProfilePage.addDemographicProfile() and PatientEditProfilePage's class docs.
 *
 * `patientTag`, `patientGender`, and `patientDateOfBirth` are option fixtures a spec overrides
 * with `test.use({...})` when it needs a distinct patient label (so generated patients stay
 * identifiable per spec in the QA grid) or a specific age/gender (e.g. dual-insurance.spec.ts
 * needs an older patient for Medicare eligibility).
 */
interface InsuranceFixtures {
  patientTag: string;
  patientGender: 'Male' | 'Female';
  patientAgeRange: { minAge: number; maxAge: number };
  insurance: InsurancePlansPage;
}

export const test = base.extend<InsuranceFixtures>({
  patientTag: ['Insurance', { option: true }],
  patientGender: ['Female', { option: true }],
  // Plain data, not a function — Playwright treats a function-valued option fixture as a
  // fixture implementation that must call use(), not a literal default.
  patientAgeRange: [{ minAge: 18, maxAge: 90 }, { option: true }],

  insurance: async ({ page, patientTag, patientGender, patientAgeRange }, use) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();

    const lastName = uniquePatientLastName(patientTag);
    const firstName = randomFirstName();
    const fullName = `${firstName} ${lastName}`;

    await patients.addPatientButton.click();
    const addPatient = new AddPatientModal(page);
    await addPatient.expectOpen();
    await addPatient.createPatient({
      firstName,
      lastName,
      dateOfBirth: randomDateOfBirth(patientAgeRange.minAge, patientAgeRange.maxAge),
      email: uniquePatientEmail(lastName),
      gender: patientGender,
      zipcode: randomZipcode()
    });

    await patients.searchByName(firstName, lastName);
    await patients.expectPatientFound(fullName);
    await patients.openPatient(fullName);

    const patientProfile = await (await PatientEditProfilePage.openFromPatientPage(page)).goToPatientProfile();
    await patientProfile.addDemographicProfile();

    const editProfile = await PatientEditProfilePage.openFromPatientPage(page);
    const insurancePlans = await editProfile.goToInsurancePlans();

    await use(insurancePlans);
  }
});

/**
 * Adds a Commercial/Other Plan Cigna PPO plan — the default plan several specs (edit, delete,
 * add/delete card image) need already in place before exercising their own specific action —
 * and asserts it saved. Returns the generated Member ID so the caller can address that card.
 */
export async function addCignaInsurancePlan(insurance: InsurancePlansPage): Promise<string> {
  const wizard = await insurance.openAddInsuranceWizard();
  const memberId = uniqueInsuranceMemberId();
  await wizard.addInsurance({
    insuranceType: 'Commercial/ Other Plan',
    payer: 'Cigna',
    planType: 'PPO',
    insurancePackage: 'Cigna',
    insuranceIdNumber: memberId
  });

  await insurance.expectInsuranceFound({ payer: 'Cigna', planType: 'Commercial/ Other Plan', memberId });
  return memberId;
}

export { expect } from '@playwright/test';
