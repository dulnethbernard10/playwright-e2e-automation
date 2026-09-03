import { addCignaInsurancePlan, test } from './fixtures';

test.use({ patientTag: 'Insurance', patientGender: 'Male' });

/**
 * Add insurance from a patient's profile — see fixtures.ts for the shared setup (create patient
 * → Demographic Profile → Insurance Plans).
 *
 * Extended timeout: a DEV-environment issue can make adding insurance for a freshly created
 * patient fail server-side (see AddInsuranceWizard's class docs and the DEV environment note in
 * CLAUDE.md) — AddInsuranceWizard.save()'s built-in retry needs the extra room to recover
 * without slowing down a passing run.
 */
test.describe('Add insurance from patient profile', () => {
  test('adds a new insurance plan and verifies it on the Insurance Plans screen', async ({ insurance }) => {
    test.setTimeout(150_000);

    await addCignaInsurancePlan(insurance);
  });
});
