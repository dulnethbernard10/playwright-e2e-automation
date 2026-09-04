import { expect, type Locator, type Page } from '@playwright/test';

/** Fields whose handling is identical whichever way Medication Name was set. */
interface CommonMedicationFields {
  frequency: string;
  timeOfDay?: string;
  sig?: string;
  prescriber?: string;
  pharmacy?: string;
  refills?: string;
  quantity?: string;
  routeOfAdministration?: string;
  /** Omit to leave Date Filled unset. */
  fillDate?: boolean;
  /** Omit to leave Date Written unset. */
  writtenDate?: boolean;
}

export interface MedicationDetails extends CommonMedicationFields {
  /** First few letters typed into Medication Name to trigger the search-as-you-type list. */
  searchText: string;
  /** Exact option label to pick from that list, e.g. "Lisinopril (Oral Pill)". */
  medicationOption: string;
  /** Exact option label from the Strength dropdown that appears once a medication is picked. */
  strength: string;
  dose: string;
}

export interface ManualMedicationDetails extends CommonMedicationFields {
  /** Free-text medication name, typed directly rather than picked from the search list. */
  name: string;
  /**
   * Required here (unlike the autocomplete flow, where picking a known medication fills
   * this in automatically) — with no matched medication there's nothing to infer it from.
   */
  form: string;
  dose: string;
  /** Numeric strength amount, e.g. "5" — a free spinbutton here, not a preset dropdown. */
  strength: string;
  /** e.g. "mg" — its own dropdown alongside the free-text Strength amount. */
  strengthUnit: string;
}

/**
 * "New Medication", opened from a patient's Medications → Triage list (its own routed page
 * at `/patients/:id/details/medications/new`, rendered as a dialog over the triage list).
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - Medication Name is a search-as-you-type autocomplete: typing ~2+ letters fires a
 *    debounced lookup, and matches render as plain, non-semantic `<div>`s with no `option`
 *    role and no stable attribute — so they're matched by their exact visible text
 *    (`getByText(..., { exact: true })`), scoped to the dialog to stay clear of anything
 *    else on the page.
 *  - Picking a known medication reshapes the form: Strength switches from a free-text
 *    dose+unit pair to a single preset dropdown of that medication's real strengths (e.g.
 *    "5 mg", "10 mg"), and Form auto-fills from the medication's dosage type (e.g. "Oral
 *    Pill" → "tablet").
 *  - Medication Name is also "freeSolo": typing a name with no formulary match (e.g. a
 *    ZZ_PREFIX-tagged manual entry) and moving on keeps the typed text rather than
 *    reverting it to empty — see ManualMedicationDetails. But blur that field with Escape
 *    rather than Tab and, because there's no real match, no suggestion popup ever opens for
 *    Escape to dismiss — with nothing open to catch it, Escape instead bubbles up to the
 *    dialog itself and closes the whole "New Medication" screen (confirmed: it silently
 *    navigated back to the triage list mid-fill). `typeMedicationNameManually()` uses Tab.
 *  - Form / Strength / Frequency / Time of Day / Route of Administration are all rendered as
 *    a `div[role="button"]` overlaid on a hidden text input sharing the one placeholder
 *    "Select an option..." across every such field, so it can't disambiguate them. Some of
 *    these trigger divs pick up an accessible name from their own selected-value text (once
 *    one is chosen) and some never do (verified: Frequency's never gets a name even after
 *    selecting) — so rather than branch on that, every one of these fields is opened
 *    structurally instead, via the fixed, always-present label text immediately preceding
 *    it (`dropdownField()`), which works whether or not the trigger happens to have a name.
 *  - Date Filled / Date Written / Date Sold are masked text inputs that silently ignore
 *    `.fill()` — the value never lands (confirmed: an attempted `.fill()` left the field's
 *    real `.value` empty). They must be set via their "Choose date" calendar button instead.
 *    `pickDate()` always selects the current day (marked `aria-current="date"` in the
 *    calendar), sidestepping month-navigation entirely since any valid date satisfies these
 *    fields for E2E purposes.
 *  - Save has no accessible-name collision, but doesn't render in a snapshot taken
 *    immediately after opening the dialog — it's still there and clickable, so it's used by
 *    role/name without waiting on a snapshot to "prove" it first.
 */
export class NewMedicationModal {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly saveButton: Locator;

