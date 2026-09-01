import { expect, test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * "Show All" toggle — Notes → Show All checkbox.
 *
 * Creates one non-archived and one archived note (self-contained, so the assertions don't
 * depend on which of the many pre-existing notes happen to be archived), then checks that
 * the archived note is hidden by default, appears once "Show All" is checked, and is hidden
 * again once it's unchecked.
 */
test.describe('Patient notes', () => {
  test('toggling Show All reveals archived notes and hides them again', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName('James', 'Baker');
    await patients.openPatient('James Baker');

    const notes = new PatientNotesPage(page);
    await notes.open();

    const visible = uniqueNoteDescription('ShowAllVisible');
    const archived = uniqueNoteDescription('ShowAllArchived');
    for (const description of [visible, archived]) {
      const addModal = await notes.openAddNoteModal();
      await addModal.createNote({ description });
      await notes.expectNoteFound(description);
    }
    await notes.archiveNote(archived);

    // Default: Show All is unchecked, so only the non-archived note appears.
    await expect(notes.showAllCheckbox).not.toBeChecked();
    await notes.expectNoteNotFound(archived);
    await notes.expectNoteFound(visible);

    // Checked: both the archived and non-archived notes appear.
    await notes.showAllCheckbox.check();
    await notes.expectNoteFound(archived);
    await notes.expectNoteFound(visible);

    // Unchecked again: back to only the non-archived note.
    await notes.showAllCheckbox.uncheck();
    await notes.expectNoteNotFound(archived);
    await notes.expectNoteFound(visible);
  });
});
