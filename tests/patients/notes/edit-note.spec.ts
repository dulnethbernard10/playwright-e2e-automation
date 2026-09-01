import { expect, test } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Edit Note — Patients Lookup → patient context → Notes → pencil icon → Update Account Note.
 *
 * Creates its own note first (rather than depending on one left by another test run), then
 * edits both Description and Noted During, and asserts the grid reflects both changes.
 */
test.describe('Patient notes', () => {
  test('edits an existing note and the grid reflects the change', async ({ page }) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName('James', 'Baker');
    await patients.openPatient('James Baker');

    const notes = new PatientNotesPage(page);
    await notes.open();

    const original = uniqueNoteDescription('EditNote');
    const addModal = await notes.openAddNoteModal();
    await addModal.createNote({ description: original });
    await notes.expectNoteFound(original);

    const updated = `${original} EDITED`;
    const editModal = await notes.openEditNoteModal(original);
    await editModal.updateNote({ description: updated, notedDuring: 'Talk with Provider' });

    await notes.expectNoteFound(updated);
    await expect(
      notes.noteRow(updated).getByRole('cell', { name: 'Talk with Provider', exact: true })
    ).toBeVisible();
  });
});
