# Playwright Skills — Usage Guide

What Playwright tooling is installed in this workspace, and how to use it.

---

## What's installed

### Skill: `playwright-cli`

Location: `.claude/skills/playwright-cli/`

> **Automate browser interactions, test web pages and work with Playwright tests.**

This is the only Playwright *skill* in the project. It teaches Claude to drive a real browser
from the terminal — one shell command per browser action — and to author, run, debug, and repair
Playwright tests. It is auto-invoked when you ask for browser work, or you can call it explicitly
with `/playwright-cli`.

It ships with nine reference docs, loaded on demand rather than all at once:

| Reference | Covers |
|---|---|
| `references/playwright-tests.md` | Running tests, `--debug=cli` + attach workflow |
| `references/test-generation.md` | The full **plan → generate → heal** authoring loop |
| `references/session-management.md` | Named sessions, isolation, `attach`/`detach`, persistent profiles |
| `references/storage-state.md` | Cookies, localStorage, sessionStorage, saved auth state |
| `references/request-mocking.md` | `route`, mock bodies/statuses, network failure simulation |
| `references/running-code.md` | `run-code` — geolocation, permissions, iframes, downloads, clipboard |
| `references/tracing.md` | Trace capture and what traces contain |
| `references/video-recording.md` | Screencasts, chapter cards, HTML overlay annotations |
| `references/element-attributes.md` | Reading `id` / `class` / `data-*` that snapshots omit |

### MCP server: `playwright`

Declared in `.claude/settings.json` as `npx @playwright/mcp@latest`. Same browser engine, exposed
as MCP tools instead of shell commands. Enable it via `enabledMcpjsonServers` in
`.claude/settings.local.json`. See the main [README](README.md) for that setup.

### Non-Playwright skills also available

`context7-mcp` (fetch current library docs) and `find-skills` (discover/install new skills) are
installed globally in `~/.claude/skills/`, not project-scoped.

---

## Prerequisite: the right command prefix

The skill's docs are written as `playwright-cli <command>`. **There is no global `playwright-cli`
binary on this machine** — this project uses the local `@playwright/cli` dev dependency, so the
working invocation is:

```bash
npx playwright cli <command>
```

Verify:

```bash
npx --no-install playwright --version   # → Version 1.62.1
npx --no-install playwright cli --help  # full command list
```

Optional — install the shorter global command so the docs read literally:

```bash
npm install -g @playwright/cli@latest
```

Everything below uses `npx playwright cli`. Substitute `playwright-cli` if you installed globally.

---

## Core mental model: snapshots and refs

You don't write CSS selectors. You take a **snapshot** — an accessibility tree of the page — and
each interactive element gets a short **ref** like `e15`. You act on refs.

```bash
npx playwright cli open https://portal.qa.truentity.net
npx playwright cli snapshot          # lists elements with refs
npx playwright cli click e15         # act on a ref
```

Every command prints the equivalent Playwright TypeScript. That generated code is the raw material
for test files — you copy it out rather than hand-writing locators.

Refs go stale after the page changes. Re-snapshot after any navigation or significant DOM update.

You can also target by selector or locator when a ref isn't handy:

```bash
npx playwright cli click "#main > button.submit"
npx playwright cli click "getByRole('button', { name: 'Submit' })"
npx playwright cli click "getByTestId('submit-button')"
```

---

## Usage 1 — Interactive exploration (the common case)

Just describe the task in Claude Code and let the skill drive:

> "Log in with the credentials in `.env.playwright`, open the patient list, and screenshot it."

Under the hood it runs roughly this:

```bash
npx playwright cli open https://portal.qa.truentity.net/login
npx playwright cli snapshot
npx playwright cli fill e1 "qa-user@truentity.com"
npx playwright cli fill e2 "$PASSWORD" --submit
npx playwright cli snapshot
npx playwright cli screenshot --filename=patient-list.png
npx playwright cli close
```

Useful during exploration:

```bash
npx playwright cli find "Sign in"                  # grep the snapshot instead of dumping it all
npx playwright cli find --regex "/enroll(ed)?/i"
npx playwright cli snapshot --depth=4              # shallow first, then drill into a ref
npx playwright cli snapshot e34
npx playwright cli console                         # app-side JS errors
npx playwright cli requests                        # network log
npx playwright cli eval "el => el.getAttribute('data-testid')" e5
```

**Cost note:** page snapshots are the expensive part of a session. Prefer `find` over full
`snapshot`, use `--depth`, and consider `open --mobile` — mobile layouts are lighter, so snapshots
are smaller.

---

## Usage 2 — Skip the login every time (saved auth state)

Log in once, save the cookies + storage, reuse them forever:

