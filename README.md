# Truentity E2E Automation — Claude Code + Playwright

A Claude Code workspace for QA browser testing against Truentity environments. Claude drives the browser via the Playwright MCP, captures screenshots, and can query the database via the MySQL MCP — no test scripting required.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Claude Code CLI | `npm install -g @anthropic-ai/claude-code` |
| Playwright browsers | `npx playwright install chromium` |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/dulnethbernard10/playwright-e2e-automation.git
cd playwright-e2e-automation
npm install
npx playwright install chromium
```

### 2. Configure the target environment

Copy the env example and fill in the QA credentials:

```bash
cp .env.example .env.playwright
```

Open `.env.playwright` and set your values:

```env
PLAYWRIGHT_BASE_URL=https://portal.qa.truentity.net
PLAYWRIGHT_TEST_EMAIL=your-qa-email@truentity.com
PLAYWRIGHT_TEST_PASSWORD=your-password-here
```

### 3. Configure MySQL access (optional)

Copy the Claude settings example and fill in the DB connection:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

Open `.claude/settings.local.json` and set your MySQL credentials:

```json
{
  "enabledMcpjsonServers": ["mysql", "playwright"],
  "env": {
    "MYSQL_HOST": "your-host",
    "MYSQL_PORT": "3306",
    "MYSQL_USER": "your-username",
    "MYSQL_PASS": "your-password",
    "MYSQL_DB": "your-database"
  }
}
```

If you only need browser testing (no DB queries), set `enabledMcpjsonServers` to `["playwright"]` only.

---

## Running tests with Claude

Open this directory in Claude Code:

```bash
claude
```

Claude has direct browser control via Playwright MCP. Tell it what to test in plain English:

**Login and navigate:**
> "Log in using the credentials from `.env.playwright`, go to the patient list, and take a screenshot."

**Verify a feature:**
> "Open the RPM page for the first patient, check the vitals tab loads correctly, and screenshot any errors."

**Database + UI cross-check:**
> "Query the database for patients enrolled in RPM this month, then verify the count matches what's shown on the dashboard."

Screenshots of failures are saved automatically to `test-results/`.

---

## File structure

```
.
├── .claude/
│   ├── settings.json                # MCP server definitions (Playwright + MySQL)
│   ├── settings.local.json          # Your DB credentials — DO NOT commit (gitignored)
│   └── settings.local.json.example  # Template — copy and fill in
├── tests/                           # Test files from sessions land here
├── .env.example                     # Env variable template
├── .env.playwright                  # Your QA credentials — DO NOT commit (gitignored)
├── playwright.config.ts             # Playwright configuration
└── package.json
```

---

## Playwright skills

See **[SKILLS.md](SKILLS.md)** for the installed `playwright-cli` skill: the snapshot/ref model, saved
auth state, the plan → generate → heal test-authoring workflow, request mocking, parallel sessions,
and tracing/video capture.

---

## Notes

- `.env.playwright` and `.claude/settings.local.json` are gitignored — never commit credentials
- HTML report after a test run: `npm run report`
- To run recorded tests headlessly: `npm test`
- To run with visible browser: `npm run test:headed`
