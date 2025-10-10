# Meta Chat Platform

**Multi-tenant WhatsApp, Messenger, and Web Chat platform with RAG-powered AI assistants**

A production-grade conversational AI platform that synthesizes the best patterns from leading open-source projects:
- **Wassenger WhatsApp Bot**: Clean webhook handling, OpenAI function calling, multimodal support
- **Evolution API**: Multi-tenant architecture, event-driven system, TypeScript + Prisma
- **Tiledesk**: Multi-channel routing, connector pattern, human handoff workflows
- **RAGFlow**: Hybrid retrieval (keyword + vector), document chunking, pgvector integration

---

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 20+ with TypeScript 5
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with Prisma ORM + pgvector extension
- **Cache**: Redis 7+
- **Message Queue**: RabbitMQ (core event transport)
- **Vector Store**: PostgreSQL with pgvector
- **LLM**: OpenAI API (GPT-4o)
- **Embeddings**: OpenAI text-embedding-3-small
- **Authentication**: Custom HMAC API keys for HTTP + scoped JWT tokens for WebSocket (Passport **not** used)

## 📅 Roadmap Snapshot

| Milestone | Deadline | Owner | Highlights |
|-----------|----------|-------|------------|
| AI Core & Security Baseline | 2025-11-15 | Priya Sharma | Ship LLM/RAG services and harden API skeleton (keys, rate limits, secrets). |
| Channel & Orchestration Launch | 2025-12-20 | Marco Díaz | Deliver WhatsApp/Messenger/WebChat adapters plus orchestrator pipeline. |
| Tenant Experience Platform | 2026-01-31 | Tiana Lee | Expand REST APIs, release dashboard, and ship embeddable widget. |
| Deployment & Observability | 2026-03-14 | Omar Nasser | Package Docker rollout, infrastructure automation, and monitoring stack. |
| Production Hardening | 2026-04-25 | Riley Chen | Complete test matrix, load/security audits, and go-live playbook. |

> See [`docs/TODO.md`](docs/TODO.md) for the full milestone backlog and task breakdown.

### New Frontend Apps

- [`apps/web-widget`](apps/web-widget/README.md) – Embeddable customer chat widget built with Vite + React.
- [`apps/dashboard`](apps/dashboard/README.md) – Admin console for tenants, channels, documents, conversations, and webhooks.

Additional onboarding docs:

- [`docs/widget-embedding.md`](docs/widget-embedding.md) – Step-by-step widget embedding guide.
- [`docs/admin-onboarding.md`](docs/admin-onboarding.md) – Admin dashboard onboarding.

### Project Structure

```
meta-chat-platform/
├── apps/
│   ├── api/              # ✅ COMPLETE - API server, webhooks, REST API, WebSocket
│   ├── web-widget/       # ✅ COMPLETE - Embeddable chat widget (Vite + React)
│   └── dashboard/        # ✅ COMPLETE - Management UI (Vite + React)
├── packages/
│   ├── shared/           # ✅ COMPLETE - Types, constants, utilities, security
│   ├── database/         # ✅ COMPLETE - Prisma schema, vector search, partitioning, RLS
│   ├── events/           # ✅ COMPLETE - Brokered event bus, webhook emitter, RabbitMQ
│   ├── orchestrator/     # ✅ COMPLETE - Message pipeline, LLM integration, RAG retrieval
│   ├── rag/              # ✅ COMPLETE - Loaders, chunking, embeddings, hybrid retrieval
│   ├── llm/              # ✅ COMPLETE - OpenAI, Anthropic, Ollama providers with tests
│   └── channels/         # ✅ COMPLETE - WhatsApp, Messenger, WebChat adapters
├── docs/                 # ✅ COMPLETE - Architecture, deployment, guides
└── docker/               # ✅ COMPLETE - Docker Compose with health checks
```

---

## ✅ What's Been Built

