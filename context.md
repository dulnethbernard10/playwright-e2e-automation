# Qase MCP Integration — Context

This project connects Claude Code to [Qase](https://qase.io) via the official
Qase MCP server, so Claude can read/manage test cases, suites, runs, plans,
and defects directly instead of you copy-pasting from the Qase UI.

## What's configured

**Server definition** — [.claude/settings.json](.claude/settings.json):

```json
"qase": {
  "command": "npx",
  "args": ["-y", "@qase/mcp-server"],
  "env": {
    "QASE_API_TOKEN": "${QASE_API_TOKEN}"
  }
}
```

**Credential** — `QASE_API_TOKEN` is set in `.claude/settings.local.json`
(gitignored, never commit it). Get/rotate the token from Qase under
**Personal Settings → API Tokens**.

## Activating it

MCP servers load at session start. After adding or changing
`QASE_API_TOKEN`, start a new Claude Code session (`claude`) for the
`qase` server to connect. Check status with:

```bash
claude mcp list
```

## What it can do

The server exposes ~83 tools covering:

- Projects
- Test cases
- Test runs
- Test results
- Test plans
- Test suites
- Defects

It also supports QQL (Qase Query Language) for advanced filtering.

## Example prompts

- "List all test suites under the 'July 2026' suite."
- "Show me test cases in project DEMO that are currently failing."
- "Create a defect for test case DEMO-42."

Repo: [qase-tms/qase-mcp-server](https://github.com/qase-tms/qase-mcp-server)
