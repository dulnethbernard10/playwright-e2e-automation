import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The "Insurance Card Image" dialog, opened from a saved plan card's "Add Card Image" button
 * on Insurance Plans.
 *
 * Verified against the DEV portal, build 2026-09-01-2:
 *  - With no image uploaded yet, the dialog shows "No insurance card images are available for
 *    this patient." alongside three icon-only buttons: Mobile Upload, Desktop Upload, Delete.
 *  - **Desktop Upload reveals a drag-and-drop form**, not an immediate native file picker —
 *    two drop zones (front-side, back-side, both optional) each with their own "Browse File"
 *    button and hidden `<input type="file">`. Clicking "Browse File" itself does not reliably
 *    open a native OS file chooser in this environment (Playwright's file-chooser interception
 *    never fires), so `uploadFrontImage()` calls `setInputFiles()` directly on the front
 *    dropzone's input instead — the standard, CI-reliable way to drive a file input regardless
 *    of whether the native picker would work.
 *  - **Upload starts disabled** and only enables once a file has been chosen (a preview thumbnail
 *    appears in that dropzone at that point).
 *  - **After a successful upload, the dialog immediately shows the saved image** ("Insurance
 *    Card 1") with zoom in/out/reset controls, replacing both the empty-state message and the
 *    upload form. Closing and reopening the dialog still shows it — a fresh load, not just
 *    leftover client-side state — confirming the upload persisted server-side.
 *  - **Deleting needs confirmation.** The Delete button (present in both the empty and
 *    image-saved states) opens a separate "Delete Insurance Card Image" dialog asking "Are you
 *    sure you want to delete the insurance card image?" with "No" / "Yes". Confirming takes a
 *    moment to apply server-side — the confirm dialog stays open for a beat after "Yes" is
 *    clicked before it closes and the underlying dialog reverts to the empty state ("No
 *    insurance card images are available for this patient."), so `deleteImage()` waits on the
 *    confirm dialog closing rather than asserting immediately after the click.
 */
export class InsuranceCardImageDialog {
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly mobileUploadButton: Locator;
  readonly desktopUploadButton: Locator;
  readonly deleteButton: Locator;
  readonly noImagesMessage: Locator;
  readonly frontFileInput: Locator;
  readonly backFileInput: Locator;
  readonly uploadButton: Locator;
  readonly cancelButton: Locator;
  readonly cardImage: Locator;
  readonly confirmDeleteDialog: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog').filter({ hasText: 'Insurance Card Image' });
    this.closeButton = this.dialog.getByRole('button', { name: 'close' });
    this.mobileUploadButton = this.dialog.getByRole('button', { name: 'Mobile Upload' });
    this.desktopUploadButton = this.dialog.getByRole('button', { name: 'Desktop Upload' });
    this.deleteButton = this.dialog.getByRole('button', { name: 'Delete', exact: true });
    this.noImagesMessage = this.dialog.getByText('No insurance card images are available for this patient.');
    this.frontFileInput = this.dialog.locator('input[type="file"]').first();
    this.backFileInput = this.dialog.locator('input[type="file"]').last();
    this.uploadButton = this.dialog.getByRole('button', { name: 'Upload', exact: true });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel', exact: true });
    this.cardImage = this.dialog.getByRole('img', { name: /^Insurance Card/ });
    this.confirmDeleteDialog = page.getByRole('dialog').filter({ hasText: 'Delete Insurance Card Image' });
  }

  async expectOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible();
  }

  async expectNoImages(): Promise<void> {
    await expect(this.noImagesMessage).toBeVisible();
  }

  /** Reveals the drag-and-drop upload form. */
  async openDesktopUpload(): Promise<void> {
    await this.desktopUploadButton.click();
    await expect(this.frontFileInput).toBeAttached();
  }

  /** Uploads a front-side card image and saves it — see class docs on why this drives the
   *  hidden file input directly instead of the "Browse File" button. */
  async uploadFrontImage(filePath: string): Promise<void> {
    await this.frontFileInput.setInputFiles(filePath);
    await expect(this.uploadButton).toBeEnabled();
    await this.uploadButton.click();
    await expect(this.cardImage).toBeVisible();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.dialog).toBeHidden();
  }

  /** Deletes the saved card image, confirming the "Delete Insurance Card Image" dialog — see
   *  class docs on why this waits for the confirm dialog to close before checking the empty
   *  state, rather than asserting right after the "Yes" click. */
  async deleteImage(): Promise<void> {
    await this.deleteButton.click();
    await expect(this.confirmDeleteDialog).toBeVisible();
    await this.confirmDeleteDialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(this.confirmDeleteDialog).toBeHidden();
    await expect(this.noImagesMessage).toBeVisible();
  }
}