  readonly medicationNameInput: Locator;
  readonly doseInput: Locator;
  readonly strengthInput: Locator;
  readonly sigInput: Locator;
  readonly prescriberInput: Locator;
  readonly pharmacyInput: Locator;
  readonly refillsInput: Locator;
  readonly quantityInput: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'New Medication' });
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save', exact: true });

    this.medicationNameInput = this.dialog.getByRole('textbox', { name: 'Medication Name', exact: true });
    this.doseInput = this.dialog.getByRole('spinbutton', { name: 'Dose', exact: true });
    // Only present before a known medication is picked — see ManualMedicationDetails.
    this.strengthInput = this.dialog.getByRole('spinbutton', { name: 'Strength', exact: true });
    this.sigInput = this.dialog.getByRole('textbox', { name: 'SIG', exact: true });
    this.prescriberInput = this.dialog.getByRole('textbox', { name: 'Prescriber', exact: true });
    this.pharmacyInput = this.dialog.getByRole('textbox', { name: 'Pharmacy', exact: true });
    this.refillsInput = this.dialog.getByRole('spinbutton', { name: 'Refills', exact: true });
    this.quantityInput = this.dialog.getByRole('spinbutton', { name: 'Quantity', exact: true });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(this.medicationNameInput).toBeVisible();
  }

  /**
   * The interactive control for a labelled field, found via the field's own label text
   * rather than the control's accessible name — see the class-level note on why several of
   * these controls can't be relied on to have one.
   */
  private dropdownField(label: string): Locator {
    return this.dialog.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
  }

  async selectFromDropdown(label: string, optionName: string): Promise<void> {
    await this.dropdownField(label).getByRole('button').click();
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  /** Type the search text and pick the exact medication option once it appears. */
  async searchAndSelectMedication(searchText: string, optionLabel: string): Promise<void> {
    await this.medicationNameInput.fill(searchText);
    await this.dialog.getByText(optionLabel, { exact: true }).click();
    await expect(this.medicationNameInput).toHaveValue(optionLabel);
  }

  /**
   * Type a medication name directly instead of picking one from the search list — Medication
   * Name is a "freeSolo" autocomplete, so an unmatched typed value is kept as-is once the
   * field is blurred, rather than being reverted to empty.
   *
   * Blurring via Tab rather than Escape: a random, ZZ_PREFIX-tagged name has no real
   * formulary match, so no suggestion popup ever opens for Escape to dismiss — with nothing
   * open to catch it, Escape instead bubbles up to the dialog itself and closes the whole
   * "New Medication" screen (confirmed: it navigated back to the triage list mid-fill).
   */
  async typeMedicationNameManually(name: string): Promise<void> {
    await this.medicationNameInput.fill(name);
    await this.page.keyboard.press('Tab');
    await expect(this.medicationNameInput).toHaveValue(name);
  }

  /**
   * Opens the given date field's calendar and picks today — see the class-level note.
   *
   * A previously-opened date picker's popper stays in the DOM (visible, not removed) after
   * its date is chosen, so by the second date field there are two "today" cells matching
   * `aria-current="date"` — one per popper, both still visible. The one already chosen
   * carries `aria-selected="true"`; the freshly-opened, not-yet-picked one is
   * `aria-selected="false"`, which is what distinguishes it.
   */
  async pickDate(label: string): Promise<void> {
    await this.dropdownField(label).getByRole('button').click();
    await this.page.locator('[role="gridcell"][aria-current="date"][aria-selected="false"]').click();
  }

  private async fillCommonFields(details: CommonMedicationFields): Promise<void> {
    await this.selectFromDropdown('Frequency *', details.frequency);

    if (details.timeOfDay !== undefined) {
      await this.selectFromDropdown('Time of Day', details.timeOfDay);
    }
    if (details.sig !== undefined) {
      await this.sigInput.fill(details.sig);
    }
    if (details.prescriber !== undefined) {
      await this.prescriberInput.fill(details.prescriber);
    }
    if (details.pharmacy !== undefined) {
      await this.pharmacyInput.fill(details.pharmacy);
    }
    if (details.refills !== undefined) {
      await this.refillsInput.fill(details.refills);
    }
    if (details.quantity !== undefined) {
      await this.quantityInput.fill(details.quantity);
    }
    if (details.routeOfAdministration !== undefined) {
      await this.selectFromDropdown('Route of Administration', details.routeOfAdministration);
    }
    if (details.fillDate) {
      await this.pickDate('Date Filled');
    }
    if (details.writtenDate) {
      await this.pickDate('Date Written');
    }
  }

  async fillMedication(details: MedicationDetails): Promise<void> {
    await this.searchAndSelectMedication(details.searchText, details.medicationOption);
    await this.selectFromDropdown('Strength *', details.strength);
    await this.doseInput.fill(details.dose);
    await this.fillCommonFields(details);
  }

  /**
   * Fills the modal for a medication typed manually rather than picked from the search
   * list — see ManualMedicationDetails for how the required fields differ from the
   * autocomplete flow (Form must be chosen explicitly; Strength is a numeric amount plus a
   * separate Unit dropdown, not one preset option).
   */
  async fillManualMedication(details: ManualMedicationDetails): Promise<void> {
    await this.typeMedicationNameManually(details.name);
    await this.selectFromDropdown('Form *', details.form);
    await this.doseInput.fill(details.dose);
    await this.strengthInput.fill(details.strength);
    await this.selectFromDropdown('Unit *', details.strengthUnit);
    await this.fillCommonFields(details);
  }

  async save(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
    await expect(this.dialog).toBeHidden();
  }

  async createMedication(details: MedicationDetails): Promise<void> {
    await this.fillMedication(details);
    await this.save();
  }

  async createManualMedication(details: ManualMedicationDetails): Promise<void> {
    await this.fillManualMedication(details);
    await this.save();
  }
}
