# LLM Provider Review

## Scope
Review of OpenAI, Anthropic, and Ollama provider implementations in `packages/llm`, exported index wiring, and API-layer usage in `apps/api`.

## Findings

### Provider coverage and capabilities
- All three providers (OpenAI, Anthropic, Ollama) are implemented and exported via the LLM package index and factory. The factory switches on `provider` to build the corresponding provider instance and throws for unsupported values. 【F:packages/llm/src/index.ts†L2-L12】【F:packages/llm/src/factory.ts†L7-L27】
- OpenAI supports streaming, embeddings, and function calling; Anthropic supports streaming and function calling but explicitly omits embeddings; Ollama supports streaming and embeddings but not function calling. Each advertises these in `getInfo()`. 【F:packages/llm/src/providers/openai.ts†L107-L118】【F:packages/llm/src/providers/anthropic.ts†L95-L107】【F:packages/llm/src/providers/ollama.ts†L137-L146】

### API key and configuration handling
- SDK clients are constructed with API keys/base URLs passed in the `ProviderConfig`, but constructors do not validate presence of required keys; missing keys will surface later from vendor SDKs. 【F:packages/llm/src/providers/openai.ts†L18-L27】【F:packages/llm/src/providers/anthropic.ts†L17-L25】
- The API-layer helpers guard configuration more explicitly: OpenAI and DeepSeek reject calls when no API key is provided, and Ollama requires a base URL, throwing early if absent. 【F:apps/api/src/services/llmProviders.ts†L48-L99】【F:apps/api/src/services/llmProviders.ts†L211-L307】

### Error handling and resiliency
- Each provider wraps calls in `try/catch` and rethrows mapped errors; streaming paths similarly translate vendor failures. 【F:packages/llm/src/providers/openai.ts†L29-L104】【F:packages/llm/src/providers/anthropic.ts†L27-L93】【F:packages/llm/src/providers/ollama.ts†L22-L119】
- Providers inherit retry-with-backoff and circuit-breaker protection from `BaseLLMProvider.executeWithPolicies`, but there is no cross-provider fallback; unsupported providers trigger an exception instead of failing over. 【F:packages/llm/src/providers/base.ts†L78-L82】【F:packages/llm/src/factory.ts†L7-L27】

### Rate limiting and cost tracking
- No dynamic rate limiting is enforced beyond static `limits` metadata returned by `getInfo()` for each provider. 【F:packages/llm/src/providers/openai.ts†L107-L118】【F:packages/llm/src/providers/anthropic.ts†L95-L105】【F:packages/llm/src/providers/ollama.ts†L137-L145】
- Usage/cost tracking exists in `BaseLLMProvider.trackUsage`, which computes token totals and optional USD costs when pricing is provided, recording metrics via an injected `CostTracker`. 【F:packages/llm/src/providers/base.ts†L83-L112】
- The API-layer `callLlm` helpers return token counts and latency for responses but do not apply rate limiting or cost controls. 【F:apps/api/src/services/llmProviders.ts†L48-L205】【F:apps/api/src/services/llmProviders.ts†L211-L307】

### Outstanding gaps
- No inter-provider fallback logic exists; callers must choose providers explicitly. 【F:packages/llm/src/factory.ts†L7-L27】
- Providers assume credentials are present; validation occurs only in the API helper layer for specific providers. 【F:packages/llm/src/providers/openai.ts†L18-L27】【F:packages/llm/src/providers/anthropic.ts†L17-L25】【F:apps/api/src/services/llmProviders.ts†L48-L307】
- Rate limiting is not enforced in code; only descriptive limits are reported via `getInfo()`. 【F:packages/llm/src/providers/openai.ts†L107-L118】【F:packages/llm/src/providers/anthropic.ts†L95-L105】【F:packages/llm/src/providers/ollama.ts†L137-L145】

## Answers to review questions
- **Are all providers implemented?** Yes—OpenAI, Anthropic, and Ollama providers are implemented and wired through the factory/index. 【F:packages/llm/src/index.ts†L2-L12】【F:packages/llm/src/factory.ts†L7-L27】
- **Proper fallback handling?** No fallback between providers; unsupported providers throw immediately. 【F:packages/llm/src/factory.ts†L7-L27】
- **API errors handled gracefully?** Vendor calls are wrapped with error translation and guarded by retry/circuit-breaker policies, with API helpers surfacing HTTP errors. 【F:packages/llm/src/providers/base.ts†L78-L112】【F:packages/llm/src/providers/openai.ts†L29-L104】【F:packages/llm/src/providers/anthropic.ts†L27-L93】【F:packages/llm/src/providers/ollama.ts†L22-L119】【F:apps/api/src/services/llmProviders.ts†L48-L205】【F:apps/api/src/services/llmProviders.ts†L211-L307】
- **Cost tracking/limiting?** Cost tracking hooks exist via `BaseLLMProvider.trackUsage` when pricing and a `CostTracker` are supplied, but there is no built-in rate limiting; API helpers only return token counts. 【F:packages/llm/src/providers/base.ts†L83-L112】【F:packages/llm/src/providers/openai.ts†L107-L118】【F:packages/llm/src/providers/anthropic.ts†L95-L105】【F:packages/llm/src/providers/ollama.ts†L137-L145】【F:apps/api/src/services/llmProviders.ts†L48-L205】【F:apps/api/src/services/llmProviders.ts†L211-L307】

