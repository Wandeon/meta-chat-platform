# XSS Security Tests for MessageList Component

## Overview
This document describes XSS vulnerability tests for the MessageList component in the web widget.
The component now uses DOMPurify to sanitize all user-generated content before rendering.

## Automated Tests (To be implemented when testing infrastructure is added)

### Test 1: Script Tag Injection Prevention
**Purpose**: Verify that `<script>` tags in messages are removed

```typescript
import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import DOMPurify from 'dompurify';

test('removes script tags from message content', () => {
  const messages = [
    {
      id: '1',
      role: 'user',
      content: '<script>alert("XSS")</script>Hello World',
      timestamp: new Date().toISOString(),
    }
  ];

  // Verify DOMPurify sanitizes the content
  const sanitized = DOMPurify.sanitize(messages[0].content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('<script>');
  expect(sanitized).not.toContain('alert');
  expect(sanitized).toBe('Hello World');

  // Verify no script tags in actual DOM
  render(<MessageList messages={messages} />);
  expect(document.querySelector('script')).toBeNull();
});
```

### Test 2: Event Handler Injection Prevention
**Purpose**: Verify that inline event handlers are removed

```typescript
test('removes inline event handlers from message content', () => {
  const messages = [
    {
      id: '2',
      role: 'user',
      content: '<img src=x onerror="alert(1)"> <div onclick="alert(2)">Click</div>',
      timestamp: new Date().toISOString(),
    }
  ];

  const sanitized = DOMPurify.sanitize(messages[0].content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('onerror');
  expect(sanitized).not.toContain('onclick');
  expect(sanitized).not.toContain('alert');

  render(<MessageList messages={messages} />);
  expect(document.querySelector('[onerror]')).toBeNull();
  expect(document.querySelector('[onclick]')).toBeNull();
});
```

### Test 3: JavaScript URL Prevention
**Purpose**: Verify that `javascript:` URLs in links are removed

```typescript
test('removes javascript URLs from links', () => {
  const messages = [
    {
      id: '3',
      role: 'assistant',
      content: '<a href="javascript:alert(1)">Malicious Link</a>',
      timestamp: new Date().toISOString(),
    }
  ];

  const sanitized = DOMPurify.sanitize(messages[0].content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('javascript:');

  render(<MessageList messages={messages} />);
  const links = document.querySelectorAll('a[href^="javascript:"]');
  expect(links.length).toBe(0);
});
```

### Test 4: SVG Script Injection Prevention
**Purpose**: Verify that SVG elements with scripts are removed

```typescript
test('removes SVG script injections', () => {
  const messages = [
    {
      id: '4',
      role: 'user',
      content: '<svg onload="alert(1)"><script>alert(2)</script></svg>',
      timestamp: new Date().toISOString(),
    }
  ];

  const sanitized = DOMPurify.sanitize(messages[0].content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).not.toContain('<svg');
  expect(sanitized).not.toContain('onload');
  expect(sanitized).not.toContain('<script>');
});
```

### Test 5: Allowed HTML Preservation
**Purpose**: Verify that safe HTML tags are correctly rendered

```typescript
test('preserves safe HTML tags', () => {
  const messages = [
    {
      id: '5',
      role: 'assistant',
      content: 'You can visit <a href="https://example.com">our website</a> for <strong>more info</strong>.',
      timestamp: new Date().toISOString(),
    }
  ];

  const sanitized = DOMPurify.sanitize(messages[0].content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });

  expect(sanitized).toContain('<a href="https://example.com">');
  expect(sanitized).toContain('<strong>');

  render(<MessageList messages={messages} />);
  expect(screen.getByText(/more info/i)).toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
});
```

### Test 6: Multiple Messages
**Purpose**: Verify that all messages in a conversation are sanitized

```typescript
test('sanitizes all messages in the list', () => {
  const messages = [
    {
      id: '1',
      role: 'user',
      content: '<script>alert(1)</script>Hello',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Safe response <strong>with formatting</strong>',
      timestamp: new Date().toISOString(),
    },
    {
      id: '3',
      role: 'user',
      content: '<img src=x onerror="alert(2)">',
      timestamp: new Date().toISOString(),
    }
  ];

  render(<MessageList messages={messages} />);

  // No scripts should be in DOM
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('[onerror]')).toBeNull();

  // Safe formatting should be preserved
  expect(screen.getByText(/with formatting/i).closest('strong')).toBeInTheDocument();
});
```

## Manual Testing in Widget

### Test Procedure

