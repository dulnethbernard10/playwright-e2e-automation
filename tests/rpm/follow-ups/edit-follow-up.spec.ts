import { test } from './fixtures';
import { uniqueFollowUpNote } from '../../support/test-data';

/**
 * Edit Follow-up — Care Management Patients (Enrolled) → patient context → New Follow-up →
 * All Follow-ups → Edit Entry.
 *
 * Every editable field is changed from its created value (see EditFollowUpModal for the two
 * verified quirks this relies on: the Notes field needing an explicit clear before typing,
 * and re-opening a differently-assigned row popping an unrelated confirmation — not hit here
 * since Edit is only opened once, before any assignee change).
 */
test.describe('Patient follow-ups', () => {
  test('edits a follow-up and the changes persist in All Follow-ups', async ({ followUps }) => {
    const originalNote = uniqueFollowUpNote('EditFollowUp');
    await followUps.createFollowUp(originalNote);

    const editModal = await followUps.openEditFollowUpModal(originalNote);

    const updatedNote = uniqueFollowUpNote('EditFollowUp-Updated');
    await editModal.fillAllFields({
      date: '2026-09-25',
      hour: '03 PM',
      minute: '45',
      type: 'Call Provider',
      assignee: 'Enda Hyatt',
      subCategory: 'CCM',
      status: 'Completed',
      note: updatedNote
    });
    await editModal.update();

    await followUps.openAllFollowUps();
    await followUps.expectFollowUpFound(updatedNote);
    await followUps.expectFollowUpDetails(updatedNote, {
      date: 'Sep 25, 2026',
      time: '3:45 PM EST',
      type: 'Call Provider',
      status: 'Completed',
      subCategory: 'CCM',
      assignee: 'Enda Hyatt'
    });
  });
});
