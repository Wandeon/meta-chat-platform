# Authentication & Signup System Review

## Overview
This report summarizes the review of the self-service signup and verification flow at commit `3e7fa8e` on `master`. The scope covered backend auth routes and services, frontend signup + verification pages, Prisma migration, and the supporting email/tenant provisioning flows.

## Overall Security Rating
**5 / 10.** Strong cryptography (bcrypt, crypto RNG, SHA-256) is undermined by missing transactional safety, replay-prone token handling, and lack of abuse-prevention controls, leaving the flow vulnerable to inconsistencies and automated attacks.

## Code Quality Assessment
- Backend code is readable but chains several raw SQL statements (`CREATE TABLE IF NOT EXISTS`, `INSERT ...`) directly in request handlers rather than Prisma models or migrations. Without wrapping them inside a `prisma.$transaction`, failures mid-flow create dangling data (users without passwords, tokens without admins, orphan tenants).
- Tenant provisioning is encapsulated yet unaware of admin ownership and has no retry/rollback guarantees. Provisioning failures can leak API keys or leave half-created tenants.
- The frontend form omits `name`/`companyName` fields and enforces weaker password rules than the API, so every signup attempt fails before verification, and UX diverges from backend requirements.
- API error responses are flat strings, and the UI echoes them verbatim, providing no per-field guidance while still risking leakage if backend strings ever expose internals.

## Critical Issues
1. **Signup flow lacks atomicity.** User creation, password persistence, token issuance, and metadata inserts all run as separate statements via `$executeRaw` without a surrounding transaction. Any crash between steps leaves inconsistent state.
2. **Frontend-backend contract mismatch.** The form never submits the required `name` and `companyName`, so the backend always throws a validation error, making signup impossible.
3. **DDL in request path.** Password hashes live in an ad-hoc table created via `CREATE TABLE IF NOT EXISTS` on every signup request, rather than via Prisma migrations/models. This is fragile, slow, and risks schema drift.
4. **No abuse protection.** Signup has no rate limiting, CAPTCHA, or throttling, enabling brute-force and bot-driven signups/email spraying.
5. **Replayable tokens.** Email verification marks tokens as `used` after provisioning without a transaction/lock, so concurrent requests can both pass the check and double-provision tenants/API keys.
6. **Tenant provisioning not tied to admins.** Provisioned tenants and API keys are not associated with the verifying admin, and there is no cleanup if provisioning fails mid-way.
7. **Logs may leak sensitive data.** Errors are logged via `console.error('Signup error:', error)` without redaction, potentially exposing PII or SQL fragments.

## Recommendations
1. Wrap the entire signup process (user insert, password record, token creation, pending tenant entry) inside `prisma.$transaction`. Abort on email dispatch failures to avoid orphaned data.
2. Align frontend fields and validation rules with backend expectations (include `name` + `companyName`, enforce special-character requirement, show inline errors).
3. Move password storage into the Prisma schema/migrations and drop request-time DDL. Store hashes (with pepper/version metadata) via ORM models.
4. Add abuse controls such as `express-rate-limit`, CAPTCHA, IP throttling, and/or disposable-email blocking to reduce automated attacks.
5. Hash verification tokens at rest, enforce uniqueness, and update + provisioning within a single transaction or row-lock to guarantee single-use semantics.
6. Associate tenants + API keys with the verifying admin and add retry/rollback logic so failures do not leak resources.
7. Implement structured error responses and redact logs to ensure no sensitive payloads leak in stack traces or console output.

## UI/UX Observations
- Password guidance is inconsistent (no mention of required special characters) and validation happens only on submit. Add a live-updating checklist covering all backend rules.
- All validation errors show as a single alert banner, making it unclear which field failed. Use per-field helper text tied to structured API responses.
- Submission lacks a spinner/disabled state, and Verify page redirects after 2s without communicating the countdown. Improve loading states and add accessible announcements (ARIA live regions, `htmlFor` label bindings).
- Layout is desktop-focused (fixed 400px card); introduce responsive styles for smaller viewports.

## Answers to Key Questions
1. **Token security?** Tokens use `crypto.randomBytes(32)` (64-char hex) but are stored in plaintext and updated outside transactions, so DB compromise or race conditions remain risks.
2. **Password hashing strength?** Bcrypt with 12 rounds is acceptable for modern workloads, though 12–14 rounds may be considered based on latency targets.
3. **UI password guidance?** No. The UI omits the special-character requirement and lacks real-time feedback, causing confusing rejections.
4. **Error message quality?** Backend returns simple strings plus optional `details`, but the UI collapses everything into one alert, so users lack actionable field-level feedback (while still hiding internals).
5. **Auto-provisioning robustness?** Weak. Provisioning runs outside any transaction, is not bound to the admin, and lacks rollback, so failures leave inconsistent tenants or API keys.
6. **Need for CAPTCHA?** Yes. With no rate limiting or throttling, adding CAPTCHA or equivalent bot mitigation is recommended.

## Estimated Effort
| Task | Estimate (hours) |
| --- | --- |
| Transactional signup flow + Prisma models for passwords/pending tenants | 8–12 |
| Frontend contract fixes + validation parity + inline errors | 6–8 |
| Rate limiting/CAPTCHA/disposable-email checks | 6–10 |
| Token hardening + transactional verification | 6–8 |
| Tenant provisioning associations + rollback | 6–10 |
| Accessibility & responsive UX improvements | 4–6 |

*Testing was not executed; this was a static review.*
