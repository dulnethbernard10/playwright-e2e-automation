import type { Locator, Page } from '@playwright/test';

/**
 * Shared field-selection logic for the Demographic Profile fields (Language, Race, Ethnicity,
 * Marital Status, Contact Preference, Usual Provider). The app renders this same set of fields
 * in two different places — patient onboarding's Patient Profile edit screen, and a reactive
 * modal Insurance Plans opens for a patient with no profile yet — so both `PatientProfileEditPage`
 * (onboarding) and `PatientProfilePage` (insurance) wrap this class, each scoped to their own
 * container.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Language, Race, Ethnicity, and Usual Provider are ordinary MUI comboboxes, properly
 *    labelled — selectable by accessible name via `getByRole('combobox', { name })`.
 *  - Marital Status and Contact Preference are NOT — like Client Organization / Client
 *    Location in AddPatientModal, their triggers have no accessible name at all (a broken
 *    aria-labelledby) until a value is chosen, and a text-based structural locator for them
 *    proved flaky here: adjacent fields' popper transitions made the match target
 *    intermittently "not stable", so clicks landed without opening the dropdown. They're
 *    located by their own auto-generated MUI DOM id instead
 *    (`mui-component-select-maritalStatus` / `-contactPreference`), stable since MUI derives it
 *    from the field's name. The two consumer forms are never mounted at the same time, so an
 *    unscoped page-level id lookup is safe from either.
 *  - Contact Preference's option list can include disabled options (e.g. "Homephone" /
 *    "Mobile Phone", disabled when the patient has no phone on file) — `selectFirstEnabledOption()`
 *    exists for a caller (like `fillMinimalRequired()`) that just needs *a* valid choice.
 */
export class DemographicProfileFields {
  readonly languageTrigger: Locator;
  readonly raceTrigger: Locator;
  readonly ethnicityTrigger: Locator;
  readonly usualProviderTrigger: Locator;
  readonly maritalStatusTrigger: Locator;
  readonly contactPreferenceTrigger: Locator;

  constructor(private readonly page: Page, scope: Locator) {
    this.languageTrigger = scope.getByRole('combobox', { name: 'Language' });
    this.raceTrigger = scope.getByRole('combobox', { name: 'Race' });
    this.ethnicityTrigger = scope.getByRole('combobox', { name: 'Ethnicity' });
    this.usualProviderTrigger = scope.getByRole('combobox', { name: 'Usual Provider' });

    this.maritalStatusTrigger = this.page.locator('#mui-component-select-maritalStatus');
    this.contactPreferenceTrigger = this.page.locator('#mui-component-select-contactPreference');
  }

  private async selectOption(trigger: Locator, name: string): Promise<void> {
    await trigger.click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  private async selectFirstOption(trigger: Locator): Promise<void> {
    await trigger.click();
    await this.page.getByRole('option').first().click();
  }

  /** Picks the first non-disabled option — see class docs on Contact Preference. */
  private async selectFirstEnabledOption(trigger: Locator): Promise<void> {
    await trigger.click();
    await this.page.locator('[role="option"]:not([aria-disabled="true"])').first().click();
  }

  async selectLanguage(name: string): Promise<void> {
    await this.selectOption(this.languageTrigger, name);
  }

  async selectRace(name: string): Promise<void> {
    await this.selectOption(this.raceTrigger, name);
  }

  async selectEthnicity(name: string): Promise<void> {
    await this.selectOption(this.ethnicityTrigger, name);
  }

  async selectMaritalStatus(name: string): Promise<void> {
    await this.selectOption(this.maritalStatusTrigger, name);
  }

  async selectContactPreference(name: string): Promise<void> {
    await this.selectOption(this.contactPreferenceTrigger, name);
  }

  /**
   * Selects `name` if given, otherwise picks whichever provider is first in the list — see
   * class docs on why the roster (and so the exact choice) varies by environment. Returns the
   * name that ended up selected, since a caller that omitted `name` has no other way to know it.
   */
  async selectUsualProvider(name?: string): Promise<string> {
    await this.usualProviderTrigger.click();
    const option =
      name !== undefined ? this.page.getByRole('option', { name, exact: true }) : this.page.getByRole('option').first();
    const resolvedName = name ?? (await option.textContent()) ?? '';
    await option.click();
    return resolvedName;
  }

  /**
   * Fills every required field with a valid (if arbitrary) choice — for a caller that only
   * needs a valid Demographic Profile to unlock something else (e.g. Insurance Plans), not to
   * test the fields themselves.
   */
  async fillMinimalRequired(): Promise<void> {
    await this.selectFirstOption(this.languageTrigger);
    await this.selectFirstOption(this.raceTrigger);
    await this.selectFirstOption(this.ethnicityTrigger);
    await this.selectFirstEnabledOption(this.maritalStatusTrigger);
    await this.selectFirstOption(this.usualProviderTrigger);
    await this.selectFirstEnabledOption(this.contactPreferenceTrigger);
  }
}
