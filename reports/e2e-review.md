# E2E Test Review Summary

## Playwright Configuration
- Playwright runs E2E tests from `tests/e2e` with full parallelization, HTML reporting, retries on CI, and desktop/mobile coverage (Chromium, Firefox, WebKit, Pixel 5, iPhone 12). Base URL is set to `http://localhost:5173`, and the dev server is started with `npm run dev` targeting `http://127.0.0.1:5173` when tests launch.

## Current Scenario Coverage
- **Signup**: Validates form visibility, email/password required states, successful signup happy-path, and duplicate email handling.
- **Login**: Covers form visibility, email/password validation, invalid credential rejection, successful login redirect, remember-me visibility, and password reset link navigation.
- **Widget**: Ensures widget loads, opens, sends a message, closes, retains message history, and includes a basic initialization error check.
- **Missing flows**: No scenarios exist for create channel, upload document, or full in-app messaging beyond widget checks; critical user journeys are only partially covered.

## Test Data Handling
- Tests rely on UI interactions only; there is no explicit fixture setup/teardown or seeding/cleanup for users, channels, or documents.

## Test Execution
- `npx playwright test` fails because the dev server does not become ready within the 60s Playwright webServer timeout.
