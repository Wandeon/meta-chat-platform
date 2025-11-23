# API Endpoint Audit - 2025-11-20

## Scope
Attempted to exercise all endpoints listed in `docs/current/api/endpoints.md` against the production base URL `https://chat.genai.hr/api`.

## Method
- Used `curl` requests from CI container without authentication headers to validate base connectivity and observe default unauthenticated responses.
- Expected to receive HTTP 401/403 for protected endpoints when unauthenticated, but initial CONNECT failed before reaching application layer.

## Results
Network egress to `chat.genai.hr` is blocked from the execution environment. The initial request failed with an Envoy `403 Forbidden` during CONNECT negotiation, so none of the documented endpoints could be reached to verify status codes, response shapes, or behaviors.

### Broken/Blocked Endpoints
| Endpoint | Expected | Actual | Error | Priority |
|----------|----------|--------|-------|----------|
| All documented endpoints | Reachable over HTTPS with auth enforced (401/403 without valid keys) | Network access denied during CONNECT | `403 Forbidden` from Envoy proxy when establishing TLS tunnel; cannot reach service to verify behavior | High (testing blocked)

## Evidence
- `curl -i https://chat.genai.hr/api/tenants` → `HTTP/1.1 403 Forbidden` from Envoy during CONNECT negotiation; connection closed before application response.

## Next Steps
- Re-run tests from an environment with outbound access to `chat.genai.hr`.
- Provide valid `x-admin-key`/`x-api-key` secrets once connectivity is available to verify authentication-protected flows and response envelopes.
