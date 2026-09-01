import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Pin a note — Notes → pin icon (1st row action) → patient header widget.
 *
 * Creates its own note first (self-contained), pins it, and asserts it appears in the
 * patient's persistent header "Click to Edit" field (a page reload is required for that
 * field to pick up the change — see PatientNotesPage.expectPinnedInHeader()).
 */
test.describe('Patient notes', () => {
  test('pins a note and it appears in the patient header', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName('James', 'Baker');
    await patients.openPatient('James Baker');

    const notes = new PatientNotesPage(page);
    await notes.open();

    const description = uniqueNoteDescription('PinNote');
    const addModal = await notes.openAddNoteModal();
    await addModal.createNote({ description });
    await notes.expectNoteFound(description);

    await notes.togglePin(description);

    await notes.expectPinnedInHeader(description);
  });
});
