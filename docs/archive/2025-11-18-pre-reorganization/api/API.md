# Meta Chat Platform API

## Overview

The API service located in `apps/api` provides REST endpoints, inbound webhook
handlers, and a Socket.IO gateway for the Meta Chat Platform. The service is
multi-tenant aware and integrates with PostgreSQL, Redis, and RabbitMQ.

## Environment Configuration

The server loads environment variables via `dotenv`. The most important
variables are:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port for the Express server (default `3000`). |
| `DATABASE_URL` | PostgreSQL connection string. |
| `REDIS_URL` | Redis connection string for Socket.IO adapter. |
| `RABBITMQ_URL` | RabbitMQ connection string used by queue publisher and webhook acknowledgements. |
| `API_CORS_ORIGINS` | Comma-separated list of allowed origins for CORS (default allows all). |
| `API_RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds (default `60000`). |
| `API_RATE_LIMIT_MAX` | Max requests per window for rate limiting (default `120`). |
| `API_BODY_LIMIT` | JSON payload limit (default `5mb`). |
| `WEBCHAT_JWT_SECRET` | Secret for verifying web chat JWTs. |
| `WEBCHAT_HMAC_SECRET` | Secret for verifying HMAC-based socket handshakes. |
| `ADMIN_JWT_*` | Existing admin auth secrets (see `modules/adminAuth`). |
| `WHATSAPP_VERIFY_TOKEN`, `MESSENGER_VERIFY_TOKEN` | Optional fallbacks for webhook verification. |

## Middleware & Observability

Global middleware registered during bootstrap:

- Request correlation/request IDs with propagation via headers.
- JSON body parsing (retaining raw payload for signature validation).
- CORS and rate limiting.
- Structured request logging via the shared logger.
- Prometheus metrics histogram (`http_request_duration_seconds`).

The server exposes:

- `GET /health` – checks PostgreSQL, Redis, and RabbitMQ connectivity. Response
  matches the `HealthCheck` structure (`status`, `services`, `timestamp`).
- `GET /metrics` – Prometheus metrics (requires authentication via your metrics
  scraper if desired).

## REST API

All REST endpoints live under `/api` and return `{ success, data }` envelopes on
success or `{ success: false, error }` on failure. Admin key authentication uses
`authenticateAdmin`; tenant-scoped endpoints use `authenticateTenant` with the
`x-api-key` header.

### Tenants (`/api/tenants`)

- `GET /api/tenants` – list tenants (admin-only).
- `POST /api/tenants` – create a tenant (`name`, optional `settings`, `enabled`).
- `GET /api/tenants/:tenantId` – fetch tenant details.
- `PUT /api/tenants/:tenantId` – update tenant metadata/settings.

### Channels (`/api/channels`)

Tenant authenticated endpoints to manage messaging channels.

- `GET /api/channels` – list channels for the tenant.
- `POST /api/channels` – create channel (`type`, `config`, `enabled`).
- `PUT /api/channels/:channelId` – update configuration.
- `DELETE /api/channels/:channelId` – remove a channel.

### Documents (`/api/documents`)

Tenant endpoints for RAG document metadata.

- `GET /api/documents` – list documents (optional `status` query).
- `POST /api/documents` – create a document record (`filename`, `mimeType`,
  `size`, `path`, `checksum`, optional metadata).
- `GET /api/documents/:id` – get document detail.
- `PUT /api/documents/:id` – update metadata/status/version.
- `DELETE /api/documents/:id` – delete a document record.

### Conversations (`/api/conversations`)

- `GET /api/conversations` – list conversations (filters: `status`,
  `channelType`, `userId`).
- `POST /api/conversations` – create conversation (`channelType`, `externalId`,
  `userId`, optional metadata).
- `GET /api/conversations/:id` – fetch conversation plus latest messages.
- `PUT /api/conversations/:id` – update status/metadata.

### Webhooks (`/api/webhooks`)

- `GET /api/webhooks` – list webhook subscriptions.
- `POST /api/webhooks` – create webhook (`url`, `events`, optional `headers`,
  `enabled`).
- `GET /api/webhooks/:id` – fetch webhook configuration.
- `PUT /api/webhooks/:id` – update webhook.
- `DELETE /api/webhooks/:id` – delete webhook.

### Admin API Keys (`/api/security/...`)

Existing routes remain under `/api/security` for managing admin and tenant API
keys. These reuse the admin authentication middleware.

## Inbound Webhooks

Routes under `/api/integrations` handle WhatsApp and Messenger events.

### WhatsApp (`/api/integrations/whatsapp/:tenantId`)

- `GET` – verification handshake (`hub.verify_token`, `hub.challenge`).
- `POST` – verifies `x-hub-signature-256`, acknowledges via RabbitMQ, and
  publishes normalized inbound messages.

### Messenger (`/api/integrations/messenger/:tenantId`)

- `GET` – verification handshake with `verifyToken`.
- `POST` – signature verification, acknowledgement, and message publishing.

`WebhookAckStrategy` enqueues acknowledgement payloads to the orchestrator
exchange while the `TenantQueuePublisher` publishes normalized messages with a
payload of `{ type: 'message.received', message }`.

## Socket.IO Gateway

The HTTP server hosts a Socket.IO instance for web chat clients.

- Supports JWT authentication (`WEBCHAT_JWT_SECRET`) and HMAC authentication
  using `tenantId:userId:timestamp` signed with `WEBCHAT_HMAC_SECRET`.
- Automatically joins tenants to rooms (`tenantId`, `tenantId:userId`).
- Uses the Redis adapter when `REDIS_URL` is configured for horizontal
  scalability.

## Metrics & Logging

- Request logs include method, route, status, duration, and tenant/admin
  context.
- Prometheus metrics include request duration histogram. Additional metrics can
  be added via the shared `metricsRegistry`.

## Shutdown Behavior

`SIGTERM`/`SIGINT` triggers graceful shutdown closing Socket.IO, RabbitMQ
publishers, webhook acknowledgement channel, and the Prisma connection.
