# XSS Audit Summary

## Scope
- apps/dashboard/src (React dashboard)
- apps/web-widget/src (embedded widget)
- apps/api/src/routes/public/widget-config.ts (public widget configuration endpoint)
- packages/shared/src (shared utilities)

## Findings
### Widget system input handling
- Widget configuration returned from `widget-config` endpoint is consumed by the client without converting values to HTML; UI renders string values (e.g., `brandName`, `agentName`, `initialMessage`, `quickReplies`) via React text nodes, which apply automatic escaping. 【F:apps/api/src/routes/public/widget-config.ts†L18-L79】【F:apps/web-widget/src/MetaChatWidget.tsx†L14-L46】【F:apps/web-widget/src/components/Composer.tsx†L15-L40】【F:apps/web-widget/src/components/MessageList.tsx†L9-L30】

### HTML sanitization and script execution
- No uses of `dangerouslySetInnerHTML` or manual HTML injection were found across dashboard or widget components (verified via ripgrep). The widget loader deliberately avoids `innerHTML` when surfacing errors, using `textContent` instead to prevent injection. 【F:apps/web-widget/src/loader.tsx†L34-L77】
- Dashboard views render user and assistant message content through JSX text nodes (`{messageText}`), preventing script execution by relying on React's escaping. 【F:apps/dashboard/src/pages/ConversationsPage.tsx†L100-L205】【F:apps/dashboard/src/pages/ConversationsPage.tsx†L224-L315】

### Message content handling
- Chat messages and quick replies are displayed as plain text without HTML parsing, limiting XSS risk. Messages that arrive as objects are stringified before rendering. 【F:apps/dashboard/src/pages/ConversationsPage.tsx†L236-L279】【F:apps/web-widget/src/components/MessageList.tsx†L9-L30】

### Content Security Policy
- API layer applies security headers globally, including a production-only CSP of `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`. This blocks remote scripts and framing but allows inline styles; CSP is configured yet could be further tightened if inline styles are removed. 【F:apps/api/src/middleware/securityHeaders.ts†L7-L34】【F:apps/api/src/server.ts†L460-L495】

## Status
- No active XSS vectors identified in the reviewed areas. Inputs are rendered as text, and CSP is present though includes `'unsafe-inline'` for styles.
- Continued vigilance recommended if future features require rendering rich HTML; introduce a sanitization utility at that time.
