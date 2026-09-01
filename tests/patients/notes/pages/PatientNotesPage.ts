import { expect, type Locator, type Page } from '@playwright/test';
import { AddNoteModal } from './AddNoteModal';
import { EditNoteModal } from './EditNoteModal';

/**
 * A patient's Notes tab (`/patients/:id/details/notes`), reached from the patient detail
 * side nav's "Misc" section.
 *
 * Verified against the DEV portal, build 2026-08-31-1:
 *  - The side nav has a "Notes" button, but so does an unrelated quick-access icon row
 *    higher up on the same patient page — both compute to the exact accessible name
 *    "Notes". Scoping to the `navigation` landmark (only the side nav is one) disambiguates.
 *  - The "add note" control is an icon-only button (a bare `+`, MUI `AddIcon`) with no
 *    accessible name and no unique attribute of its own — there are 3 `AddIcon`s on the
 *    page. It's located structurally: the "Patient Notes" section header is the innermost
 *    container that has both the "Patient Notes" title and an `AddIcon` as descendants
 *    (`.last()` picks the innermost match, since nested ancestors sharing that description
 *    are returned outermost-first in document order).
 *  - Each note row has 3 icon-only action buttons with no accessible names: pin
 *    (`PushPinOutlinedIcon`), edit (`EditIcon`), archive (`ArchiveIcon`), in that order.
 *    Since notes accumulate and aren't cleaned up, rows are found by their description text
 *    rather than by position, so a re-run never picks the wrong row's edit button.
 *  - The toolbar's **SHARE WITH PROVIDERS** button bulk-shares every checked row in one
 *    click, with no confirmation dialog. It's rendered disabled until at least one row
 *    checkbox is checked; Playwright's click already waits on that, so no extra wait is
 *    needed before using it.
 *  - **Archiving does need confirmation.** Both the row archive icon and the toolbar's bulk
 *    archive button open an "Archive note" / "Archive N notes" dialog (heading text varies
 *    with count) with a single "Archive" / "Cancel" choice. Once confirmed, the note(s) drop
 *    out of the default grid view entirely; they only reappear if the toolbar's "Show All"
 *    checkbox is checked (unchecked by default), so `expectNoteNotFound()` is a meaningful
 *    assertion only while that stays unchecked.
 *  - **The toolbar's archive button's accessible name includes the selection count** —
 *    "Archive (2) Notes", etc. — so it's matched by pattern, not exact text.
 *  - **Pinning a note surfaces it in the patient's persistent header** (visible across every
 *    patient sub-page, not just Notes) as a "Click to Edit" field with a pale-yellow
 *    background. That header widget does not update live from the pin toggle alone — a page
 *    reload is needed before it reflects the change (verified quirk; `expectPinnedInHeader()`
 *    reloads for this reason).
 */
export class PatientNotesPage {
  readonly notesNavButton: Locator;
  readonly addNoteButton: Locator;
  readonly grid: Locator;
  readonly shareSelectedButton: Locator;
  readonly archiveSelectedButton: Locator;
  readonly showAllCheckbox: Locator;
  readonly pinnedNoteField: Locator;

  constructor(private readonly page: Page) {
    this.notesNavButton = page.getByRole('navigation').getByRole('button', { name: 'Notes', exact: true });

    const notesHeader = page
      .locator('div')
      .filter({ hasText: 'Patient Notes' })
      .filter({ has: page.getByTestId('AddIcon') })
      .last();
    this.addNoteButton = notesHeader.getByTestId('AddIcon').locator('xpath=ancestor::button[1]');

    this.grid = page.getByRole('grid').first();
    this.shareSelectedButton = page.getByRole('button', { name: 'SHARE WITH PROVIDERS' });
    this.archiveSelectedButton = page.getByRole('button', { name: /^Archive \(\d+\) Notes?$/ });
    this.showAllCheckbox = page.getByRole('checkbox', { name: 'Show All' });
    this.pinnedNoteField = page.getByRole('textbox', { name: 'Click to Edit' });
  }

