import { expect, type Locator, type Page } from '@playwright/test';
import { AddInsuranceWizard } from './AddInsuranceWizard';
import { EditInsuranceWizard } from './EditInsuranceWizard';
import { InsuranceCardImageDialog } from './InsuranceCardImageDialog';

export interface InsuranceDetails {
  payer: string;
  planType: string;
  memberId: string;
}

/**
 * A patient's Insurance Plans page (`/providers/:id/insurance-plans`), reached from the
 * patient edit-profile side nav.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - A patient with no Demographic Profile yet can't manage insurance at all: the page shows
 *    "Add the Demographic Profile to manage insurance details." instead of the plan list, with
 *    its own "Add Demographic Profile" button that opens a reactive modal. Specs avoid this
 *    path entirely by adding the Demographic Profile up front via the patient edit-profile
 *    page's Patient Profile tab instead — see `PatientProfilePage.addDemographicProfile()` —
 *    so by the time a spec reaches this page, the plan list is already unlocked.
 *  - Each saved plan renders as a card showing the payer name, plan type, and a "Member ID"
 *    field holding whatever was typed into the wizard's Insurance ID Number — that's the only
 *    field on the card whose value the test fully controls, so `insuranceCard()` finds a card
 *    by payer + Member ID together.
 *  - **Each card also carries a collapsed "Additional Information" accordion panel holding a
 *    raw field dump** (`ircname` = payer, `insuranceidnumber` = Member ID, etc.) that's present
 *    in the DOM — and rendered from real, individually exact-text-matching elements, not one
 *    opaque string — even though the accordion is never expanded. It duplicates literally every
 *    payer/Member-ID value on the card, so filtering `insuranceCard()` on payer + Member ID
 *    alone (whether by `hasText` substring or `has:` exact-text descendant) keeps resolving to
 *    the smallest sub-container that satisfies both via the *dump* rather than the real heading
 *    a level up. The one thing the dump never contains is the sequence badge wording
 *    ("Primary"/"Secondary"/"Insurance N" — the dump has `sequencenumber1`, not "Primary"), so
 *    `insuranceCard()` also requires that as a signal, which only the real header can supply —
 *    forcing the match to widen out past the dump to the actual visible card.
 *  - **Each card's sequence badge ("Primary", "Secondary", ...) is a plain `generic` element
 *    when it's the patient's only plan, but becomes a clickable `button` once a 2nd plan
 *    exists** (presumably so you can promote it) — same displayed text either way, so
 *    `sequenceBadge()` matches by text rather than role.
 *  - **Known defect: the saved-plan card disagrees with the wizard for the 3rd plan onward.**
 *    AddInsuranceWizard's own Sequence preview says "Tertiary" while adding a 3rd plan, but
 *    the card this page renders afterwards labels it "Insurance 3" instead — the app only
 *    special-cases "Primary"/"Secondary" for the saved display and falls back to "Insurance N"
 *    beyond that. Both behaviors are real; assert whichever one the test actually cares about.
 *  - **Editing a saved plan only lets you change its Insurance ID Number** — see
 *    `EditInsuranceWizard`, opened here via each card's icon-only "Edit" button.
 *  - **Deleting needs confirmation.** The card's icon-only "Delete" button opens a "Delete
 *    Insurance Plan" dialog asking "Are you sure you want to delete the insurance plan
 *    <payer>?" with "No" / "Yes". Confirming removes the card immediately — no undo.
 *  - **Each card also has an "Add Card Image" button** opening a dialog for uploading, and
 *    later deleting, a front/back photo of the physical insurance card — see
 *    `InsuranceCardImageDialog`.
 */
export class InsurancePlansPage {
  readonly addNewInsuranceButton: Locator;

  constructor(private readonly page: Page) {
    this.addNewInsuranceButton = page.getByRole('button', { name: 'Add New Insurance' });
  }

  async expectOpen(): Promise<void> {
    await expect(this.addNewInsuranceButton).toBeVisible();
  }

  async openAddInsuranceWizard(): Promise<AddInsuranceWizard> {
    await this.addNewInsuranceButton.click();
    const wizard = new AddInsuranceWizard(this.page);
    await wizard.expectOpen();
    return wizard;
  }

  /**
   * The insurance plan card matching a payer name and Member ID — see class docs on why the
   * sequence-badge wording is required too. Scoped to `div:visible` because a just-saved card
   * can briefly leave behind an animation/transition wrapper `div` that still matches on text
   * but fails `toBeVisible()`.
   */
  insuranceCard(payer: string, memberId: string): Locator {
    return this.page
      .locator('div:visible')
      .filter({ hasText: /Primary|Secondary|Insurance \d+/ })
      .filter({ hasText: payer })
      .filter({ hasText: memberId })
      .last();
  }

  async expectInsuranceFound(details: InsuranceDetails): Promise<void> {
    const card = this.insuranceCard(details.payer, details.memberId);
    await expect(card).toBeVisible();
    await expect(card).toContainText(details.planType);
  }

  /** A specific plan card's sequence badge — see class docs on why this matches by text. */
  sequenceBadge(payer: string, memberId: string): Locator {
    return this.insuranceCard(payer, memberId).getByText(/^(Primary|Secondary|Insurance \d+)$/, {
      exact: true
    });
  }

  /** Assert a saved plan's sequence badge (e.g. "Primary", "Secondary", "Insurance 3"). */
  async expectSequence(plan: { payer: string; memberId: string }, label: string): Promise<void> {
    await expect(this.sequenceBadge(plan.payer, plan.memberId)).toHaveText(label);
  }

  /** Open the Edit dialog for a specific plan card, found by payer + Member ID. */
  async openEditInsuranceWizard(payer: string, memberId: string): Promise<EditInsuranceWizard> {
    const editButton = this.insuranceCard(payer, memberId).getByRole('button', { name: 'Edit', exact: true });
    await editButton.click();
    const wizard = new EditInsuranceWizard(this.page);
    await wizard.expectOpen();
    return wizard;
  }

  /** Delete a specific plan card, found by payer + Member ID, confirming the dialog. */
  async deleteInsurance(payer: string, memberId: string): Promise<void> {
    const deleteButton = this.insuranceCard(payer, memberId).getByRole('button', { name: 'Delete', exact: true });
    await deleteButton.click();

    const confirmDialog = this.page.getByRole('dialog').filter({ hasText: 'Delete Insurance Plan' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(confirmDialog).toBeHidden();
  }

  /** Assert a plan card no longer exists — see `insuranceCard()` for the matching rules. */
  async expectInsuranceNotFound(payer: string, memberId: string): Promise<void> {
    await expect(this.insuranceCard(payer, memberId)).toHaveCount(0);
  }

  /** Open the Insurance Card Image dialog for a specific plan card, found by payer + Member ID. */
  async openCardImageDialog(payer: string, memberId: string): Promise<InsuranceCardImageDialog> {
    const button = this.insuranceCard(payer, memberId).getByRole('button', { name: 'Add Card Image' });
    await button.click();
    const dialog = new InsuranceCardImageDialog(this.page);
    await dialog.expectOpen();
    return dialog;
  }
}
