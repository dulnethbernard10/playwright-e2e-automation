import { expect, type Locator, type Page } from '@playwright/test';

/** Medical service codes offered on the Company Details step. */
export type ServiceCode = 'RPM' | 'CCM' | 'MTM' | 'TCM';

/** Services the application pre-selects for a brand new company. */
export const DEFAULT_SERVICES: ServiceCode[] = ['RPM', 'CCM'];

export interface LocationInput {
  name: string;
  nameTag: string;
}

export interface CompanyDetails {
  companyName: string;
  /** Defaults to true — keeps E2E records out of reporting and analytics. */
  mockCompany?: boolean;
  /** Omit to accept the app default (RPM + CCM). */
  services?: ServiceCode[];
  /** Omit to accept the auto-mirrored company name. */
  organizationName?: string;
  locations?: LocationInput[];
}

/**
 * The "Add Company" modal.
 *
 * The wizard has TWO steps:
 *   1. Company Details — company fields, medical services, and the optional
 *      Client Organization sub-section (organization name + locations).
 *   2. Users — assign existing users or create a new one.
 *
 * Notes on the real DOM (verified against QA, portal build 2026-08-20-3):
 *  - Medical services render as clickable cards, not checkbox inputs. Selection state is
 *    carried by a nested MUI icon (`CheckBoxIcon` vs `CheckBoxOutlineBlankIcon`).
 *  - Organization Name auto-mirrors Company Name until it is explicitly overridden.
 *  - Adding a location pre-fills Name and Name Tag with a slug derived from the company name.
 *  - The Company Details step advances via "Save and Proceed", which stays disabled while
 *    the name is empty or already taken.
 */
export class AddCompanyWizard {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;

  // Step 1 — Company Details
  readonly companyNameInput: Locator;
  readonly organizationNameInput: Locator;
  readonly mockCompanyCheckbox: Locator;
  readonly servicesGroup: Locator;
  readonly addLocationButton: Locator;
  readonly saveAndProceedButton: Locator;

  // Step 2 — Users
  readonly existingUserTab: Locator;
  readonly newUserTab: Locator;
  readonly assignSelectedButton: Locator;
  readonly doneButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.cancelButton = this.dialog.getByRole('button', { name: /^cancel$/i });

    this.companyNameInput = this.dialog.getByRole('textbox', { name: 'Company Name' });
    this.organizationNameInput = this.dialog.getByRole('textbox', { name: 'Organization Name' });
    this.mockCompanyCheckbox = this.dialog.getByRole('checkbox', { name: 'Mock company' });
    this.servicesGroup = this.dialog.getByRole('group', { name: 'Medical Services' });
    this.addLocationButton = this.dialog.getByRole('button', { name: /add location/i });
    this.saveAndProceedButton = this.dialog.getByRole('button', { name: /save and proceed/i });

