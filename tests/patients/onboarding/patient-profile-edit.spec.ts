import { expect, test, type Page } from '@playwright/test';
import { CompanyProfilePage } from '../../support/pages/CompanyProfilePage';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { AddPatientModal } from './pages/AddPatientModal';
import { PatientProfileEditPage } from './pages/PatientProfileEditPage';
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

interface TestPatient {
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Creates a fresh patient via the Add Patient modal, ready to be looked up with
 * PatientsLookupPage. Shared by every test below so each one edits its own patient rather than
 * depending on one left by another test run.
 */
async function createTestPatient(page: Page, label: string): Promise<TestPatient> {
  const patients = new PatientsLookupPage(page);
  await patients.goto();

  const lastName = uniquePatientLastName(label);
  const firstName = randomFirstName();

  await patients.addPatientButton.click();
  const addModal = new AddPatientModal(page);
  await addModal.expectOpen();
  await addModal.createPatient({
    firstName,
    lastName,
    dateOfBirth: randomDateOfBirth(),
    email: uniquePatientEmail(lastName),
    gender: 'Male',
    zipcode: randomZipcode(),
    // A phone number is required for the Demographic Profile's "Mobile Phone" Contact
    // Preference option to be selectable — see the Demographic Profile test below.
    phone: randomPhoneNumber(),
    healthPlan: 'Cigna',
    address: {
      addressLine1: randomStreetAddress(),
      addressLine2: 'Suite 12',
      city: randomCity(),
      state: 'California'
    }
  });

  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

/** Finds `patient` from a fresh Patients Lookup and opens its detail context. */
async function openTestPatient(page: Page, patient: TestPatient): Promise<void> {
  const patients = new PatientsLookupPage(page);
  await patients.goto();
  await patients.searchByName(patient.firstName, patient.lastName);
  await patients.openPatient(patient.fullName);
}

/** The Phone/Home Phone input mask reformats raw digits for display, e.g. "7007189300" -> "(700) 718-9300". */
function formatPhone(raw: string): string {
  return raw.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

interface GuarantorIdentity {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
}

/** Asserts the Guarantor Information identity fields (not the Statement Mailing Address). */
async function expectGuarantorIdentity(editPage: PatientProfileEditPage, expected: GuarantorIdentity): Promise<void> {
  await expect(editPage.guarantorFirstNameInput).toHaveValue(expected.firstName);
  await expect(editPage.guarantorMiddleNameInput).toHaveValue(expected.middleName);
  await expect(editPage.guarantorLastNameInput).toHaveValue(expected.lastName);
  await expect(editPage.guarantorDateOfBirthInput).toHaveValue(expected.dateOfBirth);
  await expect(editPage.guarantorPhoneInput).toHaveValue(expected.phone);
}

interface GuarantorAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  /** Omit when comparing against the company address, which has no Zipcode field. */
  zipcode?: string;
}

/** Asserts the Guarantor Information Statement Mailing Address fields. */
async function expectGuarantorAddress(editPage: PatientProfileEditPage, expected: GuarantorAddress): Promise<void> {
  await expect(editPage.guarantorAddressLine1Input).toHaveValue(expected.addressLine1);
  await expect(editPage.guarantorAddressLine2Input).toHaveValue(expected.addressLine2);
  await expect(editPage.guarantorCityInput).toHaveValue(expected.city);
  await expect(editPage.guarantorStateTrigger).toHaveValue(expected.state);
  if (expected.zipcode !== undefined) {
    await expect(editPage.guarantorZipcodeInput).toHaveValue(expected.zipcode);
  }
}

/**
 * Patient profile edit — Patients Lookup → patient context → avatar → Patient Profile.
 *
 * "Patient's Relationship to Guarantor" is deliberately left as "Self" throughout — changing it
 * makes a whole Guarantor Information sub-section required, which is out of scope for these
 * tests (see PatientProfileEditPage).
 */
test.describe('Patient profile edit', () => {
  test('edits Profile, Address, and Preferences and the changes persist', async ({ page }) => {
    const patient = await createTestPatient(page, 'ProfileEdit');
    await openTestPatient(page, patient);

    const editedMiddleName = randomFirstName();
    const editedPhone = randomPhoneNumber();
    const editedAddressLine1 = randomStreetAddress();
    const editedCity = randomCity();
    const editedZipcode = randomZipcode();

    const editPage = await PatientProfileEditPage.openFromAvatar(page);
    await editPage.fillProfile({
      middleName: editedMiddleName,
      phone: editedPhone,
      gender: 'Female'
    });
    await editPage.fillAddress({
      addressLine1: editedAddressLine1,
      addressLine2: 'Suite 45',
      city: editedCity,
      zipcode: editedZipcode,
      // Kept close to the initially-selected "California" — the Address State dropdown only
      // renders a short scroll window, and Playwright can't bring a far-down option (e.g. "New
      // York") into the browser viewport to click it. See PatientProfileEditPage.
      state: 'Colorado'
    });
    await editPage.fillPreferences({ healthPlan: 'Aetna' });
    await editPage.save();

    const reopened = await PatientProfileEditPage.openFromAvatar(page);
    await expect(reopened.middleNameInput).toHaveValue(editedMiddleName);
    await expect(reopened.phoneInput).toHaveValue(formatPhone(editedPhone));
    await expect(reopened.genderTrigger).toHaveText('Female');
    await expect(reopened.addressLine1Input).toHaveValue(editedAddressLine1);
    await expect(reopened.addressLine2Input).toHaveValue('Suite 45');
    await expect(reopened.addressCityInput).toHaveValue(editedCity);
    await expect(reopened.zipcodeInput).toHaveValue(editedZipcode);
    await expect(reopened.addressStateTrigger).toHaveValue('Colorado');
    await expect(reopened.healthPlanTrigger).toHaveValue('Aetna');
  });

  test('adds a Demographic Profile and the details persist', async ({ page }) => {
    const patient = await createTestPatient(page, 'Demographic');
    await openTestPatient(page, patient);

    const homePhone = randomPhoneNumber();

    const editPage = await PatientProfileEditPage.openFromAvatar(page);
    await editPage.addDemographicProfileCheckbox.check();
    const { usualProvider } = await editPage.fillDemographicProfile({
      race: '2058-6: African American',
      ethnicity: '2186-5: Not Hispanic or Latino',
      maritalStatus: 'Single',
      contactPreference: 'Mobile Phone',
      homePhone
    });
    await editPage.save();

    // Once a Demographic Profile exists, the checkbox and disabled state are gone — the
    // fields are directly editable, so this reads them straight off the reopened form.
    const reopened = await PatientProfileEditPage.openFromAvatar(page);
    await expect(reopened.addDemographicProfileCheckbox).toBeHidden();
    await expect(reopened.raceTrigger).toHaveValue('2058-6: African American');
    await expect(reopened.ethnicityTrigger).toHaveValue('2186-5: Not Hispanic or Latino');
    await expect(reopened.maritalStatusTrigger).toHaveText('Single');
    await expect(reopened.contactPreferenceTrigger).toHaveText('Mobile Phone');
    await expect(reopened.homePhoneInput).toHaveValue(formatPhone(homePhone));
    await expect(reopened.usualProviderTrigger).toHaveValue(usualProvider);
  });

  test('Demographic Profile fields stay disabled until the checkbox is checked', async ({ page }) => {
    const patient = await createTestPatient(page, 'DemographicDisabled');
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);

    await expect(editPage.addDemographicProfileCheckbox).not.toBeChecked();
    await expect(editPage.languageTrigger).toBeDisabled();
    await expect(editPage.raceTrigger).toBeDisabled();
    await expect(editPage.ethnicityTrigger).toBeDisabled();
    await expect(editPage.maritalStatusTrigger).toBeDisabled();
    await expect(editPage.usualProviderTrigger).toBeDisabled();
    await expect(editPage.homePhoneInput).toBeDisabled();
    await expect(editPage.contactPreferenceTrigger).toBeDisabled();

    await editPage.addDemographicProfileCheckbox.check();

    await expect(editPage.languageTrigger).toBeEnabled();
    await expect(editPage.raceTrigger).toBeEnabled();
    await expect(editPage.ethnicityTrigger).toBeEnabled();
    await expect(editPage.maritalStatusTrigger).toBeEnabled();
    await expect(editPage.usualProviderTrigger).toBeEnabled();
    await expect(editPage.homePhoneInput).toBeEnabled();
    await expect(editPage.contactPreferenceTrigger).toBeEnabled();
  });

  test('Guarantor Information mirrors the patient when Self and Same as patient address are kept', async ({
    page
  }) => {
    const patient = await createTestPatient(page, 'Guarantor');
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);

    // Both are the form's defaults for a freshly-created patient — asserted here rather than
    // set, since setting either is exactly what this test is verifying against.
    await expect(editPage.relationshipTrigger).toHaveText('Self');
    await editPage.expandGuarantorInformation();
    await expect(editPage.sameAsPatientAddressCheckbox).toBeChecked();

    // Read the patient's own Profile/Address values to compare the (disabled, mirrored)
    // Guarantor fields against — the ground truth is whatever the form actually shows, not
    // what was passed in at creation.
    await expectGuarantorIdentity(editPage, {
      firstName: await editPage.firstNameInput.inputValue(),
      middleName: await editPage.middleNameInput.inputValue(),
      lastName: await editPage.lastNameInput.inputValue(),
      dateOfBirth: await editPage.dateOfBirthInput.inputValue(),
      phone: await editPage.phoneInput.inputValue()
    });
    await expectGuarantorAddress(editPage, {
      addressLine1: await editPage.addressLine1Input.inputValue(),
      addressLine2: await editPage.addressLine2Input.inputValue(),
      city: await editPage.addressCityInput.inputValue(),
      state: await editPage.addressStateTrigger.inputValue(),
      zipcode: await editPage.zipcodeInput.inputValue()
    });

    // Mirrored fields are locked while "Same as patient address" is checked — a couple of
    // representative fields are enough to confirm that, without re-asserting every field.
    await expect(editPage.guarantorFirstNameInput).toBeDisabled();
    await expect(editPage.guarantorAddressLine1Input).toBeDisabled();
  });

  test('Guarantor Information mirrors the patient and the company when Self and Same as company address are kept', async ({
    page
  }) => {
    const patient = await createTestPatient(page, 'GuarantorCompany');

    // The profile menu navigates away from the patients section entirely, so the company's
    // address is read here, before opening the patient (which navigates back to Patients
    // Lookup first anyway).
    const company = await CompanyProfilePage.openProfileAndContact(page);
    const companyAddress = await company.getAddress();
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);

    // Both are the form's defaults for a freshly-created patient — asserted here rather than
    // set, since setting relationship is exactly what this test is verifying against.
    await expect(editPage.relationshipTrigger).toHaveText('Self');
    await editPage.expandGuarantorInformation();
    await editPage.sameAsCompanyAddressCheckbox.check();
    await expect(editPage.sameAsCompanyAddressCheckbox).toBeChecked();

    // Identity fields still mirror the patient regardless of which "Same as ... address"
    // checkbox is active — only the address block below switches source.
    await expectGuarantorIdentity(editPage, {
      firstName: await editPage.firstNameInput.inputValue(),
      middleName: await editPage.middleNameInput.inputValue(),
      lastName: await editPage.lastNameInput.inputValue(),
      dateOfBirth: await editPage.dateOfBirthInput.inputValue(),
      phone: await editPage.phoneInput.inputValue()
    });
    // The Statement Mailing Address now mirrors the company (the pharmacy), not the patient.
    await expectGuarantorAddress(editPage, companyAddress);
  });

