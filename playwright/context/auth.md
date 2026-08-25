# Auth Context — QA Portal

## Environment

All values come from `.env.playwright` (gitignored — never committed):
- `PLAYWRIGHT_BASE_URL` — the portal URL to test against
- `PLAYWRIGHT_TEST_EMAIL` — QA test account email
- `PLAYWRIGHT_TEST_PASSWORD` — QA test account password

When using the Playwright MCP, read `.env.playwright` first to get the actual values.
When running spec files, `playwright.config.ts` loads it automatically via dotenv.


## Login Flow

1. Navigate to `PLAYWRIGHT_BASE_URL/log-in`
2. Fill email and password from `.env.playwright`
3. Submit — redirects to `**/my-patients` on success


## Session Notes

- JWT is stored in localStorage as `truentity_token`
- Session expires after inactivity — re-login if you get a 401
- MFA is not enabled on QA test accounts
