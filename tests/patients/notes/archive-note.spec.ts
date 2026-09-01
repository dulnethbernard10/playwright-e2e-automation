import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Archive notes — Notes → archive icon / bulk archive button → "Archive" confirmation.
 *
 * Both tests create their own notes first (self-contained, no dependency on state left by
 * other test runs), archive them, and assert they disappear from the default grid view (see
 * PatientNotesPage for the "Show All" caveat).
 */
test.describe('Patient notes', () => {
  let notes: PatientNotesPage;

  test.beforeEach(async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName('James', 'Baker');
    await patients.openPatient('James Baker');

    notes = new PatientNotesPage(page);
    await notes.open();
  });

  test('archives a single note via its row action and it is no longer visible in the grid', async () => {
    const description = uniqueNoteDescription('ArchiveNote');
    const addModal = await notes.openAddNoteModal();
    await addModal.createNote({ description });
    await notes.expectNoteFound(description);

    await notes.archiveNote(description);

    await notes.expectNoteNotFound(description);
  });

  test('bulk-archives multiple checked notes and none remain visible in the grid', async () => {
    const descriptions = [uniqueNoteDescription('BulkArchiveA'), uniqueNoteDescription('BulkArchiveB')];
    for (const description of descriptions) {
      const addModal = await notes.openAddNoteModal();
      await addModal.createNote({ description });
      await notes.expectNoteFound(description);
    }

    await notes.selectNotes(descriptions);
    await notes.archiveSelectedNotes();

    for (const description of descriptions) {
      await notes.expectNoteNotFound(description);
    }
  });
});
