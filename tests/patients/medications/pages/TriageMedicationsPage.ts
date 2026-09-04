import { expect, type Locator, type Page } from '@playwright/test';
import { AddActivityModal } from './AddActivityModal';
import { CertifyMedRecModal } from './CertifyMedRecModal';
import { NewMedicationModal } from './NewMedicationModal';

/** Per-attempt timeout for a single assertion inside one of this class's `toPass()` retries. */
const STEP_TIMEOUT = { timeout: 3_000 };
/** Overall time budget for retrying a whole filter-set-and-read sequence — see class doc. */
const FILTER_RETRY_TIMEOUT = { timeout: 30_000 };

/**
 * A patient's Medications → Triage list (`/patients/:id/details/medications/triage/list`),
 * reached from the patient detail side nav's "Medications" item.
 *
 * The side nav's "Medications" section has a plain (non-interactive) heading that shares the
 * same text as the actual nav button, but scoping to `getByRole('button', ...)` already
 * excludes it — unlike Notes' side-nav collision, both matches there being buttons.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - The "Verification Status" grid filter (Verified / Unverified / Both) is an account-level
 *    preference that silently re-applies on every remount (e.g. opening the New Medication
 *    dialog and returning), hiding every medication that doesn't match it — including a
 *    freshly-added one, which is always Unverified. `startCreateMedRec()`'s "Verify, Lock and
 *    Certify" step (and `setVerificationStatus()`) leave it on "Verified" as a side effect, so
 *    without correcting it, one test's MedRec/Verify action can make every *other* medications
 *    test unable to find its own newly-added rows. "Both" is not a safe fix for this, though:
 *    confirmed repeatedly flaky in ways "Verified"/"Unverified" never were — reloading right
 *    after picking "Both" once silently reverted it, and in later runs the picked-up value
 *    sometimes never even reflected client-side, both immediately and after 20s of retrying
 *    the click sequence. `setVerificationStatusFilter()` therefore never uses "Both" — every
 *    grid-reading method here filters to the *exact* status it expects the row to be in
 *    instead, calling this immediately before reading rather than relying on one upfront call
 *    in `open()` to still hold by the time it's needed.
 *  - "Create MedRec" doesn't open the naming form directly: clicking it opens a one-item menu,
 *    "Verify, Lock and Certify", which must be confirmed first — that's what actually marks the
 *    checked rows Verified (and everything else Unverified) and makes them eligible to include
 *    in a MedRec. Only after confirming does the real "Certify Med Rec" name/description form
 *    (`CertifyMedRecModal`) appear.
 *  - The toolbar's separate "Actions" button offers a more direct route to the same
 *    verification state: Actions → Verify → Verify/Unverify applies immediately to every
 *    checked row, with no confirmation dialog and without touching every other row's status
 *    (unlike "Verify, Lock and Certify", which also marks everything unchecked Unverified).
 *    It still carries the same filter side effect, though: picking "Verify" leaves the grid
 *    filtered to "Verified" afterward.
 *  - A row's verification state isn't exposed as its own grid column — it shows up only as a
 *    "verified"/"unverified" class on the Name cell. Both are plain, literal class names the
 *    app itself adds to mean exactly this (unlike its `css-xxxxx` hashed styling classes), so
 *    matching on them is as stable as matching on `data-field`.
 *  - Like the companies grid (see CompaniesListPage), this one is server-paginated — capped at
 *    100 rows per page — and not sorted newest-first by default, so once enough ZZ_PREFIX test
 *    medications accumulate (confirmed at 102 unverified rows on this DEV account), a freshly
 *    added one can land on page 2 and never be found. There's no "Created On" column here to
 *    sort by, but every medication this suite adds sets Date Written to today, so sorting that
 *    column descending reliably surfaces it within page 1 the same way.
 */
