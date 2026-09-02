import { expect, type Locator, type Page } from '@playwright/test';
import type { NoteDetails } from './AddNoteModal';

/**
 * The "Update Account Note" modal, opened via a note row's edit (pencil) icon.
 *
 * Same Noted During / Description fields as AddNoteModal, pre-filled with the note's
 * current values, plus a "Share with provider" checkbox that only appears in edit mode.
 */
export class EditNoteModal {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;
  readonly descriptionInput: Locator;
  readonly notedDuringTrigger: Locator;
  readonly shareWithProviderCheckbox: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Update Account Note' });
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.descriptionInput = this.dialog.getByRole('textbox', { name: 'Description', exact: true });
    this.notedDuringTrigger = this.dialog.getByRole('button', { name: /^Noted During/ });
    this.shareWithProviderCheckbox = this.dialog.getByRole('checkbox', { name: 'Share with provider' });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    // Description is prefilled from the note asynchronously after the dialog opens. Editing
    // before that prefill lands has been observed to get silently clobbered once it resolves
    // — wait for real content, not just visibility, before handing control back.
    await expect(this.descriptionInput).not.toHaveValue('');
  }

  async selectNotedDuring(value: string): Promise<void> {
    await this.notedDuringTrigger.click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
    // The trigger's own label is the source of truth for what actually got selected — the
    // option click can resolve in the DOM before the app's state update lands, so read this
    // back rather than trusting the click.
    await expect(this.notedDuringTrigger).toHaveText(value);
  }

  /** Overwrites whichever fields are provided; omitted fields keep their current value. */
  async fillNote(details: Partial<NoteDetails>): Promise<void> {
    if (details.notedDuring !== undefined) {
      await this.selectNotedDuring(details.notedDuring);
    }
    if (details.description !== undefined) {
      await this.descriptionInput.fill(details.description);
      // Confirm the value landed before Save reads it — a save observed to sometimes close
      // the dialog without persisting the new description.
      await expect(this.descriptionInput).toHaveValue(details.description);
    }
  }

  async save(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async updateNote(details: Partial<NoteDetails>): Promise<void> {
    await this.fillNote(details);
    await this.save();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
