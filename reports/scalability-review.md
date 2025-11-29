# Scalability Review

## Findings
- **Database client sharing:** The API uses a singleton Prisma client via `getPrismaClient`, reusing the underlying connection pool across the process and connecting once on startup. Shutdown hooks disconnect cleanly. 【F:packages/database/src/client.ts†L24-L43】【F:apps/api/src/server.ts†L483-L535】
- **Rate limiting state:** The rate limiter uses the default in-memory store, so quotas are enforced per process rather than globally. This can produce uneven throttling when multiple API instances run. 【F:apps/api/src/server.ts†L131-L143】
- **WebSocket scaling:** Socket.IO is configured to use a Redis adapter only when `REDIS_URL` is set. Without it, multiple API instances would not share subscription state or deliver cross-instance events. 【F:apps/api/src/server.ts†L324-L341】
- **Stateless HTTP layer:** No per-request state is stored server-side; request and correlation IDs are derived per request and echoed back, and authentication relies on tokens/HMACs rather than server sessions. 【F:apps/api/src/server.ts†L90-L143】【F:apps/api/src/server.ts†L343-L380】
- **In-memory caches:** Health checks are cached in-process (`cachedHealthCheck`, `inFlightHealthCheck`). This improves local performance but does not share across instances; it does not block horizontal scaling but yields per-instance cache warm-up. 【F:apps/api/src/server.ts†L40-L74】

## Answers to Questions
- **Can you run multiple API instances?** Yes, the API is largely stateless and can be replicated; ensure a Redis adapter is configured for Socket.IO (`REDIS_URL`) and consider a shared rate-limit store for consistent throttling. 【F:apps/api/src/server.ts†L324-L341】【F:apps/api/src/server.ts†L131-L143】
- **Is session state shared properly?** HTTP requests avoid server-side sessions, so nothing needs sharing. Socket authentication is token/HMAC-based and per-connection; cross-instance message delivery depends on enabling the Redis adapter. 【F:apps/api/src/server.ts†L343-L380】【F:apps/api/src/server.ts†L324-L341】
- **Are there singleton patterns blocking scaling?** Prisma is a singleton per process to reuse the connection pool, which is standard and not a cross-process bottleneck. Ensure environments provision adequate DB pool size for the number of instances. 【F:packages/database/src/client.ts†L24-L43】
- **Are database connections properly managed?** Prisma connects once at startup and disconnects on shutdown/beforeExit, leveraging Prisma's built-in pooling. No per-request client creation is observed. 【F:packages/database/src/client.ts†L24-L43】【F:apps/api/src/server.ts†L483-L535】

## Recommendations
- Enable the Socket.IO Redis adapter (`REDIS_URL`) in multi-instance deployments to distribute websocket traffic. 【F:apps/api/src/server.ts†L324-L341】
- Configure a distributed rate-limit store (e.g., Redis) if consistent throttling across instances is required. 【F:apps/api/src/server.ts†L131-L143】
- Monitor database pool size relative to instance count; adjust Prisma pool settings via environment variables if saturation appears. 【F:packages/database/src/client.ts†L24-L43】
