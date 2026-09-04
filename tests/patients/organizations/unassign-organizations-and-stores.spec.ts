import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { randomDateOfBirth, randomFirstName, randomZipcode, uniquePatientEmail, uniquePatientLastName } from '../../support/test-data';
import { AddPatientModal } from '../onboarding/pages/AddPatientModal';
import { PatientProfileEditPage } from '../onboarding/pages/PatientProfileEditPage';
import { ManageClientOrgsAndStoresPage } from './pages/ManageClientOrgsAndStoresPage';

/**
 * Unassign organizations and stores — Patients Lookup → new patient (auto-assigned an
 * organization/store at creation, see AddPatientModal) → Patient Profile Edit →
 * Administration → Manage Client Orgs and Stores.
 */
test.describe('Unassign organizations and stores', () => {
  test('unassigns a client organization and store from a patient account', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();

    const lastName = uniquePatientLastName('OrgStoreUnassign');
    const firstName = randomFirstName();
    const fullName = `${firstName} ${lastName}`;

    await patients.addPatientButton.click();
    const addModal = new AddPatientModal(page);
    await addModal.expectOpen();
    const { organization, store } = await addModal.createPatient({
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

    // The organization/store picked during patient creation starts out assigned.
    await orgStorePage.expectOrganizationAssigned(organization);
    await orgStorePage.expandOrganization(organization);
    await orgStorePage.expectStoreAssigned(store);

    await orgStorePage.deselectStore(store);
    await orgStorePage.deselectOrganization(organization);
    await orgStorePage.assignSelected();

    await orgStorePage.expectOrganizationUnassigned(organization);
    await orgStorePage.expectStoreUnassigned(store);

    // Reload to confirm the unassignment actually persisted server-side, not just local state.
    await page.reload();
    await orgStorePage.expectOpen();
    await orgStorePage.expectOrganizationUnassigned(organization);
    await orgStorePage.expandOrganization(organization);
    await orgStorePage.expectStoreUnassigned(store);
  });
});
