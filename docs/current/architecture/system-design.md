# System Architecture

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Architecture Team

## Overview

Meta Chat Platform is a production-grade, multi-tenant conversational AI platform that enables businesses to deploy intelligent chatbots across multiple messaging channels with RAG (Retrieval-Augmented Generation) capabilities. The platform provides:

- **Multi-Channel Support**: WhatsApp Business API, Facebook Messenger, and embeddable Web Chat Widget
- **Multi-Tenant Architecture**: Complete isolation between tenants with per-tenant configuration and data
- **RAG Knowledge Base**: Document ingestion, vector embeddings, and hybrid search for context-aware responses
- **LLM Flexibility**: Support for OpenAI, Anthropic Claude, and local models via Ollama
- **Function Calling**: AI-powered function execution with iterative refinement
- **Human Handoff**: Keyword-based escalation to human operators
- **Event-Driven**: RabbitMQ-based messaging for reliable cross-service communication
- **Production Ready**: Deployed on VPS with PM2 process management, comprehensive monitoring, and logging

## High-Level Architecture

The platform follows a service-oriented architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         External Services                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ WhatsApp │  │Messenger │  │ Browser  │  │ LLM Providers    │   │
│  │   Cloud  │  │ Platform │  │  Client  │  │ (OpenAI/Claude)  │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────────────┘   │
└────────┼─────────────┼─────────────┼──────────────┼────────────────┘
         │ Webhooks    │ Webhooks    │ WebSocket    │ API Calls
         │             │             │              │
┌────────▼─────────────▼─────────────▼──────────────▼────────────────┐
│                         API Server (Port 3000)                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Express.js + Socket.IO                                        ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      ││
│  │  │Webhook   │  │  REST    │  │WebSocket │  │  Auth    │      ││
│  │  │Receivers │  │   API    │  │  Server  │  │Middleware│      ││
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      ││
│  └───────┼─────────────┼─────────────┼─────────────┼─────────────┘│
└──────────┼─────────────┼─────────────┼─────────────┼──────────────┘
           │             │             │             │
           └─────────────┴─────────────┴─────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                    RabbitMQ Message Broker                         │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Queue: message.process                                        ││
