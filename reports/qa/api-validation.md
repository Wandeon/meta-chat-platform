# API Request Validation Review

## Scope
- apps/api/src/middleware/
- apps/api/src/routes/
- packages/shared/src/types.ts

## Findings

### Missing schema validation for analytics query parameters
- Analytics routes rely on manual `typeof` checks and `parseInt` without schema validation, so arbitrary query fields are accepted and numeric limits/coercion are unchecked (e.g., `days`, `limit`, `range`). 【F:apps/api/src/routes/analytics.ts†L19-L155】

### Metadata accepts arbitrary fields for document creation/update
- Document routes validate `metadata` with `z.record(z.string(), z.any())`, permitting any keys and values (including nested objects) without whitelisting or size/type checks, so unexpected fields are stored and later used (e.g., `fileType`, `fileSize`) without verification. 【F:apps/api/src/routes/documents.ts†L13-L99】【F:apps/api/src/routes/documents.ts†L128-L179】

### Lax tenant scoping on document listing
- `/documents` GET accepts an optional `tenantId` from the query without validating presence or type, allowing calls without tenant scoping and trusting any string coercion. 【F:apps/api/src/routes/documents.ts†L34-L48】

### Webhook payloads are unvalidated
- WhatsApp/Messenger webhook handlers process `req.body` directly with helper functions that assume nested properties exist, without any schema or size/type checks, risking malformed input and type coercion issues. 【F:apps/api/src/routes/webhookIntegrations.ts†L47-L173】【F:apps/api/src/routes/webhookIntegrations.ts†L200-L320】

### No file-type/size enforcement for document ingestion
- Document creation derives `mimeType` and `size` from user-provided metadata or defaults, with no validation against allowed types or maximum sizes, so arbitrary values can be persisted and used downstream. 【F:apps/api/src/routes/documents.ts†L54-L99】

## Recommendations
- Introduce consistent schema validation (e.g., zod) for all query params, path params, and bodies in analytics and webhook routes; enforce numeric bounds to avoid coercion issues.
- Replace `z.record(...any())` for document metadata with explicit schemas (e.g., content, fileType, fileSize) and reject extra fields unless explicitly permitted.
- Require and validate `tenantId` for document listing to prevent cross-tenant or unscoped access.
- Add file-type allowlists and maximum size checks before persisting document metadata or processing content.
- Define schemas for webhook payload envelopes and enforce limits before normalizing messages.
