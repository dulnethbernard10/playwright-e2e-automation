import type { Page } from '@playwright/test';
import { uniqueMedicationSig, uniqueMedRecName } from '../../support/test-data';
import type { CertifyMedRecModal } from './pages/CertifyMedRecModal';
import { MedicationReconciliationTab } from './pages/MedicationReconciliationTab';
import type { TriageMedicationsPage } from './pages/TriageMedicationsPage';

/** "MMM DD, YYYY", matching the Triage Medications / Activities grids' date column format. */
export function todayInGridFormat(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/**
 * Adds two real, stable formulary medications (amLODIPine 5 mg, Lisinopril 10 mg, both Once
 * Daily) via the New Medication autocomplete, each tagged with a unique SIG so it can be
 * found afterward. Shared by every spec that just needs "two freshly-added, unverified
 * medications" as its starting point (Create MedRec, Lock & Certify, Verify/Unverify) — `label`
 * is suffixed with "A"/"B" so a failure's SIG is traceable back to the test that created it.
 */
export async function createTwoMedications(
  medications: TriageMedicationsPage,
  label: string
): Promise<[sigA: string, sigB: string]> {
  const sigA = uniqueMedicationSig(`${label}A`);
  const modalA = await medications.openNewMedicationModal();
  await modalA.createMedication({
    searchText: 'amlo',
    medicationOption: 'amLODIPine (Oral Pill)',
    strength: '5 mg',
    dose: '1',
    frequency: 'Once Daily',
    sig: sigA
  });

  const sigB = uniqueMedicationSig(`${label}B`);
  const modalB = await medications.openNewMedicationModal();
  await modalB.createMedication({
    searchText: 'lisi',
    medicationOption: 'Lisinopril (Oral Pill)',
    strength: '10 mg',
    dose: '1',
    frequency: 'Once Daily',
    sig: sigB
  });

  return [sigA, sigB];
}

/**
 * Completes an already-open "Certify Med Rec" form with a unique name and asserts the
 * resulting MedRec shows up in Initial Visit & Setup → Medication Reconciliation — the common
 * tail end of both Create MedRec and Lock & Certify once either has opened the form.
 */
export async function certifyAndExpectMedRecFound(
  page: Page,
  certifyModal: CertifyMedRecModal,
  label: string
): Promise<void> {
  const medRecName = uniqueMedRecName(label);
  await certifyModal.createMedRec(medRecName, 'ZZ E2E medrec description');

  const reconciliationTab = new MedicationReconciliationTab(page);
  await reconciliationTab.open();
  await reconciliationTab.expectMedRecFound(medRecName);
}
