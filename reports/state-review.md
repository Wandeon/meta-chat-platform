# Frontend State Management Review

## Dashboard (apps/dashboard)
- **State solution**: Uses React Query for async server state and a custom `AuthProvider` context for the admin API key. The app is wrapped in a single `QueryClientProvider` in `main.tsx`. Authentication state is persisted to `localStorage` and exposed via context helpers.
- **Backend sync**: Queries rely on `queryKey`-scoped fetchers and server writes use mutations that invalidate queries. Tenants, webhooks, billing, and other resources are refreshed via `queryClient.invalidateQueries` rather than optimistic writes.
- **Optimistic behavior**: Mutations are mostly fire-and-forget with refetches (no optimistic updates or rollback handlers), so user-visible state can remain stale until the server responds and the refetch completes.
- **Error handling**: Most queries surface loading/error UI, but mutations rarely surface failures (e.g., tenant create/delete/toggle just mutate and invalidate). Failed writes do not notify users, which can leave UI showing old data without explaining the problem.
- **Race / consistency risks**: Heavy reliance on `invalidateQueries` without canceling in-flight requests could allow stale refetches to overwrite newer responses if network latency spikes; no guards to prevent rapid toggles from enqueueing multiple mutations.

## Web Widget (apps/web-widget)
- **State solution**: Custom reducer-based hook (`useWidgetState`) manages widget config, message list, connection status, typing indicator, and pending messages, driven by a WebSocket connection.
- **Backend sync**: Incoming WebSocket messages update state and reconcile pending client messages when `clientMessageId` is present. Initial config dispatch occurs on mount/config change.
- **Optimistic behavior**: Outbound messages are optimistically appended with `pending: true` and replaced when a matching server message arrives.
- **Issues / red flags**:
  - Pending messages are never resent after a disconnect; if the WebSocket drops before the server processes a message, the optimistic entry stays pending with no retry, and pending IDs are cleared only after retries are exhausted, leaving the UI stuck.
  - When the connection is not open, `sendMessage` throws and the Composer merely logs the error, so end users get no feedback about failed sends.
  - Connection retry logic clears pending IDs after max retries but does not resolve corresponding message objects, which can leave indefinite `pending` bubbles with no error state.
- **Error handling**: Errors are logged to the console (message parse errors, send failures) and connection errors update state, but there is no user-visible error or recovery UI for failed sends or exhausted retries.
