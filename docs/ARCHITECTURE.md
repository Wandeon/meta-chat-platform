# Meta Chat Platform - Architecture

## Overview

Meta Chat Platform is a production-grade, multi-tenant conversational AI platform that enables businesses to deploy AI-powered assistants across WhatsApp, Messenger, and Web Chat with RAG (Retrieval-Augmented Generation) capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Services                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ WhatsApp │  │Messenger │  │ Browser  │  │  OpenAI  │       │
│  │   Cloud  │  │ Platform │  │  Client  │  │    API   │       │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘       │
└────────┼─────────────┼─────────────┼──────────────┼────────────┘
         │             │             │              │
         │ Webhooks    │ Webhooks    │ WebSocket    │ LLM/Embeddings
         │             │             │              │
┌────────▼─────────────▼─────────────▼──────────────▼────────────┐
│                         API Server                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              Express.js + WebSocket Server                 ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ││
│  │  │Webhook   │  │  REST    │  │WebSocket │  │  Auth    │  ││
│  │  │Receivers │  │   API    │  │  Server  │  │Middleware│  ││
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  ││
│  └───────┼─────────────┼─────────────┼─────────────┼─────────┘│
└──────────┼─────────────┼─────────────┼─────────────┼──────────┘
           │             │             │             │
           │             │             │             │
┌──────────▼─────────────▼─────────────▼─────────────▼──────────┐
│                      Channel Adapters                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   WhatsApp   │  │  Messenger   │  │   WebChat    │        │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │        │
│  │              │  │              │  │              │        │
│  │ • Verify     │  │ • Verify     │  │ • WebSocket  │        │
│  │ • Receive    │  │ • Receive    │  │ • Events     │        │
│  │ • Send       │  │ • Send       │  │ • Sessions   │        │
│  │ • Normalize  │  │ • Normalize  │  │ • Normalize  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Message Orchestrator                       │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              Message Processing Pipeline                   ││
│  │                                                             ││
│  │  1. Tenant Resolution    (API Key → Tenant ID)            ││
│  │  2. Conversation Lookup  (External ID → Conversation)     ││
│  │  3. Human Handoff Check  (Keywords → Escalate)            ││
│  │  4. RAG Retrieval        (Query → Context Chunks)         ││
│  │  5. LLM Completion       (History + Context → Response)   ││
│  │  6. Function Calling     (Tools → Execute → Continue)     ││
│  │  7. Response Send        (NormalizedMessage → Channel)    ││
│  │                                                             ││
│  └────────────────────────────────────────────────────────────┘│
│                             │                                   │
│         ┌───────────────────┼───────────────────┐              │
│         │                   │                   │              │
│    ┌────▼────┐        ┌─────▼──────┐      ┌────▼────┐        │
│    │   RAG   │        │    LLM     │      │Function │        │
│    │ Engine  │        │   Client   │      │ Caller  │        │
│    └─────────┘        └────────────┘      └─────────┘        │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼──────┐   ┌─────────▼────────┐   ┌──────▼──────┐
│ RAG Engine   │   │  Event System    │   │  Database   │
│              │   │                  │   │             │
│ • Loader     │   │ • Event Bus      │   │ PostgreSQL  │
│ • Chunker    │   │ • Webhook Emit   │   │ + pgvector  │
│ • Embeddings │   │ • RabbitMQ Emit  │   │             │
│ • Retriever  │   │ • Event Log      │   │ • Tenants   │
│ • Functions  │   │                  │   │ • Channels  │
│              │   └──────────────────┘   │ • Messages  │
└──────────────┘                          │ • Documents │
                                          │ • Chunks    │
                                          │ • Events    │
                                          └─────────────┘
```

## Core Components

### 1. API Server (`apps/api`)
**Responsibilities:**
- HTTP endpoints for management (tenants, channels, documents)
- Webhook receivers for WhatsApp and Messenger
- WebSocket server for web chat
- Authentication and rate limiting
- Request logging

**Technology:**
- Express.js
- Socket.IO for WebSocket
- Passport for authentication
- Express-rate-limit

### 2. Channel Adapters (`packages/channels`)
**Responsibilities:**
- Platform-specific webhook verification
- Message format normalization
- Sending messages via platform APIs
- Media handling (upload/download)
- Typing indicators

**Implementations:**
- WhatsApp Cloud API
- Messenger Platform API
- WebChat (native)

### 3. Message Orchestrator (`packages/orchestrator`)
**Responsibilities:**
- Route incoming messages through processing pipeline
- Manage conversation state
- Coordinate RAG retrieval
- Invoke LLM with context
- Execute function calls
- Handle human handoff triggers

**Flow:**
```
Message → Normalize → Lookup Conversation → Check Handoff
  → RAG Retrieve → Build Context → LLM Complete → Functions
  → Generate Response → Send via Channel → Log Event