### 1. **Shared Package** (`packages/shared`)
- **Types**: Comprehensive TypeScript types for messages, channels, events, RAG
- **Constants**: System limits, error codes, default configurations
- **Utils**: Retry logic, ID generation (RFC 4122 UUID), JSON parsing, deep merge
- **Logging**: Structured logging with Pino, async context storage, correlation IDs
- **Security**: API key generation/hashing with scrypt, timing-safe comparisons
- **Secrets**: AES-256-GCM encryption/decryption for sensitive data, buffer scrubbing

### 2. **Database Package** (`packages/database`)
- **Prisma Schema**: Multi-tenant model with:
  - Tenants with settings and relations
  - Channels (WhatsApp, Messenger, WebChat configs) with encrypted secrets
  - Conversations and Messages (partitioned by month)
  - Documents and Chunks with pgvector embeddings
  - Webhooks and Events
  - API logs (partitioned by month)
  - TenantApiKey and AdminApiKey with rotation support
  - TenantSecret and ChannelSecret for encrypted storage
  - Admin keys with hashed secrets, rotation metadata, and lifecycle status
  - Admin audit logs for privileged actions
- **Vector Search**: IVFFlat-indexed cosine similarity search with normalization
- **Keyword Search**: Full-text search with PostgreSQL tsvector
- **Client**: Singleton Prisma client with graceful shutdown
- **Partitioning**: Monthly partitions for messages and api_logs tables
- **Data Retention**: Automated archival and deletion jobs with configurable policies
- **Row Level Security**: Tenant isolation enforced at database level

### 3. **Events Package** (`packages/events`)
- **Event Bus**: Broker-backed publisher that persists events, pushes to RabbitMQ, and optionally caches locally for fast reads
- **Webhook Emitter**: Reliable webhook delivery with:
  - Exponential backoff retry logic
  - Per-tenant webhook configuration
  - Custom headers support
  - Parallel delivery to multiple webhooks
- **RabbitMQ Broker**: Topic-based event publishing with:
  - Auto-reconnection on failure
  - Durable exchanges
  - Routing keys: `{tenantId}.{eventType}`
- **Event Manager**: Unified interface coordinating broker publishing, local cache, and webhooks

### 4. **Orchestrator Package** (`packages/orchestrator`)
- **Queue Consumer**: RabbitMQ consumer with configurable visibility timeout and retry logic
- **Message Orchestrator**: High-level abstraction for consuming tenant/channel-specific messages
- **Queue Topology Management**: Per-tenant and per-channel queue setup with routing keys `{tenantId}.{channel}.{direction}`
- **Dead Letter Queue**: Failed messages automatically routed to DLQ after max retries with error metadata
- **Webhook Acknowledgement**: Queued webhook acks for async processing to prevent blocking webhook handlers
- **Retry with Backoff**: Exponential backoff with jitter for failed message processing

### 5. **RAG Package** (`packages/rag`)
- **Document Upload Pipeline**: Checksum-aware upload with version tracking and integrity verification
- **Storage Providers**: Pluggable storage backends (LocalStorageProvider implemented)
  - Save/read/remove operations with streaming support
  - SHA-256 checksum calculation and verification
  - Path resolution and directory management
- **Storage Registry**: Provider registration and default provider management
- **Integrity Checker**: Background job to verify document checksums and detect corruption
  - Batch processing with configurable batch size
  - Automatic remediation with re-upload support
  - Status tracking (healthy/stale) with metadata
- **Metadata Utilities**: Deep merge for document metadata with type safety

### 6. **Admin Authentication Module** (`apps/api`)
- **Short-lived Admin Sessions**: Issues JWTs (default 15 minutes) for validated admin keys
- **Hashed Admin Keys**: Secrets generated server-side, stored using salted + peppered scrypt hashes, returned only once
- **Key Lifecycle Management**: Create, rotate, and revoke admin keys while preserving rotation metadata
- **Audit Logging**: Every authentication attempt and key lifecycle change persisted to `admin_audit_logs` for traceability
- **Extensible Logging API**: Service exposes `logAction` helper for other modules to record privileged activity with contextual metadata

