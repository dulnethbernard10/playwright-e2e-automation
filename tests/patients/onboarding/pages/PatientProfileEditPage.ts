import { expect, type Locator, type Page } from '@playwright/test';

export type Gender = 'Male' | 'Female';

export interface ProfileEdits {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  /** MM/DD/YYYY */
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
}

export interface AddressEdits {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipcode?: string;
  /** Full state name as shown in the dropdown, e.g. "California". */
  state?: string;
}

export interface PreferencesEdits {
  healthPlan?: string;
}

export type GuarantorRelationship = 'Self' | 'Spouse' | 'Child' | 'Other';

export interface GuarantorEdits {
  /** Required by the form for any relationship other than Self. */
  firstName?: string;
  middleName?: string;
  /** Required by the form for any relationship other than Self. */
  lastName?: string;
  /** MM/DD/YYYY */
  dateOfBirth?: string;
  phone?: string;
  /** Required by the form for any relationship other than Self. */
  addressLine1?: string;
  addressLine2?: string;
  /** Required by the form for any relationship other than Self. */
  city?: string;
  /** Required by the form for any relationship other than Self. Full state name, e.g. "North Carolina". */
  state?: string;
  /** Required by the form for any relationship other than Self. */
  zipcode?: string;
  emergencyContact?: boolean;
  canAccessMedicalRecords?: boolean;
}

export interface DemographicProfileEdits {
  /** Defaults to "English" already; only pass this to change it. */
  language?: string;
  /** Required by the form — see the class-level note on Demographic Profile. */
  race?: string;
  /** Required by the form. */
  ethnicity?: string;
  /** Required by the form. */
  maritalStatus?: string;
  /** Required by the form. */
  contactPreference?: string;
  homePhone?: string;
  /**
   * Required by the form. Omit to auto-pick whichever provider the current org has available
   * — like Client Organization/Store in AddPatientModal, the roster varies by environment.
   */
  usualProvider?: string;
}

/**
 * The patient profile edit screen (`/providers/:id/update-profile`), reached from any patient
 * detail sub-route via the avatar in the patient header.
 *
 * Notes on the real DOM (verified against the DEV portal, build 2026-08-31-1):
 *  - The avatar is a `<div aria-label="Profile">` wrapping an `<img>`, with no other accessible
 *    role. On pages that also render a "Profile" tab (e.g. the RPM encounter screens), the
 *    active tabpanel picks up the same computed accessible name via `aria-labelledby`, so
 *    `getByLabel('Profile')` alone hits a strict-mode collision. Filtering for an `<img>`
 *    descendant disambiguates it from the tabpanel, which has none.
 *  - Gender and "Patient's Relationship to Guarantor" are MUI Selects whose trigger carries
 *    `aria-labelledby` pointing at its own id, so its accessible name is the *current value*
 *    ("Male", "Self", ...) rather than the field label — the same broken-label pattern as
 *    Client Organization/Store in AddPatientModal. Both are located by their stable
 *    `#mui-component-select-<field>` id instead.
 *  - Health Plan and Address State don't have this bug and are selectable by accessible name.
 *  - Changing "Patient's Relationship to Guarantor" away from "Self" makes a whole Guarantor
 *    Information sub-section required, and auto-expands the accordion (unlike Self, which
 *    starts collapsed) — `expandGuarantorInformation()` checks `aria-expanded` first so it's
 *    safe to call either way without accidentally collapsing it.
 *  - Save navigates to `/patients/:id/details`; there is no confirmation dialog or toast, so
 *    the URL change is the signal the edit was submitted.
 *  - Demographic Profile: Race, Ethnicity, and Language are MUI Autocompletes (short lists,
 *    selectable by accessible name); Marital Status and Contact Preference are broken-label
 *    Selects like Gender, located via `#mui-component-select-<field>`. All fields render
 *    disabled until "Add Demographic Profile" is checked. That checkbox — and the whole
 *    section's disabled state — only exists for a patient with no demographic profile yet;
 *    once one has been saved, the fields stay directly editable with no checkbox and an
 *    "EHR ID: <n>" label appears instead.
 *  - Guarantor Information is a collapsed MUI Accordion; its content only renders once expanded,
 *    at which point it's the page's only `role=region`, which is how `guarantorRegion` scopes
 *    to it. That scoping matters because the fields inside reuse the exact same accessible
 *    names as Profile/Address ("First Name", "Address Line 1", "Zipcode", ...), which would
 *    otherwise be a strict-mode collision. With relationship "Self" and "Same as patient
 *    address" checked (both on by default), every field in there just mirrors the patient's own
 *    Profile/Address values and renders disabled — there's nothing to fill in that state.
 */
