# Multi-LLM Provider Support

**Flexible AI Backend Configuration** | Last Updated: 2025-10-08

---

## Overview

Meta Chat Platform supports multiple LLM providers, allowing you to choose the best model for your needs:

- **OpenAI** (GPT-4o, GPT-4o-mini) - Best for production, excellent function calling
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku) - Best for complex reasoning, large context
- **Local Models** (Ollama: Llama 3, Mistral, etc.) - Best for privacy, no API costs
- **Per-Tenant Configuration** - Each tenant can use different providers

---

## Provider Comparison

| Feature | OpenAI | Anthropic | Ollama (Local) |
|---------|--------|-----------|----------------|
| **Function Calling** | ✅ Excellent | ✅ Good (Tool Use) | ⚠️ Limited |
| **Context Window** | 128K tokens | 200K tokens | 2K-128K (model dependent) |
| **Response Speed** | Fast (~1-2s) | Fast (~1-2s) | Slower (~5-10s) |
| **Cost** | $2.50-$10/1M tokens | $3-$15/1M tokens | Free (hardware cost) |
| **Privacy** | Data sent to OpenAI | Data sent to Anthropic | Local only |
| **Streaming** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Embeddings** | ✅ Excellent | ❌ No (use OpenAI) | ⚠️ Basic |
| **Setup** | API key only | API key only | Install required |

---

## Configuration Options

### Option 1: OpenAI (Recommended for Production)

**Environment Variables:**
```bash
# Default LLM provider for system
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o              # or gpt-4o-mini for lower cost
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional: Organization ID
OPENAI_ORG_ID=org-...
```

**Pros:**
- ✅ Best-in-class function calling
- ✅ Reliable and fast
- ✅ Excellent embeddings (text-embedding-3-small)
- ✅ Great documentation
- ✅ Scales well

**Cons:**
- ⚠️ Costs per token
- ⚠️ Data sent to external service

**Best For:**
- Production deployments
- High-volume usage
- Complex function calling
- Need for reliability

**Pricing:**
- GPT-4o: $2.50/1M input tokens, $10/1M output tokens
- GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- Embeddings: $0.02/1M tokens

---

### Option 2: Anthropic Claude

**Environment Variables:**
```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # or claude-3-haiku-20240307

# Still need OpenAI for embeddings
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Pros:**
- ✅ Excellent at following complex instructions
- ✅ 200K context window (vs OpenAI's 128K)
- ✅ Strong reasoning capabilities
- ✅ Good at nuanced conversations
- ✅ Tool use (function calling) support

**Cons:**
- ⚠️ Costs per token (slightly more expensive)
- ⚠️ No native embeddings (need OpenAI for RAG)
- ⚠️ Tool use format different from OpenAI

**Best For:**
- Complex reasoning tasks
- Long conversations
- Nuanced customer support
- When you need large context

**Pricing:**
- Claude 3.5 Sonnet: $3/1M input tokens, $15/1M output tokens
- Claude 3 Haiku: $0.25/1M input tokens, $1.25/1M output tokens

---

### Option 3: Local Models (Ollama)

**Environment Variables:**
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b  # or mistral, phi, etc.

# Still need OpenAI for embeddings (or use local embeddings)
OPENAI_API_KEY=sk-proj-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**Available Models:**
- **Llama 3.1** (8B, 70B) - Meta's open model
- **Mistral** (7B) - Fast and efficient
- **Phi 3** (3.8B) - Microsoft's small model
- **Gemma** (2B, 7B) - Google's model
- **CodeLlama** - For code generation

**Pros:**
- ✅ No API costs (free)
- ✅ Complete privacy (data stays local)
- ✅ No rate limits
- ✅ Full control
- ✅ Ollama already installed on your VPS

**Cons:**
- ⚠️ Slower than cloud APIs
- ⚠️ Limited function calling support
- ⚠️ Requires good hardware (better with GPU)
- ⚠️ More setup required

**Best For:**
- Development/testing
- Privacy-sensitive use cases
- High-volume scenarios (no per-token cost)
- When internet connectivity is limited

**Performance:**
- CPU-only: ~5-10s per response (acceptable for testing)
- With GPU: ~1-2s per response (production-ready)

---

### Option 4: Hybrid (Best of Both Worlds)

Use different providers for different purposes:

```bash
# System defaults (for new tenants)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...