1. **Embed the Widget**
   Add the widget to a test page:
   ```html
   <script src="https://chat.genai.hr:3007/widget.js"></script>
   <script>
     MetaChat.init({
       tenantId: 'YOUR_TENANT_ID',
       userId: 'test-user-123'
     });
   </script>
   ```

2. **Test XSS Payloads**
   Type the following messages in the widget chat interface:

   a. Script tag injection:
   ```
   <script>alert("XSS")</script>Hello
   ```

   b. Event handler injection:
   ```
   <img src=x onerror="alert(1)">
   ```

   c. JavaScript URL:
   ```
   <a href="javascript:alert(1)">Click me</a>
   ```

   d. SVG injection:
   ```
   <svg onload="alert(1)">
   ```

   e. Data URI with script:
   ```
   <a href="data:text/html,<script>alert(1)</script>">Click</a>
   ```

3. **Verify Prevention**
   - Open browser DevTools Console (F12)
   - Check for any alert dialogs (should be none)
   - Inspect the message elements in the DOM
   - Verify no `<script>` tags are present
   - Verify no event handler attributes exist

4. **Test Safe HTML**
   Type the following message to verify safe HTML works:
   ```
   Visit <a href="https://example.com">this link</a> for <strong>important</strong> info!
   ```

   **Expected Results:**
   - Link should be clickable and safe
   - Bold text should render correctly
   - No security warnings

## Widget-Specific XSS Vectors

Test these widget-specific scenarios:

### 1. Cross-Window Message Injection
```javascript
// From parent page console
window.postMessage({
  type: 'meta-chat-message',
  content: '<script>alert(1)</script>'
}, '*');
```

### 2. URL Parameter Injection
```
https://yoursite.com/?userId=<script>alert(1)</script>
```

### 3. Stored XSS via Server
Send malicious message via API that gets stored and displayed:
```bash
curl -X POST https://chat.genai.hr:3007/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "YOUR_TENANT_ID",
    "userId": "test-user",
    "content": "<script>alert(\"Stored XSS\")</script>"
  }'
```

## Common XSS Payloads to Test

```html
<!-- Basic script injection -->
<script>alert(1)</script>

<!-- Image with onerror -->
<img src=x onerror="alert(1)">

<!-- SVG with script -->
<svg><script>alert(1)</script></svg>
<svg onload="alert(1)">

<!-- JavaScript URL -->
<a href="javascript:alert(1)">Click</a>

<!-- Data URI -->
<iframe src="data:text/html,<script>alert(1)</script>">

<!-- Event handlers -->
<div onmouseover="alert(1)">Hover</div>
<input onfocus="alert(1)" autofocus>

<!-- Meta refresh -->
<meta http-equiv="refresh" content="0;url=javascript:alert(1)">

<!-- Style injection -->
<style>@import'javascript:alert(1)';</style>

<!-- Link with href -->
<link rel="stylesheet" href="javascript:alert(1)">

<!-- Object/Embed -->
<object data="javascript:alert(1)">
<embed src="javascript:alert(1)">

<!-- Form action -->
<form action="javascript:alert(1)"><input type="submit"></form>

<!-- Base tag -->
<base href="javascript:alert(1)//">

<!-- Encoded payloads -->
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">

<!-- Mixed case to bypass filters -->
<ScRiPt>alert(1)</sCrIpT>
```

## Browser Testing Matrix

Test in multiple browsers:

| Browser | Version | Script Tag | Event Handler | JS URL | Result |
|---------|---------|------------|---------------|--------|--------|
| Chrome  | Latest  | ☐          | ☐             | ☐      | ☐ Pass ☐ Fail |
| Firefox | Latest  | ☐          | ☐             | ☐      | ☐ Pass ☐ Fail |
| Safari  | Latest  | ☐          | ☐             | ☐      | ☐ Pass ☐ Fail |
| Edge    | Latest  | ☐          | ☐             | ☐      | ☐ Pass ☐ Fail |

## Security Headers Verification

The widget loads from the API server. Verify these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

Check headers in Network tab when widget.js loads.

## Test Results

Date: _______________
Tester: _______________

| Test Case | Result | Notes |
|-----------|--------|-------|
| Script tag removal | ☐ Pass ☐ Fail | |
| Event handler removal | ☐ Pass ☐ Fail | |
| JavaScript URL removal | ☐ Pass ☐ Fail | |
| SVG injection prevention | ☐ Pass ☐ Fail | |
| Safe HTML preservation | ☐ Pass ☐ Fail | |
| Multiple messages sanitized | ☐ Pass ☐ Fail | |

## References

- DOMPurify Documentation: https://github.com/cure53/DOMPurify
- OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- Widget Security: https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html
