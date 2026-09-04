import { test } from './fixtures';
import { certifyAndExpectMedRecFound, createTwoMedications } from './helpers';

/**
 * Create MedRec — Triage Medications → select 2+ medications → Create MedRec.
 *
 * "Create MedRec" doesn't open the naming form directly: it first requires confirming
 * "Verify, Lock and Certify" (which marks the checked rows Verified and everything else
 * Unverified — only verified rows are eligible for a MedRec), and only then does the actual
 * "Certify Med Rec" name/description form appear. See TriageMedicationsPage and
 * CertifyMedRecModal for the full chain.
 */
test.describe('Create MedRec', () => {
  test('creates a MedRec from selected medications and it appears in Medication Reconciliation', async ({
    page,
    medications
  }) => {
    const [sigA, sigB] = await createTwoMedications(medications, 'CreateMedRec');
    await medications.selectMedicationCheckboxes([sigA, sigB]);

    const certifyModal = await medications.startCreateMedRec();
    await certifyAndExpectMedRecFound(page, certifyModal, 'CreateMedRec');
  });
});
