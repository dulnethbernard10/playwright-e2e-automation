import { expect, type Locator, type Page } from '@playwright/test';

export interface InsuranceSelection {
  insuranceType: string;
  payer: string;
  planType: string;
  insurancePackage: string;
  insuranceIdNumber: string;
}

/**
 * The "Add New Insurance Plan" wizard, opened from Insurance Plans' "Add New Insurance"
 * button.
 *
 * Verified against the DEV portal, build 2026-09-01-2, for the Commercial/Other Plan path
 * (Insurance Type → Payer → Plan Type → Insurance Package → Plan & Holder Details):
 *  - Every step but the last is a flat list of clickable cards; picking one immediately
 *    reveals the next step's cards in place — there's no "Next" button. Save/Cancel/Back only
 *    appear once the final step is reached.
 *  - The final step's Policy Holder Details are read-only, pre-filled from the patient's own
 *    profile, and Insurance Package is likewise pre-filled (disabled) from the prior step.
 *    Insurance ID Number is the only field left to fill in.
 *  - Other insurance types (e.g. Traditional Medicare) may have a different, shorter step
 *    sequence — this class only encodes the Commercial/Other Plan path since that's the one
 *    covered here.
 *  - **Insurance Package options can share a display name.** UHC's package step has offered
 *    two entries both labelled "United Healthcare" (presumably distinct records underneath).
 *    `pickCard()` takes whichever one the list shows first rather than failing on the
 *    strict-mode ambiguity, matching how AddPatientModal deals with picking among options.
 *  - **The Sequence field on the final step is disabled and auto-computed** from how many
 *    plans the patient already has: "Primary" for the 1st, "Secondary" for the 2nd, "Tertiary"
 *    for the 3rd. This is the wizard's own preview — the Insurance Plans screen's saved-plan
 *    card can disagree with it (see InsurancePlansPage's class docs).
 *  - **"Dual Eligible Medicare/Medicaid Plan" is a different shape**: its final step shows
 *    *two* plans at once — the Medicare plan selected via the wizard's own steps (labelled
 *    "Primary"), plus a second, separate "Secondary Insurance (Medicaid)" section with its own
 *    editable Insurance Package (a Medicaid package, pre-selected but changeable) and its own
 *    Insurance ID Number field. Saving creates both plans in one submission. Because both
 *    sections reuse the same field labels ("Insurance ID Number", "Insurance Package"), they're
 *    disambiguated by the underlying HTML `name` attribute (`insuranceIdNumber` /
 *    `secondaryInsuranceIdNumber`) rather than accessible name, and by document order
 *    (`.last()`) for the Insurance Package combobox.
 *  - **Known defect**: Insurance ID Number is forwarded to an upstream Athena API that
 *    rejects values over 25 characters — and the app does nothing to surface that: Save just
 *    leaves the dialog open with no visible error (the failure only shows up in the
 *    `addAthenaAccountInsurance` GraphQL response, which the UI never reads). There's no
 *    client-side length limit on the field either. Keep generated IDs at or under 25
 *    characters (see `uniqueInsuranceMemberId()`) until this is fixed.
 *  - **Resolved DEV-environment issue, worth remembering why**: adding insurance for a freshly
 *    created patient used to reliably fail server-side (500 or `MISSING_EHR_ID`) when the
 *    patient's Demographic Profile had been added via Insurance Plans' own reactive modal —
 *    every automated run failed on it. Adding the profile via the Patient Profile tab instead
 *    (`PatientProfilePage.addDemographicProfile()`) made it disappear entirely. See the DEV
 *    environment note in CLAUDE.md before touching that flow. `save()` still retries a bounded
 *    number of times as a cheap safety net, but the retry alone never fixed the original
 *    failures — the flow change did.
 */
export class AddInsuranceWizard {
  readonly dialog: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly insuranceIdNumberInput: Locator;
  readonly sequenceTrigger: Locator;
  /** The Dual Eligible final step's second, Medicaid plan — see class docs. */
  readonly secondaryInsuranceIdNumberInput: Locator;
  readonly secondaryInsurancePackageCombobox: Locator;
  readonly primarySequenceBadge: Locator;
  readonly secondarySequenceBadge: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Add New Insurance Plan' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    // Located by HTML name, not accessible name: the Dual Eligible final step has a second
    // field sharing the same "Insurance ID Number" label — see class docs.
    this.insuranceIdNumberInput = this.dialog.locator('input[name="insuranceIdNumber"]');
    this.sequenceTrigger = this.dialog.getByRole('button', { name: /^(Primary|Secondary|Tertiary|Insurance \d+)$/ });

    this.secondaryInsuranceIdNumberInput = this.dialog.locator('input[name="secondaryInsuranceIdNumber"]');
    this.secondaryInsurancePackageCombobox = this.dialog.getByRole('combobox', { name: 'Insurance Package' }).last();
    this.primarySequenceBadge = this.dialog.getByRole('button', { name: 'Primary', exact: true });
    this.secondarySequenceBadge = this.dialog.getByRole('button', { name: 'Secondary', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('heading', { name: 'Insurance Type' })).toBeVisible();
  }

  /** Clicks a step's card by its display name. Takes the first match when the name isn't
   *  unique — see the class-level note on duplicate Insurance Package options. */
  private async pickCard(name: string): Promise<void> {
    await this.dialog.getByRole('button', { name, exact: true }).first().click();
  }

  /** Walks the Commercial/Other Plan path to the final step, leaving Insurance ID Number and
   *  Save for the caller. */
  async selectPlan(selection: Omit<InsuranceSelection, 'insuranceIdNumber'>): Promise<void> {
    await this.pickCard(selection.insuranceType);
    await this.pickCard(selection.payer);
    await this.pickCard(selection.planType);
    await this.pickCard(selection.insurancePackage);
    await expect(this.insuranceIdNumberInput).toBeVisible();
  }

  /** Assert the final step's auto-computed Sequence preview (e.g. "Primary", "Secondary"). */
  async expectSequence(label: string): Promise<void> {
    await expect(this.sequenceTrigger).toHaveText(label);
  }

  /**
   * Assert the Dual Eligible final step's shape: a Primary plan (the Medicare one selected via
   * the wizard's own steps) and a Secondary plan that's a Medicaid package.
   */
  async expectDualEligiblePreview(): Promise<void> {
    await expect(this.primarySequenceBadge).toHaveText('Primary');
    await expect(this.secondarySequenceBadge).toHaveText('Secondary');
    // This combobox renders as an <input>, whose displayed text is its `value` attribute, not
    // text content — toContainText() would only ever see an empty string here.
    await expect(this.secondaryInsurancePackageCombobox).toHaveValue(/Medicaid/);
  }

  /** Retries Save a few times — see the class-level note on the EHR-provisioning issue this
   *  can hit for a freshly created patient. */
  async save(): Promise<void> {
    const attempts = 4;
    for (let attempt = 1; attempt < attempts; attempt++) {
      await this.saveButton.click();
      const closed = await this.dialog
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (closed) return;
    }
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  /** Full happy path: pick the plan, fill Insurance ID Number, and save. */
  async addInsurance(selection: InsuranceSelection): Promise<void> {
    await this.selectPlan(selection);
    await this.insuranceIdNumberInput.fill(selection.insuranceIdNumber);
    await this.save();
  }
}