```bash
# once
npx playwright cli open https://portal.qa.truentity.net/login
npx playwright cli fill e1 "qa-user@truentity.com"
npx playwright cli fill e2 "password" --submit
npx playwright cli state-save auth.json

# every session after
npx playwright cli state-load auth.json
npx playwright cli open https://portal.qa.truentity.net/dashboard   # already signed in
```

`auth.json` holds live session tokens. **Never commit it** — add it to `.gitignore` and delete it
when done.

---

## Usage 3 — Writing tests: plan → generate → heal

The skill's flagship workflow (`references/test-generation.md`). All three phases hinge on the same
trick: run a test with `--debug=cli`, which pauses it and prints a session name, then attach the CLI
to that live paused page.

```bash
# background — wait for "Debugging Instructions" and a tw-XXXX session name
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed.spec.ts --debug=cli

# attach to the paused page
npx playwright cli attach tw-abc123
npx playwright cli resume
```

**Why go through a test instead of `open <url>`?** The test carries your fixtures, auth, and
`playwright.config.ts` setup. Opening the URL directly skips all of it.

### Step 0 — Create a seed test

A *seed* is the minimal test that lands the app in the state every scenario starts from. This repo's
`tests/` directory is currently empty, so start here:

```ts
// tests/fixtures.ts
import { test as baseTest } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.goto('/');            // baseURL comes from playwright.config.ts
    await use(page);
  },
});
```

```ts
// tests/seed.spec.ts
import { test } from './fixtures';

test('seed', async ({ page }) => {
  // Fixture already navigated. Empty body marks where exploration begins.
});
```

### Step 1 — Plan

Ask: *"Plan tests for the RPM vitals page."* Claude attaches to the seed, explores the live app, and
writes a spec file to `specs/<feature>.plan.md` — mapping user journeys, edge cases, validation
errors, empty states, and persistence behaviour. The spec is user-level prose plus `- expect:`
bullets, one per assertion. Review and edit it; it's the contract for the next step.

### Step 2 — Generate

Ask: *"Generate scenario 1.2 from `specs/rpm-vitals.plan.md`."* Claude walks the spec's steps against
the live app, collects the emitted TypeScript, and writes one test per file at the path the spec
names. Each `- expect:` becomes a real assertion.

Assertions are *not* auto-generated — the skill builds them with helpers:

```bash
npx playwright cli --raw generate-locator e5       # → getByRole('button', { name: 'Submit' })
npx playwright cli --raw eval "el => el.textContent" e5
npx playwright cli --raw snapshot e5               # for toMatchAriaSnapshot
```

If the spec is vague or the app has moved on, the skill updates the spec mid-generation. That's
expected, not a failure.

### Step 3 — Heal

When a test fails, ask: *"Heal the failing tests."* Per failure, one at a time: run it with
`--debug=cli`, attach, step to just before the break, then diagnose with `snapshot` (selector
drift?), `console` (app error?), `requests` (bad payload?). Rehearse the fix in the CLI, paste the
generated code back.

Two hard rules the skill follows: **never** add `sleep` as a fix, and **never** use
`networkidle`. And when it can't tell whether the app changed intentionally (stale spec) or
regressed (test was right), it stops and asks you rather than guessing.

---

## Usage 4 — Running the suite

```bash
npm test                                          # headless
npm run test:headed                               # visible browser
npm run report                                    # open the HTML report

PLAYWRIGHT_HTML_OPEN=never npx playwright test    # CI-friendly, no report popup
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/rpm/vitals.spec.ts:42
```

`playwright.config.ts` already captures `screenshot: only-on-failure`,
`video: retain-on-failure`, and `trace: on-first-retry` — failure artifacts land in
`test-results/` with no extra flags.

---

## Usage 5 — Mocking the network

Useful for error states the QA environment won't reproduce on demand.

```bash
npx playwright cli route "**/api/patients" --body='[{"id":1,"name":"Test"}]' --content-type=application/json
npx playwright cli route "**/api/vitals" --status=500
npx playwright cli route-list
npx playwright cli unroute                     # clear all
```

Conditional logic, response rewriting, and simulated outages go through `run-code`:

```bash
npx playwright cli run-code "async page => {
  await page.route('**/api/vitals', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.readings = [];              // force the empty state
    await route.fulfill({ response, json });
  });
}"

# simulate an outage: connectionrefused | timedout | connectionreset | internetdisconnected
npx playwright cli run-code "async page => {
  await page.route('**/api/**', route => route.abort('internetdisconnected'));
}"
```

---

## Usage 6 — Parallel sessions

Each named session (`-s=`) is fully isolated: its own cookies, storage, IndexedDB, cache, history,
and tabs. Ideal for comparing two roles side by side.