│  │  Exchange: meta-chat (topic)                                   ││
│  │  Routing: {tenantId}.{eventType}                              ││
│  └────────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                       Worker Process                                │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │               Message Processing Pipeline                      ││
│  │                                                                 ││
│  │  1. Tenant Resolution       (API Key → Tenant Config)         ││
│  │  2. Conversation Management (External ID → Conversation)      ││
│  │  3. Human Handoff Check     (Keywords → Escalate if matched)  ││
│  │  4. RAG Retrieval          (Query → Relevant Document Chunks) ││
│  │  5. Context Building        (History + RAG → Context)         ││
│  │  6. LLM Completion         (Context → AI Response)            ││
│  │  7. Function Execution      (Tool Calls → Execute → Iterate)  ││
│  │  8. Response Delivery       (Normalized → Channel Adapter)    ││
│  │                                                                 ││
│  └────────────────────────────────────────────────────────────────┘│
│           │              │              │              │            │
│      ┌────▼────┐    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐     │
│      │   RAG   │    │   LLM   │   │Channels │   │  Events │     │
│      │ Engine  │    │  Client │   │ Adapter │   │  System │     │
│      └─────────┘    └─────────┘   └─────────┘   └─────────┘     │
└────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐   ┌──────────▼─────────┐   ┌──────▼──────┐
│ PostgreSQL   │   │  Redis Cache       │   │  Storage    │
│ + pgvector   │   │                    │   │  (Local FS) │
│              │   │ • Session Data     │   │             │
│ • Tenants    │   │ • Rate Limits      │   │ • Documents │
│ • Channels   │   │ • Conversation     │   │ • Media     │
│ • Messages   │   │   History          │   │   Files     │
│ • Documents  │   │                    │   │             │
│ • Chunks     │   └────────────────────┘   └─────────────┘
│ • Events     │
│ • API Keys   │
└──────────────┘
```

### Component Responsibilities

| Component | Purpose | Technology |
|-----------|---------|------------|
| **API Server** | HTTP/WebSocket gateway, webhook receivers, authentication | Express.js, Socket.IO |
| **Worker** | Async message processing, orchestration, LLM calls | Node.js, RabbitMQ consumer |
| **Dashboard** | Admin UI for tenant management, analytics | React, TanStack Query, React Router |
| **Web Widget** | Embeddable chat interface for websites | React, Socket.IO client |
| **RabbitMQ** | Message queue for reliable async processing | RabbitMQ 3.x |
| **PostgreSQL** | Primary datastore with vector search | PostgreSQL 15 + pgvector |
| **Redis** | Caching, rate limiting, session management | Redis 7.x |

## Data Flow

### Inbound Message Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. External Platform sends message                               │
│    • WhatsApp: POST /webhooks/whatsapp                          │
│    • Messenger: POST /webhooks/messenger                        │
│    • WebChat: WebSocket event to Socket.IO                      │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. API Server receives and validates                            │
│    • Verify webhook signature (HMAC-SHA256)                     │
│    • Log request with correlation ID                            │
│    • Return 200 OK immediately (async processing)               │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Channel Adapter normalizes message                           │
│    • Extract: id, from, type, content, timestamp                │
│    • Download media if present                                  │
│    • Create NormalizedMessage structure                         │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Publish to RabbitMQ                                           │
│    • Queue: message.process                                      │
│    • Routing Key: {tenantId}.message.received                   │
│    • Payload: NormalizedMessage + metadata                      │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Worker picks up message                                       │
│    • Prefetch: 5 messages at a time                             │
│    • Visibility timeout: 5 minutes                               │
│    • Max retries: 3 with exponential backoff                    │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Orchestrator processes message                               │
│    a. Resolve tenant from channel configuration                 │
│    b. Lookup or create conversation in database                 │
│    c. Check for human handoff keywords                          │
│    d. If RAG enabled:                                            │
│       • Extract query from user message                         │
│       • Hybrid search (keyword + vector)                        │
│       • Retrieve top 5 relevant chunks                          │
│    e. Build LLM messages array:                                  │
│       • System prompt with tenant config                        │
│       • RAG context (if available)                              │
│       • Recent conversation history (last 10 messages)          │
│       • Current user message                                     │
│    f. Call LLM with function definitions                        │
│    g. If function calls in response:                            │
│       • Execute each function                                    │
│       • Add results to context                                   │
│       • Call LLM again (max 5 iterations)                       │
│    h. Extract final text response                               │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Send response via channel                                     │
│    • WhatsApp: POST to graph.facebook.com/v18.0/{phone}/messages│
│    • Messenger: POST to graph.facebook.com/v18.0/me/messages   │
│    • WebChat: Socket.IO emit to client                          │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. Emit events                                                   │
│    • Persist event to database                                  │
│    • Publish to RabbitMQ for other services                     │
│    • Trigger tenant webhooks                                     │
└──────────────────────────────────────────────────────────────────┘
```

### Document Indexing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. Upload document via API                                       │
│    POST /api/tenants/:tenantId/documents                        │
│    • File: PDF, DOCX, TXT, MD                                   │
│    • Metadata: filename, description                            │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Save to storage                                               │
│    • Path: storage/{tenantId}/{documentId}/{filename}          │
│    • Calculate SHA-256 checksum                                 │
│    • Create Document record in database                         │
│    • Status: pending → processing                               │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. Parse document                                                │
│    • PDF: Extract text with pdf-parse, preserve page numbers   │
│    • DOCX: Extract with mammoth, preserve structure            │
│    • TXT/MD: Read as-is                                         │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Chunk text                                                    │
│    • Strategy: Fixed-size with overlap                          │
│    • Chunk size: 512 tokens (~2048 chars)                       │
│    • Overlap: 50 tokens (~200 chars)                            │
│    • Metadata: page, section, source document                   │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Generate embeddings                                           │
│    • Model: mxbai-embed-large (1024 dimensions)                 │
│    • Batch: 100 chunks at a time                                │
│    • Retry: Exponential backoff on errors                       │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. Store in database                                             │
│    • Update Document status: processing → ready                 │
│    • Insert Chunk records with vector embeddings                │
│    • Build IVFFlat index for efficient similarity search        │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Emit event                                                    │
│    • Event: document.indexed                                    │
│    • Payload: documentId, tenantId, chunkCount, duration        │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x LTS | Runtime environment |
| **TypeScript** | 5.4+ | Type-safe development |
| **Express.js** | 4.x | HTTP server framework |
| **Socket.IO** | 4.x | WebSocket server for real-time chat |
| **Turbo** | 1.13+ | Monorepo build orchestration |
| **Prisma** | 5.11+ | Type-safe ORM and migrations |

