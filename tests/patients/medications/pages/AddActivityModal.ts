import { expect, type Locator, type Page } from '@playwright/test';

export interface ActivityDetails {
  note: string;
  shareWithProvider: boolean;
  durationMinutes: number;
}

/**
 * "Add Activity" — opened from the patient's Medications header (see
 * `TriageMedicationsPage.openAddActivityModal()`).
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Category and Subcategory arrive pre-filled with account/context defaults (confirmed:
 *    "Medication Management Support" / "Medication regimen review based on device reading
 *    trends" for an RPM patient) — this class leaves them alone unless a test overrides them.
 *  - Contact Mode is a group of plain toggle buttons (Phone / In-Person / N/A), not a
 *    radiogroup, and defaults to "N/A" pressed.
 *  - Share w/ Provider is a real `radiogroup` ("Yes" / "No") with neither option pre-checked —
 *    it's required, so a test must pick one explicitly.
 *  - Reviewed Datetime defaults to "now" and Duration (Mins) has no default; the dialog shows
 *    a live "N min → RPM" / monthly-totals preview as Duration is typed, purely informational.
 */
export class AddActivityModal {
  readonly dialog: Locator;
  readonly notesTextbox: Locator;
  readonly shareWithProviderYes: Locator;
  readonly shareWithProviderNo: Locator;
  readonly durationInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Add Activity' });
    this.notesTextbox = this.dialog.getByRole('textbox', { name: 'Add notes' });
    this.shareWithProviderYes = this.dialog.getByRole('radio', { name: 'Yes', exact: true });
    this.shareWithProviderNo = this.dialog.getByRole('radio', { name: 'No', exact: true });
    this.durationInput = this.dialog.getByRole('spinbutton', { name: 'Duration (Mins)', exact: true });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.notesTextbox).toBeVisible();
  }

  async fill(details: ActivityDetails): Promise<void> {
    await this.notesTextbox.fill(details.note);
    await (details.shareWithProvider ? this.shareWithProviderYes : this.shareWithProviderNo).check();
    await this.durationInput.fill(String(details.durationMinutes));
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async addActivity(details: ActivityDetails): Promise<void> {
    await this.fill(details);
    await this.save();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
