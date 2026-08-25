# Playwright Testing — Standing Instructions

Always read this file before running any E2E test via the Playwright MCP.

---

## Screenshot Rule

**Every test run must save screenshots to `playwright/screenshots/`.**

Naming convention:
```
playwright/screenshots/{TC-ID}/{step-description}.png
```

Examples:
```
playwright/screenshots/TC-1351/01-notes-screen.png
playwright/screenshots/TC-1351/02-add-note-modal.png
playwright/screenshots/TC-1351/03-note-saved-success.png
playwright/screenshots/TC-1353/04-edit-note-modal.png
```

Rules:
- Create a subfolder per TC ID
- Prefix each filename with a step number
- Take a screenshot after every significant action (navigation, modal open, form submit, success/error state)
- Always screenshot the final state (pass or fail)
- If a step fails, screenshot immediately and report which step failed and why

---

## Prompt Template for QA

Use this format when asking Claude to run a test:

> "Read `playwright/context/README.md`, `playwright/context/auth.md`, and `playwright/context/[feature].md`.
> Run test case **TC-XXXX**: [brief description].
> Save all screenshots to `playwright/screenshots/TC-XXXX/`.
> Report PASS or FAIL with a reason."

---

## Context Files

| File | What it covers |
|---|---|
| `auth.md` | Login flow, credentials location, session notes |
| `company-creation.md` | Add Company dialog — 4-step flow |
| `rpm-workflow.md` | RPM dashboard, patient detail, readings, alerts |
| `ccm-workflow.md` | CCM dashboard, care plans, time tracking, notes |
| `qase.md` | QASE project key, suite IDs, TC ranges |

---

## Pass / Fail Report Format

At the end of every test, report:

```
TC-XXXX: PASS / FAIL
Step that failed (if any): [step description]
Screenshots saved to: playwright/screenshots/TC-XXXX/
Notes: [anything unexpected observed]
```