### Data Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15+ | Primary database |
| **pgvector** | 0.5+ | Vector similarity search extension |
| **Redis** | 7.x | Caching and session management |
| **RabbitMQ** | 3.x | Message queue for async processing |

### AI & ML

| Technology | Purpose |
|------------|---------|
| **OpenAI API** | GPT-4o, GPT-4o-mini for chat, text-embedding-3-small for embeddings |
| **Anthropic API** | Claude 3.5 Sonnet, Claude 3 Haiku for chat |
| **Ollama** | Local LLM support (Llama 3.1, Mistral, DeepSeek, mxbai-embed-large) |

### Frontend

| Technology | Purpose |
|------------|---------|
| **React** | UI library for Dashboard and Web Widget |
| **TanStack Query** | Data fetching and caching (Dashboard) |
| **React Router** | Client-side routing (Dashboard) |
| **Vite** | Build tool for fast development |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **PM2** | Process manager for API and Worker |
| **Nginx** | Reverse proxy with SSL termination |
| **Certbot** | Let's Encrypt SSL certificate management |
| **Docker** | Optional containerized deployment |

## Database Schema

### Core Entities

**Tenant**
- Primary entity for multi-tenancy
- Fields: id, name, settings (JSON), enabled, timestamps
- Relations: channels, conversations, documents, webhooks, events, API keys

**Channel**
- Platform-specific connection (WhatsApp, Messenger, WebChat)
- Fields: id, tenantId, type, config (JSON), enabled, timestamps
- Encrypted credentials stored in separate ChannelSecret table
- Unique constraint: (tenantId, type)

**Conversation**
- Represents a chat thread
- Fields: id, tenantId, channelType, externalId, userId, status, metadata, timestamps
- Status: active, assigned_human, closed
- Unique constraint: (tenantId, channelType, externalId)

**Message**
- Individual messages in a conversation
- Fields: id, tenantId, conversationId, externalId, direction, from, type, content (JSON), metadata, timestamp
- Partitioned by timestamp for performance
- Direction: inbound, outbound
- Type: text, image, audio, video, document, location

### RAG Entities

**Document**
- Uploaded knowledge base file
- Fields: id, tenantId, filename, mimeType, size, path, checksum, storageProvider, version, status, metadata, timestamps
- Status: pending, processing, ready, failed, stale
- Tracks document versions for updates

**Chunk**
- Text segment with vector embedding
- Fields: id, tenantId, documentId, content, embedding (vector 1024), metadata, position, createdAt
- IVFFlat index on embedding for fast similarity search
- Position tracks order within document

### Security Entities

**TenantApiKey**
- API keys for tenant authentication
- Fields: id, tenantId, label, prefix, hash, salt, lastFour, active, timestamps, lastUsedAt, expiresAt
- Password-hashed with Argon2 and random salt
- Prefix enables quick lookup (e.g., mcp_)

**TenantSecret**
- Encrypted LLM provider credentials per tenant
- Fields: id, tenantId, name, keyId, ciphertext, iv, authTag, timestamps
- AES-256-GCM encryption with rotation support

**ChannelSecret**
- Encrypted channel adapter credentials
- Fields: id, channelId, keyId, ciphertext, iv, authTag, timestamps
- Separate from TenantSecret for finer access control

### Event & Audit Entities

**Event**
- Audit log of all platform events
- Fields: id, tenantId, type, data (JSON), timestamp
- Indexed by (tenantId, type, timestamp)

**Webhook**
- Tenant webhook endpoints
- Fields: id, tenantId, url, events (array), headers (JSON), enabled, timestamps
- Supports custom authentication headers

**AdminAuditLog**
- Administrative action tracking
- Fields: id, adminKeyId, actorId, actorType, action, target, description, metadata, ipAddress, userAgent, createdAt

