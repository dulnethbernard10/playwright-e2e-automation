import { test } from './fixtures';
import { createTwoMedications } from './helpers';

/**
 * Verify / Unverify Medications — Triage Medications → select 2+ medications → Actions →
 * Verify → Verify/Unverify.
 *
 * This is a more direct route to either verification state than Create MedRec's "Verify,
 * Lock and Certify": it applies immediately with no confirmation dialog, and only ever
 * touches the checked rows rather than also marking every unchecked row Unverified.
 */
test.describe('Verify medications', () => {
  test('verifies selected medications and their status changes from Unverified to Verified', async ({
    medications
  }) => {
    const [sigA, sigB] = await createTwoMedications(medications, 'Verify');

    await medications.expectVerificationStatus(sigA, 'Unverified');
    await medications.expectVerificationStatus(sigB, 'Unverified');

    await medications.selectMedicationCheckboxes([sigA, sigB]);
    await medications.setVerificationStatus('Verify');

    await medications.expectVerificationStatus(sigA, 'Verified');
    await medications.expectVerificationStatus(sigB, 'Verified');
  });

  test('unverifies selected medications and their status changes from Verified to Unverified', async ({
    medications
  }) => {
    const [sigA, sigB] = await createTwoMedications(medications, 'Unverify');

    await medications.selectMedicationCheckboxes([sigA, sigB]);
    await medications.setVerificationStatus('Verify');

    await medications.expectVerificationStatus(sigA, 'Verified');
    await medications.expectVerificationStatus(sigB, 'Verified');

    await medications.selectMedicationCheckboxes([sigA, sigB], 'Verified');
    await medications.setVerificationStatus('Unverify');

    await medications.expectVerificationStatus(sigA, 'Unverified');
    await medications.expectVerificationStatus(sigB, 'Unverified');
  });
});
