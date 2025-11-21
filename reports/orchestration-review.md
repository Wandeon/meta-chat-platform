# Message Orchestration Pipeline Review

## Message flow
- Worker boots, loads enabled tenants, registers channel adapters, and starts a `MessageOrchestrator` per enabled channel, each configured with a handler that instantiates `MessagePipelineWithEscalation` for processing queue messages. The orchestrators start and are tracked for shutdown. [apps/worker/src/index.ts]
- `MessagePipeline` ensures a conversation record, records the inbound message, optionally triggers human handoff, retrieves recent history, executes RAG retrieval when enabled, runs LLM completion (with optional tool calls), sends the outbound message via the channel adapter, records the outbound message with metadata, and emits a `MESSAGE_SENT` event. [packages/orchestrator/src/message-pipeline.ts]

## RAG retrieval integration
- RAG retrieval is gated by `config.settings.enableRag` and only runs when the inbound message carries text. Retrieved results feed into prompt construction. [packages/orchestrator/src/message-pipeline.ts]
- The system prompt embeds numbered RAG context snippets (source + truncated content) alongside brand, tone, locale, and optional tenant system prompt. [packages/orchestrator/src/message-pipeline.ts]

## LLM prompt construction and function calling
- Prompt messages start with the system prompt followed by chronological conversation history mapped to assistant/user roles. [packages/orchestrator/src/message-pipeline.ts]
- Function calling is supported when enabled; streamed tool-call deltas are merged, arguments parsed, handlers invoked with tenant/conversation context, and tool results appended to the message list for iterative completions (bounded by `maxToolIterations`). [packages/orchestrator/src/message-pipeline.ts]

## Response generation
- `provider.streamComplete` is consumed to accumulate content, usage, and tool calls. Outbound sending occurs once after completion—internal streaming only. [packages/orchestrator/src/message-pipeline.ts]
- Send results and LLM usage are stored with the outbound message for auditing. [packages/orchestrator/src/message-pipeline.ts]

## Context and history management
- Conversation creation/upsert ties to tenant/channel and message sender, updates status, and persists inbound/outbound messages. History retrieval bounds prompt size with a configurable limit. [packages/orchestrator/src/message-pipeline.ts]
- Human handoff triggers update conversation status and emit events when keywords match and the feature is enabled. [packages/orchestrator/src/message-pipeline.ts]

## Answers to critical questions
- **Does the orchestrator actually orchestrate?** The worker-level orchestrator consumes queue messages and routes them through `MessagePipelineWithEscalation`; however, the exported `Orchestrator` in `packages/orchestrator/src/index.ts` remains a stub and is not used in the worker path. [apps/worker/src/index.ts, packages/orchestrator/src/index.ts]
- **Is RAG context included in prompts?** Yes. When enabled and text is present, retrieved chunks are injected into the system prompt as numbered context entries. [packages/orchestrator/src/message-pipeline.ts]
- **Is conversation history maintained?** Yes. Recent messages are fetched and mapped into the prompt to preserve conversational context. [packages/orchestrator/src/message-pipeline.ts]
- **Are responses streamed or batched?** Completions stream internally to accumulate content/tool calls, but outbound messages are sent once after full assembly (no downstream streaming). [packages/orchestrator/src/message-pipeline.ts]
