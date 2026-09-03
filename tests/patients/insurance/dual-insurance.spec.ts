import { test } from './fixtures';
import { uniqueInsuranceMemberId } from '../../support/test-data';

test.use({ patientTag: 'Dual', patientAgeRange: { minAge: 65, maxAge: 90 } });

/**
 * Add a Dual Eligible Medicare/Medicaid Plan — see fixtures.ts for the shared setup (create
 * patient → Demographic Profile → Insurance Plans), choosing "Dual Eligible Medicare/Medicaid
 * Plan" as the Insurance Type instead of Commercial/Other Plan.
 *
 * That type's final step is a different shape from every other path: it previews *two* plans
 * at once — the Medicare plan just selected via the wizard (Primary) and a second, separate
 * Medicaid plan (Secondary) — and saving creates both in one submission. See
 * AddInsuranceWizard's class docs for the field-disambiguation details.
 */
test.describe('Add dual eligible insurance from patient profile', () => {
  test('previews Primary Medicare + Secondary Medicaid and saves both plans', async ({ insurance }) => {
    test.setTimeout(150_000);

    const wizard = await insurance.openAddInsuranceWizard();
    await wizard.selectPlan({
      insuranceType: 'Dual Eligible Medicare/Medicaid Plan',
      payer: 'Aetna',
      planType: 'HMO',
      insurancePackage: 'Aetna - Dual Complete (Medicare Replacement/Advantage - HMO)'
    });

    // Final step: two plans previewed at once — Primary (Medicare) and Secondary (Medicaid).
    await wizard.expectDualEligiblePreview();

    const primaryMemberId = uniqueInsuranceMemberId();
    const secondaryMemberId = uniqueInsuranceMemberId();
    await wizard.insuranceIdNumberInput.fill(primaryMemberId);
    await wizard.secondaryInsuranceIdNumberInput.fill(secondaryMemberId);
    await wizard.save();

    // Save is successful: both plans now appear on Insurance Plans with the right sequence.
    await insurance.expectInsuranceFound({
      payer: 'Aetna',
      planType: 'Dual Eligible Medicare/Medicaid Plan',
      memberId: primaryMemberId
    });
    await insurance.expectSequence({ payer: 'Aetna', memberId: primaryMemberId }, 'Primary');

    await insurance.expectInsuranceFound({
      payer: 'Traditional Medicaid (NC)',
      planType: 'Medicaid Plan',
      memberId: secondaryMemberId
    });
    await insurance.expectSequence(
      { payer: 'Traditional Medicaid (NC)', memberId: secondaryMemberId },
      'Secondary'
    );
  });
});
