import path from 'path';
import { addCignaInsurancePlan, test } from './fixtures';

const TEST_CARD_IMAGE = path.join(__dirname, 'test-assets', 'insurance-card.png');

test.use({ patientTag: 'CardImage' });

/**
 * Upload an insurance card image — see fixtures.ts for the shared setup (create patient →
 * Demographic Profile → Insurance Plans → add a Cigna plan), then upload a card image via
 * Desktop Upload and re-open the dialog to confirm it was saved, not just previewed
 * client-side.
 *
 * See InsuranceCardImageDialog's class docs for why this drives the hidden file input
 * directly rather than the "Browse File" button (its native OS file picker doesn't reliably
 * open here — same reasoning as any other file-upload automation).
 */
test.describe('Add insurance card image', () => {
  test('uploads a card image and confirms it persists after reopening the dialog', async ({ insurance }) => {
    test.setTimeout(150_000);

    const memberId = await addCignaInsurancePlan(insurance);

    let cardImageDialog = await insurance.openCardImageDialog('Cigna', memberId);
    await cardImageDialog.expectNoImages();
    await cardImageDialog.openDesktopUpload();
    await cardImageDialog.uploadFrontImage(TEST_CARD_IMAGE);
    await cardImageDialog.close();

    // Reopen from scratch — confirms the upload was actually saved, not just a client-side
    // preview that would vanish on a fresh load of the dialog.
    cardImageDialog = await insurance.openCardImageDialog('Cigna', memberId);
    await cardImageDialog.cardImage.waitFor({ state: 'visible' });
  });
});
