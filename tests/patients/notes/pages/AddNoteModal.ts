import { expect, type Locator, type Page } from '@playwright/test';

export interface NoteDetails {
  description: string;
  /** Omit to leave the modal's default "Noted During" value untouched. */
  notedDuring?: string;
}

/**
 * The "Add Account Note" modal, opened from a patient's Notes tab.
 *
 * "Noted During" defaults to "Talk with Patient" and Description is required; both are
 * ordinary, properly labelled MUI fields — no locator workarounds needed here (contrast
 * with AddPatientModal's Client Organization / Client Location).
 */
export class AddNoteModal {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;
  readonly descriptionInput: Locator;
  readonly notedDuringTrigger: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Add Account Note' });
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description', exact: true });
    this.notedDuringTrigger = this.dialog.getByRole('button', { name: /^Noted During/ });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
  }

  async selectNotedDuring(value: string): Promise<void> {
    await this.notedDuringTrigger.click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
    // The trigger's own label is the source of truth for what actually got selected — the
    // option click can resolve in the DOM before the app's state update lands, so read this
    // back rather than trusting the click.
    await expect(this.notedDuringTrigger).toHaveText(value);
  }

  async fillNote(details: NoteDetails): Promise<void> {
    if (details.notedDuring !== undefined) {
      await this.selectNotedDuring(details.notedDuring);
    }
    await this.descriptionInput.fill(details.description);
    await expect(this.descriptionInput).toHaveValue(details.description);
  }

  async save(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async createNote(details: NoteDetails): Promise<void> {
    await this.fillNote(details);
    await this.save();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
