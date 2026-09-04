import { expect, type Locator, type Page } from '@playwright/test';

export type Gender = 'Male' | 'Female';

export interface PatientAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  /** Full state name as shown in the dropdown, e.g. "California". */
  state: string;
}

export interface PatientDetails {
  firstName: string;
  middleName?: string;
  lastName: string;
  /** MM/DD/YYYY */
  dateOfBirth: string;
  email: string;
  gender: Gender;
  zipcode: string;
  phone?: string;
  /** Omit to leave the optional health plan unset. */
  healthPlan?: string;
  /** Omit to skip the "Include Patient Address Details" section entirely. */
  address?: PatientAddress;
}

export interface OrganizationAndStore {
  organization: string;
  store: string;
}

/**
 * The "Add Patient" modal, opened from Patients Lookup.
 *
 * Notes on the real DOM (verified against the DEV portal, build 2026-08-30-1):
 *  - Client Organization and Client Location (Stores) are plain MUI Selects, but their
 *    trigger `div[role="button"]` carries `aria-labelledby="organizations"` /
 *    `aria-labelledby="stores"` — ids that don't exist anywhere in the DOM (the real label
 *    ids are suffixed `-input`). That mislabelling leaves the trigger with NO accessible
 *    name until a value is chosen, so `getByRole('button', { name })` can't find it. The
 *    workaround below locates the trigger structurally, via its hidden sibling
 *    `<input placeholder="...">`, which is unaffected by the bug.
 *  - Health Plan and Address State do NOT have this bug — their triggers are properly
 *    labelled and selectable by accessible name from the start.
 *  - Client Location options depend on the selected Client Organization, and some
 *    organizations have none. `pickOrganizationAndStore()` tries organizations in the
 *    order the dropdown lists them until one yields at least one store.
 *  - Saving a patient for an RPM-enabled organization pops a second confirmation dialog
 *    ("Confirm RPM Enrollment for <name>?"). `save()` declines it so this modal is only
 *    responsible for patient creation, not enrollment.
 */
export class AddPatientModal {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly emailInput: Locator;
  readonly zipcodeInput: Locator;
  readonly phoneInput: Locator;

  readonly genderCombobox: Locator;
  readonly genderOpenButton: Locator;
  readonly healthPlanTrigger: Locator;
  readonly addressStateTrigger: Locator;

  /** See the class-level note on the broken aria-labelledby for these two triggers. */
  readonly organizationTrigger: Locator;
  readonly storeTrigger: Locator;