# Also configure others
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

**Then configure per tenant in database:**
```json
{
  "tenantId": "prod-client-1",
  "settings": {
    "llm": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "sk-proj-..."  // Encrypted
    }
  }
}

{
  "tenantId": "test-client",
  "settings": {
    "llm": {
      "provider": "ollama",
      "model": "llama3.1:8b"
      // No API key needed for Ollama
    }
  }
}
```

**Best For:**
- Multi-tenant setups
- Testing before production
- Cost optimization
- Flexibility

---

## Implementation Architecture

### LLM Package Structure

```typescript
packages/llm/
├── src/
│   ├── index.ts              // Main exports
│   ├── types.ts              // Shared types
│   ├── factory.ts            // Provider factory
│   ├── providers/
│   │   ├── base.ts           // Abstract base class
│   │   ├── openai.ts         // OpenAI implementation
│   │   ├── anthropic.ts      // Anthropic implementation
│   │   └── ollama.ts         // Ollama implementation
│   └── utils/
│       ├── retry.ts          // Retry logic
│       └── cost-tracker.ts   // Track API costs
└── package.json
```

### Unified Interface

```typescript
interface LLMProvider {
  // Chat completion
  complete(params: CompletionParams): Promise<CompletionResponse>;

  // Streaming
  streamComplete(params: CompletionParams): AsyncIterable<CompletionChunk>;

  // Embeddings
  embed(texts: string[]): Promise<number[][]>;

  // Provider info
  getInfo(): ProviderInfo;
}
```

### Usage Example

```typescript
import { createLLMProvider } from '@meta-chat/llm';

// Create provider from tenant config
const provider = createLLMProvider({
  provider: 'openai',
  apiKey: tenant.settings.llm.apiKey,
  model: tenant.settings.llm.model,
});

// Use unified interface
const response = await provider.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2?' }
  ],
  functions: [searchKnowledgeBase],
  temperature: 0.7,
});
```

---

## Per-Tenant Configuration

### Tenant Settings Schema

```typescript
interface TenantSettings {
  llm: {
    provider: 'openai' | 'anthropic' | 'ollama';
    model: string;
    apiKey?: string;        // Encrypted in database
    temperature?: number;   // 0-2, default 0.7
    maxTokens?: number;     // Max output tokens
    topP?: number;          // Nucleus sampling
  };

  embeddings?: {
    provider: 'openai' | 'ollama';
    apiKey?: string;
    model: string;
  };
}
```

### Database Storage

```prisma
model Tenant {
  id       String
  name     String
  apiKey   String  @unique
  settings Json    @default("{}")  // Stores LLM config
  // ... other fields
}
```

### Encryption

API keys stored in tenant settings should be encrypted:

```typescript
import crypto from 'crypto';

function encryptApiKey(apiKey: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptApiKey(encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## Cost Tracking

### Implementation

```typescript
class CostTracker {
  async trackUsage(params: {
    tenantId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    embeddingTokens?: number;
  }): Promise<void> {
    const cost = this.calculateCost(params);

    await db.apiLog.create({
      data: {
        tenantId: params.tenantId,
        type: 'llm_usage',
        metadata: {
          provider: params.provider,
          model: params.model,
          tokens: {
            input: params.inputTokens,
            output: params.outputTokens,
          },
          cost,
        },
      },
    });
  }
}
```

### Dashboard Display

Show per-tenant LLM costs:
- Daily/weekly/monthly totals
- Breakdown by model
- Cost per conversation
- Token usage graphs

---

## Ollama Setup on VPS

### Check if Ollama is Running

```bash
curl http://localhost:11434/api/tags
```

If you see a JSON response, Ollama is installed. If not, install it:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull Models

```bash
# Recommended for production (good balance)
ollama pull llama3.1:8b

# Smaller, faster (good for testing)
ollama pull phi3:3.8b

# Larger, better quality (if you have GPU)
ollama pull llama3.1:70b

# Check installed models
ollama list
```

### Test Ollama

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "What is 2+2?",
  "stream": false
}'
```

---

## Migration Guide

### Switching Providers for a Tenant

