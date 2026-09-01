import { test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Add Note — Patients Lookup → patient context → Notes → Add Account Note.
 *
 * "Noted During" is left at its default value (see AddNoteModal) since this flow is only
 * about creating a note, not exercising that field.
 */
test.describe('Patient notes', () => {
  test('adds a note and it appears in the notes grid', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName('James', 'Baker');
    await patients.openPatient('James Baker');

    const notes = new PatientNotesPage(page);
    await notes.open();

    const description = uniqueNoteDescription('AddNote');
    const modal = await notes.openAddNoteModal();
    await modal.createNote({ description });

    await notes.expectNoteFound(description);
  });
});
