# Event Flow Review Summary

## Scope
Review of event emission, consumption, webhook delivery, persistence, and potential loss across:
- `packages/events/src/event-bus.ts`
- `packages/events/src/webhook-emitter.ts`
- `apps/api/src/` (event emission)
- `apps/worker/src/` (event consumption)

## Findings
1. **Event bus unused in services**
   - `EventBus` persists events to Prisma, publishes through RabbitMQ, and updates an in-memory cache. However, no initialization or calls to `EventBus` (or `EventManager`) occur in API or worker code, leaving this pipeline idle.
2. **RabbitMQ event publishing dormant**
   - The RabbitMQ broker publishes only when a channel is available and otherwise logs a warning. Because API/worker never invoke `EventBus`, no event messages reach the `metachat.events` exchange.
3. **Webhook emission absent**
   - Webhooks are emitted via `WebhookEmitter` when `EventManager.emit` runs. Since the services do not call `EventManager`/`WebhookEmitter`, no webhooks are sent from API or worker.
4. **API bypasses event bus**
   - The API publishes directly to an orchestrator exchange via `TenantQueuePublisher`, bypassing the event pipeline entirely.
5. **Worker has no event consumption**
   - Worker sources contain no event-bus or RabbitMQ consumer logic for these events; queue usage is limited to unrelated analytics SQL, so no events are consumed.
6. **Event loss/ordering considerations**
   - Because the services do not emit through `EventBus`, there are no events to be lost or ordered. If used, `RabbitMQBroker.publish` would skip publication when channels are unavailable after logging a warning, but that path is unused here.

## Answers to requested questions
- **Are events actually flowing through RabbitMQ?** No—`EventBus` is unused by API/worker, so nothing publishes to RabbitMQ for these events.
- **Are webhooks being sent?** No—`WebhookEmitter` is not invoked by the API or worker.
- **Are there lost events?** None observed; the pipeline is idle. Potential drops could occur if RabbitMQ channels were unavailable, but this path is inactive.
- **Is event ordering preserved?** Not applicable; there is no consumer. If enabled, ordering would depend on RabbitMQ queue semantics and consumer implementation.