```

### 4. RAG Engine (`packages/rag`)
**Responsibilities:**
- Parse and chunk documents (PDF, TXT, MD, DOCX)
- Generate embeddings via OpenAI
- Store in PostgreSQL with pgvector
- Hybrid retrieval (keyword + vector search)
- Re-ranking and scoring
- Function definition management

**Retrieval Strategy:**
1. Keyword search (PostgreSQL tsvector) → top 10
2. Vector search (pgvector cosine similarity) → top 10
3. Merge and re-rank with weighted scores
4. Return top 5 chunks

### 5. Event System (`packages/events`)
**Responsibilities:**
- Internal pub/sub (EventEmitter2)
- Reliable webhook delivery with retry
- RabbitMQ publishing for external consumers
- Event persistence for audit log

**Event Types:**
- `message.received`
- `message.sent`
- `conversation.created`
- `conversation.updated`
- `human_handoff.requested`
- `document.uploaded`
- `document.indexed`

### 6. Database (`packages/database`)
**Technology:** PostgreSQL 15+ with pgvector extension

**Schema Design:**
```
Tenant (1) ←→ (*) Channel
Tenant (1) ←→ (*) Conversation
Tenant (1) ←→ (*) Document
Tenant (1) ←→ (*) Webhook
Conversation (1) ←→ (*) Message
Document (1) ←→ (*) Chunk (with vector embedding)
Tenant (1) ←→ (*) TenantSecret (per-provider credentials)
Channel (1) ←→ (1) ChannelSecret (adapter credentials)
```

**Key Features:**
- Multi-tenant isolation at database level
- pgvector for vector similarity search
- Full-text search with tsvector
- Cascade deletes for tenant cleanup
- Indexed queries for performance

### 7. Secrets & Key Management

**Dedicated Tables:**
- `tenant_secrets`: keyed by `tenantId` + logical `name`, storing ciphertext, IV, auth tag, and encryption key identifier for tenant-level credentials (e.g., LLM providers).
- `channel_secrets`: keyed by `channelId`, storing the encrypted payload for channel adapter credentials.

Both tables only persist Base64-encoded ciphertext, IV, and AES-GCM authentication tag alongside the key identifier. Plaintext secrets never touch the database.

**Encryption Service (`packages/shared/src/secrets.ts`):**
- Uses AES-256-GCM via Node's `crypto` module.
- Requires `SECRET_KEY_ID` and a Base64-encoded 32-byte `SECRET_ENCRYPTION_KEY` environment variable for the active key material.
- Exposes `SecretService` helpers to store and retrieve secrets through repository interfaces, ensuring callers work with callback-based access (`withTenantSecret` / `withChannelSecret`) so decrypted values remain in memory briefly.
- Scrubs intermediate buffers after use and never logs decrypted data; downstream callers must also avoid logging and invoke scrub routines immediately after use.

**Usage Guidance:**
- Channel and LLM adapters must call into `SecretService` rather than writing raw JSON credentials. The adapters should provide repository implementations that read/write the new tables and use the callback helpers to avoid leaking plaintext values.
- Rotate keys by introducing a new environment-provided key identifier and material, then re-encrypt affected secrets using the helper before decommissioning the old key.

## Data Flow

### Inbound Message Flow

```
1. Platform sends webhook
   ├─ WhatsApp: POST /webhooks/whatsapp
   ├─ Messenger: POST /webhooks/messenger
   └─ WebChat: WebSocket event

2. API Server receives and validates
   ├─ Verify signature (HMAC-SHA256)
   ├─ Log request
   └─ Return 200 OK immediately (async processing)

3. Channel Adapter normalizes message
   ├─ Extract: id, from, type, content, timestamp
   ├─ Download media if present
   └─ Create NormalizedMessage

4. Orchestrator processes message
   ├─ Resolve tenant from channel config
   ├─ Lookup or create conversation
   ├─ Check for human handoff keywords
   ├─ Retrieve RAG context (if enabled)
   ├─ Build LLM messages array
   ├─ Call OpenAI with functions
   ├─ Execute functions iteratively
   └─ Generate final response

5. Send response via channel
   ├─ WhatsApp: POST to graph.facebook.com
   ├─ Messenger: POST to graph.facebook.com
   └─ WebChat: WebSocket emit

6. Emit events
   ├─ Internal event bus
   ├─ Tenant webhooks
   └─ RabbitMQ (if configured)
```

### Document Indexing Flow

```
1. Upload document via API
   POST /api/tenants/:id/documents

2. Save to storage
   └─ Local filesystem or S3

3. Parse document
   ├─ PDF → Extract text, metadata
   ├─ TXT/MD → Read as-is
   └─ DOCX → Extract paragraphs

4. Chunk text
   ├─ Strategy: fixed-size (512 tokens) with overlap
   └─ Store metadata (page, section, source)

5. Generate embeddings
   └─ OpenAI text-embedding-3-small (1536 dims)

6. Store in database
   ├─ Document record
   └─ Chunk records with vector embeddings

