# Resource & Memory Leak Audit

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Summary
- Reviewed setTimeout/setInterval usage, database connections, WebSocket handling, and DOM event listeners for potential leaks or resource retention.
- Identified repeated PrismaClient instantiation without reuse or teardown in the vector search service.
- Found UI timeouts that are not cleaned up on unmount, risking setState warnings/memory churn if pages unmount quickly.

## Findings

### Database Connections
- **apps/api/src/services/vectorSearch.ts**
  - Creates a **new PrismaClient instance per request** in `searchSimilarChunks` and `indexDocument` without reusing the shared client or calling `$disconnect()`. This can leak connections under load and exhaust the pool.
  - Suggested fix: inject the shared client (e.g., `getPrismaClient()`) or manage a single module-level instance and close it during shutdown hooks.

### Timer Cleanup
- **apps/dashboard/src/pages/TenantsPage.tsx**
  - `setTimeout` is used to hide a generated API key after 30s, but the timer isn't cleared on component unmount. If the page unmounts before the timeout fires, React can warn about state updates on unmounted components.
  - Suggested fix: store the timeout ID in a ref and clear it in a `useEffect` cleanup.

## Items Checked with No Issues Found
- WebSocket lifecycle management in `apps/web-widget/src/hooks/useWidgetState.ts` properly clears reconnection timers and closes sockets on unmount.
- DOM event listeners in `apps/dashboard/src/components/analytics/ExportButton.tsx` and `DateRangePicker.tsx` are removed in `useEffect` cleanups.
- API route timeout handling in `apps/api/src/routes/ollama.ts` clears the abort timer after fetch completion.