### 7. **LLM Package** (`packages/llm`)
- **Multi-Provider Support**: OpenAI, Anthropic Claude, and Ollama (local models)
- **Unified Interface**: Common abstraction across all providers with consistent response format
- **Streaming Support**: Real-time token streaming for all providers
- **Function Calling**: OpenAI-style function calling and Anthropic tool use
- **Embeddings**: Text embedding generation (OpenAI text-embedding-3-small)
- **Error Handling**: Provider-specific error translation and retry logic
- **Cost Tracking**: Token usage tracking with optional cost calculation
- **Provider Factory**: Dynamic provider instantiation with configuration
- **Comprehensive Tests**: Full test coverage for all 3 providers (PR #23)

### 8. **RAG Package** (`packages/rag`)
- **Document Loaders**: PDF (pdf-parse), DOCX (mammoth), TXT, and Markdown
- **Text Chunking**: Fixed-size, semantic (paragraph-based), and recursive strategies
- **Embeddings Service**: Batch processing with OpenAI text-embedding-3-small
- **Vector Search**: Cosine similarity with pgvector IVFFlat index
- **Keyword Search**: Full-text search with PostgreSQL tsvector (BM25-style)
- **Hybrid Retrieval**: Weighted fusion of keyword (0.3) and vector (0.7) results
- **Knowledge Base Functions**: OpenAI function calling integration for RAG queries
- **Document Upload Pipeline**: Checksum-aware upload with version tracking
- **Storage Providers**: Pluggable storage backends (LocalStorageProvider implemented)
- **Integrity Checker**: Background job to verify document checksums and detect corruption
- **Comprehensive Tests**: Unit and integration tests with mock Prisma (PR #22)

### 9. **Channel Adapters** (`packages/channels`)
- **WhatsApp Cloud API**: Webhook verification, signature validation, message normalization, media handling
- **Messenger Platform**: Webhook verification, app_secret signature, typing indicators, message sending
- **WebChat (Socket.IO)**: Real-time bidirectional communication, authentication, message events
- **Base Adapter**: Abstract class with common patterns for all channels
- **Message Normalization**: Convert channel-specific formats to unified `NormalizedMessage`
- **Media Support**: Download, upload, and storage integration for images, videos, documents
- **Comprehensive Tests**: Full test coverage for all adapters (PR #17)

### 10. **Orchestrator Package** (`packages/orchestrator`)
- **Message Pipeline**: End-to-end message processing with LLM integration
- **Conversation Manager**: Create, retrieve, and update conversations with message recording
- **Config Cache**: Tenant configuration caching with TTL and invalidation
- **RAG Retriever**: Hybrid retrieval integration with configurable weights
- **Function Registry**: Register and execute custom functions with tenant scope
- **LLM Integration**: Multi-turn conversations with function calling (up to 5 iterations)
- **Context Builder**: System prompts with RAG context and conversation history
- **Human Handoff**: Keyword-based handoff detection and conversation status updates
- **Error Handling**: Comprehensive error handling with logging and event emission
- **Comprehensive Tests**: Unit tests for orchestrator and message pipeline (PR #21)

### 11. **Admin Dashboard** (`apps/dashboard`)
- **Complete CRUD Operations**: Full create, read, update, delete functionality for all resources
- **Tenant Management**: Create tenants, configure AI settings, toggle active/inactive, delete tenants
- **Tenant Settings UI**: Visual configuration for:
  - AI model parameters (temperature, max tokens, top P)
  - System prompts and guardrails
  - Brand name, tone, and locale preferences
  - Feature toggles (RAG, function calling, human handoff)
  - Human handoff keywords
  - RAG configuration (top K, similarity threshold, hybrid weights)
  - **MCP Tool Integrations**: Enable/disable MCP servers per tenant with simple toggles
- **Channel Management**: Add/edit/delete channels with type-specific credential forms:
  - WhatsApp Business API configuration
  - Facebook Messenger configuration
  - Web Chat widget customization
  - Toggle active/inactive per channel
- **Document Management**: Upload/edit/delete knowledge base documents:
  - File upload support (.txt, .md, .json, .csv, .html)
  - Paste content directly
  - Document status indicators (pending, processing, indexed, failed)
  - Tenant selector dropdown
- **Webhook Management**: Configure/test/edit/delete webhooks:
  - Subscribe to multiple event types
  - Custom headers support
  - Webhook secret configuration
  - Test webhook delivery
  - Toggle active/inactive per webhook
- **MCP Server Management**: Global MCP server configuration:
  - Add/edit/delete MCP servers (Google Calendar, GitHub, etc.)
  - Configure command, arguments, and environment variables
  - Enable/disable servers globally
  - Per-tenant activation via simple ON/OFF toggles
- **Shared Components**: Reusable tenant selector dropdown across all pages
- **User Experience**:
  - Collapsible create/edit forms
  - Confirmation dialogs for destructive actions
  - Real-time validation and error messages
  - Loading states and success notifications
- **Documentation**: Comprehensive user guide at `apps/dashboard/DASHBOARD-GUIDE.md`

### 12. **MCP Integration** (`apps/api`)
- **Model Context Protocol Support**: Full MCP server integration for external tools
- **MCP Server CRUD**: Complete REST API for managing global MCP servers
  - Create/read/update/delete MCP servers
  - Configure command, arguments, environment variables
  - Enable/disable servers globally
- **MCP Client Service**: Production-ready MCP client implementation
  - JSON-RPC 2.0 over stdio communication
  - Tool discovery via `tools/list` RPC call
  - Tool execution via `tools/call` RPC call
  - Connection pooling and lifecycle management
  - Timeout handling and error recovery
- **Multi-Provider Support**:
  - **OpenAI**: Full function calling support (recommended)
  - **DeepSeek**: Cost-effective alternative with function calling (~17x cheaper)
  - **Ollama**: Local/free models with quick acknowledgment
- **Smart Routing Logic**: Intelligent request routing based on:
  - Tool availability detection
  - Provider function calling capabilities
  - Optional quick Ollama acknowledgment before tool execution
  - Automatic fallback when no tools needed
- **Per-Tenant Control**: Enable/disable MCP servers per tenant via dashboard
- **Pre-built Integrations**: Support for official MCP servers:
  - Google Calendar (events management)
  - GitHub (repositories, issues, PRs)
  - File System (read/write files)
  - PostgreSQL (database queries)
  - Custom MCP servers (your own tools)
- **Documentation**: Complete guide at `MCP-INTEGRATION-GUIDE.md`

### 13. **Testing & Quality Tooling** (PRs #24, #25, #26)
- **Unit Tests**: Vitest setup with 31 passing tests across all packages
- **Integration Tests**: Node.js test runner for RAG pipeline end-to-end testing
- **Code Quality**: ESLint with 0 errors (was 17), TypeScript strict mode
- **Security**: Reduced vulnerabilities from 23 to 7 (70% reduction)
- **Build System**: Turbo for fast parallel builds, all 10 packages building successfully
- **Development Tools**: Makefile, .editorconfig, CONTRIBUTING.md
- **Documentation**: VERSION file, PORTS.md, comprehensive deployment guides

---

## 📦 What Needs to Be Built

### 14. **API Server REST Routes** (`apps/api`)
✅ **COMPLETE** - Full REST API implementation with admin authentication:
- **Tenant Management**: Complete CRUD endpoints (GET, POST, PATCH, DELETE)
- **Channel Management**: Full endpoints to add/edit/remove/toggle channels per tenant
- **Document Management**: Upload/list/update/delete endpoints with metadata support
- **Webhook Management**: Complete CRUD for outgoing webhook configurations
- **MCP Server Management**: Complete CRUD endpoints for Model Context Protocol servers
- **Conversation API**: List conversations, get messages, update status
- **Chat Endpoint**: Smart routing with MCP tool integration and multi-provider support
- **Health & Metrics**: Health check endpoint showing database, Redis, and RabbitMQ status
- **Admin Authentication**: API key-based authentication with audit logging
- **Request Logging**: Request/response logging with correlation IDs
- **Error Handling**: Global error handler with consistent JSON error responses

### 15. **Production Deployment** ✅ **COMPLETE**
- **Docker Compose**: Complete stack running with PostgreSQL 16 + pgvector, Redis 7, RabbitMQ 3.13
- **Health Checks**: All services monitored with health endpoints
- **Nginx Configuration**: Reverse proxy configured for chat.genai.hr with SSL
- **SSL Certificates**: Let's Encrypt certificates (valid until 2026-01-07) with auto-renewal
- **Environment Variables**: Production `.env` with encrypted secrets
- **Database Migrations**: All Prisma migrations applied, pgvector extension enabled
- **PM2 Process Manager**: API running with auto-restart on system boot
- **Application**: Running on HTTPS at https://chat.genai.hr
- **Dashboard**: Fully deployed and accessible at https://chat.genai.hr
- **Deployment Summary**: Complete documentation at `/home/deploy/meta-chat-platform/DEPLOYMENT-SUMMARY.md`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- RabbitMQ 3+ (optional)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd meta-chat-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:push

# Enable pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Start development
npm run dev
```

### Database Setup

The Prisma schema includes pgvector for vector search. Ensure the extension is installed:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Environment Variables

Key variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/metachat"

# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Server
PORT="3000"
GLOBAL_API_KEY="your-secure-key"

# Optional: RabbitMQ
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
```

---

## 🔧 Development Guide

### Adding a New Channel Adapter

1. Create new file in `packages/channels/src/`
2. Extend base `ChannelAdapter` class
3. Implement:
   - `verifyWebhook()` - Validate incoming webhooks
   - `receiveMessage()` - Parse webhook payload to NormalizedMessage
   - `sendMessage()` - Send via channel API
4. Register in `packages/channels/src/index.ts`

### Implementing RAG Functions

1. Define function in `packages/rag/src/functions.ts`:

```typescript
export const getFAQ: FunctionDefinition = {
  name: 'get_faq',
  description: 'Search FAQ knowledge base',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  handler: async (params, context) => {
    // Implement search logic
    return 'FAQ answer...';
  }
};
```

2. Register in orchestrator's tool list

### Event Handling

Listen to events anywhere in the codebase:

```typescript
import { getEventManager, EventType } from '@meta-chat/events';

const eventManager = getEventManager();

eventManager.on(EventType.MESSAGE_RECEIVED, async (event) => {
  console.log('New message:', event.data);
});
```

---

## 📚 Architecture Decisions

### Why Monorepo?
- Shared code reuse (types, utils, database client)
- Atomic commits across packages
- Simplified dependency management
- Turbo for fast parallel builds

### Why pgvector over dedicated vector DB?
- One less service to manage
- PostgreSQL is already required
- Sufficient for 10M+ vectors
- Hybrid search (keyword + vector) in one query
- Can migrate to Pinecone/Weaviate later if needed

### Why RabbitMQ-first events with local cache?
- RabbitMQ guarantees delivery across services and instances
- Local cache (opt-in) keeps hot history and low-latency fan-out without coupling to in-process emitters
- Unified publishing path simplifies observability and failure handling

### Why OpenAI API vs self-hosted LLM?
- Faster time to market
- No GPU infrastructure needed
- Excellent function calling support
- Can swap to self-hosted (Ollama, vLLM) later

---

## 🎯 Current Status & Next Steps

### ✅ Completed (Milestones 0-3 Complete!)
- ✅ Foundation: Monorepo, shared packages, database, events
- ✅ AI Core: LLM providers (OpenAI, Anthropic, Ollama) with streaming and function calling
- ✅ RAG Engine: Document loaders, chunking, embeddings, hybrid retrieval
- ✅ Channel Adapters: WhatsApp, Messenger, WebChat with full test coverage
- ✅ Orchestrator: Message pipeline with LLM integration, RAG retrieval, function calling
- ✅ MCP Integration: Full Model Context Protocol support with multi-provider smart routing
- ✅ REST API: Complete CRUD operations for tenants, channels, documents, webhooks, MCP servers
- ✅ Admin Dashboard: Full management UI with MCP server management and per-tenant toggles
- ✅ Production Deployment: Running on HTTPS at chat.genai.hr with SSL and monitoring
- ✅ Quality: 31 unit tests passing, ESLint clean, 70% security vulnerability reduction
- ✅ Documentation: Comprehensive guides for deployment, dashboard usage, and MCP integration

### 🔄 In Progress (Milestone 4)
1. **End-to-End Testing** - Integration tests across full message flow
2. **Conversations UI** - Dashboard page to view and manage conversations
3. **Widget Deployment** - Deploy embeddable web chat widget

### 📋 Upcoming Priorities
1. **Rate Limiting** - Implement Redis-backed rate limiter for API protection
2. **Metrics & Monitoring** - Prometheus metrics, Grafana dashboards
3. **Load Testing** - Artillery/k6 performance testing under realistic load
4. **Security Audit** - Comprehensive security review and penetration testing
5. **Production Hardening** - Error handling, retry logic, circuit breakers
6. **API Documentation** - OpenAPI/Swagger documentation for REST endpoints
7. **Go-Live** - Production launch with monitoring and on-call procedures

---

## 📖 Reference Documentation

### API Endpoints (Planned)

#### Tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

#### Channels
- `POST /api/tenants/:id/channels` - Add channel
- `GET /api/tenants/:id/channels` - List channels
- `PUT /api/tenants/:id/channels/:channelId` - Update channel
- `DELETE /api/tenants/:id/channels/:channelId` - Remove channel

#### Documents
- `POST /api/tenants/:id/documents` - Upload document
- `GET /api/tenants/:id/documents` - List documents
- `DELETE /api/tenants/:id/documents/:docId` - Delete document
- `POST /api/tenants/:id/documents/:docId/reindex` - Trigger reindexing

#### Webhooks
- `POST /webhooks/whatsapp` - WhatsApp Cloud API webhook
- `POST /webhooks/messenger` - Messenger Platform webhook

### Database Schema

See `packages/database/prisma/schema.prisma` for the complete schema.

### Data Retention & Partitioning

- `messages` and `api_logs` are partitioned by month for faster pruning and queries
- Background jobs archive/delete data based on tenant retention policies
- Retention windows are configurable per tenant via the `TenantSettings.retention` object

Key models:
- **Tenant**: Multi-tenant isolation root
- **Channel**: Per-tenant channel configurations
- **Conversation**: Ongoing conversations
- **Message**: Individual messages
- **Document**: Uploaded files for RAG
- **Chunk**: Text chunks with vector embeddings
- **Webhook**: Outgoing webhook configurations
- **Event**: Event log for debugging

---

## 🤝 Contributing

This is a starting point. Continue building:
1. Follow the architecture patterns established
2. Use the shared types and utilities
3. Add tests for new functionality
4. Update documentation

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

This project synthesizes best practices from:
- [wassengerhq/whatsapp-chatgpt-bot](https://github.com/wassengerhq/whatsapp-chatgpt-bot)
- [EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api)
- [Tiledesk/tiledesk](https://github.com/Tiledesk/tiledesk)
- [infiniflow/ragflow](https://github.com/infiniflow/ragflow)

---

**Built with ❤️ for production-grade conversational AI**
