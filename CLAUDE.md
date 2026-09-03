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
│   ├── screenshots.ts             # ticket-scoped evidence capture
│   └── pages/                     # POMs used by 2+ domains
│       └── PatientsLookupPage.ts  # search/open a patient — used by onboarding & notes
│
├── administration/                # ← domain
│   └── companies/                 # ← feature area
│       ├── pages/                 # POMs owned by this feature
│       │   ├── CompaniesListPage.ts
│       │   └── AddCompanyWizard.ts
│       └── company-creation.spec.ts
│
├── patients/                      # Patients Management
│   ├── onboarding/                # ← feature area
│   │   ├── pages/
│   │   │   └── AddPatientModal.ts
│   │   └── patient-creation.spec.ts
│   └── notes/                     # ← feature area
│       ├── pages/
│       │   ├── PatientNotesPage.ts
│       │   ├── AddNoteModal.ts
│       │   └── EditNoteModal.ts
│       ├── add-note.spec.ts
│       ├── edit-note.spec.ts
│       ├── share-note.spec.ts
│       ├── archive-note.spec.ts
│       ├── show-all-notes.spec.ts
│       └── pin-note.spec.ts
│
├── rpm/                           # Remote Patient Monitoring
├── ccm/                           # Chronic Care Management
├── mtm/                           # Medication Therapy Management
└── tcm/                           # Transitional Care Management
```

### Rules

1. **Domain first, then feature area.** `tests/<domain>/<feature>/`. Domains follow the
   portal's business areas: `administration`, `patients`, `rpm`, `ccm`, `mtm`, `tcm`, `reports`.
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

- All generated companies, patient last names, and note descriptions are prefixed
  **`ZZ E2E`** — identifiable and they sort to the end of alphabetically-sorted grids.
- Company-creating tests set the **Mock company** flag by default, which excludes the record
  from reporting and analytics. Keep it that way unless a test is specifically about
  non-mock behaviour.
- **Synthetic data only.** Never real patient or customer data, never PHI, never production
  accounts. Credentials live in `.env` (gitignored) and are read via `process.env`.
- Records are **not** cleaned up automatically. The QA companies/patients grids accumulate
  `ZZ E2E` rows; purge them server-side when they get noisy.

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

## Add Patient modal — verified behaviour

Against the DEV portal, build `2026-08-31-1`. Opened from Patients Lookup's **Add Patient**
button (icon-only in the accessibility tree, but its accessible name still resolves to
"Add Patient" because the icon and label share one `<button>`).

- **Client Organization and Client Location have a broken `aria-labelledby`** — it points to
  an id that doesn't exist (the real label id has an extra `-input` suffix), so their
  triggers have no accessible name until a value is picked. `AddPatientModal` locates them
  structurally instead, via their hidden sibling `<input placeholder="...">`. Health Plan and
  Address State don't have this bug and are selectable by accessible name normally.
- **Client Location options depend on the selected Client Organization**, and some
  organizations have none. `pickOrganizationAndStore()` tries organizations in dropdown
  order until one has an available store — don't hardcode an organization name, since which
  ones have stores varies by environment.
- **The Client Organization option list populates from an async fetch after the dropdown
  opens.** Reading it immediately after the click can race that fetch and see an empty list —
  observed as `pickOrganizationAndStore()` throwing "No organization among []..." (an empty
  array, not merely all-empty-stores). It now waits for the first option to render before
  reading the list.
- **Saving for an RPM-enabled organization pops a second "Confirm RPM Enrollment?" dialog.**
  `AddPatientModal.save()` declines it (clicks "No") so this modal only creates the patient.
  It waits for the Add Patient dialog to close *first*, then checks for the confirm dialog —
  racing the two is unsafe, since the Add Patient dialog can unmount before the confirm
  dialog finishes mounting, which would wrongly skip declining it and leave it open.
- **The patients grid re-cases the name it displays** (e.g. a last name typed as
  `ZZ E2E Onboard` renders as `Zz e2e onboard`), so verifying a created patient needs a
  case-insensitive match — see `PatientsLookupPage.expectPatientFound()`.

## Add / Update Account Note modal — verified behaviour

Opened from a patient's Notes tab (`/patients/:id/details/notes`), via the **Misc → Notes**
side-nav item, the header's `+` icon button (Add), and each row's pencil icon (Update).

- **Two elements on a patient page compute the same accessible name, "Notes"**: the side-nav
  item and an unrelated quick-access icon further up the page. `PatientNotesPage` scopes to
  the `navigation` landmark, since only the side nav is one.
- **The "add note" button is icon-only with no accessible name** and no unique attribute —
  there are 3 `AddIcon`s on a patient page. It's found structurally: the innermost container
  that has both the "Patient Notes" header text and an `AddIcon` descendant (see
  `PatientNotesPage` for why `.last()` picks the innermost one).
- **Each note row has 3 icon-only action buttons with no accessible names**, in order: pin
  (`PushPinOutlinedIcon`), edit (`EditIcon`), archive (`ArchiveIcon`). Since notes accumulate
  and are never cleaned up, `PatientNotesPage.noteRow()` finds a row by its description text
  rather than by position.
- **"Noted During"** defaults to "Talk with Patient" on Add; leave it alone unless the test is
  specifically about that field.
- **Archiving needs confirmation**, unlike bulk-share. Both the row archive icon and the
  toolbar's bulk archive button open a dialog whose heading varies with count ("Archive
  note" singular, "Archive N notes" plural — matched by a `/^Archive/` prefix, not exact
  text) with "Archive" / "Cancel". Once confirmed, the note(s) drop out of the default grid
  view entirely and only reappear if the toolbar's "Show All" checkbox is checked (unchecked
  by default) — see `PatientNotesPage.expectNoteNotFound()`. The toolbar button's own
  accessible name is also count-dependent ("Archive (2) Notes"), so it's matched by pattern.
- **The "Shared with Provider" grid column is icon-only with no accessible name** — empty
  when a note isn't shared, a `HowToRegIcon` once it is. Read it via the cell's own
  `data-field="sharedWithProvider"` (a stable MUI DataGrid attribute, not a hashed class) —
  see `PatientNotesPage.sharedWithProviderCell()`.
- **The toolbar's SHARE WITH PROVIDERS button bulk-shares every checked row** in one click,
  with no confirmation dialog. It's disabled until at least one row checkbox is checked, but
  needs no explicit wait — Playwright's click already blocks on an element becoming enabled.
  Each row checkbox's accessible name toggles "Select row" / "Unselect row" with its checked
  state; `PatientNotesPage.noteCheckbox()` matches both with one pattern.
- **Editing races the modal's own prefill.** Update Account Note opens with Description
  empty and fills it asynchronously from the note's current text a moment later. Typing before
  that prefill lands has been observed to get silently clobbered once it resolves — the save
  then closes normally but persists neither the new Description nor Noted During, with no
  error. `EditNoteModal.expectOpen()` waits for Description to actually hold text (not just be
  visible) before returning, which resolved the flake in a few dozen local runs. `selectNotedDuring()`
  additionally reads the trigger's own label back after selecting, and `save()` re-checks
  Description's value beforehand — both are cheap and harmless if the underlying race is ever
  fixed, so they're left in rather than pulled once unneeded.

## Add Insurance wizard — verified behaviour

Against the DEV portal, build `2026-09-01-2`. Reached from a patient's edit-profile page
(`/providers/:id/update-profile`, opened via the **Open profile** button in a patient's
persistent header widget) via the side nav's **Insurance Plans** item
(`/providers/:id/insurance-plans`), then its **Add New Insurance** button.

- **Insurance Plans refuses to do anything until the patient has a Demographic Profile.**
  Without one the page shows "Add the Demographic Profile to manage insurance details." and an
  "Add Demographic Profile" button that opens a reactive modal — but the specs avoid that path
  entirely, adding the Demographic Profile up front instead via the patient edit-profile page's
  **Patient Profile** tab (`PatientEditProfilePage.goToPatientProfile()`), whose own
  "Demographic Profile:" section has the same fields behind an "Add Demographic Profile"
  checkbox. **Saving there navigates away** to the patient's general details page (unlike the
  modal, which just closes in place), so `add-insurance.spec.ts` /
  `insurance-sequence.spec.ts` re-open the edit-profile page afterwards to reach Insurance
  Plans. Field-selection logic is shared between both entry points via
  `DemographicProfileFields`.
- **Marital Status and Contact Preference have the same broken-accessible-name bug as Client
  Organization / Client Location in AddPatientModal** — no accessible name until a value is
  chosen. Unlike those two, there's no placeholder-input sibling to key off; instead they're
  located by their own auto-generated MUI DOM id (`mui-component-select-maritalStatus` /
  `-contactPreference`), which is stable since MUI derives it from the field's name — safe to
  look up unscoped since the modal and the inline section are never both mounted at once. A
  text-based structural locator was tried first and was flaky (adjacent field poppers made the
  match target intermittently "not stable", so clicks landed without opening the dropdown).
- **Contact Preference's option list can have disabled options** (e.g. "Homephone", "Mobile
  Phone" — disabled when the patient has no phone on file), so `DemographicProfileFields`
  filters on `[aria-disabled="true"]` rather than always picking the first option.
- **The wizard has no "Next" button.** Each step (Insurance Type → Payer → Plan Type →
  Insurance Package → Plan & Holder Details, for the Commercial/Other Plan path) is a flat list
  of clickable cards; picking one immediately reveals the next step in place. Save/Cancel/Back
  only appear on the final step, whose Policy Holder Details are read-only and pre-filled from
  the patient's own profile — Insurance ID Number is the only field left to fill in.
- **"Dual Eligible Medicare/Medicaid Plan" previews and saves *two* plans in one wizard run.**
  Its final step still has the Medicare plan just selected (labelled "Primary"), but adds a
  second, separate "Secondary Insurance (Medicaid)" section with its own editable Insurance
  Package (pre-selected to a Medicaid package, e.g. "Medicaid-NC (Medicaid)", but changeable)
  and its own Insurance ID Number. One Save creates both. Both sections reuse the same field
  labels as the single-plan flow, so `AddInsuranceWizard` disambiguates by the underlying HTML
  `name` attribute (`insuranceIdNumber` / `secondaryInsuranceIdNumber`) rather than accessible
  name, and by document order (`.last()`) for the Secondary Insurance Package combobox. That
  combobox is an `<input role="combobox">` whose value lives in the `value` attribute, not text
  content — assert it with `toHaveValue()`, not `toContainText()`. The saved Secondary card's
  payer heading reads "Traditional Medicaid (NC)" (not the package name shown in the wizard),
  with plan type "Medicaid Plan".
- **Known defect: Insurance ID Number silently fails past 25 characters.** It's forwarded to
  an upstream Athena API with a 25-character limit, and the app surfaces nothing when that's
  exceeded — Save just leaves the dialog open with no visible error (only the
  `addAthenaAccountInsurance` GraphQL response says why, and the UI never reads it). There's no
  client-side length check either. `uniqueInsuranceMemberId()` stays within the limit.
- **Each saved plan card carries a collapsed "Additional Information" accordion** holding a raw
  field-by-field dump of that plan (payer, Member ID, and nearly everything else on the card,
  each as its own real element — not one opaque string) that's present in the DOM, and passes a
  `:visible` check, even though never expanded. It duplicates almost every value the card shows,
  so naive `hasText`/`has:` filtering on payer + Member ID alone keeps resolving to a
  sub-container that satisfies both via the dump rather than the real card. The one thing the
  dump never contains is the sequence badge wording ("Primary"/"Secondary"/"Insurance N" — the
  dump has `sequencenumber1`, not "Primary") — `InsurancePlansPage.insuranceCard()` requires
  that as a third signal, forcing the match to widen out past the dump to the real card.
- **Resolved DEV-environment issue, worth remembering why:** adding insurance for a freshly
  created patient used to fail server-side almost every time — a 500
  (`undefined method 'external_id' for nil`) or a clean `MISSING_EHR_ID` GraphQL error — when
  the patient's Demographic Profile had been added via Insurance Plans' own reactive modal.
  Every automated run failed at that step across 5 full runs (10 attempts counting retries).
  Switching both specs to add the Demographic Profile via the **Patient Profile tab** instead
  (`PatientProfilePage.addDemographicProfile()`) made the issue disappear entirely — several
  clean runs since, no retries needed. The two entry points fill the same fields and (as far as
  the UI shows) produce the same profile, so the modal path likely triggers the patient's
  Athena/EHR account link differently, or a needed side effect only fires via the Patient
  Profile tab's save. **Don't reintroduce the modal-based flow for these specs without
  re-verifying this** — `AddInsuranceWizard.save()` still retries a bounded number of times as
  a cheap safety net, but that retry alone never fixed the original failures; the flow change
  did.

## Edit Insurance Plan dialog — verified behaviour

Against the DEV portal, build `2026-09-01-2`. Opened from a saved plan card's icon-only pencil
"Edit" button on Insurance Plans.

- **Only Insurance ID Number can be updated.** Insurance Package, Sequence, and Insurance Phone
  Number are all rendered disabled alongside the read-only Policy Holder Details — there's
  currently no supported way to change a plan's payer, package, or sequence after creation.
  `EditInsuranceWizard.expectOnlyInsuranceIdNumberEditable()` asserts this explicitly rather
  than the test just working around it, so a future loosening of the restriction shows up as a
  real assertion failure here instead of silently going unnoticed.
- **The submit button reads "Update Insurance Plan"**, not "Save" — a different label from
  every other Save/Cancel pairing in this app.
- **The app uppercases Insurance ID Number on submit** (e.g. a value ending `...Orig` comes
  back as `...ORIG`). Not an issue for `uniqueInsuranceMemberId()`, whose output is already
  all-uppercase/digits, but worth knowing if a future caller passes lowercase.

## Insurance Card Image dialog — verified behaviour

Against the DEV portal, build `2026-09-01-2`. Opened from a saved plan card's "Add Card Image"
button on Insurance Plans.

- **Desktop Upload reveals a drag-and-drop form**, not an immediate native file picker — front
  and back drop zones (both optional), each with a "Browse File" button and a hidden
  `<input type="file">`. Clicking "Browse File" does not reliably open a native OS file
  chooser in this environment (no `filechooser` event fires for Playwright to intercept), so
  `InsuranceCardImageDialog.uploadFrontImage()` calls `setInputFiles()` on the hidden input
  directly instead — the standard, CI-reliable way to drive a file input regardless of whether
  the native picker would work.
- **Upload starts disabled** and only enables once a file is chosen, at which point a preview
  thumbnail appears in that dropzone.
- **After a successful upload, the dialog immediately swaps to showing the saved image**
  ("Insurance Card 1") with zoom in/out/reset controls, replacing the upload form. It's a real
  save, not just a client-side preview: closing and reopening the dialog (a fresh load) still
  shows the same image.
- The committed test fixture lives at `tests/patients/insurance/test-assets/insurance-card.png`
  — a minimal 1×1 PNG. Its content doesn't matter to the app, only that it's a valid PNG/JPEG
  under whatever size limit exists (untested here).
