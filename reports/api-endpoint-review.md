# API Endpoint Review

| Endpoint | Method | Auth | Validated | Working | Issues |
|----------|--------|------|-----------|---------|--------|
| /api/health | GET | None | n/a | ✅ | Public despite docs saying all endpoints require auth. |
| /api/health/live | GET | None | n/a | ✅ | Public health endpoint, not documented. |
| /api/health/ready | GET | None | n/a | ✅ | Public readiness endpoint, not documented. |
| /api/auth/signup | POST | None | ✅ zod schema | ✅ | Uses standalone Prisma client; not listed in main endpoints doc. |
| /api/auth/verify-email | POST | None | ✅ simple checks | ✅ | Not covered in endpoints doc. |
| /api/chat | POST | Admin or Tenant API key | ✅ zod schema | ⚠️ | RAG block incomplete and duplicates `messages` declaration, so context search never runs.【F:apps/api/src/routes/chat.ts†L103-L140】 |
| /api/tenants | GET | Admin | Basic query params | ✅ | Documented. |
| /api/tenants | POST | Admin | ✅ zod schema | ✅ | Documented. |
| /api/tenants/:tenantId | GET | Admin | n/a | ✅ | Documented. |
| /api/tenants/:tenantId | PUT/PATCH | Admin | ✅ zod schema | ✅ | Documented. |
| /api/tenants/:tenantId | DELETE | Admin | n/a | ✅ | Documented. |
| /api/channels | GET/POST | Admin | ✅ zod schema on POST | ✅ | Documented? not in current endpoints doc. |
| /api/channels/:channelId | PATCH/DELETE | Admin | ✅ zod schema on PATCH | ✅ | Not documented. |
| /api/documents | GET | Admin | Query defaults | ✅ | Documented? not in doc. |
| /api/documents | POST | Admin | ✅ zod schema | ✅ | — |
| /api/documents/:documentId | GET | Admin | Query parsing | ✅ | — |
| /api/documents/:documentId | PUT/PATCH | Admin | ✅ zod schema | ✅ | — |
| /api/documents/:documentId | DELETE | Admin | n/a | ✅ | — |
| /api/conversations | GET | Admin | Query parsing | ✅ | — |
| /api/conversations | POST | Admin | ✅ zod schema | ✅ | — |
| /api/conversations/:conversationId | GET | Admin | n/a | ✅ | — |
| /api/conversations/:conversationId | PUT | Admin | ✅ zod schema | ✅ | — |
| /api/api-keys/admin/users/:adminId/api-keys | POST | Admin | Label optional | ✅ | — |
| /api/api-keys/admin/users/:adminId/api-keys/:keyId/rotation | POST | Admin | Token issuance | ✅ | — |
| /api/api-keys/admin/users/:adminId/api-keys/:keyId/rotation/confirm | POST | Admin | Token required | ✅ | — |
| /api/api-keys/tenants/:tenantId/api-keys | GET | Admin (super) | n/a | ✅ | — |
| /api/api-keys/tenants/:tenantId/api-keys | POST | Admin (super) | Label optional | ✅ | — |
| /api/api-keys/tenants/:tenantId/api-keys/:keyId/rotation | POST | Admin (super) | n/a | ✅ | — |
| /api/api-keys/tenants/:tenantId/api-keys/:keyId/rotation/confirm | POST | Admin (super) | Token required | ✅ | — |
| /api/api-keys/tenants/:tenantId/api-keys/:keyId | DELETE | Admin (super) | n/a | ✅ | — |
| /api/webhooks | GET/POST | Admin | ✅ zod schema | ✅ | — |
| /api/webhooks/:webhookId | GET/PUT/DELETE | Admin | ✅ zod schema on PUT | ✅ | — |
| /api/webhooks/stripe | POST | None | Stripe signature | ⚠️ | Throws if STRIPE_SECRET_KEY missing; TODO comments for follow-up handling.【F:apps/api/src/routes/webhooks/stripe.ts†L17-L79】 |
| /api/mcp-servers | GET/POST | Admin | ✅ zod schema | ✅ | Not documented. |
| /api/mcp-servers/:serverId | GET/PATCH/DELETE | Admin | ✅ zod schema on PATCH | ✅ | Not documented. |
| /api/ollama | GET | Admin | n/a | ✅ | — |
| /api/ollama/models | GET | Admin | Query parsing | ⚠️ | Relies on environment, may fail without Ollama host. |
| /api/public/widget/config | GET | None (rate-limited) | ✅ query schema | ✅ | Public endpoint contradicts docs that all routes require auth. |
| /api/public/widget/sdk | GET | None (rate-limited) | n/a | ✅ | Public, undocumented. |
| /api/integrations/whatsapp/:tenantId | GET/POST | None | Basic input checks | ⚠️ | No auth; webhook verification expects rawBody; risk of unauthenticated access.【F:apps/api/src/routes/webhookIntegrations.ts†L256-L336】 |
| /api/integrations/messenger/:tenantId | GET/POST | None | Basic input checks | ⚠️ | Same as above (no auth).【F:apps/api/src/routes/webhookIntegrations.ts†L297-L336】 |
| /api/billing/create-checkout-session | POST | None | Basic body check | ❌ | No authentication middleware; relies on req.tenant which is never set, and throws if Stripe key missing.【F:apps/api/src/routes/billing/index.ts†L13-L49】 |
| /api/billing/create-portal-session | POST | None | n/a | ❌ | Same missing auth and Stripe dependency issues. 【F:apps/api/src/routes/billing/index.ts†L13-L90】 |
| /api/billing/subscription | GET | None | n/a | ⚠️ | No auth middleware; uses tenant context that may be absent. 【F:apps/api/src/routes/billing/index.ts†L13-L150】 |
| /api/billing/usage | GET | None | n/a | ⚠️ | No auth; relies on tenant context. 【F:apps/api/src/routes/billing/index.ts†L13-L220】 |
| /api/billing/plans | GET | None | n/a | ✅ | Public list of plans; undocumented. 【F:apps/api/src/routes/billing/index.ts†L13-L290】 |
| /api/billing/cancel | POST | None | n/a | ⚠️ | No auth; depends on tenant context and Stripe key. 【F:apps/api/src/routes/billing/index.ts†L13-L310】 |
| /api/analytics (various: /usage, /conversations, /health, /agents) | GET | Admin | Query parsing | ✅ | Not documented in endpoints file. |
| /api/ollama (models) | GET | Admin | Query parsing | ⚠️ | Dependent on external Ollama service. |