    this.existingUserTab = this.dialog.getByRole('tab', { name: /existing user/i });
    this.newUserTab = this.dialog.getByRole('tab', { name: /new user/i });
    this.assignSelectedButton = this.dialog.getByRole('button', { name: /assign selected/i });
    this.doneButton = this.dialog.getByRole('button', { name: /^done$/i });
  }

  /** Resolves once the modal is open and sitting on the Company Details step. */
  async expectOpenOnCompanyDetails(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.companyNameInput).toBeVisible();
  }

  // ── Medical services ──────────────────────────────────────────────────────

  /** The card for one service. Cards are the grandchildren of the services group. */
  serviceCard(code: ServiceCode): Locator {
    return this.servicesGroup
      .locator('> div > div')
      .filter({ has: this.page.getByRole('heading', { name: code, exact: true }) });
  }

  async isServiceSelected(code: ServiceCode): Promise<boolean> {
    return (await this.serviceCard(code).locator('[data-testid="CheckBoxIcon"]').count()) > 0;
  }

  /** Click the card only when the current state differs from the target. */
  async setService(code: ServiceCode, selected: boolean): Promise<void> {
    if ((await this.isServiceSelected(code)) !== selected) {
      await this.serviceCard(code).click();
      await expect
        .poll(() => this.isServiceSelected(code), {
          message: `service ${code} did not become ${selected ? 'selected' : 'unselected'}`
        })
        .toBe(selected);
    }
  }

  /** Apply an exact service selection, toggling everything else off. */
  async setServices(services: ServiceCode[]): Promise<void> {
    const all: ServiceCode[] = ['RPM', 'CCM', 'MTM', 'TCM'];
    for (const code of all) {
      await this.setService(code, services.includes(code));
    }
  }

  async selectedServices(): Promise<ServiceCode[]> {
    const all: ServiceCode[] = ['RPM', 'CCM', 'MTM', 'TCM'];
    const selected: ServiceCode[] = [];
    for (const code of all) {
      if (await this.isServiceSelected(code)) selected.push(code);
    }
    return selected;
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  // "Name" and "Name Tag" are the accessible names of the location fields only —
  // Company Name / Organization Name do not collide under an exact match.

  locationNameInput(index = 0): Locator {
    return this.dialog.getByRole('textbox', { name: 'Name', exact: true }).nth(index);
  }

  locationNameTagInput(index = 0): Locator {
    return this.dialog.getByRole('textbox', { name: 'Name Tag', exact: true }).nth(index);
  }

  removeLocationButton(index = 0): Locator {
    return this.dialog.getByRole('button', { name: /remove location/i }).nth(index);
  }

  async locationCount(): Promise<number> {
    return this.dialog.getByRole('button', { name: /remove location/i }).count();
  }

  /** Add a location row and overwrite its auto-generated name and tag. */
  async addLocation(location: LocationInput): Promise<void> {
    const before = await this.locationCount();
    await this.addLocationButton.click();
    await expect
      .poll(() => this.locationCount(), { message: 'location row was not added' })
      .toBe(before + 1);

    await this.locationNameInput(before).fill(location.name);
    await this.locationNameTagInput(before).fill(location.nameTag);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  /** Inline validation message shown under Company Name, e.g. "Company name already taken". */
  get companyNameError(): Locator {
    return this.dialog.getByText(/company name already taken|company name is required/i);
  }

  /** Success hint shown once the async uniqueness check clears. */
  get companyNameAvailable(): Locator {
    return this.dialog.getByText(/name is available/i);
  }

  /**
   * Workaround for a confirmed defect: when the async "Name is available" check resolves,
   * the app does not re-enable "Save and Proceed" on its own. Any other field interaction
   * forces the re-render that unblocks it. Toggling the Mock company checkbox twice is
   * state-neutral, so it nudges validation without changing the payload.
   *
   * Remove this once the disabled-submit defect is fixed — the dedicated regression test
   * `enables submission as soon as a unique name is validated` will start failing (it is
   * marked test.fail()), which is the signal that this is no longer needed.
   */
  async nudgeValidation(): Promise<void> {
    await this.mockCompanyCheckbox.click();
    await this.mockCompanyCheckbox.click();
  }

  // ── Step transitions ──────────────────────────────────────────────────────

  /** Fill the Company Details step without submitting it. */
  async fillCompanyDetails(details: CompanyDetails): Promise<void> {
    await this.companyNameInput.fill(details.companyName);

    // Default to a mock company so E2E records are excluded from reporting.
    const mock = details.mockCompany ?? true;
    await this.mockCompanyCheckbox.setChecked(mock);

    if (details.services) await this.setServices(details.services);

    // Organization Name mirrors Company Name, so only touch it when overriding.
    if (details.organizationName !== undefined) {
      await this.organizationNameInput.fill(details.organizationName);
    }

    for (const location of details.locations ?? []) {
      await this.addLocation(location);
    }
  }

  /** Submit Company Details and wait for the Users step. */
  async submitCompanyDetails(): Promise<void> {
    // Let the async uniqueness check settle before judging the button state.
    await expect(this.companyNameAvailable).toBeVisible();
    if (!(await this.saveAndProceedButton.isEnabled())) {
      await this.nudgeValidation();
    }
    await expect(this.saveAndProceedButton).toBeEnabled();
    await this.saveAndProceedButton.click();
    await expect(this.doneButton).toBeVisible();
  }

  /** Finish the wizard from the Users step and wait for the modal to close. */
  async finish(): Promise<void> {
    await this.doneButton.click();
    await expect(this.dialog).toBeHidden();
  }

  /** Fill step 1, submit it, and finalize without assigning users. */
  async createCompany(details: CompanyDetails): Promise<void> {
    await this.fillCompanyDetails(details);
    await this.submitCompanyDetails();
    await this.finish();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden();
  }
}
