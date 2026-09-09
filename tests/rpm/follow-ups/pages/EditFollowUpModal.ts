import { expect, type Locator, type Page } from '@playwright/test';

export interface FollowUpEditDetails {
  date: string;
  /** e.g. "03 PM" — combined hour + AM/PM, matching the field's own "hh aa" placeholder. */
  hour: string;
  /** e.g. "45" — matches the field's own "mm" placeholder. */
  minute: string;
  type: string;
  assignee: string;
  subCategory: string;
  status: string;
  note: string;
}

/**
 * The "Update Follow Up On" modal, opened via a follow-up row's pencil ("Edit Entry") icon
 * on the All Follow-ups page. Same field set as `NewFollowUpModal`, pre-filled with the
 * follow-up's current values, plus a Status field fixed to "Pending"/"Completed".
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - **Re-opening a follow-up already assigned to someone other than the current user pops a
 *    "This Follow-up is assigned to X. Are you sure?" Yes/No confirmation before the edit
 *    dialog itself appears.** Changing the assignee *within* an edit-and-Update pass does
 *    NOT trigger this — only re-opening the row afterward does. This suite only opens Edit
 *    once (before any assignee change), so it never encounters this dialog; a future test
 *    that edits the same row twice would need to handle it.
 *  - **The Notes field concatenates instead of replacing when set via a plain `.fill()`
 *    over its prefilled value** — the new text lands before the untouched old text, with no
 *    separator (e.g. "New textOld text"). Real keyboard clearing (select all + Delete) before
 *    filling does not exhibit this, so `setNote()` does that first. This looks like a genuine
 *    app defect (a real user replacing the text via select-all-and-type would hit it too,
 *    though normal incremental typing might not) — worth a bug report, but it doesn't block
 *    editing since the workaround is reliable.
 *  - Follow-up Type / Sub Type / Status options render in a listbox outside the dialog's DOM
 *    subtree (MUI poppers), same as `NewFollowUpModal` — option clicks target the page, not
 *    `dialog`.
 *  - Follow-up Assignee is a proper MUI Autocomplete here (an editable `combobox`, with
 *    "Clear"/"Open" buttons once a value is set) — its options list also renders outside the
 *    dialog.
 */
export class EditFollowUpModal {
  readonly dialog: Locator;
  readonly dateInput: Locator;
  readonly hourInput: Locator;
  readonly minuteInput: Locator;
  readonly typeTrigger: Locator;
  readonly assigneeCombobox: Locator;
  readonly assigneeOpenButton: Locator;
  readonly subTypeTrigger: Locator;
  readonly statusTrigger: Locator;
  readonly notesInput: Locator;
  readonly updateButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Update Follow Up On' });
    this.dateInput = this.dialog.getByRole('textbox', { name: 'Follow-up Date', exact: true });
    this.hourInput = this.dialog.getByRole('textbox', { name: /^Follow-up Hour/ });
    this.minuteInput = this.dialog.getByRole('textbox', { name: 'mm', exact: true });
    this.typeTrigger = this.dialog.getByRole('button', { name: 'Follow-up Type *', exact: true });
    this.assigneeCombobox = this.dialog.getByRole('combobox', { name: 'Follow-up Assignee' });
    this.assigneeOpenButton = this.dialog.getByRole('button', { name: 'Open', exact: true });
    this.subTypeTrigger = this.dialog.getByRole('button', { name: 'Follow-up Sub Type (Optional)' });
    this.statusTrigger = this.dialog.getByRole('button', { name: 'Status', exact: true });
    this.notesInput = this.dialog.getByRole('textbox', { name: 'Notes (Optional)' });
    this.updateButton = this.dialog.getByRole('button', { name: 'UPDATE', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.notesInput).toBeVisible();
  }

  private async selectFromListbox(trigger: Locator, name: string): Promise<void> {
    await trigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(trigger).toHaveText(name);
  }

  async setDate(date: string): Promise<void> {
    await this.dateInput.fill(date);
  }

  async setTime(hour: string, minute: string): Promise<void> {
    await this.hourInput.fill(hour);
    await this.minuteInput.fill(minute);
  }

  async setType(name: string): Promise<void> {
    await this.selectFromListbox(this.typeTrigger, name);
  }

  async setAssignee(name: string): Promise<void> {
    await this.assigneeOpenButton.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(this.assigneeCombobox).toHaveValue(name);
  }

  async setSubCategory(name: string): Promise<void> {
    await this.selectFromListbox(this.subTypeTrigger, name);
  }

  async setStatus(name: string): Promise<void> {
    await this.selectFromListbox(this.statusTrigger, name);
  }

  /** See the class-level note on why a plain `.fill()` over existing text is unsafe here. */
  async setNote(note: string): Promise<void> {
    await this.notesInput.click();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Delete');
    await this.notesInput.fill(note);
    await expect(this.notesInput).toHaveValue(note);
  }

  async fillAllFields(details: FollowUpEditDetails): Promise<void> {
    await this.setDate(details.date);
    await this.setTime(details.hour, details.minute);
    await this.setType(details.type);
    await this.setAssignee(details.assignee);
    await this.setSubCategory(details.subCategory);
    await this.setStatus(details.status);
    await this.setNote(details.note);
  }

  async update(): Promise<void> {
    await expect(this.updateButton).toBeEnabled();
    await this.updateButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
