# XSS Security Tests for ConversationsPage

## Overview
This document describes XSS vulnerability tests for the ConversationsPage component.
The component now uses DOMPurify to sanitize all user-generated content before rendering.

## Automated Tests (To be implemented when testing infrastructure is added)

### Test 1: Script Tag Injection
**Purpose**: Verify that `<script>` tags in messages are removed

```typescript
import { render, screen } from '@testing-library/react';
import { ConversationsPage } from '../ConversationsPage';
import DOMPurify from 'dompurify';

test('removes script tags from message content', () => {
  const maliciousMessage = {
    id: '1',
    content: { text: '<script>alert("XSS")</script>Hello' },
    direction: 'inbound',
    from: 'user',
    timestamp: new Date().toISOString(),
    metadata: {}
  };

  // Verify DOMPurify sanitizes the content
  const sanitized = DOMPurify.sanitize(maliciousMessage.content.text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('<script>');
  expect(sanitized).toBe('Hello');
});
```

### Test 2: Event Handler Injection
**Purpose**: Verify that event handlers like `onerror`, `onclick` are removed

```typescript
test('removes event handlers from message content', () => {
  const maliciousMessage = '<img src=x onerror="alert(1)">';

  const sanitized = DOMPurify.sanitize(maliciousMessage, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('onerror');
  expect(sanitized).not.toContain('alert');
  expect(document.querySelector('img[onerror]')).toBeNull();
});
```

### Test 3: JavaScript URL Injection
**Purpose**: Verify that `javascript:` URLs are removed from links

```typescript
test('removes javascript URLs from links', () => {
  const maliciousMessage = '<a href="javascript:alert(1)">Click</a>';

  const sanitized = DOMPurify.sanitize(maliciousMessage, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('javascript:');
});
```

### Test 4: Data URI with JavaScript
**Purpose**: Verify that data URIs with JavaScript are removed

```typescript
test('removes data URIs with JavaScript', () => {
  const maliciousMessage = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';

  const sanitized = DOMPurify.sanitize(maliciousMessage, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('data:text/html');
  expect(sanitized).not.toContain('<script>');
});
```

### Test 5: Allowed HTML Tags
**Purpose**: Verify that safe HTML tags are preserved

```typescript
test('preserves allowed HTML tags', () => {
  const safeMessage = 'Hello <strong>world</strong>! Visit <a href="https://example.com">example</a>';

  const sanitized = DOMPurify.sanitize(safeMessage, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).toContain('<strong>');
  expect(sanitized).toContain('<a href="https://example.com">');
  expect(sanitized).toContain('world');
});
```

## Manual Testing

### Test Procedure

1. **Access the Conversations Page**
   - Navigate to https://chat.genai.hr:3007/conversations
   - Login with valid credentials

2. **Inject XSS Payloads via API**
   Use the following curl commands to send messages with XSS payloads:

   ```bash
   # Test 1: Script tag injection
   curl -X POST https://chat.genai.hr:3007/api/chat/message \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "tenantId": "YOUR_TENANT_ID",
       "userId": "test-user",
       "content": "<script>alert(\"XSS\")</script>Hello World"
     }'

   # Test 2: Event handler injection
   curl -X POST https://chat.genai.hr:3007/api/chat/message \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "tenantId": "YOUR_TENANT_ID",
       "userId": "test-user",
       "content": "<img src=x onerror=\"alert(1)\">"
     }'

   # Test 3: JavaScript URL
   curl -X POST https://chat.genai.hr:3007/api/chat/message \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "tenantId": "YOUR_TENANT_ID",
       "userId": "test-user",
       "content": "<a href=\"javascript:alert(1)\">Click me</a>"
     }'
   ```

3. **Verify XSS Prevention**
   - Open the conversation in the dashboard
   - Open browser DevTools Console (F12)
   - Inspect the message DOM elements

   **Expected Results:**
   - No alert boxes should appear
   - Script tags should be removed from DOM
   - Event handlers should be stripped
   - JavaScript URLs should be neutralized
   - Only safe HTML tags should be present

4. **Verify Safe HTML Rendering**
   Test that allowed HTML tags work correctly:

   ```bash
   curl -X POST https://chat.genai.hr:3007/api/chat/message \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "tenantId": "YOUR_TENANT_ID",
       "userId": "test-user",
       "content": "Hello <strong>bold text</strong> and <a href=\"https://example.com\">safe link</a>"
     }'
   ```

   **Expected Results:**
   - Bold text should render correctly
   - Safe links should work
   - No security warnings in console

## Additional XSS Payloads to Test

```html
<!-- SVG with script -->
<svg onload="alert(1)">

<!-- Meta refresh -->
<meta http-equiv="refresh" content="0;url=javascript:alert(1)">

<!-- Base tag -->
<base href="javascript:alert(1)//">

<!-- Form injection -->
<form action="javascript:alert(1)"><input type="submit"></form>

<!-- Object tag -->
<object data="javascript:alert(1)">

<!-- Embed tag -->
<embed src="javascript:alert(1)">

<!-- Style with expression -->
<style>@import'javascript:alert(1)';</style>

<!-- Link with data URI -->
<link rel="stylesheet" href="data:text/css,body{background:url('javascript:alert(1)')}">
```

## Security Headers Verification

Open browser DevTools > Network tab and verify these headers are present:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Test Results

Date: _______________
Tester: _______________

| Test Case | Result | Notes |
|-----------|--------|-------|
| Script tag removal | ☐ Pass ☐ Fail | |
| Event handler removal | ☐ Pass ☐ Fail | |
| JavaScript URL removal | ☐ Pass ☐ Fail | |
| Data URI removal | ☐ Pass ☐ Fail | |
| Safe HTML preservation | ☐ Pass ☐ Fail | |
| Security headers present | ☐ Pass ☐ Fail | |

## References

- DOMPurify Documentation: https://github.com/cure53/DOMPurify
- OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- CSP Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
