/**
 * Synthetic test data helpers.
 *
 * Every generated company name carries the ZZ_PREFIX so that E2E-created records are
 * trivially identifiable and sort to the end of the alphabetical companies grid.
 * Never use real customer or patient data here.
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
