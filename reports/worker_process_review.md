# Worker Process Review

## Scope
- Entrypoint: `apps/worker/src/index.ts`
- Job handlers: `apps/worker/src/jobs/`
- Queue implementation: `packages/events/src/`

## Findings
- The worker entrypoint connects to Prisma and instantiates `MessageOrchestrator` instances per enabled tenant/channel. It processes inbound messages via `MessagePipelineWithEscalation` but does not schedule periodic jobs.
- The only job handler under `apps/worker/src/jobs` is `aggregateAnalytics`, which is intended for manual/external invocation rather than automatic scheduling within the worker process.
- RabbitMQ topology defines durable orchestrator queues with dead-letter exchanges/routing keys. The RabbitMQ broker manages reconnects and publishing durability; there is no consumer-side retry/backoff logic visible here.
- Event emission through `EventBus` persists events, publishes to RabbitMQ, and optionally caches locally. No explicit backlog monitoring or deadlock-prone constructs are present in the reviewed scope.

## Question Responses
- **Is the worker actually running jobs?** It runs message orchestrators that consume channel queues, but no scheduled jobs are started automatically; `aggregateAnalytics` exists for manual runs.
- **Are there failed jobs piling up?** The reviewed code lacks metrics/backlog visibility. Only dead-letter queues are configured at the AMQP layer.
- **Is retry logic working?** `MessageOrchestrator` receives a `maxRetries` option, but retry implementation is outside the reviewed code. RabbitMQ publishing uses persistent messages without republish retries here.
- **Are there deadlocks?** None identified; flow is async/event-driven with no obvious deadlock patterns.
- **Verify dead letter queue handling.** Per-queue dead-letter exchanges and routing keys route failed messages to `.dead-letter` queues.
