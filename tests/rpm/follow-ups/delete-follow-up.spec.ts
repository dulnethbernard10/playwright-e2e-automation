import { test } from './fixtures';
import { uniqueFollowUpNote } from '../../support/test-data';

/**
 * Delete Follow-up — Care Management Patients (Enrolled) → patient context → New Follow-up →
 * All Follow-ups → Delete Entry.
 *
 * The follow-up is self-assigned (created with default details, per NewFollowUpModal), so
 * deleting it goes straight to the "Delete Follow-up" confirmation with no intervening
 * "assigned to someone else" dialog — see PatientFollowUpsPage for that caveat.
 */
test.describe('Patient follow-ups', () => {
  test('deletes a follow-up and it no longer appears in All Follow-ups', async ({ followUps }) => {
    const note = uniqueFollowUpNote('DeleteFollowUp');
    await followUps.createFollowUp(note);
    await followUps.expectFollowUpFound(note);

    await followUps.deleteFollowUp(note);
    await followUps.expectFollowUpNotFound(note);
  });
});