  /** Navigate from the current patient detail page to its Notes tab. */
  async open(): Promise<void> {
    await this.notesNavButton.click();
    await expect(this.grid).toBeVisible();
  }

  async openAddNoteModal(): Promise<AddNoteModal> {
    await this.addNoteButton.click();
    const modal = new AddNoteModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /** The grid row for a note, found by its current (exact) description. */
  noteRow(description: string): Locator {
    return this.grid
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: description, exact: true }) });
  }

  async openEditNoteModal(description: string): Promise<EditNoteModal> {
    const editButton = this.noteRow(description).getByTestId('EditIcon').locator('xpath=ancestor::button[1]');
    await editButton.click();
    const modal = new EditNoteModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /** Assert a note with the given (exact) description is present in the notes grid. */
  async expectNoteFound(description: string): Promise<void> {
    await expect(this.grid.getByRole('cell', { name: description, exact: true })).toBeVisible();
  }

  /**
   * The "Shared with Provider" cell for a note's row. Empty when not shared; once shared it
   * holds an icon-only `HowToRegIcon` with no accessible name, so it's read via the grid's
   * own `data-field` attribute (MUI DataGrid's stable per-column hook) rather than by role.
   */
  sharedWithProviderCell(description: string): Locator {
    return this.noteRow(description).locator('[data-field="sharedWithProvider"]');
  }

  /** Assert a note has been shared with the provider (the grid shows the "shared" icon). */
  async expectSharedWithProvider(description: string): Promise<void> {
    await expect(this.sharedWithProviderCell(description).getByTestId('HowToRegIcon')).toBeVisible();
  }

  /**
   * The row-selection checkbox for a note, found by its current (exact) description. Its
   * accessible name toggles "Select row" / "Unselect row" with checked state — "select row"
   * is a substring of both, so this one pattern matches it either way.
   */
  noteCheckbox(description: string): Locator {
    return this.noteRow(description).getByRole('checkbox', { name: /select row/i });
  }

  /** Check the row-selection checkbox for each given note, ready for a bulk action. */
  async selectNotes(descriptions: string[]): Promise<void> {
    for (const description of descriptions) {
      await this.noteCheckbox(description).check();
    }
  }

  /** Bulk-share every currently checked note with the provider. */
  async shareSelectedNotes(): Promise<void> {
    await this.shareSelectedButton.click();
  }

  /** Confirms whichever "Archive note" / "Archive N notes" dialog is currently open. */
  private async confirmArchiveDialog(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /^Archive/ });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(dialog).toBeHidden();
  }

  /** Archive a note via its row's archive icon, confirming the dialog. */
  async archiveNote(description: string): Promise<void> {
    const archiveButton = this.noteRow(description).getByTestId('ArchiveIcon').locator('xpath=ancestor::button[1]');
    await archiveButton.click();
    await this.confirmArchiveDialog();
  }

  /** Bulk-archive every currently checked note, confirming the dialog. */
  async archiveSelectedNotes(): Promise<void> {
    await this.archiveSelectedButton.click();
    await this.confirmArchiveDialog();
  }

  /** Assert a note with the given (exact) description is absent from the current grid view. */
  async expectNoteNotFound(description: string): Promise<void> {
    await expect(this.grid.getByRole('cell', { name: description, exact: true })).toHaveCount(0);
  }

  /**
   * Toggle a note's pinned state via its row's pin icon. The icon itself swaps between
   * `PushPinOutlinedIcon` (unpinned) and `PushPinIcon` (pinned), so one pattern covers
   * pinning and unpinning alike.
   */
  async togglePin(description: string): Promise<void> {
    const pinButton = this.noteRow(description)
      .getByTestId(/^PushPin(Outlined)?Icon$/)
      .locator('xpath=ancestor::button[1]');
    await pinButton.click();
  }

  /**
   * Assert a note is shown as pinned in the patient's persistent header widget. Reloads
   * first — see the class-level note on why that's required.
   */
  async expectPinnedInHeader(description: string): Promise<void> {
    await this.page.reload();
    await expect(this.pinnedNoteField).toHaveValue(description);
  }
}
