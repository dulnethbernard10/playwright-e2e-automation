import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Care Management → Patients (`/care-management/patients`), the RPM patient list with
 * Priority Candidates / Scheduled for Enrollment / Enrolled / Unenrolled tabs.
 *
 * Distinct from `support/pages/PatientsLookupPage`, which is a name-search-only lookup with
 * no enrollment concept, used by onboarding/notes/organizations. This grid is where a
 * follow-up test needs to start, since only here can a patient be picked *because* they're
 * enrolled.
 */
export class EnrolledPatientsPage {
  static readonly path = '/care-management/patients';

  readonly enrolledTab: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.enrolledTab = page.getByRole('tab', { name: 'Enrolled', exact: true });
    this.grid = page.getByRole('grid').first();
  }

  async goto(): Promise<void> {
    await this.page.goto(EnrolledPatientsPage.path);
    await expect(this.enrolledTab).toBeVisible({ timeout: 30_000 });
    await this.enrolledTab.click();
    await expect(this.grid).toBeVisible();
    // The grid frame renders before its rows fetch in, so waiting on `grid` visible alone can
    // leave `openRandomEnrolledPatient()` counting zero links — wait for the first row too.
    await expect(this.grid.getByRole('link').first()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Open a random patient row from the currently loaded Enrolled page (not the full,
   * server-paginated set) and return their displayed name. A name link is the only link
   * rendered in a row — every other cell control is a button — so `getByRole('link')` picks
   * out just the name column. The random index is intentional here, unlike a positional
   * chain into a fixed form: any enrolled row is a valid, equally acceptable target.
   */
  async openRandomEnrolledPatient(): Promise<string> {
    const nameLinks = this.grid.getByRole('link');
    const count = await nameLinks.count();
    const link = nameLinks.nth(Math.floor(Math.random() * count));
    const fullName = (await link.textContent()) ?? '';
    await link.click();
    return fullName;
  }
}
