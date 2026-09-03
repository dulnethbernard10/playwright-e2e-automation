import path from 'path';
import { addCignaInsurancePlan, test } from './fixtures';

const TEST_CARD_IMAGE = path.join(__dirname, 'test-assets', 'insurance-card.png');

test.use({ patientTag: 'DeleteCardImage' });

/**
 * Delete a saved insurance card image — see fixtures.ts for the shared setup (create patient →
 * Demographic Profile → Insurance Plans → add a Cigna plan), then upload a card image, delete
 * it via the dialog's Delete button, and confirm both the immediate UI state and a fresh
 * reopen agree the image is gone.
 *
 * See InsuranceCardImageDialog's class docs for the "Delete Insurance Card Image" confirmation
 * dialog and why deleteImage() waits for it to close before checking the empty state.
 */
test.describe('Delete insurance card image', () => {
  test('deletes a saved card image and confirms it no longer persists after reopening the dialog', async ({
    insurance
  }) => {
    test.setTimeout(150_000);

    const memberId = await addCignaInsurancePlan(insurance);

    let cardImageDialog = await insurance.openCardImageDialog('Cigna', memberId);
    await cardImageDialog.expectNoImages();
    await cardImageDialog.openDesktopUpload();
    await cardImageDialog.uploadFrontImage(TEST_CARD_IMAGE);

    await cardImageDialog.deleteImage();
    await cardImageDialog.close();

    // Reopen from scratch — confirms the deletion was actually saved, not just a client-side
    // update that would revert on a fresh load of the dialog.
    cardImageDialog = await insurance.openCardImageDialog('Cigna', memberId);
    await cardImageDialog.expectNoImages();
  });
});
