import { expect, test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { AddPatientModal } from './pages/AddPatientModal';
import {
  randomCity,
  randomDateOfBirth,
  randomFirstName,
  randomPhoneNumber,
  randomStreetAddress,
  randomZipcode,
  uniquePatientEmail,
  uniquePatientLastName
} from '../../support/test-data';

/**
 * Patient creation — Patients Management → Patients Lookup → Add Patient.
 *
 * Every field the modal offers is filled with randomly generated, synthetic data. The
 * patient's last name carries the ZZ_PREFIX so the record is identifiable, and Client
 * Organization / Client Location are picked at runtime (see AddPatientModal) since which
 * organizations have an available store varies by environment.
 */
test.describe('Patient creation', () => {
  let patients: PatientsLookupPage;

  test.beforeEach(async ({ page }) => {
    patients = new PatientsLookupPage(page);
    await patients.goto();
  });

  test('creates a patient with every field filled from random data', async ({ page }) => {
    const lastName = uniquePatientLastName('Onboard');
    const firstName = randomFirstName();
    const fullName = `${firstName} ${lastName}`;

    await patients.addPatientButton.click();
    const modal = new AddPatientModal(page);
    await modal.expectOpen();

    const { organization, store } = await modal.createPatient({
      firstName,
      middleName: randomFirstName(),
      lastName,
      dateOfBirth: randomDateOfBirth(),
      email: uniquePatientEmail(lastName),
      gender: 'Male',
      zipcode: randomZipcode(),
      phone: randomPhoneNumber(),
      healthPlan: 'Cigna',
      address: {
        addressLine1: randomStreetAddress(),
        addressLine2: 'Suite 12',
        city: randomCity(),
        state: 'California'
      }
    });

    expect(organization).toBeTruthy();
    expect(store).toBeTruthy();

    await patients.searchByName(firstName, lastName);
    await patients.expectPatientFound(fullName);
  });
});
