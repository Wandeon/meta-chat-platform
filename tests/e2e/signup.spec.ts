import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display signup page', async ({ page }) => {
    // Check if signup form is visible
    const signupForm = page.locator('[data-testid="signup-form"]');
    await expect(signupForm).toBeVisible();
  });

  test('should validate email field', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const submitBtn = page.locator('[data-testid="signup-submit"]');

    // Leave email empty and try to submit
    await submitBtn.click();

    // Check for validation error
    const error = page.locator('[data-testid="email-error"]');
    await expect(error).toBeVisible();
  });

  test('should validate password field', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const submitBtn = page.locator('[data-testid="signup-submit"]');

    // Fill email but not password
    await emailInput.fill('test@example.com');
    await submitBtn.click();

    // Check for password validation error
    const error = page.locator('[data-testid="password-error"]');
    await expect(error).toBeVisible();
  });

  test('should accept valid signup', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const nameInput = page.locator('[data-testid="name-input"]');
    const submitBtn = page.locator('[data-testid="signup-submit"]');

    // Fill form with valid data
    await nameInput.fill('Test User');
    await emailInput.fill('test@example.com');
    await passwordInput.fill('ValidPassword123!');
    await submitBtn.click();

    // Wait for success - adjust selector based on actual implementation
    const successMsg = page.locator('[data-testid="signup-success"]');
    await expect(successMsg).toBeVisible({ timeout: 10000 });
  });

  test('should handle duplicate email', async ({ page }) => {
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const nameInput = page.locator('[data-testid="name-input"]');
    const submitBtn = page.locator('[data-testid="signup-submit"]');

    // Try to sign up with existing email
    await nameInput.fill('Duplicate User');
    await emailInput.fill('existing@example.com');
    await passwordInput.fill('Password123!');
    await submitBtn.click();

    // Check for duplicate email error
    const error = page.locator('[data-testid="email-exists-error"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });
});
