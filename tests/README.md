# Meta Chat Platform - Testing Guide

## Overview

This document provides comprehensive information about testing the Meta Chat Platform, including unit tests, integration tests, E2E tests, and CI/CD pipeline.

## Test Structure

```
meta-chat-platform/
├── tests/
│   ├── e2e/                          # End-to-End tests using Playwright
│   │   ├── signup.spec.ts           # User signup flow tests
│   │   ├── login.spec.ts            # User login flow tests
│   │   └── widget.spec.ts           # Web widget integration tests
│   └── README.md                    # This file
├── apps/
│   ├── api/
│   │   └── tests/
│   │       └── integration/         # API integration tests
│   │           └── auth-integration.spec.ts
│   └── dashboard/
│       └── tests/
│           └── e2e/                 # Dashboard E2E tests (future)
├── playwright.config.ts             # Playwright configuration
└── .github/
    └── workflows/
        └── ci.yml                   # GitHub Actions CI/CD pipeline
```

## Running Tests

### Prerequisites

1. Node.js 20+ installed
2. pnpm package manager
3. Playwright browsers installed

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install --with-deps
```

### Unit Tests

Run unit tests using Vitest:

```bash
# Run all unit tests
pnpm run test:unit

# Run unit tests in watch mode
pnpm run test:unit -- --watch

# Run unit tests with coverage
pnpm run test:unit -- --coverage
```

### Integration Tests

Run integration tests against real database and API:

```bash
# Run all integration tests
pnpm run test:integration

# Run integration tests in watch mode
pnpm run test:integration -- --watch

# Run specific integration test
pnpm run test:integration -- auth-integration
```

### E2E Tests with Playwright

Run browser-based E2E tests:

```bash
# Run all E2E tests
npx playwright test

# Run E2E tests in headed mode (see browser)
npx playwright test --headed

# Run E2E tests in debug mode
npx playwright test --debug

# Run specific test file
npx playwright test tests/e2e/login.spec.ts

# Run tests matching pattern
npx playwright test -g "should login"

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Generate HTML report
npx playwright show-report
```

### All Tests Combined

```bash
# Run all tests (unit + integration)
pnpm run test:all

# Run unit, integration, and E2E tests
pnpm run test && npx playwright test
```

## Test Coverage

### Unit Tests

Unit tests verify individual functions and components in isolation using mocks and fixtures.

**Framework:** Vitest
**Files:** `**/*.spec.ts`, `**/*.test.ts`

### Integration Tests

Integration tests verify API endpoints and database interactions with real services.

**Framework:** Vitest + Supertest
**Database:** PostgreSQL test container
**Cache:** Redis test container
**Files:** `apps/api/tests/integration/**/*.spec.ts`

#### Running Integration Tests with Services

```bash
# Using Docker Compose (if available)
docker-compose -f docker-compose.test.yml up -d
pnpm run test:integration
docker-compose -f docker-compose.test.yml down

# Services required:
# - PostgreSQL on localhost:5432
# - Redis on localhost:6379
```

### E2E Tests

E2E tests verify complete user workflows using real browser automation.

**Framework:** Playwright
**Browsers:** Chromium, Firefox, WebKit
**Devices:** Desktop, Mobile Chrome, Mobile Safari

#### Test Scenarios

**signup.spec.ts:**
- Display signup page
- Validate email field
- Validate password field
- Accept valid signup
- Handle duplicate email

**login.spec.ts:**
- Display login page
- Validate email field
- Validate password field
- Reject invalid credentials
- Login with valid credentials
- Display remember me option
- Password reset link

**widget.spec.ts:**
- Load widget on page
- Open chat when widget clicked
- Send message in widget
- Close widget
- Handle initialization errors
- Maintain message history

## Environment Setup

### Development Environment

```bash
# Copy environment file
cp .env.example .env.local

# Set test database
export DATABASE_URL="postgresql://test:test@localhost:5432/meta_chat_test"
export REDIS_URL="redis://localhost:6379"
```

### CI Environment

GitHub Actions automatically sets up test environments with:
- PostgreSQL 15 service container
- Redis 7 service container
- Node.js 20 runtime

## Playwright Configuration

**File:** `playwright.config.ts`

### Key Settings

- **Test directory:** `./tests/e2e`
- **Base URL:** `http://localhost:5173` (dashboard dev server)
- **Timeout:** 30 seconds per test
- **Retries:** 2 on CI, 0 locally
- **Workers:** 1 on CI, parallel locally
- **Reporter:** HTML report

### Changing Configuration

