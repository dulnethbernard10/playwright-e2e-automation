/**
 * Synthetic test data helpers.
 *
 * Every generated company name, and every generated patient's last name, carries the
 * ZZ_PREFIX so that E2E-created records are trivially identifiable and sort to the end of
 * their respective grids. Never use real customer or patient data here.
 */

export const ZZ_PREFIX = 'ZZ E2E';

let counter = 0;

/** Unique, human-readable company name. Unique per call, even within one millisecond. */
export function uniqueCompanyName(label = 'Co'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** A name long enough to probe field-length handling. */
export function longCompanyName(length = 255): string {
  const suffix = ` ${Date.now()}`;
  const filler = 'A'.repeat(Math.max(0, length - ZZ_PREFIX.length - suffix.length - 1));
  return `${ZZ_PREFIX} ${filler}${suffix}`;
}

const FIRST_NAMES = [
  'Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan',
  'Isabella', 'Elijah', 'Amelia', 'James', 'Harper'
];

const STREET_NAMES = [
  'Harbor Lane', 'Maple Street', 'Sunset Boulevard', 'Elm Avenue', 'Cedar Court', 'Willow Way'
];

const CITIES = ['San Francisco', 'Austin', 'Denver', 'Seattle', 'Portland', 'Raleigh', 'Columbus', 'Tampa'];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomFirstName(): string {
  return randomFrom(FIRST_NAMES);
}

/** Unique last name, ZZ_PREFIX-tagged like company names so E2E patients are identifiable. */
export function uniquePatientLastName(label = 'Patient'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** Unique email addressed for a generated patient. Never a real inbox. */
export function uniquePatientEmail(lastName: string): string {
  counter += 1;
  const slug = lastName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `${slug}.${Date.now()}-${counter}@example.com`;
}

/** Random date of birth (MM/DD/YYYY) for an adult between minAge and maxAge. */
export function randomDateOfBirth(minAge = 18, maxAge = 90): string {
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge));
  const year = new Date().getFullYear() - age;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28); // safe for all months, incl. February
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
}

export function randomZipcode(): string {
  return String(10000 + Math.floor(Math.random() * 89999));
}

/** 10-digit US phone number; the Add Patient form's input mask formats it for display. */
export function randomPhoneNumber(): string {
  const area = 200 + Math.floor(Math.random() * 700);
  const exchange = 200 + Math.floor(Math.random() * 700);
  const line = Math.floor(Math.random() * 10000);
  return `${area}${exchange}${String(line).padStart(4, '0')}`;
}

export function randomStreetAddress(): string {
  const number = 100 + Math.floor(Math.random() * 9000);
  return `${number} ${randomFrom(STREET_NAMES)}`;
}

export function randomCity(): string {
  return randomFrom(CITIES);
}

/** Unique note description, ZZ_PREFIX-tagged so E2E-created notes are identifiable. */
export function uniqueNoteDescription(label = 'Note'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/**
 * Unique medication SIG text, ZZ_PREFIX-tagged so E2E-created medications are identifiable
 * in the Triage Medications grid. Used when Medication Name itself can't carry the prefix —
 * i.e. picked from the fixed autocomplete list rather than typed as free text.
 */
export function uniqueMedicationSig(label = 'Sig'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** Unique, ZZ_PREFIX-tagged medication name for manual (typed, not autocomplete-picked) entry. */
export function uniqueMedicationName(label = 'Med'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** Unique, ZZ_PREFIX-tagged MedRec name, so E2E-created MedRecs are identifiable. */
export function uniqueMedRecName(label = 'MedRec'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** Unique, ZZ_PREFIX-tagged activity note, so E2E-created activities are identifiable. */
export function uniqueActivityNote(label = 'Activity'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}

/** Unique, ZZ_PREFIX-tagged follow-up note, so E2E-created follow-ups are identifiable. */
export function uniqueFollowUpNote(label = 'FollowUp'): string {
  counter += 1;
  return `${ZZ_PREFIX} ${label} ${Date.now()}-${counter}`;
}
