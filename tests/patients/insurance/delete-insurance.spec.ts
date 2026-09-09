import { addCignaInsurancePlan, test } from './fixtures';

test.use({ patientTag: 'DeleteIns' });

/**
 * Delete an existing insurance plan — see fixtures.ts for the shared setup (create patient →
 * Demographic Profile → Insurance Plans → add a Cigna plan), then delete it via the card's
 * Delete button and confirm the resulting "Delete Insurance Plan" dialog.
 *
 * See InsurancePlansPage.deleteInsurance() for the confirmation-dialog details.
 */
test.describe('Delete insurance plan', () => {
  test('removes the plan after confirming the delete dialog', async ({ insurance }) => {
    test.setTimeout(150_000);

    const memberId = await addCignaInsurancePlan(insurance);

    await insurance.deleteInsurance('Cigna', memberId);

    await insurance.expectInsuranceNotFound('Cigna', memberId);
  });
});
