import { expect, type Locator, type Page } from '@playwright/test';

export interface CompanyAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  /** Full state name, e.g. "North Carolina" — see the note on getAddress(). */
  state: string;
}

/**
 * The logged-in user's own company's mailing address, reached from the profile menu in the
 * top-right of the app shell (present on every page) → "MY COMPANY" → the "Profile & Contact"
 * step's Review button on the company setup page.
 *
 * Promoted to support/ because it's read from a patients-domain test (Guarantor Information's
 * "Same as company address" mirrors it) even though the destination page itself belongs
 * conceptually to administration — see CLAUDE.md's domain rules on cross-domain needs.
 *
 * Verified against the DEV portal, build 2026-08-31-1:
 *  - The profile menu's trigger is icon-only with no accessible name; it's the one button in
 *    the header that wraps the "company logo" image.
 *  - The company page has no single stable landmark for the "Profile & Contact" step, so its
 *    Review button is found structurally: the nearest ancestor of the "Profile & Contact"
 *    section title that also contains a "Review" button (the same
 *    find-a-label-act-on-a-sibling-control approach PatientNotesPage uses for note rows).
 *  - Clicking "MY COMPANY" navigates the page but doesn't close its own menu — it's still
 *    open, and its backdrop blocks every click, on the company page underneath. Escape
 *    dismisses it, which is unrelated to and doesn't cancel the navigation that already
 *    happened.
 *  - The company address has no Zipcode field at all in this form.
 */
export class CompanyProfilePage {
  private readonly addressLine1Input: Locator;
  private readonly addressLine2Input: Locator;
  private readonly cityInput: Locator;
  private readonly stateTrigger: Locator;

  constructor(private readonly page: Page) {
    this.addressLine1Input = page.getByRole('textbox', { name: 'Address Line 1', exact: true });
    this.addressLine2Input = page.getByRole('textbox', { name: 'Address Line 2', exact: true });
    this.cityInput = page.getByRole('textbox', { name: 'City', exact: true });
    this.stateTrigger = page.getByRole('combobox', { name: 'State', exact: true });
  }

  /** Opens the current company's Profile & Contact section from wherever the page is now. */
  static async openProfileAndContact(page: Page): Promise<CompanyProfilePage> {
    const profileMenuButton = page.getByRole('button').filter({ has: page.getByRole('img', { name: 'company logo' }) });
    await profileMenuButton.click();
    await page.getByRole('button', { name: 'MY COMPANY' }).click();
    await page.keyboard.press('Escape');

    const reviewButton = page
      .locator('p', { hasText: 'Profile & Contact' })
      .locator('xpath=ancestor::*[.//button[normalize-space()="Review"]][1]')
      .getByRole('button', { name: 'Review' });
    await reviewButton.click();

    const company = new CompanyProfilePage(page);
    await expect(company.addressLine1Input).toBeVisible();
    return company;
  }

  /**
   * Reads the company's mailing address. The State trigger only displays the abbreviation
   * (e.g. "NC"), but the field that mirrors it in Guarantor Information shows the full name —
   * so this opens the dropdown and reads the selected option's text instead, which is formatted
   * "North Carolina (NC)", and strips the parenthesised abbreviation.
   */
  async getAddress(): Promise<CompanyAddress> {
    const addressLine1 = await this.addressLine1Input.inputValue();
    const addressLine2 = await this.addressLine2Input.inputValue();
    const city = await this.cityInput.inputValue();

    await this.stateTrigger.click();
    const selectedOptionText = (await this.page.getByRole('option', { selected: true }).textContent()) ?? '';
    await this.page.keyboard.press('Escape');
    const state = selectedOptionText.replace(/\s*\([^)]*\)\s*$/, '');

    return { addressLine1, addressLine2, city, state };
  }
}
