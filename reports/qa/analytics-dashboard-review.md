# Analytics Dashboard Review

## Metadata
- **Repository:** meta-chat-platform
- **Commit:** 3e7fa8e
- **Areas Covered:** backend analytics collection/service/API, frontend analytics dashboard, database schema
- **Reviewer:** ChatGPT (gpt-5-codex)
- **Date:** 2025-11-19

## Summary
The analytics pipeline is conceptually well structured (clear service layer, dashboard components, and supporting tables) but critical mismatches between what the UI expects and what the backend returns render many widgets inaccurate or empty. Several SQL bugs keep core endpoints from running at all, and analytics writes currently block the real-time chat flow. Privacy/retention policies are undefined even though full user messages are stored indefinitely. Overall, the feature is not production ready without substantive fixes.

## Detailed Findings

### 1. Data Collection Logic (`apps/api/src/routes/chat.ts`)
- **Non-blocking requirement violated:** The route `await`s `analyticsService.trackMessageMetric`, so every user message waits on a database insert before returning.
- **Synthetic message IDs:** Tracking fabricates IDs via `${conversation.id}-${Date.now()}` which breaks deduplication/correlation with persisted messages.
- **Privacy concerns:** Full `userMessage` contents are stored with no redaction or TTL, conflicting with GDPR/PII expectations.

### 2. AnalyticsService (`apps/api/src/services/AnalyticsService.ts`)
- **Missing/incorrect metrics:** `getCurrentMetrics` never computes `resolutionRate`, `avgResponseTime`, or honors the requested date range; KPI cards therefore display stale/undefined values.
- **Broken SQL identifiers:** Several queries mix quoted camelCase columns with snake_case `GROUP BY` clauses (e.g., `"createdAt"` vs `created_at`), causing runtime errors that leave charts empty.
- **RAG performance mismatches:** Hit rate is returned as a raw fraction (0-1) and only exposes document IDs; the frontend expects percentages and friendly titles.
- **Response-time units:** API returns formatted strings ("1.2s") while the gauge expects numeric seconds, producing NaN comparisons.
- **Percentile performance:** Percentiles are computed directly on the transactional table with no caching or summarization, risking 500ms+ responses on larger datasets.

### 3. Analytics API Routes (`apps/api/src/routes/analytics.ts`)
- **Validation gaps:** Although `zod` is imported, no schema validation is enforced for date ranges, pagination, or format parameters.
- **Inconsistent DTOs:** Responses lack documented structure; overview omits `resolutionRate`, RAG endpoint omits actionable document insights, and pagination/sorting hints from the spec are absent.
- **No caching or throttling:** Each request recomputes totals and percentiles from scratch, which will not scale past a few thousand daily messages.

### 4. Database Schema
- Tables (`analytics_daily`, `message_metrics`, `widget_analytics`) provide the right columns but there is no job populating `analytics_daily` nor any retention/partition strategy. Indefinite storage of `userMessage` increases GDPR exposure and disk growth risk.

### 5. Frontend Dashboard (`apps/dashboard/src/pages/AnalyticsPage.tsx` & components)
- **Static placeholders:** KPI trends, resolution rate, error rate, and several cards use hard-coded placeholder values, undermining trust.
- **State handling gaps:** No skeleton loaders or error states; charts silently fail when APIs error. Date range picker lacks validation/persistence per requirements.
- **Actionability issues:** "Improve" buttons merely log to console; RAG card lacks guidance (e.g., "add more pricing docs").
- **Export button:** Generates CSV purely from currently loaded client data, so it cannot handle large ranges or align with backend export requirements.

### 6. Performance & Scalability
- **Blocking tracking writes** in chat route introduce user-facing latency.
- **Expensive read queries** without caching or aggregation (despite `analytics_daily` existing) will degrade quickly with >10k msgs/day/tenant.
- **Percentile calculations** over millions of rows are unbounded; consider pre-aggregation or OLAP/MatView strategy.

### 7. UX / Design
- Layout and theming are consistent, but missing loaders, empty states, and actionable insights reduce usability. Auto-refresh logic and SLA thresholds rely on nonexistent data, making the "real-time health" section misleading.

## Recommendations
1. **Decouple tracking from chat responses:** Fire-and-forget to a queue or background worker; ensure retries and deduplication via real message IDs.
2. **Fix SQL identifiers and date filtering:** Standardize snake_case columns, add proper `WHERE tenant_id = ? AND created_at BETWEEN ...` clauses, and compute all KPI fields (including `resolutionRate`).
3. **Align API/Frontend contracts:** Define DTOs, return numeric values (seconds, percentages), provide document titles, and extend pagination/sorting as per spec.
4. **Implement aggregation + caching:** Populate `analytics_daily` via cron/batch job, cache overview responses for short intervals, and pre-compute percentiles.
5. **Add privacy controls:** Redact or hash `userMessage`, implement retention policies, and expose delete tooling for GDPR compliance.
6. **Improve UI states:** Add skeletons, error toasts, actionable guidance, real export integration, and date-range validation/persistence.

## Severity & Effort
- **Overall severity:** High – analytics data is unreliable and impacts user trust.
- **Estimated remediation effort:** ~30–40 engineer hours across backend, frontend, and infra.

## Attachments / Follow-ups
- No screenshots provided (backend-heavy review).
- Consider follow-up tasks for queue-based tracking, cron aggregation, and UI polish.
