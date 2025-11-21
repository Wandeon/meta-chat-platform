# Architecture vs Implementation Review

## Scope
- Source docs: `docs/current/architecture/system-design.md`
- Implementations reviewed: `apps/api/src/server.ts`, `apps/worker/src/index.ts`, `packages/orchestrator/src/index.ts`, `packages/events/src/index.ts`

## Findings

### 1) Documented architecture vs implementation
- The system design declares an event-driven RabbitMQ workflow where normalized inbound messages are published to a `message.process` queue and handled by a worker pipeline covering tenant resolution through response delivery and event emission.【F:docs/current/architecture/system-design.md†L9-L156】
- The published pipeline is not implemented in the exported `Orchestrator` class, whose `processMessage` remains a stub returning static data.【F:packages/orchestrator/src/index.ts†L12-L24】
- Message processing is instead handled by `MessageOrchestrator` instances that are created per-tenant/channel inside the worker entrypoint, running `MessagePipelineWithEscalation` directly rather than a documented top-level orchestrator API.【F:apps/worker/src/index.ts†L37-L110】

### 2) Documented components not implemented
- The architecture calls out a centralized orchestrator with multi-step processing, but the only `Orchestrator.processMessage` export is a stub, leaving the documented orchestrator behavior unimplemented.【F:docs/current/architecture/system-design.md†L154-L156】【F:packages/orchestrator/src/index.ts†L12-L24】
- The docs describe RabbitMQ-backed event emission as part of the pipeline, but the `events` package exports broker abstractions without any API/server bootstrap wiring to initialize or use them, leaving the event bus effectively unhooked.【F:docs/current/architecture/system-design.md†L137-L143】【F:packages/events/src/index.ts†L1-L7】

### 3) Implemented features missing from documentation
- Actual runtime orchestration spins up per-tenant, per-channel consumers in the worker using `MessageOrchestrator` and `MessagePipelineWithEscalation`; this queue-driven orchestrator fleet is not reflected in the system design doc’s depiction of the API server handing off to a singular orchestrator component.【F:apps/worker/src/index.ts†L37-L110】

### 4) Monorepo structure sanity check
- The repository follows a service-ish split with `apps/` (API, worker) and shared `packages/`, matching the documented service-oriented intent, but the shared packages and tight coupling keep it closer to a single deployable system rather than independently deployable microservices.【F:docs/current/architecture/system-design.md†L20-L106】【F:apps/worker/src/index.ts†L37-L110】

### 5) Circular dependencies between packages
- No circular dependencies were identified during this review (manual inspection of referenced packages only; no automated cycle check was run).

### 6) RabbitMQ integration reality
- API server creates a `TenantQueuePublisher` to publish inbound work and webhook acknowledgements to queues, aligning partially with the documented RabbitMQ ingestion step.【F:apps/api/src/server.ts†L496-L532】
- Worker processes connect to RabbitMQ via `MessageOrchestrator` instances that consume queues and feed the message pipeline, showing actual consumption use.【F:apps/worker/src/index.ts†L37-L110】
- The separate RabbitMQ-based event bus exported from `@meta-chat/events` is never initialized by API or worker startup code, so the documented “event system” remains dormant.【F:docs/current/architecture/system-design.md†L137-L143】【F:packages/events/src/index.ts†L1-L7】

### 7) Microservices vs monolith
- Although the doc brands the platform as service-oriented, the API and worker live in the same repo and share core packages without clear independent deployment boundaries, resembling a modular monolith more than true microservices.【F:docs/current/architecture/system-design.md†L20-L106】【F:apps/worker/src/index.ts†L37-L110】

## Critical questions answered
- **Does the orchestrator package actually orchestrate anything?** The exported `Orchestrator` class is stub-only; real orchestration is done by worker-managed `MessageOrchestrator` consumers, not by the documented orchestrator API.【F:packages/orchestrator/src/index.ts†L12-L24】【F:apps/worker/src/index.ts†L37-L110】
- **Is RabbitMQ properly integrated or just stubbed out?** Queue publishing/consuming for message processing is live via `TenantQueuePublisher` and `MessageOrchestrator`, but the RabbitMQ-backed event bus is not wired into service startup, so event publishing is effectively stubbed.【F:apps/api/src/server.ts†L496-L532】【F:apps/worker/src/index.ts†L37-L110】【F:packages/events/src/index.ts†L1-L7】
- **Are the worker processes actually processing jobs?** Yes. Workers start per-tenant/channel orchestrators that consume queues and run the message pipeline with escalation handling.【F:apps/worker/src/index.ts†L37-L110】
- **Is the event bus functional or dead code?** Dead in practice: the event bus/broker exports exist but are not initialized by API or worker entrypoints.【F:packages/events/src/index.ts†L1-L7】
