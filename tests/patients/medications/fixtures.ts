import { test as base } from '@playwright/test';
import { EnrolledPatientsPage } from './pages/EnrolledPatientsPage';
import { TriageMedicationsPage } from './pages/TriageMedicationsPage';

export const test = base.extend<{ medications: TriageMedicationsPage }>({
  medications: async ({ page }, use) => {
    const enrolledPatients = new EnrolledPatientsPage(page);
    await enrolledPatients.goto();
    await enrolledPatients.openFirstReadingsCapablePatient();

    const medications = new TriageMedicationsPage(page);
    await medications.open();

    await use(medications);
  }
});

export { expect } from '@playwright/test';
