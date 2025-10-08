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
- **Message Queue**: RabbitMQ (optional)
- **Vector Store**: PostgreSQL with pgvector
- **LLM**: OpenAI API (GPT-4o)
- **Embeddings**: OpenAI text-embedding-3-small

### Project Structure

```
meta-chat-platform/
├── apps/
│   ├── api/              # Main API server (webhooks, REST API, WebSocket)
│   ├── web-widget/       # Embeddable chat widget
│   └── dashboard/        # Management UI
├── packages/
│   ├── shared/           # ✅ COMPLETE - Types, constants, utilities
│   ├── database/         # ✅ COMPLETE - Prisma schema, vector search, client
│   ├── events/           # ✅ COMPLETE - Event bus, webhook emitter, RabbitMQ
│   ├── rag/              # 📦 TODO - Document processing, embeddings, retrieval
│   ├── channels/         # 📦 TODO - WhatsApp, Messenger, WebChat adapters
│   └── orchestrator/     # 📦 TODO - Message routing, LLM integration
├── docs/                 # 📦 TODO - Architecture, API reference, deployment
└── docker/               # 📦 TODO - Docker Compose setup
```

---

## ✅ What's Been Built

### 1. **Shared Package** (`packages/shared`)
- **Types**: Comprehensive TypeScript types for messages, channels, events, RAG
- **Constants**: System limits, error codes, default configurations
- **Utils**: Retry logic, logger, ID generation, JSON parsing

### 2. **Database Package** (`packages/database`)
- **Prisma Schema**: Multi-tenant model with:
  - Tenants with API keys and settings
  - Channels (WhatsApp, Messenger, WebChat configs)
  - Conversations and Messages
  - Documents and Chunks with pgvector embeddings
  - Webhooks and Events
  - API logs
- **Vector Search**: Built-in cosine similarity search using pgvector
- **Keyword Search**: Full-text search with PostgreSQL tsvector
- **Client**: Singleton Prisma client with graceful shutdown

### 3. **Events Package** (`packages/events`)
- **Event Bus**: Internal pub/sub using EventEmitter2
- **Webhook Emitter**: Reliable webhook delivery with:
  - Exponential backoff retry logic
  - Per-tenant webhook configuration
  - Custom headers support
  - Parallel delivery to multiple webhooks
- **RabbitMQ Emitter**: Topic-based event publishing with:
  - Auto-reconnection on failure
  - Durable exchanges
  - Routing keys: `{tenantId}.{eventType}`
- **Event Manager**: Unified interface coordinating all emitters

---

## 📦 What Needs to Be Built

### 4. **RAG Engine** (`packages/rag`)
Build a complete RAG system with:
- **Document Loader**: PDF, TXT, MD, DOCX parsing
- **Chunker**: Template-based chunking (fixed-size, semantic, recursive)
- **Embeddings**: OpenAI text-embedding-3-small integration
- **Retriever**: Hybrid search combining:
  - Keyword search (BM25-style with PostgreSQL)
  - Vector search (cosine similarity with pgvector)
  - Weighted fusion (default: 0.3 keyword, 0.7 vector)
- **Functions**: OpenAI function calling definitions for tools

**Reference Implementation**: Use RAGFlow patterns from research

### 5. **Channel Adapters** (`packages/channels`)
Implement 3 channel adapters:

#### **WhatsApp Cloud API**
- **Webhook Verification**: GET endpoint with verify_token
- **Webhook Receiver**: POST endpoint with signature validation (HMAC-SHA256)
- **Message Normalization**: Convert WhatsApp format to NormalizedMessage
- **Send API**: POST to graph.facebook.com/v19.0/{phone_number_id}/messages
- **Media Handling**: Download from WhatsApp CDN, upload to storage

**Reference**: Evolution API WhatsApp Business implementation

#### **Messenger Platform**
- **Webhook Verification**: GET endpoint with verify_token
- **Webhook Receiver**: POST endpoint with app_secret signature
- **Message Normalization**: Convert Messenger format to NormalizedMessage
- **Send API**: POST to graph.facebook.com/v19.0/me/messages
- **Typing Indicators**: sender_action: typing_on/typing_off