7. Emit event
   └─ document.indexed
```

## Multi-Tenancy

### Isolation Strategy

**Database Level:**
- All queries filtered by `tenantId`
- Indexes on `(tenantId, ...)` for performance
- Cascade deletes on tenant removal

**API Level:**
- Per-tenant API keys
- Middleware validates API key → tenant ID
- Rate limiting per tenant

**Storage Level:**
- Files stored under `storage/{tenantId}/`
- Prevent cross-tenant file access

**Event Level:**
- Events tagged with `tenantId`
- Webhooks scoped to tenant
- RabbitMQ routing keys include tenant

### Tenant Configuration

Stored in `Tenant.settings` (JSON):
```json
{
  "brandName": "Your Business",
  "tone": "friendly",
  "locale": ["en"],
  "enableRag": true,
  "enableFunctionCalling": true,
  "enableHumanHandoff": true,
  "humanHandoffKeywords": ["human", "agent", "help"],
  "ragConfig": {
    "topK": 5,
    "minSimilarity": 0.7,
    "hybridWeights": {
      "keyword": 0.3,
      "vector": 0.7
    }
  }
}
```

## Security

### Authentication
- **Global API Key**: Full admin access
- **Tenant API Keys**: Scoped to tenant resources
- **JWT Tokens**: For WebSocket connections

### Webhook Verification
- **WhatsApp**: Verify signature with app secret (HMAC-SHA256)
- **Messenger**: Verify signature with app secret (HMAC-SHA1)
- **Outbound Webhooks**: Optional custom headers for auth

### Data Protection
- API keys hashed before storage
- Sensitive data in environment variables
- TLS/SSL for all external communication
- Input validation on all endpoints

## Scalability

### Horizontal Scaling
- **Stateless API servers**: Scale behind load balancer
- **WebSocket sticky sessions**: Use Redis adapter for Socket.IO
- **Database connection pooling**: Prisma handles this
- **Queue-based processing**: RabbitMQ for async tasks

### Caching Strategy
- **Redis**: Session data, rate limits, conversation history
- **In-memory**: Tenant configs (invalidate on update)
- **CDN**: Static assets (widget, dashboard)

### Performance Optimizations
- **Database indexes**: On frequently queried fields
- **Eager loading**: Prisma `include` for related data
- **Vector search**: pgvector IVFFlat index for large datasets
- **Webhook retry**: Exponential backoff prevents thundering herd

## Monitoring & Observability

### Logging
- Structured JSON logs
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error
- Log to stdout (captured by Docker/K8s)

### Metrics (TODO)
- Prometheus metrics export
- Key metrics:
  - Message throughput (per tenant, per channel)
  - LLM latency (p50, p95, p99)
  - RAG retrieval time
  - Webhook delivery success rate
  - Database query performance

### Health Checks
- `/api/health` endpoint
- Check: PostgreSQL, Redis, RabbitMQ
- Status: healthy, degraded, unhealthy

## Deployment

### Docker Compose (Development)
```yaml
services:
  postgres:
    image: ankane/pgvector:latest

  redis:
    image: redis:7-alpine

  rabbitmq:
    image: rabbitmq:3-management-alpine

  api:
    build: ./apps/api
    depends_on: [postgres, redis, rabbitmq]

  dashboard:
    build: ./apps/dashboard
```

### Kubernetes (Production)
- Helm chart (TODO)
- Horizontal Pod Autoscaler
- Persistent volumes for PostgreSQL
- Redis cluster
- Ingress with TLS

## Technology Choices - Rationale

### Why Monorepo?
- Simplified dependency management
- Atomic cross-package changes
- Shared TypeScript configs
- Turbo for fast parallel builds

### Why PostgreSQL + pgvector?
- One less service vs. dedicated vector DB
- Hybrid search (keyword + vector) in one query
- ACID transactions for consistency
- Battle-tested reliability

### Why EventEmitter2 + RabbitMQ?
- EventEmitter2: Fast in-process pub/sub
- RabbitMQ: Durable cross-service messaging
- Start simple, scale with RabbitMQ

### Why OpenAI API?
- Excellent function calling support
- Fast time to market
- No GPU infrastructure needed
- Can swap to self-hosted later

## Future Enhancements

### Phase 2
- [ ] Voice channels (Twilio, WhatsApp voice notes)
- [ ] SMS channel
- [ ] Multi-language support (translations)
- [ ] A/B testing framework
- [ ] Cost tracking per conversation

### Phase 3
- [ ] Self-hosted LLM support (Ollama, vLLM)
- [ ] Advanced analytics dashboard
- [ ] Conversation tagging and categorization
- [ ] Sentiment analysis
- [ ] Proactive messaging campaigns

### Phase 4
- [ ] Agent collaboration (multi-agent)
- [ ] Voice-to-text for all channels
- [ ] Video message support
- [ ] Integration marketplace
- [ ] White-label solution

---

**Last Updated:** 2025-01-08