Edit `playwright.config.ts` to:
- Change base URL
- Add/remove browsers
- Adjust timeouts
- Configure reporters

## GitHub Actions CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

### Pipeline Jobs

1. **Lint** - Run ESLint on all TypeScript files
2. **Build** - Build all packages and apps
3. **Test Unit** - Run unit tests
4. **Test Integration** - Run integration tests with services
5. **Test E2E** - Run Playwright E2E tests
6. **Security Scan** - Run npm audit and dependency checks
7. **Quality Report** - Generate quality metrics
8. **Deploy Staging** - Deploy to staging on `staging` branch
9. **Deploy Production** - Deploy to production on `main` branch

### Pipeline Triggers

- Push to main, develop, or staging branches
- Pull requests to main or develop branches

### Artifacts Generated

- **build-artifacts:** Compiled dist files
- **playwright-report:** HTML test report with traces
- **quality-report:** Coverage and quality metrics
- **codecov:** Code coverage to Codecov.io

## Writing Tests

### E2E Test Template

```typescript
import { test, expect } from @playwright/test;

test.describe(Feature Name, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(/path);
  });

  test(should do something, async ({ page }) => {
    const element = page.locator([data-testid=element-id]);
    await expect(element).toBeVisible();
    await element.click();
    await expect(page).toHaveURL(/.*expected-url/);
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll } from vitest;
import supertest from supertest;

describe(API Endpoint, () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(() => {
    request = supertest(http://localhost:3000);
  });

  it(should return expected data, async () => {
    const response = await request
      .get(/api/endpoint)
      .expect(200);

    expect(response.body).toHaveProperty(data);
  });
});
```

### Test Data Attributes

Mark elements with `data-testid` for reliable test selectors:

```tsx
<button data-testid="login-submit">Login</button>
<input data-testid="email-input" type="email" />
```

## Troubleshooting

### Playwright Tests Timeout

**Issue:** Tests hang or timeout

**Solutions:**
1. Increase timeout in playwright.config.ts
2. Check that dev server is running: `pnpm run dev`
3. Check that server is on correct port (5173)
4. Run in headed mode to see browser: `npx playwright test --headed`

### Database Connection Errors

**Issue:** Integration tests fail with connection errors

**Solutions:**
1. Ensure PostgreSQL is running
2. Check DATABASE_URL environment variable
3. Run `pnpm run db:push` to setup test database
4. Check database credentials

### Browser Not Found

**Issue:** Playwright cant find browser executables

**Solutions:**
1. Run `npx playwright install --with-deps`
2. Check ~/.cache/ms-playwright directory exists
3. Check disk space availability

### Module Not Found

**Issue:** Test file cant find imports

**Solutions:**
1. Check file paths are correct
2. Ensure all dependencies installed: `pnpm install`
3. Check tsconfig.json paths configuration
4. Rebuild project: `pnpm run build`

## Performance Tips

1. **Run tests in parallel:** Playwright runs in parallel by default
2. **Use page pooling:** Reuse browser contexts across tests
3. **Mock external APIs:** Avoid real API calls in tests
4. **Use fixtures:** Share setup code across tests
5. **Filter by tag:** Run only relevant tests with `-g` pattern

## Best Practices

1. **Isolate tests:** Each test should be independent
2. **Clean up:** Reset state in afterEach hooks
3. **Use semantic selectors:** Prefer data-testid over CSS selectors
4. **Avoid hardcoded waits:** Use waitFor instead of sleep
5. **Test user workflows:** Focus on real user interactions
6. **Keep tests maintainable:** Clear names and good organization
7. **Document complex tests:** Add comments explaining logic
8. **Run locally first:** Always run tests before pushing

## CI/CD Troubleshooting

### GitHub Actions Failures

Check the Actions tab in GitHub for detailed logs:

1. Click the failed workflow
2. Click the failed job
3. Expand steps to see detailed output
4. Look for error messages
5. Check artifacts if available

### Common Issues

- **Out of disk space:** Clean up artifacts
- **Timeout:** Increase timeout in workflow
- **Permission denied:** Check SSH keys or credentials
- **Service unavailable:** Check service configuration

## Contributing

When adding new tests:

1. Follow existing patterns
2. Add data-testid attributes to elements
3. Update this README if adding new test types
4. Ensure tests pass locally before pushing
5. Add tests for bug fixes
6. Maintain test coverage above 80%

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For test-related issues:

1. Check this documentation
2. Review test output and logs
3. Debug locally with `--debug` flag
4. Check GitHub Issues for similar problems
5. Create new issue with test output and steps to reproduce
