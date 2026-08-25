# CLAUDE.md

Playwright E2E automation for the Truentity QA portal. Tests drive the real QA app
(`https://portal.qa.truentity.net`) through the UI.

## Commands

```bash
npm test                                          # full suite (runs auth setup first)
npm run test:headed                               # visible browser
npm run report                                    # open the last HTML report
npx tsc --noEmit                                  # typecheck

PLAYWRIGHT_HTML_OPEN=never npx playwright test    # CI-friendly, no report popup
npx playwright test tests/administration/companies # one domain
npx playwright test -g "duplicate company name"    # one test by name
```

`npx playwright cli <command>` drives a browser interactively — there is no global
`playwright-cli` binary here. See [SKILLS.md](SKILLS.md).

## Test organisation

Tests are grouped by **business domain**, mirroring the portal's own navigation. A domain
owns its specs *and* its page objects, so a feature is self-contained and one team's churn
doesn't ripple outward.

```
tests/
├── auth.setup.ts                  # logs in once, writes tests/.auth/session.json
├── support/                       # cross-domain helpers only
│   ├── paths.ts                   # shared filesystem paths
│   ├── test-data.ts               # synthetic data generators
│   └── screenshots.ts             # ticket-scoped evidence capture
│
├── administration/                # ← domain
│   └── companies/                 # ← feature area
│       ├── pages/                 # POMs owned by this feature
│       │   ├── CompaniesListPage.ts
│       │   └── AddCompanyWizard.ts
│       └── company-creation.spec.ts
│
├── rpm/                           # Remote Patient Monitoring
├── ccm/                           # Chronic Care Management
├── mtm/                           # Medication Therapy Management
└── tcm/                           # Transitional Care Management
```

### Rules

1. **Domain first, then feature area.** `tests/<domain>/<feature>/`. Domains follow the
   portal's business areas: `administration`, `rpm`, `ccm`, `mtm`, `tcm`, `reports`.
2. **One spec per user-facing flow**, named after the flow, not the page —
   `company-creation.spec.ts`, not `companies.spec.ts`. When company *editing* arrives it
   becomes `company-edit.spec.ts` alongside it, reusing the same POMs.
3. **Page objects live with the feature that owns them**, in `<feature>/pages/`. Company
   creation is part of the `administration/companies` feature area, so
   `AddCompanyWizard.ts` lives there — not in a global `pages/` tree.
4. **Promote to `support/` only on the second consumer.** A POM used by two domains (app
   shell, global nav, login) moves to `tests/support/pages/`. Until then, leave it put.
5. **Never import across domains.** If `rpm/` needs something from `administration/`, that
   thing belongs in `support/`. Cross-domain imports are the signal to promote.
6. **`support/` holds no tests and no domain knowledge** — only generic helpers.

Playwright collects `*.spec.ts` only, so `pages/` and `support/` are never picked up as tests.

## Authentication

`auth.setup.ts` runs as a dependency project, logs in with `PLAYWRIGHT_TEST_EMAIL` /
`PLAYWRIGHT_TEST_PASSWORD`, and saves storage state to `tests/.auth/session.json`. The
`chromium` project loads that state, so specs start authenticated — never log in inside a spec.

The post-login landing route varies by account role, so the setup asserts on authenticated
chrome (the "Search Patients" box), not on a specific URL.

## Writing tests

- **Semantic locators only** — `getByRole`, `getByLabel`, `getByTestId`. No CSS class
  selectors; the app is MUI and its class names are hashed and unstable.
- **Beware MUI strict-mode collisions.** Nav items are often rendered twice (sidebar +
  breadcrumb). Scope to a container or use `exact: true` rather than reaching for `.first()`.
- **No positional chains like `getByRole('textbox').nth(2)`.** They break the moment a field
  is added. Find a scoping container or an exact accessible name.
- **Never `waitForLoadState('networkidle')` and never `waitForTimeout` as a fix for
  flakiness.** Wait on a user-visible condition. The one legitimate use of a fixed wait is
  asserting a *steady negative state* (something must stay disabled) — comment why.
- **Assert readiness via enabled-ness, not visibility,** where the app renders controls
  disabled during load. `Add Company` is visible long before it is clickable.
- **Mutating tests must generate unique data.** Use `uniqueCompanyName()`; never hardcode a
  name that a re-run would collide with.

## Test data

- All generated companies are prefixed **`ZZ E2E`** — identifiable and they sort to the end
  of the alphabetical grid.
- Company-creating tests set the **Mock company** flag by default, which excludes the record
  from reporting and analytics. Keep it that way unless a test is specifically about
  non-mock behaviour.
- **Synthetic data only.** Never real patient or customer data, never PHI, never production
  accounts. Credentials live in `.env` (gitignored) and are read via `process.env`.
- Records are **not** cleaned up automatically. The QA companies grid accumulates `ZZ E2E`
  rows; purge them server-side when they get noisy.

## Verifying a created company

The companies grid is server-paginated at 100 rows and sorted by Name ascending, so a new
company is usually **not** on page 1. Asserting `getByText(name)` right after creation is a
false negative. Use `CompaniesListPage.expectNewestCompany(name)`, which sorts by
"Created On" descending first.

## Known defects

Both are encoded as `test.fail()` regressions in `company-creation.spec.ts`. They are
*expected* to fail — when a fix lands, the test starts passing and the run goes red, which
is the signal to remove the annotation.

1. **Submit stays disabled after a successful name check.** The green "Name is available"
   hint appears but `Save and Proceed` stays disabled until an unrelated field is touched.
   `AddCompanyWizard.nudgeValidation()` is the workaround the POM applies; delete it when
   this is fixed.
2. **Whitespace-only name is not treated as empty.** A fresh form correctly rejects `"   "`,
   but replacing an already-validated name with `"   "` leaves submit enabled.

## Add Company wizard — verified behaviour

Against portal build `2026-08-20-3`. The wizard has **two** steps (an older 4-step flow is
gone):

1. **Company Details** — company name, medical services, and the optional Client
   Organization sub-section (organization name + locations).
2. **Users** — `Existing User` / `New User` tabs; finalize with **Done**.

Behaviours worth knowing:

- Medical services are clickable **cards, not checkboxes**. Selection state lives in a nested
  MUI icon (`CheckBoxIcon` vs `CheckBoxOutlineBlankIcon`). **RPM and CCM are pre-selected.**
- **Organization Name auto-mirrors Company Name** until explicitly overridden.
- Adding a location **pre-fills** Name and Name Tag with a slug derived from the company name.
- Location fields' accessible names are exactly `Name` and `Name Tag` — use `exact: true`,
  which does not collide with Company Name or Organization Name.
- Duplicate names are rejected client-side with **"Company name already taken"**.
