import { test as base } from '@playwright/test';
import { EnrolledPatientsPage } from './pages/EnrolledPatientsPage';
import { PatientFollowUpsPage } from './pages/PatientFollowUpsPage';

export const test = base.extend<{ followUps: PatientFollowUpsPage }>({
  followUps: async ({ page }, use) => {
    const patients = new EnrolledPatientsPage(page);
    await patients.goto();
    await patients.openRandomEnrolledPatient();

    const followUps = new PatientFollowUpsPage(page);
    await use(followUps);
  }
});

export { expect } from '@playwright/test';
