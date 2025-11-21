# Incomplete Features and Follow-Ups

## Stripe Webhook Handling
- Payment failure handling stops at marking tenants as `past_due` and lacks user-facing notices or enforcement. Add notifications and consider suspending access after grace periods when invoices fail. (See `apps/api/src/routes/webhooks/stripe.ts`.)
- Subscription cancellations currently only downgrade the plan; tenants are not notified and no cleanup/archival is performed. Add cancellation notifications and evaluate resource cleanup. (See `apps/api/src/routes/webhooks/stripe.ts`.)

## Cross-Tenant Security Tests
- Cross-tenant security coverage is missing authentication: the admin token setup is commented out. Add real admin token provisioning to verify auth boundaries end-to-end. (See `apps/api/src/routes/__tests__/cross-tenant-security.test.ts`.)

## Worker Channel Secrets
- Worker channel adapters fetch secret records but never decrypt or pass them through, using an empty placeholder instead. Implement proper secret decryption/loading before sending messages. (See `apps/worker/src/channel-adapters.ts`.)
