import { expect, type Locator, type Page } from '@playwright/test';

export interface FollowUpDetails {
  note: string;
  /** Omit to leave the modal's default "None" Follow-up Sub Type untouched. */
  subCategory?: string;
}

/**
 * The "Add New Follow-up" modal, opened via the patient header's "New Follow-up" button.
 * That header (and its sibling "All Follow-ups" button) is shared across every patient
 * sub-page, not just this RPM Enrolled-patients flow.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - The dialog's own heading has no title text (just a close icon) — the tab strip inside
 *    it does, so the dialog is scoped by the selected tab's text, "Add New Follow-up".
 *  - The dialog also hosts an "All Follow-ups" *tab* showing the same list as the header's
 *    separate "All Follow-ups" button — but that button navigates to a full page
 *    (`/patients/:id/details/follow-ups`) instead, which is what this suite asserts against,
 *    so the in-dialog tab is never used here.
 *  - Follow-up Date / Hour / Minute / Type / Assignee / Status all come pre-filled with
 *    sensible defaults (today+1, 10:00 AM, "Call Patient", the current user, "Pending").
 *  - **Follow-up Sub Type's options render in a listbox outside the dialog's DOM subtree**
 *    (an MUI popper), same as AddNoteModal's "Noted During" — so the option is clicked on
 *    the page, not scoped to `dialog`.
 *  - Saving does fire a "Accounts follow-up created successfully" MUI Snackbar, but it
 *    auto-dismisses too fast to assert on reliably (observed to disappear before an
 *    `expect().toBeVisible()` call ever catches it) — the dialog closing is the signal used
 *    here instead, same as AddNoteModal; the caller's own grid assertion is what confirms
 *    the follow-up actually persisted.
 */
export class NewFollowUpModal {
  readonly dialog: Locator;
  readonly subTypeTrigger: Locator;
  readonly notesInput: Locator;
  readonly addButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Add New Follow-up' });
    this.subTypeTrigger = this.dialog.getByRole('button', { name: 'Follow-up Sub Type (Optional)' });
    this.notesInput = this.dialog.getByRole('textbox', { name: 'Notes (Optional)' });
    this.addButton = this.dialog.getByRole('button', { name: 'ADD', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.notesInput).toBeVisible();
  }

  async selectSubCategory(name: string): Promise<void> {
    await this.subTypeTrigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(this.subTypeTrigger).toHaveText(name);
  }

  async fillFollowUp(details: FollowUpDetails): Promise<void> {
    if (details.subCategory !== undefined) {
      await this.selectSubCategory(details.subCategory);
    }
    await this.notesInput.fill(details.note);
    await expect(this.notesInput).toHaveValue(details.note);
  }

  async save(): Promise<void> {
    await expect(this.addButton).toBeEnabled();
    await this.addButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async createFollowUp(details: FollowUpDetails): Promise<void> {
    await this.fillFollowUp(details);
    await this.save();
  }
}
