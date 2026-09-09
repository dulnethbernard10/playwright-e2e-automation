import type { InsuranceSelection } from './pages/AddInsuranceWizard';
import { test } from './fixtures';
import { uniqueInsuranceMemberId } from '../../support/test-data';

test.use({ patientTag: 'Sequence', patientGender: 'Male' });

/**
 * Insurance sequence numbering — adding a 2nd and 3rd plan to the same patient auto-assigns
 * "Secondary" and "Tertiary" (the field is disabled; the app computes it, not the user). See
 * fixtures.ts for the shared setup (create patient → Demographic Profile → Insurance Plans).
 *
 * The Insurance Plans screen's own saved-plan card disagrees with the wizard for the 3rd plan
 * onward: the wizard's Sequence preview says "Tertiary", but the card renders "Insurance 3"
 * instead (verified against the DEV portal, build 2026-09-01-2 — see AddInsuranceWizard's and
 * InsurancePlansPage's class docs, and the "Add Insurance wizard" section of CLAUDE.md). This
 * test asserts both behaviors as they actually are rather than assuming they agree.
 */
test.describe('Insurance sequence numbering', () => {
  test('assigns Primary, Secondary, and Tertiary in order as plans are added', async ({ insurance }) => {
    test.setTimeout(240_000);

    // Different payers per plan — Insurance Plans' own duplicate-detection behaviour for a
    // repeated payer/package on the same patient isn't part of what this test is verifying.
    const plans: Array<Omit<InsuranceSelection, 'insuranceIdNumber'> & {
      wizardSequence: string;
      cardSequence: string;
    }> = [
      {
        insuranceType: 'Commercial/ Other Plan',
        payer: 'Cigna',
        planType: 'PPO',
        insurancePackage: 'Cigna',
        wizardSequence: 'Primary',
        cardSequence: 'Primary'
      },
      {
        insuranceType: 'Commercial/ Other Plan',
        payer: 'BCBS',
        planType: 'PPO',
        insurancePackage: 'BCBS-NC',
        wizardSequence: 'Secondary',
        cardSequence: 'Secondary'
      },
      {
        insuranceType: 'Commercial/ Other Plan',
        payer: 'UHC',
        planType: 'PPO',
        insurancePackage: 'United Healthcare',
        wizardSequence: 'Tertiary',
        cardSequence: 'Insurance 3'
      }
    ];

    for (const plan of plans) {
      const wizard = await insurance.openAddInsuranceWizard();
      await wizard.selectPlan(plan);
      await wizard.expectSequence(plan.wizardSequence);

      const memberId = uniqueInsuranceMemberId();
      await wizard.insuranceIdNumberInput.fill(memberId);
      await wizard.save();

      await insurance.expectInsuranceFound({ payer: plan.payer, planType: plan.insuranceType, memberId });
      await insurance.expectSequence({ payer: plan.payer, memberId }, plan.cardSequence);
    }
  });
});
