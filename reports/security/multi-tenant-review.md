# Multi-tenant Security Review (commit 3e7fa8e)

## At-a-glance
| Item | Result |
| --- | --- |
| **Security Rating** | **4 / 10 (High Risk)** |
| **Tenant Isolation Assessment** | **Fail** – tenant-scoped queries are not consistently constrained |
| **Penetration Test Scope** | Static code review of API, services, Prisma schema, and runtime configuration |

## Critical Vulnerabilities

### 1. Cross-tenant conversation takeover via `/api/chat`
* **Severity:** Critical (OWASP A01 – Broken Access Control)
* **What happens:** The chat endpoint loads existing conversations solely by `id` and later updates them without verifying the `tenantId`. Any authenticated tenant can therefore supply the ID of another tenant's conversation, read its history, and mutate it (status changes, message insertion, analytics records, escalation events).
* **Evidence:** Conversation lookup, message persistence, and updates never scope the query to `payload.tenantId` or `req.tenant.id`.【F:apps/api/src/routes/chat.ts†L62-L91】【F:apps/api/src/routes/chat.ts†L285-L383】
* **Proof-of-concept:**
  1. Tenant A enumerates a UUID belonging to Tenant B (via guesswork, logs, or leaked analytics).
  2. Tenant A calls `POST /api/chat` with their own tenantId but supplies `conversationId` set to Tenant B's ID.
  3. The API loads Tenant B's conversation, appends Tenant A's messages, and updates status/metadata, leaking cross-tenant data.
* **Recommendation:** Add `tenantId` (and `userId` where relevant) to every `findUnique`, `update`, and `message.create` call. Prisma supports composite unique constraints (`@@unique([id, tenantId])`) or `where: { id_conversationId_tenantId: { ... } }`. Reject requests where `conversation.tenantId !== req.tenant.id` before continuing.
* **Estimated effort:** 6–8 hours (touch chat handler, add schema-level compound IDs, add regression tests).

### 2. SQL injection in vector search
* **Severity:** Critical (OWASP A03 – Injection)
* **What happens:** `searchChunks` builds SQL fragments for `documentIds` and `languageFilter` by interpolating user-provided strings directly into the query string and then executes it with `$queryRawUnsafe`. Quoted IDs/language codes can therefore break out of the string context and inject arbitrary SQL.
* **Evidence:** Dynamic strings are concatenated into the SQL statement before calling `$queryRawUnsafe` at lines 50-86, so Prisma does not parameterize them.【F:apps/api/src/services/vectorSearch.ts†L50-L86】
* **Proof-of-concept:** Passing `documentIds: ["foo'::uuid); DROP TABLE documents; --"]` will append `AND "documentId" = ANY(ARRAY['foo'::uuid); DROP TABLE documents; --])`, executing the injected `DROP TABLE`.
* **Recommendation:** Stop using `$queryRawUnsafe`; instead construct the query with placeholders (`$queryRaw`) and pass `documentIds` / `languageFilter` as array parameters. For example, `WHERE "documentId" = ANY(${Prisma.sql`ARRAY[...]`})` via `Prisma.sql` helpers or separate joins.
* **Estimated effort:** 4–6 hours (refactor query builder + regression tests).

### 3. Production secrets committed to Git
* **Severity:** Critical (OWASP A07 – Identification and Authentication Failures / A05 – Security Misconfiguration)
* **What happens:** `apps/api/.env.production` is under version control with live database credentials, Redis, RabbitMQ passwords, JWT secrets, and encryption keys. Anyone with repo access can read them; if the repo is public, these secrets are effectively leaked.
* **Evidence:** The env file stores plaintext credentials and keys, e.g., `DATABASE_URL` and `ADMIN_JWT_SECRET`.【F:apps/api/.env.production†L1-L34】
* **Recommendation:** Remove `.env.production` from Git (add to `.gitignore`), rotate every exposed secret, and load production configuration from a secure secret manager or CI/CD vault. Document the rotation procedure.
* **Estimated effort:** 3–4 hours for code changes + time to rotate infrastructure secrets.

## High-Risk Issues
1. **Unscoped admin CRUD routes for conversations/documents.** Admin APIs accept an optional `tenantId` query/body parameter but otherwise operate on *all* records without verifying the caller should see that tenant's data, enabling any admin API key to exfiltrate every tenant's documents/conversations.【F:apps/api/src/routes/conversations.ts†L31-L115】【F:apps/api/src/routes/documents.ts†L34-L183】 (8–12 hours to introduce scoped admin roles / forced tenant selection.)
2. **Messages do not enforce tenant/conversation consistency.** `messages` table references `tenantId` and `conversationId` separately, but the API inserts rows without verifying that `conversation.tenantId === payload.tenantId`, so corrupted cross-tenant rows can be persisted even if Prisma adds composite keys later.【F:apps/api/src/routes/chat.ts†L337-L377】 (4–5 hours to add DB constraint or trigger & server-side checks.)

## Medium / Low Issues (summary)
- **Missing rate limiting middleware:** despite env vars, there is no `rateLimiting.ts` nor middleware usage in Express, leaving the API unthrottled and vulnerable to brute force/DDoS (searching the middleware directory shows only `auth.ts` and `usageTracking.ts`).【F:apps/api/src/middleware†L1-L3】 (Medium)
- **Security headers / TLS config absent from repo:** no `Caddyfile` or equivalent is tracked, so it's unclear whether HSTS, CSP, or TLS-hardening is enforced (Medium – configuration gap).
- **.env files for multiple apps committed to Git:** `apps/dashboard/.env.production` likely leaks front-end secrets as well (Medium).

## OWASP Top 10 alignment
| OWASP Category | Status |
| --- | --- |
| A01 Broken Access Control | ❌ Violated by chat endpoint & admin CRUD routes |
| A02 Cryptographic Failures | ⚠️ Secrets stored in Git and no documented rotation |
| A03 Injection | ❌ `$queryRawUnsafe` allows SQL injection |
| A05 Security Misconfiguration | ⚠️ Rate limiting / security headers missing |
| A07 Identification & Authentication Failures | ⚠️ Secrets leak enables credential reuse |
| Others | Not evaluated in this review |

## Recommendations (priority order)
1. **Patch the chat endpoint:** enforce tenant-based `where` clauses, reject mismatched conversations, and add Prisma-level compound unique constraints.
2. **Refactor vector search:** remove dynamic SQL, adopt parameterized queries, and add unit tests using malicious IDs to prevent regression.
3. **Purge committed secrets:** delete `.env.production` files from Git history, rotate every credential, and load secrets from environment/secret manager at deploy time.
4. **Scope administrative APIs:** require explicit tenant selection, verify role/ownership, or split admin keys into super-admin vs tenant-admin roles.
5. **Implement rate limiting middleware:** honor `RATE_LIMIT_*` env vars by integrating express-rate-limit or an API gateway to throttle auth-sensitive routes.
6. **Add automated security scanning:** expand the existing CI job to include SAST/DAST (e.g., npm audit + semgrep + OWASP ZAP) and enforce blocking thresholds.

## Estimated remediation effort
| Issue | Severity | Est. engineering time |
| --- | --- | --- |
| Chat endpoint tenant checks | Critical | 6–8 h |
| Vector search SQLi fix | Critical | 4–6 h |
| Secret rotation & removal | Critical | 3–4 h (+ ops time) |
| Admin route scoping | High | 8–12 h |
| Message/tenant integrity check | High | 4–5 h |
| Rate limiting middleware | Medium | 4 h |
| Security headers/TLS review | Medium | 4 h |

