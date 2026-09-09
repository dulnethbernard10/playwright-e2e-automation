import { test } from './fixtures';
import { uniqueFollowUpNote } from '../../support/test-data';

/**
 * Add Follow-up — Care Management Patients (Enrolled) → patient context → New Follow-up.
 *
 * All fields besides Notes and Follow-up Sub Type are left at their defaults (see
 * NewFollowUpModal) since this flow is only about creating a follow-up, not exercising
 * scheduling/assignee fields.
 */
test.describe('Patient follow-ups', () => {
  test('adds a follow-up and it appears in All Follow-ups', async ({ followUps }) => {
    const note = uniqueFollowUpNote('AddFollowUp');
    await followUps.createFollowUp(note);

    await followUps.expectFollowUpFound(note);
  });
});
