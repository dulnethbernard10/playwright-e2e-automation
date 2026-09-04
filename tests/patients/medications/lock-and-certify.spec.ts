import { test } from './fixtures';
import { certifyAndExpectMedRecFound, createTwoMedications } from './helpers';

/**
 * Lock & Certify — Triage Medications → verify 2+ medications → the page header's
 * "Lock & Certify" button (not the grid toolbar's "Create MedRec").
 *
 * See `TriageMedicationsPage.lockAndCertify()` for why this is a genuinely different route
 * to the same "Certify Med Rec" form: it skips the "Confirm Action" step entirely and
 * certifies whatever is already Verified, so the medications must be verified up front.
 */
test.describe('Lock & Certify', () => {
  test('certifies verified medications and the MedRec appears in Medication Reconciliation', async ({
    page,
    medications
  }) => {
    const [sigA, sigB] = await createTwoMedications(medications, 'LockCertify');

    await medications.selectMedicationCheckboxes([sigA, sigB]);
    await medications.setVerificationStatus('Verify');

    await medications.expectVerificationStatus(sigA, 'Verified');
    await medications.expectVerificationStatus(sigB, 'Verified');

    const certifyModal = await medications.lockAndCertify();
    await certifyAndExpectMedRecFound(page, certifyModal, 'LockCertify');
  });
});
