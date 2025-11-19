# Billing & Stripe Integration Review

- **Repository**: meta-chat-platform
- **Commit**: 3e7fa8e
- **Scope**: Backend billing routes, Stripe service + webhooks, usage tracking middleware, billing plans config, dashboard billing UI, and billing-related Prisma migration.

## Security Rating
**6 / 10**

* Strengths: All billing entry points require authenticated tenants, plan IDs are validated server-side before Checkout, and Stripe webhooks are signed using Stripe's SDK.
* Gaps: The webhook route does not register `express.raw({ type: 'application/json' })`, so upstream JSON parsing breaks signature validation. There is no idempotency store for webhook events, so replays can repeatedly toggle tenant status. The Stripe SDK is pinned to the unreleased `2025-11-17.clover` API version, risking more breaking changes (one already forced a TypeScript fix). Subscription cancellation still references the removed `subscription.current_period_end` field and can crash once Stripe removes it.

## Code Quality Summary
* The backend separates routes, service, and config layers, but the "lazy" StripeService re-instantiates the client per request instead of memoizing it.
* Errors are logged but no retries or compensating logic exist, so transient Stripe outages surface as 500s without recovery.
* Usage tracking middleware reads limits and updates usage with separate queries, creating race conditions around plan enforcement.

## Stripe Integration Findings
1. **API Version Risk** – Pinning to `2025-11-17.clover` exposes the app to untested changes (e.g., the `current_period_end` move). Consider using the latest GA version until the migration is fully audited.
2. **Webhook Body Parsing** – Without opting into a raw body parser on `/api/webhooks/stripe`, Stripe signatures can be bypassed because Express JSON parsing mutates the payload before verification.
3. **Idempotency / Replay Handling** – Webhook handlers do not persist processed event IDs, so replayed events can downgrade tenants or resync invoices indefinitely.
4. **Subscription Metadata** – Lifecycle handlers rely on `subscription.metadata.tenantId`, but `createCheckoutSession` never sets `subscription_data.metadata`, so metadata propagation is best-effort and may fail.
5. **Cancellation Bug** – `cancelSubscription` still reads the deprecated `subscription.current_period_end` field instead of `items.data[0].current_period_end`.

## Usage Tracking & Limits
* Monthly usage rows rely on `(tenant_id, period_start)` uniqueness, but the "first request of the month" path can race and violate the constraint because there is no retry logic.
* Plan limits return HTTP 402 when exceeded, but there is no overage or grace-period billing.
* `teamMembersCount` is never incremented, so that limit can never be enforced.

## Database Review
* The migration adds invoice + usage tables with useful indexes on tenant + Stripe identifiers.
* Invoices are kept indefinitely; document the retention policy to plan for storage growth.
* Usage tracking lacks historic snapshots (e.g., plan at time of usage), limiting audit capabilities.

## UI/UX Notes (BillingPage)
* The page shows plan comparisons, usage bars, and invoice history clearly.
* A single `loading` flag disables both Checkout and Customer Portal buttons; if one action errors, both stay disabled until reload. Add per-action state and inline error banners instead of `alert()`.

## Critical Bugs & Risks
1. **Webhook signature unsafe** without a raw body parser (effort: ~1h).
2. **Subscription cancellation uses a removed field**, breaking with the new API version (effort: ~0.5h).
3. **Webhook idempotency missing**, so replayed events can repeatedly toggle tenant plans (effort: ~2h).
4. **Usage limit race condition** because checks and increments are separate queries (effort: ~3h).

## Recommendations & Effort
| Area | Recommendation | Effort |
| --- | --- | --- |
| Webhook Hardening | Register `express.raw` for `/api/webhooks/stripe`, persist event IDs, and improve logging/alerting | 3–4 h |
| Stripe API Compatibility | Pin to a stable GA version or audit all API changes for `2025-11-17.clover` | 3 h |
| Subscription Cancellation | Use `subscription.items.data[0].current_period_end` when persisting `subscriptionEndDate` | 0.5 h |
| Usage Tracking | Wrap limit checks + increments in a transaction or atomic SQL statement | 3–4 h |
| Retry / Resilience | Add retry logic for Stripe API calls and webhook DLQ/replay | 4 h |
| UI Feedback | Separate loading states per button and show inline error banners | 1–2 h |
| Metadata Propagation | Set `subscription_data.metadata.tenantId` on Checkout sessions | 1 h |

## Answers to Key Questions
1. **Webhook signature verification?** Implemented but ineffective until the raw body parser is configured.
2. **Stripe API errors handled?** Logged and rethrown; no retries or alerting.
3. **Lazy initialization pattern?** Not actually lazy—new `Stripe` client per request.
4. **Usage-tracking race conditions?** Yes, due to separate read/write queries.
5. **DB write failure after payment?** No recovery; relies on Stripe retries, but webhook processing lacks durable retries.
6. **`current_period_end` fix coverage?** Most handlers updated, but cancellation still uses the deprecated field.
7. **Retry logic for webhooks?** Not implemented; failures return 500 and rely on Stripe's automatic retries.
8. **Partial months on upgrade?** Stripe handles prorations via `proration_behavior: 'create_prorations'`; downgrades rely on defaults.

## Production Readiness Checklist Highlights
- Ensure production Stripe keys, price IDs, and webhook signing secrets are configured.
- Register the webhook endpoint in Stripe with the correct raw body parser.
- Verify product + price mappings for Free/Starter/Pro before launch.
- Plan for plan migrations (upgrade/downgrade) with data retention and prorations.

## Testing References
Follow the instructions in the review request to test checkout sessions, webhooks (`stripe trigger`), usage limit enforcement (expect HTTP 402 on the 101st free-plan conversation), and the dashboard billing UI with Stripe test cards.
