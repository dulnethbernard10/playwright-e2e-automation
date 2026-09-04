import { test } from './fixtures';
import { todayInGridFormat } from './helpers';
import { uniqueActivityNote } from '../../support/test-data';
import { ActivitiesPage } from './pages/ActivitiesPage';

/**
 * Add Activity — an RPM-enrolled patient's Medications screen → Add Activity.
 *
 * Category, Subcategory, Contact Mode and Reviewed Datetime are left at their defaults (see
 * AddActivityModal); only Notes, Share w/ Provider and Duration are set explicitly.
 */
test.describe('Add Activity', () => {
  test('adds an activity from the Medications screen and it appears on the Activities screen', async ({
    page,
    medications
  }) => {
    const note = uniqueActivityNote('MedicationsActivity');

    const modal = await medications.openAddActivityModal();
    await modal.addActivity({
      note,
      shareWithProvider: false,
      durationMinutes: 4
    });

    const activities = new ActivitiesPage(page);
    await activities.open();
    await activities.expectActivityDetails(note, {
      date: todayInGridFormat(),
      timeSpent: '00:04:00',
      program: 'RPM'
    });
  });
});
