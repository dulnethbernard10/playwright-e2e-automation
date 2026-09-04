import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Initial Visit & Setup → "Medication Reconciliation" tab
 * (`/patients/:id/details/rpm/patient-setup/care-activity/medication-reconciliation`), where
 * every MedRec created from Triage Medications shows up.
 *
 * Its tab, like Form/Frequency/Strength in NewMedicationModal, renders real text that never
 * makes it into the computed accessible name — `getByRole('tab', { name })` finds nothing for
 * any of these tabs. `.filter({ hasText })` matches on raw text content instead, sidestepping
 * the bug entirely.
 */
export class MedicationReconciliationTab {
  readonly initialVisitNavButton: Locator;
  readonly tab: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.initialVisitNavButton = page.getByRole('button', { name: 'Initial Visit & Setup' });
    this.tab = page.getByRole('tab').filter({ hasText: 'Medication Reconciliation' });
    this.grid = page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'Performed On' }) });
  }

  /** Navigate from the current patient detail page to this tab. */
  async open(): Promise<void> {
    await this.initialVisitNavButton.click();
    await this.tab.click();
    await expect(this.grid).toBeVisible();
  }

  /** Assert a MedRec with the given (exact) name is listed. */
  async expectMedRecFound(name: string): Promise<void> {
    await expect(this.grid.getByRole('cell', { name, exact: true })).toBeVisible();
  }
}