**Reference**: Tiledesk Messenger connector

#### **Web Chat (WebSocket)**
- **WebSocket Server**: Socket.IO for real-time bidirectional communication
- **Authentication**: Session-based or JWT tokens
- **Events**: connect, disconnect, message, typing
- **Message Normalization**: Already in internal format

**Reference**: Tiledesk web widget architecture

### 6. **Orchestrator** (`packages/orchestrator`)
Build the core message processing engine:
- **Tenant Resolver**: Identify tenant from channel-specific IDs
- **Conversation Manager**: Create/retrieve conversations
- **Message Router**: Process flow:
  1. Check human handoff keywords
  2. RAG retrieval (if enabled)
  3. LLM completion with context
  4. Function calling (up to 5 iterations)
  5. Send response via channel
- **LLM Client**: OpenAI chat completions with streaming support
- **Context Builder**: Construct messages array from conversation history

**Reference**: Wassenger bot orchestration pattern

### 7. **API Server** (`apps/api`)
Express server with:
- **Authentication Middleware**: API key validation (global + per-tenant)
- **Rate Limiting**: Redis-backed rate limiter
- **REST Routes**:
  - `/api/tenants` - CRUD operations
  - `/api/tenants/:id/channels` - Channel management
  - `/api/tenants/:id/documents` - Document upload
  - `/api/tenants/:id/webhooks` - Webhook management
  - `/api/tenants/:id/conversations` - Conversation history
  - `/api/health` - Health check
- **Webhook Routes**:
  - `/webhooks/whatsapp` - WhatsApp Cloud API
  - `/webhooks/messenger` - Messenger Platform
- **WebSocket Server**: Web chat connections
- **Error Handling**: Async error wrapper, structured responses

### 8. **Web Widget** (`apps/web-widget`)
Lightweight embeddable chat (vanilla TS, <50KB):
- **Loader**: Iframe-based injection (load with one script tag)
- **WebSocket Client**: Connect to API WebSocket
- **UI Components**: Message list, input box, typing indicator
- **Customization**: Brand colors, position, greeting message

**Reference**: Tiledesk widget, simplified

### 9. **Dashboard** (`apps/dashboard`)
Simple management UI (Alpine.js):
- **Tenant Settings**: Brand name, tone, locale
- **Channel Configuration**: Add/edit WhatsApp, Messenger, WebChat
- **Document Upload**: Drag-drop PDFs, view indexing status
- **Conversation Logs**: Filter by channel, date, search
- **Health Dashboard**: Database, Redis, RabbitMQ status

### 10. **Docker Setup**
- `docker-compose.yml` with services:
  - PostgreSQL 15 with pgvector extension
  - Redis 7
  - RabbitMQ 3 (optional)
  - API server
  - Dashboard
- Environment variable configuration
- Volume mounts for storage

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

### Why EventEmitter2 + RabbitMQ?
- EventEmitter2: Fast in-process pub/sub
- RabbitMQ: Durable, scalable cross-service communication
- Start with EventEmitter2, add RabbitMQ when scaling

### Why OpenAI API vs self-hosted LLM?
- Faster time to market
- No GPU infrastructure needed
- Excellent function calling support
- Can swap to self-hosted (Ollama, vLLM) later

---

## 🎯 Next Steps (In Order)

1. **Implement RAG engine** - Document loader, chunker, embeddings, retriever
2. **Build WhatsApp adapter** - Webhook + send API (highest ROI)
3. **Build orchestrator** - Message routing + LLM integration
4. **Create API server** - REST routes + webhook endpoints
5. **Add Messenger adapter** - Reuse WhatsApp patterns
6. **Build web chat** - WebSocket server + simple widget
7. **Create dashboard** - Basic UI for management
8. **Docker setup** - Compose file for full stack
9. **Documentation** - API reference, deployment guide
10. **Testing** - Unit tests, integration tests, E2E tests

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
