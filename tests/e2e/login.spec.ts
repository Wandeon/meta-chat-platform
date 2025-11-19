import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible();
  });

  test('should validate email field', async ({ page }) => {
    const submitBtn = page.locator('[data-testid="login-submit"]');

    // Try to submit without email
    await submitBtn.click();

    const error = page.locator('[data-testid="email-error"]');
    await expect(error).toBeVisible();
  });

  test('should validate password field', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const submitBtn = page.locator('[data-testid="login-submit"]');

    // Fill email but not password
    await emailInput.fill('test@example.com');
    await submitBtn.click();

    const error = page.locator('[data-testid="password-error"]');
    await expect(error).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const submitBtn = page.locator('[data-testid="login-submit"]');

    // Try to login with wrong credentials
    await emailInput.fill('wrong@example.com');
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();

    // Check for error message
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const submitBtn = page.locator('[data-testid="login-submit"]');

    // Login with valid credentials
    await emailInput.fill('test@example.com');
    await passwordInput.fill('ValidPassword123!');
    await submitBtn.click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should display remember me option', async ({ page }) => {
    const rememberMe = page.locator('[data-testid="remember-me"]');
    await expect(rememberMe).toBeVisible();
  });

  test('should have password reset link', async ({ page }) => {
    const resetLink = page.locator('[data-testid="forgot-password-link"]');
    await expect(resetLink).toBeVisible();
    await resetLink.click();

    // Verify navigation to password reset page
    await expect(page).toHaveURL(/.*reset/, { timeout: 5000 });
  });
});
