import { test as base } from '@playwright/test';
import { PatientsLookupPage } from '../../support/pages/PatientsLookupPage';
import { PatientNotesPage } from './pages/PatientNotesPage';

/**
 * The shared QA patient used by every notes test. Centralized so an environment change (or
 * a future switch to a per-test-created patient) is a one-line edit, not one per spec.
 */
const EXISTING_PATIENT = { firstName: 'James', lastName: 'Baker' } as const;

export const test = base.extend<{ notes: PatientNotesPage }>({
  notes: async ({ page }, use) => {
    const patients = new PatientsLookupPage(page);
    await patients.goto();
    await patients.searchByName(EXISTING_PATIENT.firstName, EXISTING_PATIENT.lastName);
    await patients.openPatient(`${EXISTING_PATIENT.firstName} ${EXISTING_PATIENT.lastName}`);

    const notes = new PatientNotesPage(page);
    await notes.open();

    await use(notes);
  }
});

export { expect } from '@playwright/test';
