import { expect, type Page } from '@playwright/test';

/**
 * Care Management → Patients, "Enrolled" tab (selected by default). Medications/Triage is
 * only exercised against RPM-enrolled patients, and which patients are enrolled varies by
 * environment, so this picks one dynamically rather than hardcoding a patient name.
 *
 * This grid is properly owned by an RPM domain, but Medications (under patients/) is
 * currently its only consumer — per the "promote to support/ only on the second consumer"
 * rule, it stays here until e.g. a future tests/rpm/ spec needs it too.
 */
export class EnrolledPatientsPage {
  static readonly path = '/care-management/patients';

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(EnrolledPatientsPage.path);
    await expect(this.page.getByRole('tab', { name: 'Enrolled', selected: true })).toBeVisible();
  }

  /**
   * Open the first listed patient whose row link points at `/rpm/readings` — i.e. one that
   * has completed enrollment, as opposed to rows still mid-way through the
   * consent-management setup flow (whose link instead lands on
   * `/rpm/patient-setup/encounter/consent-management`). Falls back to the very first row if
   * none are readings-capable, rather than failing outright.
   */
  async openFirstReadingsCapablePatient(): Promise<void> {
    const grid = this.page.getByRole('grid').first();
    const links = grid.getByRole('link');
    // The grid starts empty until its patients finish loading, so wait for a row to actually
    // render before counting links — counting immediately races that load and sees zero.
    await expect(links.first()).toBeVisible({ timeout: 30_000 });
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href?.includes('/rpm/readings')) {
        await links.nth(i).click();
        return;
      }
    }
    await links.first().click();
  }
}