**ApiLog**
- HTTP request/response logging
- Fields: id, tenantId, method, path, statusCode, duration, ip, userAgent, error, timestamp
- Partitioned by timestamp for retention management

## Multi-Tenancy

### Isolation Strategy

**Database Level**
- All queries filtered by tenantId at repository layer
- Prisma middleware enforces tenant context
- Indexes on (tenantId, ...) for query performance
- Cascade deletes on tenant removal

**API Level**
- Per-tenant API keys with HMAC signature verification
- Middleware validates signature and loads tenant context
- Rate limiting per tenant (100 req/min by default)
- Tenant context injected into request object

**Storage Level**
- Files stored under storage/{tenantId}/ directory structure
- Prevent cross-tenant file access via path validation
- Optional S3 integration with tenant-scoped buckets

**Event Level**
- Events tagged with tenantId
- RabbitMQ routing keys include tenantId: {tenantId}.{eventType}
- Webhooks scoped to tenant, only receive tenant events

### Tenant Configuration

Stored in Tenant.settings JSON field:

```json
{
  brandName: Your Business,
  tone: friendly,
  locale: [en],
  enableRag: true,
  enableFunctionCalling: true,
  enableHumanHandoff: true,
  humanHandoffKeywords: [human, agent, help],
  llm: {
    provider: openai,
    model: gpt-4o,
    temperature: 0.7,
    maxTokens: 1000
  },
  ragConfig: {
    topK: 5,
    minSimilarity: 0.7,
    hybridWeights: {
      keyword: 0.3,
      vector: 0.7
    }
  }
}
```

## Scalability & Performance

### Horizontal Scaling

**Stateless API Servers**
- Multiple API instances behind load balancer
- No local state, all session data in Redis
- Socket.IO horizontal scaling via Redis adapter

**Worker Scaling**
- Multiple worker processes consuming from RabbitMQ
- Prefetch limit prevents overload (5 messages/worker)
- Auto-scaling based on queue depth

**Database Optimization**
- Connection pooling via Prisma (pool size: 10)
- Read replicas for analytics queries (future)
- Partitioning for high-volume tables (messages, api_logs)

### Caching Strategy

**Redis Cache**
- Tenant configuration (1 hour TTL, invalidate on update)
- Conversation history (15 min TTL)
- Rate limit counters (sliding window)
- Session data for WebSocket connections

**In-Memory Cache**
- Tenant settings (invalidated via event bus)
- Channel configurations
- LRU cache for embeddings (during bulk operations)

### Performance Optimizations

**Database**
- Indexes on all foreign keys and query fields
- IVFFlat index for vector similarity (pgvector)
- Partitioning on timestamp columns (messages, events, api_logs)
- Prepared statements via Prisma

**RAG Retrieval**
- Hybrid search combines keyword and vector (70/30 weighted)
- Top-K limiting reduces computation (5 chunks)
- Batch embedding generation (100 chunks at a time)

**LLM Calls**
- Streaming responses for real-time user feedback
- Function calling with max 5 iterations
- Token counting to stay within model limits
- Exponential backoff on rate limit errors

**Message Processing**
- Async via RabbitMQ, no blocking API calls
- Visibility timeout prevents duplicate processing
- Dead letter queue for failed messages
- Exponential backoff retry (3 attempts)

## Security

### Authentication

**API Authentication**
- HMAC-SHA256 signature verification
- Each tenant has API key + secret pair
- Signature includes body + timestamp (prevents replay)
- 5-minute freshness window

**WebSocket Authentication**
- Short-lived JWT tokens (15 min expiry)
- Signed by tenant-specific secret
- Scoped to conversation or visitor session

**Admin Authentication**
- Separate AdminApiKey table for platform admins
- Role-based access control (SUPER, STANDARD)
- Audit logging of all admin actions

### Data Protection

**Encryption at Rest**
- LLM provider credentials encrypted with AES-256-GCM
- Channel adapter credentials encrypted separately
- Encryption key stored in environment variable
- Key rotation support via keyId field

**Encryption in Transit**
- TLS 1.3 for all external communication
- Nginx terminates SSL at reverse proxy
- Internal services on localhost (no exposure)

