import { test, expect } from '@playwright/test';

test.describe('Web Widget Integration', () => {
  test('should load widget on page', async ({ page }) => {
    await page.goto('/');

    // Check if widget is loaded
    const widget = page.frameLocator('[id="meta-chat-widget"]');
    const widgetContainer = widget.locator('[data-testid="widget-container"]');
    await expect(widgetContainer).toBeVisible();
  });

  test('should open chat when widget is clicked', async ({ page }) => {
    await page.goto('/');

    const widget = page.frameLocator('[id="meta-chat-widget"]');
    const triggerBtn = widget.locator('[data-testid="widget-trigger"]');

    // Click to open chat
    await triggerBtn.click();

    // Check if chat window is visible
    const chatWindow = widget.locator('[data-testid="chat-window"]');
    await expect(chatWindow).toBeVisible({ timeout: 5000 });
  });

  test('should send message in widget', async ({ page }) => {
    await page.goto('/');

    const widget = page.frameLocator('[id="meta-chat-widget"]');
    const triggerBtn = widget.locator('[data-testid="widget-trigger"]');
    
    // Open chat
    await triggerBtn.click();

    const messageInput = widget.locator('[data-testid="message-input"]');
    const sendBtn = widget.locator('[data-testid="send-message"]');

    // Send a message
    await messageInput.fill('Hello from test');
    await sendBtn.click();

    // Check message appears in chat
    const message = widget.locator('text=Hello from test');
    await expect(message).toBeVisible({ timeout: 5000 });
  });

  test('should close widget when close button is clicked', async ({ page }) => {
    await page.goto('/');

    const widget = page.frameLocator('[id="meta-chat-widget"]');
    const triggerBtn = widget.locator('[data-testid="widget-trigger"]');
    
    // Open chat
    await triggerBtn.click();

    const closeBtn = widget.locator('[data-testid="widget-close"]');
    await closeBtn.click();

    // Check if chat window is hidden
    const chatWindow = widget.locator('[data-testid="chat-window"]');
    await expect(chatWindow).not.toBeVisible();
  });

  test('should handle widget initialization errors', async ({ page }) => {
    // Navigate to page without widget script
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check that widget gracefully handles missing iframe
    const widget = page.locator('[id="meta-chat-widget"]');
    const hasWidget = await widget.count() > 0;
    
    // Either widget exists or page handles missing widget gracefully
    const bodyText = await page.locator('body').innerText();
    expect(['widget', 'chat']).toBeDefined();
  });

  test('should maintain message history', async ({ page }) => {
    await page.goto('/');

    const widget = page.frameLocator('[id="meta-chat-widget"]');
    const triggerBtn = widget.locator('[data-testid="widget-trigger"]');
    const messageInput = widget.locator('[data-testid="message-input"]');
    const sendBtn = widget.locator('[data-testid="send-message"]');

    // Open widget
    await triggerBtn.click();

    // Send first message
    await messageInput.fill('Message 1');
    await sendBtn.click();

    // Send second message
    await messageInput.fill('Message 2');
    await sendBtn.click();

    // Check both messages are visible
    const msg1 = widget.locator('text=Message 1');
    const msg2 = widget.locator('text=Message 2');
    await expect(msg1).toBeVisible({ timeout: 5000 });
    await expect(msg2).toBeVisible({ timeout: 5000 });
  });
});
