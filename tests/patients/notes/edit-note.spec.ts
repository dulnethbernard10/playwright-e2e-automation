import { expect, test } from './fixtures';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Edit Note — Patients Lookup → patient context → Notes → pencil icon → Update Account Note.
 *
 * Creates its own note first (rather than depending on one left by another test run), then
 * edits both Description and Noted During, and asserts the grid reflects both changes.
 */
test.describe('Patient notes', () => {
  test('edits an existing note and the grid reflects the change', async ({ notes }) => {
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
