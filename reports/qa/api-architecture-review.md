# API Infrastructure & Architecture Review

## Ratings
| Category | Score (1-10) |
| --- | --- |
| Architecture | 6 |
| Security | 5 |
| Performance | 5 |
| Code Quality | 6 |

## Key Findings
- Body parsing limited to 5 MB and raw bodies kept for webhooks, but `helmet` and response compression are not enabled, reducing transport security and efficiency.
- CORS defaults to wildcard when `API_CORS_ORIGINS` is unset, allowing any origin to invoke credentialed endpoints—an authentication bypass risk.
- Rate limiting is a uniform 120 req/min per IP using in-memory storage, preventing coordination across PM2 instances and per-endpoint tuning.
- Two routers attach to `/api/webhooks`, complicating auth bypass logic and making handler execution order unclear.
- 404 handler and JSON error envelope exist, yet error codes collapse into `error/internal_error`, hindering client differentiation and risking stack trace leakage.
- API keys are hashed, but no JWT/session middleware or per-key scopes exist, and keys are accepted via query params which risks accidental logging.
- `usageTracking.ts` instantiates its own `PrismaClient`, creating extra pools per worker and risking connection exhaustion.
- Usage limit enforcement is non-atomic and inconsistent (duplicate rows, missed increments) because it uses `findFirst` + `create` and `updateMany` without ensuring row existence.
- Server continues accepting traffic even if Prisma fails to connect at startup, so clients only see failures later.
- Graceful shutdown does not wait for the HTTP server to finish in-flight requests before exiting.
- PM2 runs in single-instance fork mode (`instances: 1`) with a low 500 MB `max_memory_restart`, preventing multi-core scaling.
- Plaintext fallback secrets (JWT, DB credentials) are committed inside `ecosystem.config.js`, risking accidental use in production.
- Prometheus metrics endpoint exists but no alerting or monitoring guidance accompanies it; failures require manual detection.
- OpenAPI spec exists but API routes lack explicit versioning (no `/v1`).

## Critical Vulnerabilities
1. **Wildcard CORS with credentials** – When `API_CORS_ORIGINS` is unset, browsers from any origin can issue authenticated requests, enabling data exfiltration. Require a non-empty allowlist before booting or deny requests without explicit configuration.
2. **Committed fallback secrets** – JWT secrets, API key peppers, and DB passwords live in `ecosystem.config.js`; if env vars are missing, production could run with published secrets. Remove hard-coded secrets and source them from a secrets manager.
3. **Unbounded Prisma clients** – Extra `new PrismaClient()` instances inside middleware create redundant pools and can exhaust PostgreSQL connections under load. Share the singleton client exported from `prisma.ts`.

## Performance Bottlenecks
- Single PM2 process prevents multi-core utilization; reaching 1000 req/s needs cluster mode or external load balancing.
- Rate limiting uses the default in-memory store, so multiple instances cannot share quotas and bursts bypass throttling.
- Each API call makes repeated Prisma lookups (tenant context + usage tracking) without caching, increasing latency and DB load.
- Missing gzip/brotli compression means large responses travel uncompressed, increasing bandwidth and response times.

## Recommended Improvements
1. **Harden inbound traffic (6–8 h)** – Enforce `API_CORS_ORIGINS`, add `helmet`, enable compression, and separate Stripe webhooks onto `/api/webhooks/stripe` with explicit validation/bypass rules.
2. **Adopt shared rate limiting & usage tracking (10–12 h)** – Use Redis-backed limiters keyed per tenant/user and refactor usage tracking to reuse the singleton Prisma client with atomic `upsert` + `increment` calls.
3. **Improve error taxonomy & resilience (6–8 h)** – Define typed error codes, hide internal messages in production, refuse traffic when Prisma is unhealthy, and wait for HTTP server shutdown to complete.
4. **Secrets & process management (4–6 h)** – Remove plaintext secrets from `ecosystem.config.js`, switch PM2 to `cluster` with `instances` tied to CPU cores, and raise `max_memory_restart` after profiling.
5. **Monitoring & alerting (4–6 h)** – Connect `/metrics` to Prometheus/Alertmanager (or another APM) and document alert thresholds for latency, error rate, and dependency health.

## Missing Features
- Automated alerting/uptime checks (only `/metrics` exists).
- Distributed rate limiting or DDoS mitigation (no WAF/CAPTCHA integration).
- Tenant-scoped audit logging or anomaly detection.
- API versioning strategy (routes lack `/v1`).

## Answers to Key Questions
1. **Scalability** – Not ready for 1000 req/s due to single PM2 process, Socket.IO hot spots, and DB-heavy middleware. Horizontal scaling + caching required.
2. **Database pooling** – Prisma defaults to its standard pool, but extra clients inflate connection counts; remove redundant instantiations.
3. **Error handling completeness** – Generic handler exists but lacks typed codes; validation, auth, and business errors are indistinguishable.
4. **Security gaps** – Wildcard CORS, committed secrets, no scope-based API keys, and missing CAPTCHA on auth routes.
5. **Rate limiting suitability** – 120 req/min/IP is coarse; sensitive endpoints need stricter per-tenant/user quotas backed by Redis.
6. **Monitoring strategy** – Only `/metrics` is available; requires integration with Prometheus/Alertmanager or similar.
7. **Graceful degradation** – Server continues accepting traffic even if Prisma is down; need maintenance gating or degraded responses.
8. **Multi-tenancy enforcement** – Tenant context derived from API keys, but RBAC per route is minimal; ensure Prisma queries always filter by `req.tenant.id`.
9. **API versioning** – No `/v1` prefix; breaking changes must be carefully coordinated via OpenAPI updates.
10. **Documentation** – OpenAPI 3.0 spec exists in `docs/openapi.yaml`, aiding client integration but lacking versioned routes.

## Estimated Effort
- Security hardening (CORS, helmet, secrets cleanup): **8–10 h**
- Distributed rate limiting & usage tracking overhaul: **10–12 h**
- Error handling & shutdown improvements: **6–8 h**
- Monitoring/alerting rollout: **6 h**
- API versioning/route cleanup: **6 h**

Total: **36–42 hours** for an engineer experienced with Express and Prisma.