export class PatientProfileEditPage {
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly phoneInput: Locator;
  readonly genderTrigger: Locator;

  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly addressCityInput: Locator;
  readonly zipcodeInput: Locator;
  readonly addressStateTrigger: Locator;

  readonly healthPlanTrigger: Locator;
  readonly relationshipTrigger: Locator;

  readonly guarantorToggle: Locator;
  readonly guarantorRegion: Locator;
  readonly guarantorFirstNameInput: Locator;
  readonly guarantorDateOfBirthInput: Locator;
  readonly guarantorMiddleNameInput: Locator;
  readonly guarantorPhoneInput: Locator;
  readonly guarantorLastNameInput: Locator;
  readonly sameAsPatientAddressCheckbox: Locator;
  readonly sameAsCompanyAddressCheckbox: Locator;
  readonly guarantorAddressLine1Input: Locator;
  readonly guarantorAddressLine2Input: Locator;
  readonly guarantorCityInput: Locator;
  readonly guarantorStateTrigger: Locator;
  readonly guarantorZipcodeInput: Locator;
  readonly emergencyContactCheckbox: Locator;
  readonly canAccessMedicalRecordsCheckbox: Locator;

  readonly addDemographicProfileCheckbox: Locator;
  readonly languageTrigger: Locator;
  readonly raceTrigger: Locator;
  readonly ethnicityTrigger: Locator;
  readonly maritalStatusTrigger: Locator;
  readonly usualProviderTrigger: Locator;
  readonly homePhoneInput: Locator;
  readonly contactPreferenceTrigger: Locator;

  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    // Once the Guarantor Information accordion is expanded, it duplicates several of these
    // accessible names verbatim (First Name, Date of Birth, Middle Name, Phone, Last Name,
    // Address Line 1, Address Line 2, Zipcode). The real Profile/Address field always renders
    // first in the DOM, ahead of the accordion further down the page, so `.first()` reliably
    // picks it over the mirrored (disabled) copy inside `guarantorRegion` — see that field's
    // own `guarantor*` locator for the scoped counterpart.
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name', exact: true }).first();
    this.middleNameInput = page.getByRole('textbox', { name: 'Middle Name', exact: true }).first();
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name', exact: true }).first();
    this.dateOfBirthInput = page.getByRole('textbox', { name: 'Date of Birth', exact: true }).first();
    this.phoneInput = page.getByRole('textbox', { name: 'Phone', exact: true }).first();
    this.genderTrigger = page.locator('#mui-component-select-gender');

    this.addressLine1Input = page.getByRole('textbox', { name: 'Address Line 1', exact: true }).first();
    this.addressLine2Input = page.getByRole('textbox', { name: 'Address Line 2', exact: true }).first();
    this.addressCityInput = page.getByRole('textbox', { name: 'Address City', exact: true });
    this.zipcodeInput = page.getByRole('textbox', { name: 'Zipcode', exact: true }).first();
    this.addressStateTrigger = page.getByRole('combobox', { name: 'Address State' });

    this.healthPlanTrigger = page.getByRole('combobox', { name: 'Health Plan' });
    this.relationshipTrigger = page.locator('#mui-component-select-guarantorRelationship');

    this.guarantorToggle = page.getByRole('button', { name: /^Guarantor Information/ });
    this.guarantorRegion = page.getByRole('region');
    this.guarantorFirstNameInput = this.guarantorRegion.getByRole('textbox', { name: 'First Name', exact: true });
    this.guarantorDateOfBirthInput = this.guarantorRegion.getByRole('textbox', { name: 'Date of Birth', exact: true });
    this.guarantorMiddleNameInput = this.guarantorRegion.getByRole('textbox', { name: 'Middle Name', exact: true });
    this.guarantorPhoneInput = this.guarantorRegion.getByRole('textbox', { name: 'Phone', exact: true });
    this.guarantorLastNameInput = this.guarantorRegion.getByRole('textbox', { name: 'Last Name', exact: true });
    this.sameAsPatientAddressCheckbox = this.guarantorRegion.getByRole('checkbox', { name: 'Same as patient address' });
    this.sameAsCompanyAddressCheckbox = this.guarantorRegion.getByRole('checkbox', { name: 'Same as company address' });
    this.guarantorAddressLine1Input = this.guarantorRegion.getByRole('textbox', { name: 'Address Line 1', exact: true });
    this.guarantorAddressLine2Input = this.guarantorRegion.getByRole('textbox', { name: 'Address Line 2', exact: true });
    this.guarantorCityInput = this.guarantorRegion.getByRole('textbox', { name: 'City', exact: true });
    this.guarantorStateTrigger = this.guarantorRegion.getByRole('combobox', { name: 'State', exact: true });
    this.guarantorZipcodeInput = this.guarantorRegion.getByRole('textbox', { name: 'Zipcode', exact: true });
    this.emergencyContactCheckbox = this.guarantorRegion.getByRole('checkbox', { name: 'Emergency contact' });
    this.canAccessMedicalRecordsCheckbox = this.guarantorRegion.getByRole('checkbox', {
      name: 'Can access medical records'
    });

