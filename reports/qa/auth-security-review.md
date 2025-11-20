# Authentication and Authorization Review

## Scope
Requested verification of API key and WebSocket authentication, JWT handling, and claims around Passport usage.

## Findings

### HTTP API keys
- API keys are validated through `authenticateTenant`, `authenticateAdmin`, and `authenticateAdminOrTenant`, which resolve records by prefix, enforce `active`/`expiresAt`, verify hashes with a timing-safe scrypt comparison, and update `lastUsedAt`.【F:apps/api/src/middleware/auth.ts†L1-L114】
- Key management endpoints are behind admin authentication and only expose prefixes/last four digits; new keys use scrypt-based hashing via `hashSecret`, and rotation tokens are hashed with the same helper, preventing plaintext storage and providing timing-safe comparison.【F:apps/api/src/routes/apiKeys.ts†L1-L140】【F:apps/api/src/routes/apiKeys.ts†L150-L335】【F:packages/shared/src/security.ts†L1-L125】
- Default tenant API keys created during signup/provisioning are hashed with a simple SHA-256 of `secret + salt`, which is incompatible with the scrypt-based `verifySecret` used during authentication (hash lengths differ), causing those keys to fail validation while still being presented to users.【F:apps/api/src/services/authService.ts†L120-L205】【F:apps/api/src/services/TenantProvisioning.ts†L1-L70】【F:packages/shared/src/security.ts†L85-L125】 This is a correctness bug that doubles as an availability/authentication failure.

### WebSocket JWT/HMAC
- Socket.io authentication accepts either a JWT (validated with `jsonwebtoken.verify` against `WEBCHAT_JWT_SECRET` and requiring `tenantId`/`userId` claims) or an HMAC signature using `WEBCHAT_HMAC_SECRET` with timing-safe comparison.【F:apps/api/src/server.ts†L324-L386】
- The HMAC path does not validate the provided `timestamp` for freshness, so any captured signature remains replayable indefinitely as long as the shared secret is unchanged.【F:apps/api/src/server.ts†L340-L370】
- JWT verification does not enforce issuer/audience claims and relies entirely on the shared secret; expiry is handled by `jsonwebtoken.verify` defaults, but there is no rotation or KID support documented in code.【F:apps/api/src/server.ts†L332-L352】

### Authentication coverage and rate limiting
- Sensitive routers (tenants, channels, chat, API key management) all mount admin or admin/tenant authentication middleware, preventing unauthenticated access; public routes are limited to signup/verify and widget config.【F:apps/api/src/routes/tenants.ts†L1-L38】【F:apps/api/src/routes/channels.ts†L1-L19】【F:apps/api/src/routes/chat.ts†L1-L36】【F:apps/api/src/server.ts†L280-L296】
- Global rate limiting is applied to `/api` via `express-rate-limit`, covering auth endpoints as well.【F:apps/api/src/server.ts†L130-L148】

### Secrets and session management
- API key helpers generate random keys, derive prefixes/last-four, and use scrypt with timing-safe compare; rotation tokens are also hashed and stored with expirations.【F:packages/shared/src/security.ts†L1-L143】
- Admin API keys are stored as scrypt+pepper hashes with timing-safe comparison, and short-lived JWTs (default 15 minutes) are issued with issuer/audience claims; tokens are verified against key status/expiry, and audit logs record authentication attempts.【F:apps/api/src/modules/adminAuth/service.ts†L1-L210】【F:packages/database/src/admin.ts†L1-L72】
- No usage of Passport is present in the codebase (no imports or dependencies).【F:apps/api/src/middleware/auth.ts†L1-L114】【F:apps/api/src/server.ts†L1-L200】

## Risks & Recommendations
1) **Broken tenant API key validation** – Align API key hashing in signup/provisioning with the scrypt-based `hashSecret`/`verifySecret` helpers so issued keys actually authenticate. Until fixed, onboarded tenants will receive unusable keys.
2) **WebSocket HMAC replay** – Enforce a maximum clock skew for `timestamp` (e.g., reject signatures older than 5 minutes) and consider nonce tracking to prevent replay.
3) **JWT hardening for sockets** – Require issuer/audience claims and consider key rotation/KID support; document secret management alongside `WEBCHAT_HMAC_SECRET`.

No evidence of authentication bypass on protected REST routes, plaintext key storage, or Passport usage was found.
