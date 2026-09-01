import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Share notes with provider — Notes → "Share with provider".
 *
 * Both tests create their own notes first (self-contained, no dependency on state left by
 * other test runs) and assert via the grid's "Shared with Provider" column.
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

  test('shares a single note via its edit modal and the grid shows it', async () => {
    const description = uniqueNoteDescription('ShareNote');
    const addModal = await notes.openAddNoteModal();
    await addModal.createNote({ description });
    await notes.expectNoteFound(description);

    const editModal = await notes.openEditNoteModal(description);
    await editModal.shareWithProviderCheckbox.check();
    await editModal.save();

    await notes.expectSharedWithProvider(description);
  });

  test('bulk-shares multiple checked notes and the grid shows it for each', async () => {
    const descriptions = [uniqueNoteDescription('BulkShareA'), uniqueNoteDescription('BulkShareB')];
    for (const description of descriptions) {
      const addModal = await notes.openAddNoteModal();
      await addModal.createNote({ description });
      await notes.expectNoteFound(description);
    }

    await notes.selectNotes(descriptions);
    await notes.shareSelectedNotes();

    for (const description of descriptions) {
      await notes.expectSharedWithProvider(description);
    }
  });
});
