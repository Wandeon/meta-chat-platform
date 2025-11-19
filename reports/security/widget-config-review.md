# Widget Configuration & Loader Review

## Metadata
- **Date:** 2025-11-19
- **Reviewer:** Automated (ChatGPT)
- **Scope:** Public widget configuration API, dashboard configurator UI, embeddable loader script, database migration `20251119000100_add_widget_config`.

## Security Rating (Public Endpoint)
**3 / 10** – unauthenticated endpoint lacks input validation, rate limiting, CORS restrictions, cache strategy, or generic error messaging. Attackers can enumerate tenant IDs, flood the DB, and receive detailed lifecycle hints.

## Key Findings

### 1. Public API Security
- No normalization/validation for `tenantId`; accepts arbitrary strings allowing enumeration attempts.
- No rate limiting or abuse detection; sustained scraping/DoS possible.
- CORS defaults to wildcard (implicit), enabling any origin to fetch tenant branding data.
- Error responses disclose operational state ("Widget disabled" etc.).
- Responses include full configuration blobs; need explicit allowlist of safe fields plus caching guidance.

### 2. XSS & Data Validation
- Textual fields (brand/agent names, welcome/trigger messages, quick replies) rendered directly in dashboard preview and widget runtime with no sanitization → stored XSS.
- Colors, positions, and lengths are unchecked; invalid CSS/placement accepted silently.
- Recommendation: shared schema (e.g., Zod) enforcing hex colors, enum positions, and string length limits (80 char button labels, 500 char messages). Strip HTML before persistence.

### 3. Database & Migration
- JSONB column flexible but lacks CHECK constraints/defaults; existing tenants inherit `{}` requiring app-level defaults.
- Consider generated columns or dedicated `widget_settings` table for analytics/auditing once schema stabilizes.

### 4. Dashboard Configurator UX (Rating: 6/10)
- Live preview works but provides no validation errors; users can enter invalid colors/text that later break widget.
- Save mutation errors are swallowed; surface `saveConfig` failure states inline.
- Installation snippet lacks CSP/SRI guidance and platform-specific steps.

### 5. Widget Loader Script
- Async mount generally OK but assumes snippet passes `configUrl`; default snippet uses `widgetId`, so onboarding is brittle.
- No DOM-ready guard if script injected before `<body>`; `document.body.appendChild` may throw.
- Error messages rendered raw into host page instead of telemetry/logging.

### 6. Installation / Documentation (Rating: 5/10)
- Snippet is short yet hides dependency on global `MetaChatWidget`; lacks guides for CMS (WordPress, Shopify, Wix, etc.).
- Provide "email instructions" and platform walkthroughs; mention CSP script tag requirements.

### 7. Performance
- No caching for widget configs or versioning for `widget.js` → poor resilience and cache-busting story.
- Loader eagerly mounts full chat UI; consider lazy-loading conversation bundle after launcher click.

### 8. Cross-Platform & Design
- Preview approximates widget but lacks controls for placement, responsiveness, or preset themes.
- CSS isolation strategy unclear; ensure widget styles cannot be overridden by host site.

## Recommendations Summary
1. **Hardening public API (6–8h):** input validation, tenant normalization, Redis rate limiting, cache headers (1–5 min TTL), and restrictive CORS (dashboard + CDN origins).
2. **XSS mitigation (4–6h):** shared schema, sanitized outputs, string length enforcement, escaping error messages.
3. **Loader contract (3h):** support `widgetId` parameter, DOM-ready guard, graceful error logging.
4. **Documentation/UX (8–12h):** validation feedback, save error display, platform-specific install guides, snippet with SRI/CSP hints.
5. **Performance (4–6h):** CDN caching for widget configs, versioned `widget.js`, lazy-load chat UI bundle.

## Outstanding Questions & Answers
1. **Is the public API vulnerable to abuse?** Yes; see findings above.
2. **Should widget config include API key?** Prefer signed, time-limited tokens/presigned URLs over static keys in HTML.
3. **Is JSONB sufficient?** Works short-term; consider typed table for long-term validation/auditing.
4. **Versioning strategy?** Use filename versioning (e.g., `/widget.vYYYYMMDD.js`) with loader pointer for rollbacks.
5. **Analytics?** Add lightweight load/open/message telemetry with batching.
6. **Preview on real site?** Provide hosted playground loading tenant config via URL params.
7. **Sandbox mode?** Add environment toggle routing to staging APIs.
8. **Widget load failure?** Currently dumps raw error div; add retries + console warnings only.
9. **A/B testing?** Not implemented; consider multiple saved presets with rollout percentages.
10. **Install complexity?** Moderate; snippet needs better context and platform guides.

## Critical Bugs
1. **Stored XSS in configurable text fields.**
2. **No rate limiting/CORS on public config endpoint.**
3. **Loader requires manual `configUrl` wiring, breaking default snippet installs.**

## Effort Estimate
- Security hardening & validation: **12–16 hours**.
- UX/documentation improvements: **8–12 hours**.
- Loader resilience/versioning: **6–8 hours**.
- Performance/caching enhancements: **4–6 hours**.

## Testing Status
_No automated tests executed for this review._
