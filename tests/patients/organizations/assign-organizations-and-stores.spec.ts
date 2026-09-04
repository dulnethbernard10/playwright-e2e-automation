import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { randomDateOfBirth, randomFirstName, randomZipcode, uniquePatientEmail, uniquePatientLastName } from '../../support/test-data';
import { AddPatientModal } from '../onboarding/pages/AddPatientModal';
import { PatientProfileEditPage } from '../onboarding/pages/PatientProfileEditPage';
import { ManageClientOrgsAndStoresPage } from './pages/ManageClientOrgsAndStoresPage';

/**
 * Assign organizations and stores — Patients Lookup → new patient → Patient Profile Edit →
 * Administration → Manage Client Orgs and Stores.
 */
test.describe('Assign organizations and stores', () => {
  test('assigns a client organization and store to a patient account', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();

    const lastName = uniquePatientLastName('OrgStore');
    const firstName = randomFirstName();
    const fullName = `${firstName} ${lastName}`;

    await patients.addPatientButton.click();
    const addModal = new AddPatientModal(page);
    await addModal.expectOpen();
    await addModal.createPatient({
      firstName,
      lastName,
      dateOfBirth: randomDateOfBirth(),
      email: uniquePatientEmail(lastName),
      gender: 'Male',
      zipcode: randomZipcode()
    });

    await patients.goto();
    await patients.searchByName(firstName, lastName);
    await patients.openPatient(fullName);

    await PatientProfileEditPage.openFromAvatar(page);
    const orgStorePage = await ManageClientOrgsAndStoresPage.openFromSideMenu(page);

    const { organization, store } = await orgStorePage.pickOrganizationWithStore();
    await orgStorePage.selectOrganization(organization);
    await orgStorePage.selectStore(store);
    await orgStorePage.assignSelected();

    await orgStorePage.expectOrganizationAssigned(organization);
    await orgStorePage.expectStoreAssigned(store);

    // Reload to confirm the assignment actually persisted server-side, not just local state.
    await page.reload();
    await orgStorePage.expectOpen();
    await orgStorePage.expectOrganizationAssigned(organization);
    await orgStorePage.expandOrganization(organization);
    await orgStorePage.expectStoreAssigned(store);
  });
});
