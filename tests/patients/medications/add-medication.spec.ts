import { test } from './fixtures';
import { todayInGridFormat } from './helpers';
import { uniqueMedicationName, uniqueMedicationSig } from '../../support/test-data';

/**
 * Add Medication — an RPM-enrolled patient's Medications → Triage list → New Medication.
 *
 * Medication Name is chosen from the app's own drug database via its search-as-you-type
 * autocomplete (see NewMedicationModal), not typed as free text, so this picks a real,
 * stable formulary entry ("Lisinopril (Oral Pill)") rather than a synthetic name.
 */
test.describe('Triage medications', () => {
  test('adds a medication from the autocomplete and it appears in the triage grid', async ({ medications }) => {
    const sig = uniqueMedicationSig('AddMedication');
    const prescriber = 'ZZ E2E Dr Tester';

    const modal = await medications.openNewMedicationModal();
    await modal.createMedication({
      searchText: 'lisi',
      medicationOption: 'Lisinopril (Oral Pill)',
      strength: '10 mg',
      dose: '1',
      frequency: 'Once Daily',
      timeOfDay: 'noon',
      sig,
      prescriber,
      pharmacy: 'ZZ E2E Pharmacy',
      refills: '3',
      quantity: '60',
      routeOfAdministration: 'Sublingually',
      fillDate: true,
      writtenDate: true
    });

    await medications.expectMedicationDetails(sig, {
      name: 'LISINOPRIL (ORAL PILL)',
      strength: '10 mg',
      prescriber,
      refills: '3',
      dateWritten: todayInGridFormat(),
      fillDate: todayInGridFormat()
    });
  });

  test('adds a manually-typed medication and it appears in the triage grid', async ({ medications }) => {
    const name = uniqueMedicationName('ManualMedication');
    const sig = uniqueMedicationSig('ManualMedication');
    const prescriber = 'ZZ E2E Dr Manual';

    const modal = await medications.openNewMedicationModal();
    await modal.createManualMedication({
      name,
      form: 'capsule',
      dose: '1',
      strength: '25',
      strengthUnit: 'mg',
      frequency: 'Twice Daily',
      timeOfDay: 'evening',
      sig,
      prescriber,
      pharmacy: 'ZZ E2E Pharmacy',
      refills: '1',
      quantity: '30',
      routeOfAdministration: 'Topically',
      fillDate: true,
      writtenDate: true
    });

    await medications.expectMedicationDetails(sig, {
      name: name.toUpperCase(),
      strength: '25 mg',
      prescriber,
      refills: '1',
      dateWritten: todayInGridFormat(),
      fillDate: todayInGridFormat()
    });
  });
});
