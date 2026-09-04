import { expect, type Locator, type Page } from '@playwright/test';

/**
 * A patient's Care Management → Activities screen
 * (`/patients/:id/details/rpm/activities`), reached from the patient detail side nav's
 * "Activities" item — where every activity logged via "Add Activity" shows up.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Unlike the Triage Medications / Companies grids, this one is scoped by a month picker
 *    (defaulting to the current month) rather than plain pagination, so a freshly-added
 *    activity (always logged against "now") is reliably on-screen without needing a
 *    newest-first sort — the month scope already keeps the row count small.
 *  - Rows are found by their Notes cell text rather than by category/subcategory, since those
 *    are shared defaults and multiple activities can carry the same ones — Notes is the one
 *    field the test controls that's guaranteed unique; see `uniqueActivityNote`.
 */
export class ActivitiesPage {
  readonly activitiesNavButton: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.activitiesNavButton = page.getByRole('button', { name: 'Activities', exact: true });
    this.grid = page.getByRole('grid').first();
  }

  /** Navigate from the current patient detail page to its Activities screen. */
  async open(): Promise<void> {
    await this.activitiesNavButton.click();
    await expect(this.grid).toBeVisible();
  }

  /** The grid row for an activity, found by its unique (ZZ_PREFIX-tagged) Notes text. */
  activityRow(note: string): Locator {
    return this.grid.getByRole('row').filter({ has: this.page.getByRole('cell', { name: note, exact: true }) });
  }

  private fieldCell(note: string, dataField: string): Locator {
    return this.activityRow(note).locator(`[data-field="${dataField}"]`);
  }

  /** Assert an activity with the given Notes text was saved with the given details. */
  async expectActivityDetails(
    note: string,
    details: {
      /** "MMM DD, YYYY", matching this column's display format, e.g. "Sep 04, 2026". */
      date?: string;
      /** "hh:mm:ss", e.g. "00:04:00" for 4 minutes. */
      timeSpent?: string;
      program?: string;
    }
  ): Promise<void> {
    await expect(this.activityRow(note)).toBeVisible();

    if (details.date !== undefined) {
      await expect(this.fieldCell(note, 'date')).toHaveText(details.date);
    }
    if (details.timeSpent !== undefined) {
      await expect(this.fieldCell(note, 'timeSpent')).toHaveText(details.timeSpent);
    }
    if (details.program !== undefined) {
      await expect(this.fieldCell(note, 'program')).toHaveText(details.program);
    }
  }
}