```bash
npx playwright cli -s=provider open https://portal.qa.truentity.net
npx playwright cli -s=patient  open https://portal.qa.truentity.net

npx playwright cli -s=provider snapshot
npx playwright cli -s=patient  snapshot

npx playwright cli list           # all live sessions
npx playwright cli close-all      # clean up
npx playwright cli kill-all       # force-kill zombies
```

Name sessions for their purpose (`-s=provider`, not `-s=s1`), and always clean up — stray browsers
hold memory and disk.

---

## Usage 7 — Evidence: traces, video, UI review

**Trace** — step-by-step replay with DOM, network, and console. The debugging tool of choice:

```bash
npx playwright cli tracing-start
# ... reproduce the issue ...
npx playwright cli tracing-stop
```

**Video** — WebM screencast for demos or bug reports, with chapter cards and HTML overlay callouts:

```bash
npx playwright cli video-start recordings/enrollment-flow.webm
npx playwright cli video-show-actions --duration=600 --position=top-right   # annotate each action
npx playwright cli video-chapter "Enrolling patient" --description="Happy path" --duration=2000
# ... actions ...
npx playwright cli video-stop
```

For a polished recording, script the whole flow in a `.js` file and run it with
`run-code --filename=script.js` — that lets you set typing delays, deliberate pauses, and
`page.screencast.showOverlay()` highlights. See `references/video-recording.md`.

**Interactive UI review** — hand the page to a human. They draw boxes on the live page and type
comments; Claude receives the annotated screenshot, the snapshot of the marked region, and the notes:

```bash
npx playwright cli show --annotate
```

Reach for this whenever feedback is genuinely a design or judgement call rather than a test outcome.

---

## Piping output

`--raw` strips the status header, generated code, and snapshot sections, leaving only the value:

```bash
npx playwright cli --raw eval "JSON.stringify([...document.querySelectorAll('a')].map(a => a.href))" > links.json
TOKEN=$(npx playwright cli --raw cookie-get session_id)

# diff the page before and after an action
npx playwright cli --raw snapshot > before.yml
npx playwright cli click e5
npx playwright cli --raw snapshot > after.yml
diff before.yml after.yml
```

`--json` wraps every reply as JSON instead.

---

## Command reference (condensed)

| Group | Commands |
|---|---|
| **Lifecycle** | `open [url]`, `close`, `attach`, `detach`, `list`, `close-all`, `kill-all`, `delete-data` |
| **Navigate** | `goto`, `go-back`, `go-forward`, `reload` |
| **Interact** | `click`, `dblclick`, `fill`, `type`, `press`, `hover`, `select`, `check`, `uncheck`, `upload`, `drag`, `drop` |
| **Inspect** | `snapshot`, `find`, `eval`, `generate-locator`, `highlight`, `console`, `requests`, `request <n>` |
| **Keyboard/Mouse** | `press`, `keydown`, `keyup`, `mousemove`, `mousedown`, `mouseup`, `mousewheel` |
| **Capture** | `screenshot`, `pdf`, `tracing-start/stop`, `video-start/chapter/stop`, `show --annotate` |
| **Tabs** | `tab-list`, `tab-new`, `tab-close`, `tab-select` |
| **Storage** | `state-save/load`, `cookie-*`, `localstorage-*`, `sessionstorage-*` |
| **Network** | `route`, `route-list`, `unroute` |
| **Escape hatch** | `run-code` (inline or `--filename=`) |
| **Dialogs** | `dialog-accept`, `dialog-dismiss` |

Common `open` flags: `--browser=chrome|firefox|webkit|msedge`, `--headed`, `--mobile`,
`--device="iPhone 15"`, `--persistent`, `--profile=<dir>`, `--config=<file>`.

Full list: `npx playwright cli --help`.

---

## Practical notes

- **Credentials** live in `.env.playwright` (gitignored). Never inline them into a test file or a
  saved `auth.json` that gets committed.
- **Refs expire.** Re-snapshot after navigation; a stale `e15` will hit the wrong element or nothing.
- **Always go through a test**, not a bare `open <url>`, when generating or healing — otherwise you
  lose fixtures, auth, and config.
- **Stop background debug runs** when finished. A forgotten `--debug=cli` process holds a browser
  and blocks the next run.
- **Traces and videos grow fast.** Prune periodically:
  `find .playwright-cli/traces -mtime +7 -delete`.
- **Generate one scenario at a time.** Scenarios share the seed session; parallel generation is
  fragile.
- **Windows `&` in URLs** truncates the command. Escape as `^&` in `cmd.exe`, or prefix with `--%`
  in PowerShell.

---

## Discovering more skills

```bash
ls .claude/skills/          # project-scoped
ls ~/.claude/skills/        # global
```

Ask *"find a skill for X"* to invoke `find-skills` and search the installable skill registry.