**Input Validation**
- Zod schemas for all API payloads
- Prisma validation at database layer
- Sanitization of user-generated content
- File upload validation (type, size, content)

**Secrets Management**
- No secrets in git (.env files gitignored)
- Environment variables for sensitive config
- Separate encryption key per deployment
- API keys hashed with Argon2 + salt

### Rate Limiting

**Per-Tenant Limits**
- 100 requests/minute for REST API
- 50 messages/minute per conversation
- 10 documents/hour for uploads

**Global Limits**
- 1000 webhooks/minute across all tenants
- 500 embeddings/minute (Ollama)
- Circuit breaker on LLM provider errors

## Monitoring & Observability

### Logging

**Structured Logging with Pino**
- JSON format for easy parsing
- Log levels: debug, info, warn, error
- Correlation IDs for request tracing
- Async context propagation via withRequestContext

**Log Destinations**
- stdout (captured by PM2)
- PM2 log files: logs/api-out.log, logs/worker-out.log
- Future: Ship to centralized log aggregator (e.g., Loki)

**Log Context Enrichment**
- Tenant ID on all tenant-scoped operations
- Correlation ID for end-to-end tracing
- Request ID for individual API requests
- User ID for conversation-level logs

### Metrics (Future)

**Application Metrics**
- Message throughput (per tenant, per channel)
- LLM latency (p50, p95, p99)
- RAG retrieval time
- Queue depth and processing rate
- Error rate by endpoint

**System Metrics**
- CPU, memory, disk usage via Netdata
- Database connection pool utilization
- Redis memory usage
- RabbitMQ queue depth

### Health Checks

**API Health Endpoint**: GET /api/health

```json
{
  status: healthy,
  timestamp: 2025-11-18T19:00:00Z,
  checks: {
    database: { status: up, latency: 5 },
    redis: { status: up, latency: 1 },
    rabbitmq: { status: up, latency: 2 }
  }
}
```

Status values: healthy, degraded, unhealthy

## Deployment

### Production Environment

**VPS Specifications**
- Provider: Hetzner genai.hr
- CPU: 4 cores (AMD EPYC)
- RAM: 7.8GB (5.4GB available)
- Disk: 370GB available
- OS: Debian/Ubuntu

**Domain Configuration**
- chat.genai.hr → API Server (port 3000)
- chat-admin.genai.hr → Dashboard (future)
- widget.genai.hr → Web Widget (future)

**Port Allocation**
- 3000: API Server (HTTP/WebSocket)
- 3001: Dashboard (future)
- 5432: PostgreSQL (localhost only)
- 6379: Redis (localhost only)
- 5672: RabbitMQ (localhost only)
- 15672: RabbitMQ Management UI (localhost only)

### Process Management

**PM2 Ecosystem**
- meta-chat-api: API server (1 instance, fork mode)
- meta-chat-worker: Worker process (1 instance, fork mode)
- Auto-restart on crashes (max 10 restarts, 10s min uptime)
- Memory limit: 500MB per process
- Logs: ./logs/{api,worker}-{out,error}.log

**Startup Scripts**
- pm2 startup: systemd integration for auto-start
- pm2 save: persist process list

### Reverse Proxy

**Nginx Configuration**
- TLS termination with Let's Encrypt
- WebSocket upgrade for Socket.IO
- Gzip compression for responses
- Rate limiting at proxy layer
- Request logging

### Backup Strategy

**Database Backups**
- Daily pg_dump to local disk
- Retention: 7 days local, 30 days remote
- Backup script: ops/backup-db.sh (future)

**Document Storage Backups**
- Rsync to remote storage daily
- Incremental backups for efficiency

**Configuration Backups**
- .env files (encrypted)
- Nginx configs
- PM2 ecosystem.config.js

## Related Documentation

- [Component Details](./components.md) - Deep dive into each component
- [Deployment Guide](/home/deploy/meta-chat-platform/docs/DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](/home/deploy/meta-chat-platform/docs/API.md) - REST API reference
- [LLM Providers](/home/deploy/meta-chat-platform/docs/LLM-PROVIDERS.md) - LLM integration guide
- [Confidence Escalation Guide](/home/deploy/meta-chat-platform/docs/confidence-based-escalation-guide.md) - Human handoff feature
