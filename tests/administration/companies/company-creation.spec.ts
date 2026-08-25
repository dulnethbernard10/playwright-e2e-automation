import { expect, test } from '@playwright/test';
import { CompaniesListPage } from './pages/CompaniesListPage';
import { DEFAULT_SERVICES } from './pages/AddCompanyWizard';
import { uniqueCompanyName } from '../../support/test-data';

/**
 * Company creation — Administration → System → All Companies → Add Company.
 *
 * Every company created here is flagged as a mock company so the records stay out of
 * reporting and analytics. Names are prefixed `ZZ E2E` for easy identification.
 */
test.describe('Company creation', () => {
  let companies: CompaniesListPage;

  test.beforeEach(async ({ page }) => {
    companies = new CompaniesListPage(page);
    await companies.goto();
  });

  // ── Happy paths ───────────────────────────────────────────────────────────

  test('creates a company using the default medical services', async () => {
    const name = uniqueCompanyName('Defaults');
    const wizard = await companies.openAddCompanyWizard();

    await wizard.createCompany({ companyName: name });

    await companies.expectNewestCompany(name);
  });

  test('creates a company with a client organization and two locations', async () => {
    const name = uniqueCompanyName('FullFlow');
    const wizard = await companies.openAddCompanyWizard();

    await wizard.createCompany({
      companyName: name,
      organizationName: `${name} Organization`,
      locations: [
        { name: 'Main Clinic', nameTag: 'main-clinic' },
        { name: 'Satellite Clinic', nameTag: 'satellite-clinic' }
      ]
    });

    await companies.expectNewestCompany(name);
  });

  test('creates a company with a non-default service selection', async () => {
    const name = uniqueCompanyName('Services');
    const wizard = await companies.openAddCompanyWizard();

    await wizard.fillCompanyDetails({ companyName: name, services: ['RPM', 'MTM'] });
    expect(await wizard.selectedServices()).toEqual(['RPM', 'MTM']);

    await wizard.submitCompanyDetails();
    await wizard.finish();

    await companies.expectNewestCompany(name);
  });

  // ── Form defaults and derived values ──────────────────────────────────────

  test('pre-selects RPM and CCM only', async () => {
    const wizard = await companies.openAddCompanyWizard();

    expect(await wizard.selectedServices()).toEqual(DEFAULT_SERVICES);
  });

  test('mirrors the company name into the organization name until overridden', async () => {
    const name = uniqueCompanyName('Mirror');
    const wizard = await companies.openAddCompanyWizard();

    await wizard.companyNameInput.fill(name);
    await expect(wizard.organizationNameInput).toHaveValue(name);

    // An explicit override must survive a later company-name edit.
    await wizard.organizationNameInput.fill('Explicit Organization');
    await wizard.companyNameInput.fill(`${name} Renamed`);
    await expect(wizard.organizationNameInput).toHaveValue('Explicit Organization');
  });

  test('pre-fills a new location from the company name and allows overriding it', async () => {
    const wizard = await companies.openAddCompanyWizard();

    await wizard.companyNameInput.fill('ZZ E2E Prefill Probe');
    await wizard.addLocationButton.click();
    await expect(wizard.locationNameInput(0)).not.toHaveValue('');

    await wizard.locationNameInput(0).fill('Overridden Clinic');
    await expect(wizard.locationNameInput(0)).toHaveValue('Overridden Clinic');
  });

  test('adds and removes location rows', async () => {
    const wizard = await companies.openAddCompanyWizard();
    await wizard.companyNameInput.fill(uniqueCompanyName('Locations'));

    await wizard.addLocation({ name: 'First Clinic', nameTag: 'first-clinic' });
    await wizard.addLocation({ name: 'Second Clinic', nameTag: 'second-clinic' });
    expect(await wizard.locationCount()).toBe(2);

    await wizard.removeLocationButton(0).click();
    await expect.poll(() => wizard.locationCount()).toBe(1);
    await expect(wizard.locationNameInput(0)).toHaveValue('Second Clinic');
  });

  // ── Negative paths ────────────────────────────────────────────────────────

  test('disables submission while the company name is empty', async () => {
    const wizard = await companies.openAddCompanyWizard();

    await expect(wizard.saveAndProceedButton).toBeDisabled();

    // Entering, then clearing, the name must return the form to a blocked state.
    await wizard.companyNameInput.fill(uniqueCompanyName('Cleared'));
    await expect(wizard.companyNameAvailable).toBeVisible();
    await wizard.companyNameInput.fill('');
    await expect(wizard.saveAndProceedButton).toBeDisabled();
  });

  /**
   * KNOWN DEFECT — submit stays disabled after a successful name check.
   *
   * The field shows the green "Name is available" hint, but "Save and Proceed" remains
   * disabled until some other field is touched. A user who only wants the default services
   * hits a dead end with no indication of why.
   *
   * Marked test.fail() so it documents the defect without breaking the suite; when the fix
   * lands this test starts passing, which fails the run and tells us to remove both this
   * annotation and AddCompanyWizard.nudgeValidation().
   */
  test.fail(
    'enables submission as soon as a unique name is validated',
    async () => {
      const wizard = await companies.openAddCompanyWizard();

      await wizard.companyNameInput.fill(uniqueCompanyName('Enables'));
      await expect(wizard.companyNameAvailable).toBeVisible();

      await expect(wizard.saveAndProceedButton).toBeEnabled();
    }
  );

  test('rejects a whitespace-only company name on a fresh form', async ({ page }) => {
    const wizard = await companies.openAddCompanyWizard();

    await wizard.companyNameInput.fill('   ');
    // Asserting a steady negative state, so give validation time to run first —
    // toBeDisabled() would otherwise pass instantly, before the app reacts at all.
    await page.waitForTimeout(3_000);

    await expect(wizard.saveAndProceedButton).toBeDisabled();
    await expect(wizard.companyNameAvailable).toBeHidden();
  });

  /**
   * KNOWN DEFECT — whitespace is not treated as empty once a valid name has been entered.
   *
   * A fresh form correctly rejects "   ", but replacing an already-validated name with
   * "   " leaves "Save and Proceed" enabled with no availability hint and no error, so a
   * company with a blank display name can be submitted. The test stops short of submitting,
   * so the back end's handling of that payload is unverified.
   */
  test.fail(
    'treats a whitespace-only name as empty when it replaces a valid name',
    async ({ page }) => {
      const wizard = await companies.openAddCompanyWizard();

      await wizard.companyNameInput.fill(uniqueCompanyName('Whitespace'));
      await expect(wizard.companyNameAvailable).toBeVisible();
      // Get to a genuinely submittable state first (see the disabled-submit defect above).
      await wizard.nudgeValidation();
      await expect(wizard.saveAndProceedButton).toBeEnabled();

      await wizard.companyNameInput.fill('   ');
      await page.waitForTimeout(3_000);

      await expect(wizard.saveAndProceedButton).toBeDisabled();
    }
  );

  test('rejects a duplicate company name', async ({ page }) => {
    const name = uniqueCompanyName('Duplicate');

    const first = await companies.openAddCompanyWizard();
    await first.createCompany({ companyName: name });
    await companies.expectNewestCompany(name);

    // Re-open and attempt the same name.
    await page.reload();
    await expect(companies.addCompanyButton).toBeEnabled();
    const second = await companies.openAddCompanyWizard();
    await second.companyNameInput.fill(name);

    await expect(second.companyNameError).toBeVisible();
    await expect(second.saveAndProceedButton).toBeDisabled();
  });

  test('does not create a company when the wizard is cancelled', async () => {
    const name = uniqueCompanyName('Cancelled');
    const before = await companies.totalCount();

    const wizard = await companies.openAddCompanyWizard();
    await wizard.fillCompanyDetails({ companyName: name });
    await wizard.cancel();

    expect(await companies.totalCount()).toBe(before);
    await companies.expectNotAmongNewest(name);
  });

  // ── Persistence ───────────────────────────────────────────────────────────

  test('a created company survives a page reload', async ({ page }) => {
    const name = uniqueCompanyName('Persist');
    const wizard = await companies.openAddCompanyWizard();
    await wizard.createCompany({ companyName: name });

    await page.reload();
    await expect(companies.addCompanyButton).toBeEnabled();

    await companies.expectNewestCompany(name);
  });
});
