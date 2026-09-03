import type { Locator, Page } from '@playwright/test';

/**
 * Shared field-selection logic for the Demographic Profile form. The app renders the same set
 * of fields in two different places — a reactive modal on Insurance Plans, and an inline,
 * checkbox-gated section on the patient edit-profile page's Patient Profile tab (see
 * PatientProfilePage) — and both wrap this class, scoped to their own container.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Language, Race, Ethnicity, and Usual Provider are ordinary MUI comboboxes, each with a
 *    properly labelled "Open" button, found by scoping to the innermost container holding the
 *    field's label text (the "text-filter + `.last()`" idiom used elsewhere in this repo, e.g.
 *    PatientNotesPage).
 *  - Marital Status and Contact Preference are NOT — like Client Organization / Client
 *    Location in AddPatientModal, their triggers have no accessible name at all (a broken
 *    aria-labelledby) until a value is chosen, and unlike the fields above, a text-based
 *    structural locator for them proved flaky here: adjacent fields' popper transitions made
 *    the match target intermittently "not stable", so clicks landed without opening the
 *    dropdown. They're located by their own auto-generated MUI DOM id instead
 *    (`mui-component-select-maritalStatus` / `-contactPreference`), stable since MUI derives it
 *    from the field's name. The modal and the inline section are never both mounted at once
 *    (different routes), so an unscoped page-level id lookup is safe from either.
 *  - Contact Preference's option list can include disabled options (e.g. "Homephone" /
 *    "Mobile Phone", disabled when the patient has no phone on file), so options there are
 *    chosen via `[aria-disabled="true"]` rather than blindly picking the first one.
 *  - Which providers Usual Provider offers varies by environment, so `fillMinimalRequired()`
 *    picks the first available option everywhere rather than a hardcoded value — the exact
 *    choice doesn't matter for a test that only needs a valid profile to unlock insurance.
 */
export class DemographicProfileFields {
  readonly languageTrigger: Locator;
  readonly raceTrigger: Locator;
  readonly ethnicityTrigger: Locator;
  readonly usualProviderTrigger: Locator;
  readonly maritalStatusTrigger: Locator;
  readonly contactPreferenceTrigger: Locator;

  constructor(private readonly page: Page, scope: Locator) {
    this.languageTrigger = this.fieldContainer(scope, /^Language/).getByRole('button', { name: 'Open' });
    this.raceTrigger = this.fieldContainer(scope, /^Race/).getByRole('button', { name: 'Open' });
    this.ethnicityTrigger = this.fieldContainer(scope, /^Ethnicity/).getByRole('button', { name: 'Open' });
    this.usualProviderTrigger = this.fieldContainer(scope, /^Usual Provider/).getByRole('button', { name: 'Open' });

    this.maritalStatusTrigger = this.page.locator('#mui-component-select-maritalStatus');
    this.contactPreferenceTrigger = this.page.locator('#mui-component-select-contactPreference');
  }

  /** The innermost field wrapper whose text starts with the given label — see class docs. */
  private fieldContainer(scope: Locator, labelPattern: RegExp): Locator {
    return scope.locator('div').filter({ hasText: labelPattern }).last();
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

  async fillMinimalRequired(): Promise<void> {
    await this.selectFirstOption(this.languageTrigger);
    await this.selectFirstOption(this.raceTrigger);
    await this.selectFirstOption(this.ethnicityTrigger);
    await this.selectFirstEnabledOption(this.maritalStatusTrigger);
    await this.selectFirstOption(this.usualProviderTrigger);
    await this.selectFirstEnabledOption(this.contactPreferenceTrigger);
  }
}