    this.addDemographicProfileCheckbox = page.getByRole('checkbox', { name: 'Add Demographic Profile' });
    this.languageTrigger = page.getByRole('combobox', { name: 'Language' });
    this.raceTrigger = page.getByRole('combobox', { name: 'Race' });
    this.ethnicityTrigger = page.getByRole('combobox', { name: 'Ethnicity' });
    this.maritalStatusTrigger = page.locator('#mui-component-select-maritalStatus');
    this.usualProviderTrigger = page.getByRole('combobox', { name: 'Usual Provider' });
    this.homePhoneInput = page.getByRole('textbox', { name: 'Home Phone', exact: true });
    this.contactPreferenceTrigger = page.locator('#mui-component-select-contactPreference');

    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
  }

  /** Opens the edit screen via the avatar in the header of the currently-viewed patient page. */
  static async openFromAvatar(page: Page): Promise<PatientProfileEditPage> {
    const avatar = page.getByLabel('Profile', { exact: true }).filter({ has: page.locator('img') });
    await avatar.click();

    const editPage = new PatientProfileEditPage(page);
    await editPage.expectOpen();
    return editPage;
  }

  async expectOpen(): Promise<void> {
    await this.page.waitForURL(/\/update-profile/);
    await expect(this.firstNameInput).toBeVisible();
    // The form mounts with every field empty and hydrates from the patient's data a moment
    // later — the same prefill race documented on EditNoteModal. First Name is always
    // non-empty for an existing patient, so waiting for it to hold real text is a reliable
    // signal the rest of the form has hydrated too, before handing control back.
    await expect(this.firstNameInput).not.toHaveValue('');
  }

  /** Opens `trigger`'s dropdown and clicks the option with accessible name `name`. */
  private async selectOption(trigger: Locator, name: string): Promise<void> {
    await trigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async selectGender(gender: Gender): Promise<void> {
    await this.selectOption(this.genderTrigger, gender);
  }

  async selectRelationship(relationship: GuarantorRelationship): Promise<void> {
    await this.selectOption(this.relationshipTrigger, relationship);
  }

  /** Safe to call regardless of current state — see the class-level note on auto-expand. */
  async expandGuarantorInformation(): Promise<void> {
    if ((await this.guarantorToggle.getAttribute('aria-expanded')) !== 'true') {
      await this.guarantorToggle.click();
    }
    await expect(this.guarantorRegion).toBeVisible();
  }

  async selectGuarantorState(name: string): Promise<void> {
    await this.selectOption(this.guarantorStateTrigger, name);
  }

  /**
   * Overwrites whichever Guarantor Information fields are provided; requires the accordion to
   * already be expanded (see expandGuarantorInformation()).
   */
  async fillGuarantorInformation(edits: GuarantorEdits): Promise<void> {
    if (edits.firstName !== undefined) await this.guarantorFirstNameInput.fill(edits.firstName);
    if (edits.middleName !== undefined) await this.guarantorMiddleNameInput.fill(edits.middleName);
    if (edits.lastName !== undefined) await this.guarantorLastNameInput.fill(edits.lastName);
    if (edits.dateOfBirth !== undefined) await this.guarantorDateOfBirthInput.fill(edits.dateOfBirth);
    if (edits.phone !== undefined) await this.guarantorPhoneInput.fill(edits.phone);
    if (edits.addressLine1 !== undefined) await this.guarantorAddressLine1Input.fill(edits.addressLine1);
    if (edits.addressLine2 !== undefined) await this.guarantorAddressLine2Input.fill(edits.addressLine2);
    if (edits.city !== undefined) await this.guarantorCityInput.fill(edits.city);
    if (edits.zipcode !== undefined) await this.guarantorZipcodeInput.fill(edits.zipcode);
    if (edits.state !== undefined) await this.selectGuarantorState(edits.state);
    if (edits.emergencyContact !== undefined) await this.emergencyContactCheckbox.setChecked(edits.emergencyContact);
    if (edits.canAccessMedicalRecords !== undefined) {
      await this.canAccessMedicalRecordsCheckbox.setChecked(edits.canAccessMedicalRecords);
    }
  }

  /**
   * Address State and Health Plan are long, alphabetical lists in a MUI Autocomplete popper
   * that only renders a ~288px scroll window; an option far down the list resolves in the DOM
   * but Playwright can't scroll it into the browser viewport (a pre-existing limitation this
   * suite works around elsewhere too — see AddPatientModal — by only ever selecting options
   * near the top of the list, e.g. near the currently-selected value).
   */
  async selectAddressState(name: string): Promise<void> {
    await this.selectOption(this.addressStateTrigger, name);
  }

  async selectHealthPlan(name: string): Promise<void> {
    await this.selectOption(this.healthPlanTrigger, name);
  }

  /** Overwrites whichever Profile fields are provided; omitted fields keep their current value. */
  async fillProfile(edits: ProfileEdits): Promise<void> {
    if (edits.firstName !== undefined) await this.firstNameInput.fill(edits.firstName);
    if (edits.middleName !== undefined) await this.middleNameInput.fill(edits.middleName);
    if (edits.lastName !== undefined) await this.lastNameInput.fill(edits.lastName);
    if (edits.dateOfBirth !== undefined) await this.dateOfBirthInput.fill(edits.dateOfBirth);
    if (edits.phone !== undefined) await this.phoneInput.fill(edits.phone);
    if (edits.gender !== undefined) await this.selectGender(edits.gender);
  }

  /** Overwrites whichever Address fields are provided; omitted fields keep their current value. */
  async fillAddress(edits: AddressEdits): Promise<void> {
    if (edits.addressLine1 !== undefined) await this.addressLine1Input.fill(edits.addressLine1);
    if (edits.addressLine2 !== undefined) await this.addressLine2Input.fill(edits.addressLine2);
    if (edits.city !== undefined) await this.addressCityInput.fill(edits.city);
    if (edits.zipcode !== undefined) await this.zipcodeInput.fill(edits.zipcode);
    if (edits.state !== undefined) await this.selectAddressState(edits.state);
  }

  /** Overwrites whichever Preferences fields are provided; omitted fields keep their current value. */
  async fillPreferences(edits: PreferencesEdits): Promise<void> {
    if (edits.healthPlan !== undefined) await this.selectHealthPlan(edits.healthPlan);
  }

  async selectLanguage(name: string): Promise<void> {
    await this.selectOption(this.languageTrigger, name);
  }

  async selectRace(name: string): Promise<void> {
    await this.selectOption(this.raceTrigger, name);
  }

  async selectEthnicity(name: string): Promise<void> {
    await this.selectOption(this.ethnicityTrigger, name);
  }

  async selectMaritalStatus(name: string): Promise<void> {
    await this.selectOption(this.maritalStatusTrigger, name);
  }

  async selectContactPreference(name: string): Promise<void> {
    await this.selectOption(this.contactPreferenceTrigger, name);
  }

  /** Selects `name` if given, otherwise picks whichever provider is first in the list. */
  async selectUsualProvider(name?: string): Promise<string> {
    await this.usualProviderTrigger.click();
    const option =
      name !== undefined ? this.page.getByRole('option', { name, exact: true }) : this.page.getByRole('option').first();
    const resolvedName = name ?? (await option.textContent()) ?? '';
    await option.click();
    return resolvedName;
  }

  /**
   * Fills whichever Demographic Profile fields are provided — call
   * `addDemographicProfileCheckbox.check()` first for a patient that doesn't have one yet, or
   * the fields stay disabled. Race, Ethnicity, Marital Status, Contact Preference, and Usual
   * Provider are required by the form for Save to succeed. Returns the Usual Provider that
   * ended up selected, since it may have been auto-picked.
   */
  async fillDemographicProfile(edits: DemographicProfileEdits): Promise<{ usualProvider: string }> {
    if (edits.language !== undefined) await this.selectLanguage(edits.language);
    if (edits.race !== undefined) await this.selectRace(edits.race);
    if (edits.ethnicity !== undefined) await this.selectEthnicity(edits.ethnicity);
    if (edits.maritalStatus !== undefined) await this.selectMaritalStatus(edits.maritalStatus);
    if (edits.contactPreference !== undefined) await this.selectContactPreference(edits.contactPreference);
    if (edits.homePhone !== undefined) await this.homePhoneInput.fill(edits.homePhone);

    const usualProvider = await this.selectUsualProvider(edits.usualProvider);
    return { usualProvider };
  }

  async save(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes('update-profile'));
  }
}
