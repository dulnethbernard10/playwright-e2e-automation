import { expect, type Locator, type Page } from '@playwright/test';

/**
 * "Certify Med Rec" — the name/description form that follows Triage Medications' "Verify,
 * Lock and Certify" confirmation (see `TriageMedicationsPage.startCreateMedRec()`).
 *
 * Submitting sometimes pops a second confirmation, "Assign Medication Reconciliation
 * Snapshot?" (make this the patient's primary RPM MedRec?) — confirmed to appear for a
 * patient's first-ever MedRec, and confirmed to be skipped entirely for a later one once
 * the patient already has a primary. `submit()` answers it when it shows and otherwise just
 * moves on, mirroring `AddPatientModal.save()`'s handling of its own optional follow-up
 * dialog: wait for this modal to close first, then check for the follow-up afterwards,
 * rather than racing the two.
 */
export class CertifyMedRecModal {
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Certify Med Rec' });
    this.nameInput = this.dialog.getByRole('textbox', { name: 'Name', exact: true });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description (optional)', exact: true });
    this.submitButton = this.dialog.getByRole('button', { name: 'Submit', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async fill(name: string, description?: string): Promise<void> {
    await this.nameInput.fill(name);
    if (description !== undefined) {
      await this.descriptionInput.fill(description);
    }
  }

  /**
   * Submits, then answers the "Assign Medication Reconciliation Snapshot?" dialog if it
   * appears — see the class-level note on why it doesn't always.
   */
  async submit(makePrimary: boolean): Promise<void> {
    await this.submitButton.click();
    await expect(this.dialog).toBeHidden();

    const assignDialog = this.page.getByRole('dialog').filter({
      hasText: 'Assign Medication Reconciliation Snapshot'
    });
    const assignDialogShown = await assignDialog
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (assignDialogShown) {
      await assignDialog.getByRole('button', { name: makePrimary ? 'Yes' : 'No', exact: true }).click();
      await expect(assignDialog).toBeHidden();
    }
  }

  async createMedRec(name: string, description?: string, makePrimary = true): Promise<void> {
    await this.fill(name, description);
    await this.submit(makePrimary);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