  readonly includeAddressCheckbox: Locator;
  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly addressCityInput: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Add Patient' });
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });

    this.firstNameInput = this.dialog.getByRole('textbox', { name: 'First Name', exact: true });
    this.middleNameInput = this.dialog.getByRole('textbox', { name: 'Middle Name', exact: true });
    this.lastNameInput = this.dialog.getByRole('textbox', { name: 'Last Name', exact: true });
    this.dateOfBirthInput = this.dialog.getByRole('textbox', { name: 'Date of Birth', exact: true });
    this.emailInput = this.dialog.getByRole('textbox', { name: 'Email', exact: true });
    this.zipcodeInput = this.dialog.getByRole('textbox', { name: 'Zipcode', exact: true });
    this.phoneInput = this.dialog.getByRole('textbox', { name: 'Phone', exact: true });

    this.genderCombobox = this.dialog.getByRole('combobox', { name: 'Gender' });
    this.genderOpenButton = this.dialog.getByRole('button', { name: 'Open' });
    this.healthPlanTrigger = this.dialog.getByRole('button', { name: 'Health Plan' });
    this.addressStateTrigger = this.dialog.getByRole('button', { name: /^Address State/ });

    this.organizationTrigger = this.dialog.locator(
      'xpath=.//input[@placeholder="select an organization"]/preceding-sibling::div[@role="button"]'
    );
    this.storeTrigger = this.dialog.locator(
      'xpath=.//input[@placeholder="select a store"]/preceding-sibling::div[@role="button"]'
    );

    this.includeAddressCheckbox = this.dialog.getByRole('checkbox', {
      name: 'Include Patient Address Details'
    });
    this.addressLine1Input = this.dialog.getByRole('textbox', { name: 'Address Line 1', exact: true });
    this.addressLine2Input = this.dialog.getByRole('textbox', { name: 'Address Line 2', exact: true });
    this.addressCityInput = this.dialog.getByRole('textbox', { name: 'Address City', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.firstNameInput).toBeVisible();
  }

  // ── Dropdowns rendered as popups (options are not scoped to the dialog) ────────────────

  async selectGender(gender: Gender): Promise<void> {
    await this.genderOpenButton.click();
    await this.page.getByRole('option', { name: gender, exact: true }).click();
  }

  async selectHealthPlan(name: string): Promise<void> {
    await this.healthPlanTrigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async selectAddressState(name: string): Promise<void> {
    await this.addressStateTrigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  /**
   * Selects a Client Organization and its Client Location, trying organizations in dropdown
   * order until one has at least one available store. Picks randomly among that
   * organization's stores when there is more than one.
   */
  async pickOrganizationAndStore(): Promise<OrganizationAndStore> {
    await this.organizationTrigger.click();
    // Options populate from an unawaited async fetch — wait so we don't read zero of them.
    await expect(this.page.getByRole('option').first()).toBeVisible();
    const organizations = await this.page.getByRole('option').allTextContents();
    await this.page.keyboard.press('Escape');

    for (const organization of organizations) {
      await this.organizationTrigger.click();
      await this.page.getByRole('option', { name: organization, exact: true }).click();

      await this.storeTrigger.click();
      const stores = await this.page.getByRole('option').allTextContents();
      if (stores.length > 0) {
        const store = stores[Math.floor(Math.random() * stores.length)];
        await this.page.getByRole('option', { name: store, exact: true }).click();
        return { organization, store };
      }
      await this.page.keyboard.press('Escape');
    }

    throw new Error(
      `No organization among [${organizations.join(', ')}] has an available client location`
    );
  }

  // ── Fill and submit ─────────────────────────────────────────────────────────────────────

  /** Fill every field the modal offers. Organization/store are auto-picked (see above). */
  async fillPatientDetails(details: PatientDetails): Promise<OrganizationAndStore> {
    await this.firstNameInput.fill(details.firstName);
    if (details.middleName !== undefined) await this.middleNameInput.fill(details.middleName);
    await this.lastNameInput.fill(details.lastName);
    await this.dateOfBirthInput.fill(details.dateOfBirth);
    await this.emailInput.fill(details.email);
    await this.selectGender(details.gender);
    await this.zipcodeInput.fill(details.zipcode);
    if (details.phone !== undefined) await this.phoneInput.fill(details.phone);
    if (details.healthPlan !== undefined) await this.selectHealthPlan(details.healthPlan);

    const organizationAndStore = await this.pickOrganizationAndStore();

    if (details.address) {
      await this.includeAddressCheckbox.setChecked(true);
      await this.addressLine1Input.fill(details.address.addressLine1);
      if (details.address.addressLine2 !== undefined) {
        await this.addressLine2Input.fill(details.address.addressLine2);
      }
      await this.addressCityInput.fill(details.address.city);
      await this.selectAddressState(details.address.state);
    } else {
      await this.includeAddressCheckbox.setChecked(false);
    }

    return organizationAndStore;
  }

  /**
   * Click Save and settle whatever comes next: for RPM-enabled organizations, a "Confirm
   * RPM Enrollment" dialog follows — declined here so this modal only creates the patient.
   *
   * The Add Patient dialog closes as soon as the patient is created, which can happen
   * before the confirm dialog has finished mounting — racing the two would sometimes see
   * "closed" first and wrongly skip the confirm dialog, leaving it open and blocking
   * everything behind it. So this waits for the close first, then checks for the confirm
   * dialog afterwards instead of racing them.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();

    const rpmConfirmHeading = this.page.getByRole('heading', { name: /confirm rpm enrollment/i });
    const rpmConfirmShown = await rpmConfirmHeading
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (rpmConfirmShown) {
      await this.page.getByRole('button', { name: 'No', exact: true }).click();
      await expect(rpmConfirmHeading).toBeHidden();
    }
  }

  /** Fill every field and save. Returns the organization/store the wizard picked. */
  async createPatient(details: PatientDetails): Promise<OrganizationAndStore> {
    const organizationAndStore = await this.fillPatientDetails(details);
    await this.save();
    return organizationAndStore;
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
