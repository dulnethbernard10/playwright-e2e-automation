import { addCignaInsurancePlan, test } from './fixtures';
import { uniqueInsuranceMemberId } from '../../support/test-data';

test.use({ patientTag: 'EditIns' });

/**
 * Edit an existing insurance plan — see fixtures.ts for the shared setup (create patient →
 * Demographic Profile → Insurance Plans → add a Cigna plan), then reopen it via the card's Edit
 * button and update its Insurance ID Number.
 *
 * Only Insurance ID Number is editable today — see EditInsuranceWizard's class docs. The test
 * asserts that constraint explicitly (Insurance Package, Sequence, and Insurance Phone Number
 * all stay disabled) rather than just working around it, so a future loosening of that
 * restriction shows up as a meaningful assertion failure here.
 */
test.describe('Edit insurance plan', () => {
  test('updates the Insurance ID Number and leaves every other field unchanged', async ({ insurance }) => {
    test.setTimeout(150_000);

    const originalMemberId = await addCignaInsurancePlan(insurance);

    const editWizard = await insurance.openEditInsuranceWizard('Cigna', originalMemberId);
    await editWizard.expectOnlyInsuranceIdNumberEditable();

    const updatedMemberId = uniqueInsuranceMemberId();
    await editWizard.update(updatedMemberId);

    // The update took effect: the card now shows the new Member ID...
    await insurance.expectInsuranceFound({
      payer: 'Cigna',
      planType: 'Commercial/ Other Plan',
      memberId: updatedMemberId
    });
    // ...and the old one is gone, not just duplicated alongside the new one.
    await insurance.insuranceCard('Cigna', originalMemberId).waitFor({ state: 'hidden' });
  });
});
