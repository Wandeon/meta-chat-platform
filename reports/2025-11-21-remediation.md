# Remediation Log - 2025-11-21

## Changes
- Enforced tenant scoping for conversations and documents: routes now require a resolved tenant from auth/query/body and reject mismatches; switched to tenant-aware auth middleware.
- Secured billing API: added tenant authentication + rate limiting, reused shared Prisma client instead of constructing new instances per request.
- Fixed vector search import to use shared database exports, eliminating module resolution failures in tests.
- Added tenant resolution helper + unit tests to guard against cross-tenant access regressions.

## Validation
- `npm run test:unit`
  - 17 passed, 2 skipped (vectorSearch security suite no longer errors).

## Notes
- Cross-tenant integration tests remain skipped (require live DB); helper and route guards now block mismatched tenant IDs from request vs credentials.