export class TriageMedicationsPage {
  readonly medicationsNavButton: Locator;
  readonly heading: Locator;
  readonly newMedicationButton: Locator;
  readonly createMedRecButton: Locator;
  readonly actionsButton: Locator;
  readonly lockAndCertifyButton: Locator;
  readonly addActivityButton: Locator;
  readonly verificationStatusFilterButton: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.medicationsNavButton = page.getByRole('button', { name: 'Medications', exact: true });
    this.heading = page.getByText('Triage Medications', { exact: true });
    this.newMedicationButton = page.getByRole('button', { name: 'New Medication' });
    this.createMedRecButton = page.getByRole('button', { name: 'Create MedRec', exact: true });
    this.actionsButton = page.getByRole('button', { name: 'Actions', exact: true });
    this.lockAndCertifyButton = page.getByRole('button', { name: 'Lock & Certify', exact: true });
    this.addActivityButton = page.getByRole('button', { name: 'Add Activity', exact: true });
    this.verificationStatusFilterButton = page.getByRole('button').filter({ hasText: 'verification status' });
    this.grid = page.getByRole('grid').first();
  }

  /** Navigate from the current patient detail page to its Medications → Triage list. */
  async open(): Promise<void> {
    await this.medicationsNavButton.click();
    await this.expectOpen();
  }

  /**
   * Sets the "Verification Status" filter to the given exact value, so the grid shows only
   * medications currently in that state. See the class-level note on why this needs calling
   * immediately before each read (rather than once upfront) and why it's never given "Both".
   *
   * Called back-to-back (e.g. two reads in a row, each setting the filter for itself), this
   * nested menu's own invisible close-transition backdrop (`MuiBackdrop-invisible`) can still
   * be sitting over the whole page — confirmed directly: a later click at this same button
   * failed after 20s and dozens of retries, Playwright's own log naming that exact backdrop as
   * the element "intercepting pointer events" throughout. Clicking anywhere to dismiss it
   * doesn't help, since Playwright (rightly) won't click *through* an element it has detected
   * is on top — it just keeps waiting for the obstruction to clear on its own, which it
   * doesn't. Escape sidesteps this entirely: it's a keyboard event, not a pointer one, so it
   * reaches the menu's own dismiss handling regardless of what may be visually overlaying the
   * page, and carries none of the "closes something bigger than intended" risk it has inside
   * NewMedicationModal (no dialog is open here to accidentally catch it).
   */
  async setVerificationStatusFilter(status: 'Verified' | 'Unverified'): Promise<void> {
    await this.verificationStatusFilterButton.click();
    await this.page.getByRole('menuitem', { name: 'Verification Status', exact: true }).click();
    await this.page.getByRole('menuitem', { name: status, exact: true }).click();
    await this.page.keyboard.press('Escape');
    await expect(this.verificationStatusFilterButton).toContainText(new RegExp(status, 'i'));
  }

  async expectOpen(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.newMedicationButton).toBeEnabled();
  }

  async openNewMedicationModal(): Promise<NewMedicationModal> {
    await this.newMedicationButton.click();
    const modal = new NewMedicationModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  async openAddActivityModal(): Promise<AddActivityModal> {
    await this.addActivityButton.click();
    const modal = new AddActivityModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /**
   * The grid row for a medication, found by its unique (ZZ_PREFIX-tagged) SIG text rather
   * than by medication name — like Patient Notes, triage medications accumulate and are
   * never cleaned up, so a re-run (or an earlier failed run's leftover row) can leave more
   * than one row for the same medication. SIG is the one field the test controls that's
   * guaranteed unique; see `uniqueMedicationSig`.
   */
  medicationRow(sig: string): Locator {
    return this.grid.getByRole('row').filter({ has: this.page.getByRole('cell', { name: sig, exact: true }) });
  }

  /**
   * Sorts by Date Written descending so today's medications (everything this suite adds) sit
   * on page 1 — see the class-level note on why a freshly added row otherwise risks landing on
   * page 2 once enough test data has piled up. First click sorts ascending, second flips it.
   */
  private async sortByNewestFirst(): Promise<void> {
    const header = this.grid.getByRole('columnheader', { name: 'Date Written', exact: true });
    await header.click();
    await header.click();
  }

  /**
   * Check every given medication's row-selection checkbox, each found by its unique SIG text
   * (see above). Filters to `status` first — defaults to "Unverified" since most callers
   * select freshly-added medications (new ones are always Unverified) to either certify or
   * verify them, but unverifying an already-Verified row needs the row filtered into view as
   * "Verified" instead.
   *
   * Takes every sig at once and filters/sorts only *once* for the whole batch — confirmed
   * that checking one row, then re-running `setVerificationStatusFilter()` for a second one
   * (even reselecting the exact same status), can silently clear the first row's checked
   * state, presumably because re-applying the filter causes the grid to re-fetch and remount
   * its rows. Selecting one-at-a-time (each call setting the filter fresh) was confirmed to
   * lose earlier selections this way — only the last-checked row survived to the point where
   * the caller acted on the checked set. Setting the filter/sort once and checking every row
   * in the same pass avoids the extra remounts between checks.
   *
   * Wrapped in `toPass()`: confirmed that the filter can briefly show the value just picked
   * and then silently revert moments later — presumably a slightly-delayed background refetch
   * overwriting the optimistic update with a stale server response — which surfaces here as
   * a target row seeming to vanish partway through. Retrying re-sets the filter fresh each
   * attempt and re-checks every row, rather than trusting anything to hold from a prior
   * attempt.
   */
  async selectMedicationCheckboxes(sigs: string[], status: 'Verified' | 'Unverified' = 'Unverified'): Promise<void> {
    await expect(async () => {
      await this.setVerificationStatusFilter(status);
      await this.sortByNewestFirst();
      for (const sig of sigs) {
        await this.medicationRow(sig).getByRole('checkbox', { name: 'Select row', exact: true }).check(STEP_TIMEOUT);
      }
    }).toPass(FILTER_RETRY_TIMEOUT);
  }

  /**
   * Starts Create MedRec for the currently checked rows — see the class-level note on why
   * this requires confirming "Verify, Lock and Certify" first. Returns the resulting
   * "Certify Med Rec" form once that's done.
   */
  async startCreateMedRec(): Promise<CertifyMedRecModal> {
    await this.createMedRecButton.click();
    await this.page.getByRole('menuitem', { name: 'Verify, Lock and Certify' }).click();

    const confirmDialog = this.page.getByRole('dialog').filter({ hasText: 'Confirm Action' });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(confirmDialog).toBeHidden();

    const modal = new CertifyMedRecModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /**
   * "Lock & Certify" — a distinct button in the page's "Medications" header (outside the
   * Triage grid's own toolbar entirely), not to be confused with "Create MedRec"'s
   * "Verify, Lock and Certify" menu item above. Confirmed by inspection: it opens the same
   * "Certify Med Rec" form directly, with no "Confirm Action" step first, and certifies
   * whatever medications are *already* Verified account-wide — it doesn't need (or care
   * about) the grid's row checkboxes at all, unlike `startCreateMedRec()`. So the caller must
   * mark its own medications Verified first (e.g. via `setVerificationStatus('Verify')`)
   * before this button will include them.
   */
  async lockAndCertify(): Promise<CertifyMedRecModal> {
    await this.lockAndCertifyButton.click();
    const modal = new CertifyMedRecModal(this.page);
    await modal.expectOpen();
    return modal;
  }

  /**
   * Sets every currently checked row's verification status via Actions → Verify → {status},
   * applying immediately with no confirmation dialog. The nested menu's "Verify" trigger and
   * its "Verify" leaf option share the exact same text — `.first()` gets the trigger (which
   * appears first in the DOM), `.last()` the leaf (nested inside, appended after).
   *
   * Presses Escape afterward for the same reason as `setVerificationStatusFilter()` — this is
   * the same kind of two-level menu, and dismissing via a real click risks hanging on that
   * menu's own invisible close-transition backdrop, which Playwright rightly won't click
   * through once it's detected as covering the target.
   */
  async setVerificationStatus(status: 'Verify' | 'Unverify'): Promise<void> {
    await this.actionsButton.click();
    await this.page.getByRole('menuitem', { name: 'Verify', exact: true }).first().click();
    await this.page.getByRole('menuitem', { name: status, exact: true }).last().click();
    await this.page.keyboard.press('Escape');
  }

  /**
   * A row's cell for one column, addressed by the grid's own `data-field` attribute (a
   * stable MUI DataGrid hook, unaffected by the "Strength"/"SIG"/etc. header text or by
   * columns sharing displayed values, e.g. Date Written and Fill Date both showing today).
   */
  private fieldCell(sig: string, dataField: string): Locator {
    return this.medicationRow(sig).locator(`[data-field="${dataField}"]`);
  }

  /**
   * Assert every given detail was persisted, reading each back from its own grid column of
   * the row identified by `sig` (see `medicationRow`). Filters to "Unverified" first since
   * this is always used to check a medication right after adding it, before any verification.
   *
   * See `selectMedicationCheckboxes()` on why the whole read — not just confirming the row is
   * visible, but every field assertion after it — is wrapped in one `toPass()`. Confirmed
   * directly (consistently reproducible once the account had accumulated enough medications):
   * the row can still be visible when the retry loop's own visibility check succeeds, then
   * vanish moments later while reading its first field, the same filter-revert race as
   * elsewhere. An earlier version of this method retried only the visibility check and read
   * every field outside the loop, which left those reads exposed to exactly that gap.
   */
  async expectMedicationDetails(
    sig: string,
    details: {
      /** The grid uppercases whatever name it displays, e.g. "LISINOPRIL (ORAL PILL)". */
      name?: string;
      strength?: string;
      prescriber?: string;
      refills?: string;
      /** "MMM DD, YYYY", matching this column's display format, e.g. "Sep 03, 2026". */
      dateWritten?: string;
      /** "MMM DD, YYYY", matching this column's display format. */
      fillDate?: string;
    }
  ): Promise<void> {
    await expect(async () => {
      await this.setVerificationStatusFilter('Unverified');
      await this.sortByNewestFirst();
      await expect(this.medicationRow(sig)).toBeVisible(STEP_TIMEOUT);

      if (details.name !== undefined) {
        await expect(this.fieldCell(sig, 'displayName')).toHaveText(details.name, STEP_TIMEOUT);
      }
      if (details.strength !== undefined) {
        await expect(this.fieldCell(sig, 'strength')).toHaveText(details.strength, STEP_TIMEOUT);
      }
      if (details.prescriber !== undefined) {
        await expect(this.fieldCell(sig, 'prescriberName')).toHaveText(details.prescriber, STEP_TIMEOUT);
      }
      if (details.refills !== undefined) {
        await expect(this.fieldCell(sig, 'numRefills')).toHaveText(details.refills, STEP_TIMEOUT);
      }
      if (details.dateWritten !== undefined) {
        await expect(this.fieldCell(sig, 'prescriptionWrittenDateAt')).toHaveText(details.dateWritten, STEP_TIMEOUT);
      }
      if (details.fillDate !== undefined) {
        await expect(this.fieldCell(sig, 'lastFillDateAt')).toHaveText(details.fillDate, STEP_TIMEOUT);
      }
    }).toPass(FILTER_RETRY_TIMEOUT);
  }

  /**
   * Assert a medication's verification status, read from its Name cell's "verified" /
   * "unverified" class — see the class-level note on why that's the only place this shows up.
   * Filters to the same status first, guaranteeing the row is actually visible to check. See
   * `selectMedicationCheckboxes()` on why the whole thing is wrapped in `toPass()` — the filter
   * can revert moments after appearing to apply.
   */
  async expectVerificationStatus(sig: string, status: 'Verified' | 'Unverified'): Promise<void> {
    await expect(async () => {
      await this.setVerificationStatusFilter(status);
      await this.sortByNewestFirst();
      await expect(this.fieldCell(sig, 'displayName')).toHaveClass(
        new RegExp(`\\b${status.toLowerCase()}\\b`),
        STEP_TIMEOUT
      );
    }).toPass(FILTER_RETRY_TIMEOUT);
  }
}
