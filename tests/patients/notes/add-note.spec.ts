import { test } from './fixtures';
import { uniqueNoteDescription } from '../../support/test-data';

/**
 * Add Note — Patients Lookup → patient context → Notes → Add Account Note.
 *
 * "Noted During" is left at its default value (see AddNoteModal) since this flow is only
 * about creating a note, not exercising that field.
 */
test.describe('Patient notes', () => {
  test('adds a note and it appears in the notes grid', async ({ notes }) => {
    const description = uniqueNoteDescription('AddNote');
    const modal = await notes.openAddNoteModal();
    await modal.createNote({ description });

    await notes.expectNoteFound(description);
  });
});
