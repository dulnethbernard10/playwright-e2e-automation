import { expect, type Locator, type Page } from '@playwright/test';
import { NewFollowUpModal } from './NewFollowUpModal';
import { EditFollowUpModal } from './EditFollowUpModal';

export interface FollowUpRowDetails {
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  subCategory?: string;
  assignee?: string;
}

/**
 * The patient detail header's follow-up controls ("New Follow-up" / "All Follow-ups"),
 * present on every patient sub-page, plus the "All Follow-ups" list page
 * (`/patients/:id/details/follow-ups`) that the latter button navigates to.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Despite a count badge ("3") rendered next to it, the "All Follow-ups" button's own
 *    accessible name/text is the static label alone — the count lives in a separate sibling
 *    element — so it needs no pattern match, unlike the count-dependent buttons documented
 *    elsewhere in this app (e.g. notes' bulk-archive button).
 *  - **The row's pencil ("Edit Entry") and trash ("Delete Entry") icon buttons are icon-only
 *    with no accessible name of their own** — "Edit Entry"/"Delete Entry" is an `aria-label`
 *    on a wrapping `<span>` (an MUI Tooltip anchor), not on the `<button>` itself. Found
 *    structurally instead, via each icon's own testid, same pattern as PatientNotesPage's
 *    row actions.
 *  - The grid's columns carry stable MUI DataGrid `data-field` attributes
 *    (`followupDate`, `followupTime`, `type`, `status`, `subType`, `assignedTo`, `notes`),
 *    used here for per-column assertions on a specific row.
 *  - **Deleting a follow-up currently assigned to someone other than the current user pops
 *    the same "This Follow-up is assigned to X. Are you sure?" confirmation documented on
 *    `EditFollowUpModal`, before the actual delete confirmation.** A freshly-created
 *    follow-up is always self-assigned, so `deleteFollowUp()` doesn't handle it — a future
 *    test deleting a reassigned row would need to.
 *  - The real delete confirmation is a "Delete Follow-up" dialog ("There is 1 follow-up
 *    scheduled for <patient>. This action will modify the calendar items. Are you sure?")
 *    with No/Yes buttons. Confirming removes the row immediately, client-side — no reload
 *    needed for it to disappear from the grid.
 */
export class PatientFollowUpsPage {
  readonly newFollowUpButton: Locator;
  readonly allFollowUpsButton: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.newFollowUpButton = page.getByRole('button', { name: 'New Follow-up', exact: true });
    this.allFollowUpsButton = page.getByRole('button', { name: 'All Follow-ups', exact: true });
    this.grid = page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'Note', exact: true }) });
  }

  async openNewFollowUpModal(): Promise<NewFollowUpModal> {
    await this.newFollowUpButton.click();
    const modal = new NewFollowUpModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /**
   * Create a follow-up with the given note (and default Sub Type "RPM") and land on the All
   * Follow-ups list page — the common starting point every follow-up spec needs before its
   * own edit/delete action.
   */
  async createFollowUp(note: string, subCategory = 'RPM'): Promise<void> {
    const modal = await this.openNewFollowUpModal();
    await modal.createFollowUp({ note, subCategory });
    await this.openAllFollowUps();
  }

  /** Navigate from the current patient sub-page to the full "All Follow-ups" list page. */
  async openAllFollowUps(): Promise<void> {
    await this.allFollowUpsButton.click();
    await expect(this.grid).toBeVisible();
  }

  /** The grid row for a follow-up, found by its current (exact) note text. */
  followUpRow(note: string): Locator {
    return this.grid.getByRole('row').filter({ has: this.page.getByRole('cell', { name: note, exact: true }) });
  }

  /** Assert a follow-up with the given (exact) note text is present in the All Follow-ups grid. */
  async expectFollowUpFound(note: string): Promise<void> {
    await expect(this.followUpRow(note)).toBeVisible();
  }

  async openEditFollowUpModal(note: string): Promise<EditFollowUpModal> {
    const editButton = this.followUpRow(note).getByTestId('EditIcon').locator('xpath=ancestor::button[1]');
    await editButton.click();
    const modal = new EditFollowUpModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /** Assert a follow-up row's other column values, keyed by its (exact, current) note text. */
  async expectFollowUpDetails(note: string, details: FollowUpRowDetails): Promise<void> {
    const row = this.followUpRow(note);
    if (details.date !== undefined) {
      await expect(row.locator('[data-field="followupDate"]')).toHaveText(details.date);
    }
    if (details.time !== undefined) {
      await expect(row.locator('[data-field="followupTime"]')).toHaveText(details.time);
    }
    if (details.type !== undefined) {
      await expect(row.locator('[data-field="type"]')).toHaveText(details.type);
    }
    if (details.status !== undefined) {
      await expect(row.locator('[data-field="status"]')).toHaveText(details.status);
    }
    if (details.subCategory !== undefined) {
      await expect(row.locator('[data-field="subType"]')).toHaveText(details.subCategory);
    }
    if (details.assignee !== undefined) {
      await expect(row.locator('[data-field="assignedTo"]')).toHaveText(details.assignee);
    }
  }

  /** Delete a follow-up via its row's trash icon, confirming the "Delete Follow-up" dialog. */
  async deleteFollowUp(note: string): Promise<void> {
    const deleteButton = this.followUpRow(note).getByTestId('DeleteIcon').locator('xpath=ancestor::button[1]');
    await deleteButton.click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Delete Follow-up' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(dialog).toBeHidden();
  }

  /** Assert a follow-up with the given (exact) note text is absent from the current grid view. */
  async expectFollowUpNotFound(note: string): Promise<void> {
    await expect(this.followUpRow(note)).toHaveCount(0);
  }
}
