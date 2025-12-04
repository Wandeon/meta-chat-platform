# Logging and Monitoring Review (2025-02-06)

## Scope
- Logging implementation (`packages/shared/src/logging.ts`).
- Logger usage across services (API server, worker, orchestrator, events, RAG utilities).
- Monitoring and operations documentation (`docs/current/operations/monitoring.md`).

## Findings
### Structured logging
- Logging uses `pino` with ISO timestamps and uppercase level field, keeping JSON output (`messageKey: 'message'`) and AsyncLocalStorage-backed context propagation. 【F:packages/shared/src/logging.ts†L24-L119】
- API server attaches `requestId`/`correlationId` and records per-request metrics plus structured log fields (method, route, status, duration, tenant/admin IDs). 【F:apps/api/src/server.ts†L90-L171】
- Monitoring docs explicitly describe JSON log format and rotation via PM2. 【F:docs/current/operations/monitoring.md†L96-L168】

### Logging coverage and levels
- Default level from `LOG_LEVEL` (defaults to `info`); error paths log at `error` with attached Error objects. 【F:packages/shared/src/logging.ts†L24-L69】
- API error handler logs failures before responding. 【F:apps/api/src/server.ts†L306-L320】
- Worker startup/shutdown paths log configuration, missing env vars, and uncaught errors; uses `error` for failures. 【F:apps/worker/src/index.ts†L8-L116】
- Core components create scoped child loggers (e.g., `scope: ApiServer.Http`), aiding filtering; correlation context exists for API requests but not automatically for background jobs.

### Monitoring and metrics
- API exposes Prometheus metrics (`/metrics`) with default process collectors and HTTP duration histogram. 【F:apps/api/src/metrics.ts†L1-L12】【F:apps/api/src/server.ts†L267-L280】
- Operations doc outlines PM2 monitoring commands, alert thresholds, and log locations/rotation, but assumes external systems (Prometheus/Grafana, PM2 Plus) without code-level alerting hooks. 【F:docs/current/operations/monitoring.md†L7-L200】

### Error tracking
- No APM/error tracking integrations (e.g., Sentry/Datadog) in the codebase; errors are logged locally only.

## Answers to questions
- **Are logs structured (JSON)?** Yes—Pino outputs JSON with consistent keys and ISO timestamps, and docs reinforce the JSON format. 【F:packages/shared/src/logging.ts†L24-L69】【F:docs/current/operations/monitoring.md†L140-L168】
- **Is there sufficient logging for debugging?** Core request/worker flows log lifecycle events and errors with contextual fields; however, background pipelines do not automatically stamp correlation IDs per message, which can limit cross-service tracing.
- **Are errors properly logged?** API and worker log errors with message + error object; health checks also log failures. 【F:apps/api/src/server.ts†L250-L320】【F:apps/worker/src/index.ts†L82-L116】
- **Is there monitoring/alerting?** Metrics endpoint and PM2 monitoring/rotation are documented; alerting is procedural (docs with thresholds) rather than implemented via code or alerting service.
- **Check error tracking:** No dedicated error-tracking/alerting integrations present.

## Recommendations
- Propagate correlation/request IDs into background jobs (queue payloads, orchestrator pipelines) so worker logs can be tied back to originating requests/tenants.
- Consider integrating centralized error tracking (e.g., Sentry) and wiring Prometheus alerts to the documented thresholds.
- Add structured logging around external dependencies in worker/orchestrator flows (e.g., RabbitMQ publishes/consumes) to improve failure diagnosis.
- Document or enforce `LOG_LEVEL` per environment (debug in staging, info in prod) to balance verbosity and signal.
