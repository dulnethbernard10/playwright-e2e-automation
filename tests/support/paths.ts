import path from 'path';

/** Root of the tests/ directory, regardless of where Playwright is invoked from. */
export const TESTS_ROOT = path.join(__dirname, '..');

/** Saved authenticated browser state, produced by auth.setup.ts. Gitignored. */
export const STORAGE_STATE = path.join(TESTS_ROOT, '.auth', 'session.json');

/** Where per-ticket screenshot evidence is written. Gitignored. */
export const EVIDENCE_ROOT = path.join(TESTS_ROOT, '..', 'evidence');