**Via API:**
```bash
curl -X PUT https://chat.genai.hr/api/tenants/:id \
  -H "Authorization: Bearer TENANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "llm": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "apiKey": "sk-ant-..."
      }
    }
  }'
```

**Via Dashboard:**
1. Go to Tenant Settings
2. Select "LLM Configuration"
3. Choose provider from dropdown
4. Enter API key (if needed)
5. Select model
6. Save

---

## Fallback Strategy

Implement fallback if primary provider fails:

```typescript
const providers = [
  { type: 'openai', priority: 1 },
  { type: 'anthropic', priority: 2 },
  { type: 'ollama', priority: 3 },
];

async function completeWithFallback(params) {
  for (const config of providers) {
    try {
      const provider = createLLMProvider(config);
      return await provider.complete(params);
    } catch (error) {
      console.error(`${config.type} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All LLM providers failed');
}
```

---

## Best Practices

### 1. Choose Provider Based on Use Case

**High-volume customer support:**
→ Use GPT-4o-mini or Claude Haiku for cost efficiency

**Complex reasoning:**
→ Use Claude 3.5 Sonnet or GPT-4o

**Testing/development:**
→ Use Ollama (free)

**Function calling heavy:**
→ Use OpenAI (best support)

### 2. Rate Limiting

Set per-tenant limits to control costs:

```typescript
settings: {
  rateLimit: {
    requestsPerMinute: 10,
    tokensPerDay: 100000,
  }
}
```

### 3. Caching

Cache LLM responses for common queries:

```typescript
const cacheKey = `llm:${hash(messages)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const response = await provider.complete(params);
await redis.setex(cacheKey, 3600, JSON.stringify(response));
```

### 4. Monitoring

Track key metrics:
- Response times per provider
- Error rates per provider
- Cost per tenant
- Token usage trends

---

## Environment Variables Reference

```bash
# ============= LLM Configuration =============

# Default provider (openai | anthropic | ollama)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o                          # or gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_ORG_ID=org-...                        # Optional

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022   # or claude-3-haiku-20240307

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b                     # or mistral, phi3, etc.

# ============= LLM Parameters =============

# Default temperature (0-2)
LLM_TEMPERATURE=0.7

# Max output tokens
LLM_MAX_TOKENS=1000

# Request timeout (ms)
LLM_TIMEOUT=30000

# Max retries
LLM_MAX_RETRIES=3

# ============= Cost Tracking =============

# Enable cost tracking
ENABLE_COST_TRACKING=true

# Alert threshold (USD per day)
COST_ALERT_THRESHOLD=100

# ============= Embeddings =============

# Separate embeddings provider (if different from LLM)
EMBEDDINGS_PROVIDER=openai
EMBEDDINGS_API_KEY=sk-proj-...
EMBEDDINGS_MODEL=text-embedding-3-small

# ============= API Keys Encryption =============

# Encryption key for storing tenant API keys
ENCRYPTION_KEY=your-32-character-secret-key
```

---

## Testing Different Providers

### Create Test Script

```bash
# test-providers.sh

echo "Testing OpenAI..."
curl -X POST https://chat.genai.hr/api/test/llm \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","prompt":"What is 2+2?"}'

echo "\nTesting Anthropic..."
curl -X POST https://chat.genai.hr/api/test/llm \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","prompt":"What is 2+2?"}'

echo "\nTesting Ollama..."
curl -X POST https://chat.genai.hr/api/test/llm \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","prompt":"What is 2+2?"}'
```

---

## FAQ

**Q: Can I use multiple API keys for the same provider?**
A: Yes, configure different keys per tenant.

**Q: What happens if my API key runs out of credits?**
A: The provider will return an error. Implement fallback or alert.

**Q: Can I use local embeddings instead of OpenAI?**
A: Yes, Ollama supports embeddings, but quality may vary.

**Q: How do I monitor costs?**
A: Check the dashboard analytics or API logs table.

**Q: Which provider is cheapest?**
A: Ollama (free), then OpenAI GPT-4o-mini, then others.

**Q: Can I switch providers without downtime?**
A: Yes, update tenant settings. Next message will use new provider.

**Q: Do I need different embeddings for each LLM?**
A: No, embeddings are separate. Can use OpenAI embeddings with any LLM.

---

**Last Updated:** 2025-10-08
**Next Steps:** Implement `packages/llm` with multi-provider support