  test('edits Guarantor Information for a Spouse and the new details persist', async ({ page }) => {
    const patient = await createTestPatient(page, 'GuarantorSpouse');
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);
    await editPage.selectRelationship('Spouse');
    // Changing away from Self auto-expands the accordion — expandGuarantorInformation() is
    // still called for clarity and because it's a no-op once already open (see the POM).
    await editPage.expandGuarantorInformation();

    const guarantorEdits = {
      firstName: randomFirstName(),
      middleName: randomFirstName(),
      lastName: randomFirstName(),
      dateOfBirth: randomDateOfBirth(),
      phone: randomPhoneNumber(),
      addressLine1: randomStreetAddress(),
      addressLine2: 'Unit 4',
      city: randomCity(),
      zipcode: randomZipcode(),
      // Kept reachable without scrolling the State dropdown's popper — see the note on
      // selectAddressState in PatientProfileEditPage.
      state: 'North Carolina'
    };

    await editPage.fillGuarantorInformation({
      ...guarantorEdits,
      emergencyContact: true,
      canAccessMedicalRecords: true
    });
    await editPage.save();

    const reopened = await PatientProfileEditPage.openFromAvatar(page);
    await expect(reopened.relationshipTrigger).toHaveText('Spouse');
    await reopened.expandGuarantorInformation();

    await expectGuarantorIdentity(reopened, { ...guarantorEdits, phone: formatPhone(guarantorEdits.phone) });
    await expectGuarantorAddress(reopened, guarantorEdits);
    await expect(reopened.emergencyContactCheckbox).toBeChecked();
    await expect(reopened.canAccessMedicalRecordsCheckbox).toBeChecked();
  });

  test('edits Guarantor Information for a Spouse using Same as patient address', async ({ page }) => {
    const patient = await createTestPatient(page, 'GuarantorSpouseSameAddr');
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);
    await editPage.selectRelationship('Spouse');
    await editPage.expandGuarantorInformation();

    // Read the patient's own Address now, before the checkbox below overwrites the Statement
    // Mailing Address fields with it — this is the ground truth the reopened form is compared
    // against.
    const patientAddress = {
      addressLine1: await editPage.addressLine1Input.inputValue(),
      addressLine2: await editPage.addressLine2Input.inputValue(),
      city: await editPage.addressCityInput.inputValue(),
      state: await editPage.addressStateTrigger.inputValue(),
      zipcode: await editPage.zipcodeInput.inputValue()
    };

    const guarantorEdits = {
      firstName: randomFirstName(),
      middleName: randomFirstName(),
      lastName: randomFirstName(),
      dateOfBirth: randomDateOfBirth(),
      phone: randomPhoneNumber()
    };

    // Everything but the Statement Mailing Address — "Same as patient address" fills and
    // locks those fields instead.
    await editPage.fillGuarantorInformation(guarantorEdits);
    await editPage.sameAsPatientAddressCheckbox.check();
    await editPage.fillGuarantorInformation({ emergencyContact: true, canAccessMedicalRecords: true });
    await editPage.save();

    const reopened = await PatientProfileEditPage.openFromAvatar(page);
    await expect(reopened.relationshipTrigger).toHaveText('Spouse');
    await reopened.expandGuarantorInformation();

    await expectGuarantorIdentity(reopened, { ...guarantorEdits, phone: formatPhone(guarantorEdits.phone) });
    await expect(reopened.sameAsPatientAddressCheckbox).toBeChecked();
    await expectGuarantorAddress(reopened, patientAddress);
    await expect(reopened.emergencyContactCheckbox).toBeChecked();
    await expect(reopened.canAccessMedicalRecordsCheckbox).toBeChecked();
  });

  test('edits Guarantor Information for a Spouse using Same as company address', async ({ page }) => {
    const patient = await createTestPatient(page, 'GuarantorSpouseCompany');

    // The profile menu navigates away from the patients section entirely, so the company's
    // address is read here, before opening the patient (which navigates back to Patients
    // Lookup first anyway).
    const company = await CompanyProfilePage.openProfileAndContact(page);
    const companyAddress = await company.getAddress();
    await openTestPatient(page, patient);

    const editPage = await PatientProfileEditPage.openFromAvatar(page);
    await editPage.selectRelationship('Spouse');
    await editPage.expandGuarantorInformation();

    const guarantorEdits = {
      firstName: randomFirstName(),
      middleName: randomFirstName(),
      lastName: randomFirstName(),
      dateOfBirth: randomDateOfBirth(),
      phone: randomPhoneNumber()
    };

    // Everything but the Statement Mailing Address — "Same as company address" fills and
    // locks those fields instead.
    await editPage.fillGuarantorInformation(guarantorEdits);
    await editPage.sameAsCompanyAddressCheckbox.check();
    await editPage.fillGuarantorInformation({ emergencyContact: true, canAccessMedicalRecords: true });
    await editPage.save();

    const reopened = await PatientProfileEditPage.openFromAvatar(page);
    await expect(reopened.relationshipTrigger).toHaveText('Spouse');
    await reopened.expandGuarantorInformation();

    await expectGuarantorIdentity(reopened, { ...guarantorEdits, phone: formatPhone(guarantorEdits.phone) });
    // The Statement Mailing Address mirrors the company (the pharmacy), not what was entered.
    await expect(reopened.sameAsCompanyAddressCheckbox).toBeChecked();
    await expectGuarantorAddress(reopened, companyAddress);
    await expect(reopened.emergencyContactCheckbox).toBeChecked();
    await expect(reopened.canAccessMedicalRecordsCheckbox).toBeChecked();
  });
});
