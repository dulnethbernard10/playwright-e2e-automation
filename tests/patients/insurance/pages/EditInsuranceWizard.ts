import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The "Edit Insurance Plan" dialog, opened from a saved plan card's pencil-icon "Edit" button
 * on Insurance Plans.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Unlike Add New Insurance's multi-step wizard, this is a single flat form — Policy Holder
 *    Details and Plan Details, both pre-filled from the existing plan.
 *  - **Only Insurance ID Number is editable.** Insurance Package, Sequence, and Insurance
 *    Phone Number are all rendered disabled, matching every other read-only field on the
 *    Policy Holder Details side. There's currently no supported way to change a plan's payer,
 *    package, or sequence after creation — only re-issue its Member ID.
 *  - The submit button is labelled **"Update Insurance Plan"**, not "Save".
 *  - **The app uppercases Insurance ID Number on submit** (e.g. `...Orig` is saved and
 *    displayed back as `...ORIG`). Not an issue for `uniqueInsuranceMemberId()`, whose output
 *    is already all-uppercase/digits, but worth knowing if a future caller passes lowercase.
 */
export class EditInsuranceWizard {
  readonly dialog: Locator;
  readonly insuranceIdNumberInput: Locator;
  readonly insurancePackageCombobox: Locator;
  readonly sequenceTrigger: Locator;
  readonly insurancePhoneNumberInput: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Edit Insurance Plan' });
    this.insuranceIdNumberInput = this.dialog.getByRole('textbox', { name: 'Insurance ID Number', exact: true });
    this.insurancePackageCombobox = this.dialog.getByRole('combobox', { name: 'Insurance Package', exact: true });
    this.sequenceTrigger = this.dialog.getByRole('button', { name: /^(Primary|Secondary|Tertiary|Insurance \d+)$/ });
    this.insurancePhoneNumberInput = this.dialog.getByRole('textbox', { name: 'Insurance Phone Number', exact: true });
    this.updateButton = this.dialog.getByRole('button', { name: 'Update Insurance Plan', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.insuranceIdNumberInput).toBeVisible();
  }

  /** Assert only Insurance ID Number is editable — see class docs. */
  async expectOnlyInsuranceIdNumberEditable(): Promise<void> {
    await expect(this.insuranceIdNumberInput).toBeEnabled();
    await expect(this.insurancePackageCombobox).toBeDisabled();
    await expect(this.sequenceTrigger).toBeDisabled();
    await expect(this.insurancePhoneNumberInput).toBeDisabled();
  }

  /** Replace Insurance ID Number and submit. */
  async update(insuranceIdNumber: string): Promise<void> {
    await this.insuranceIdNumberInput.fill(insuranceIdNumber);
    await this.updateButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
