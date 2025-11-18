# Component Architecture

**Last Updated:** 2025-11-18  
**Status:** ✅ Current  
**Maintainer:** Architecture Team

## Overview

Meta Chat Platform follows a modular, monorepo architecture using Turbo for build orchestration. The codebase is organized into:

- **apps/**: Deployable applications (API Server, Worker, Dashboard, Web Widget)
- **packages/**: Shared libraries and services

This document provides detailed information about each component, its responsibilities, dependencies, and key implementation details.

---

## Apps

### 1. API Server (apps/api)

**Purpose**: Main HTTP/WebSocket gateway for all external communication

**Tech Stack**:
- Express.js 4.x, Socket.IO 4.x, Cors, Express-rate-limit, IORedis, Jsonwebtoken

**Port**: 3000 (production)

**Key Responsibilities**:
- Receive webhook events from WhatsApp and Messenger
- Provide REST API for tenant, channel, document, and conversation management
- WebSocket server for real-time web chat
- Request authentication and authorization
- Rate limiting per tenant, Health check endpoint

**Authentication**:
- HMAC-SHA256 signature verification for REST API
- JWT tokens for WebSocket connections
- API key + secret per tenant

**Dependencies**: @meta-chat/events, @meta-chat/orchestrator, @meta-chat/shared, @prisma/client

---

### 2. Worker (apps/worker)

**Purpose**: Async message processor consuming from RabbitMQ, orchestrating LLM interactions

**Key Responsibilities**:
- Consume messages from RabbitMQ queue
- Process messages through orchestration pipeline
- Execute RAG retrieval and LLM completion
- Handle function calling with iterative refinement
- Send responses back via channel adapters
- Emit events for audit and webhooks

**Message Processing Pipeline**:
1. Tenant Resolution 2. Conversation Management 3. Human Handoff Check 4. RAG Retrieval 5. Context Building 6. LLM Completion 7. Function Execution 8. Response Delivery 9. Event Emission

**Configuration**: WORKER_PREFETCH (5), WORKER_MAX_RETRIES (3), WORKER_VISIBILITY_TIMEOUT_MS (300000), ENABLE_CONFIDENCE_ESCALATION (true)

**Dependencies**: @meta-chat/channels, @meta-chat/database, @meta-chat/orchestrator, @meta-chat/shared

---

### 3. Dashboard (apps/dashboard)

**Purpose**: Admin web interface for managing tenants, channels, documents, and analytics

**Tech Stack**: React 18.x, TanStack Query, React Router, React Hook Form + Zod, Vite, TypeScript

**Key Features**: Tenant management, Channel configuration, Document upload, Conversation history viewer, Analytics dashboard, API key management, Webhook configuration

**Deployment**: Static hosting via Nginx at chat-admin.genai.hr (future)

---

### 4. Web Widget (apps/web-widget)

**Purpose**: Embeddable chat widget for websites

**Tech Stack**: React 18.x, Socket.IO client, Vite, TypeScript

**Key Features**: Minimizable chat window, Message history persistence (localStorage), Typing indicators, Media message support, Customizable theme via props, Mobile-responsive design

**Dependencies**: React, React DOM, Socket.IO client, Clsx, Vite, TypeScript

---

## Packages

### 1. Shared (packages/shared)

**Purpose**: Common utilities, types, and constants used across all packages and apps

**Key Exports**:
- Types: NormalizedMessage, TenantConfig, LLMProvider, EventType
- Utilities: createLogger(), withRequestContext(), createCorrelationId(), addToRequestContext(), ensureCorrelationId()
- Constants: SUPPORTED_MIME_TYPES, MAX_FILE_SIZE, DEFAULT_CHUNK_SIZE, RATE_LIMITS
- Secrets Management: SecretService (AES-256-GCM), withTenantSecret(), withChannelSecret()

**Dependencies**: pino

---

### 2. Database (packages/database)

**Purpose**: Prisma ORM, schema, and database utilities

**Key Exports**: prisma client, Repositories (Tenant, Channel, Conversation, Message, Document, Chunk, Event)

**Prisma Schema Highlights**:
- Multi-tenant with tenantId indexes
- pgvector for Chunk.embedding vector search
- Partitioning for Messages and Events by timestamp
- Cascade Deletes on tenant removal
- Audit Tables: AdminAuditLog, ApiLog

**Key Tables**: Tenant, Channel, ChannelSecret, Conversation, Message, Document, Chunk, Webhook, Event, TenantApiKey, TenantSecret, AdminApiKey, AdminUser, McpServer

**Database Maintenance**: node-cron scheduled jobs for stale data cleanup, document version tracking, API log retention

**Dependencies**: @meta-chat/shared, @prisma/client, node-cron, pgvector

---

### 3. Events (packages/events)

**Purpose**: Event bus for internal communication and webhook delivery

**Key Exports**: EventBus, RabbitMQPublisher, WebhookManager

**Event Flow**: Component emits → EventBus persists to DB → Publishes to RabbitMQ → WebhookManager delivers to tenant webhooks with retry

**Event Types**: message.received, message.sent, conversation.created, conversation.updated, human_handoff.requested, document.uploaded, document.indexed

**Retry Strategy**: Max 3 attempts, Exponential backoff (1s, 2s, 4s), Failures logged to database

**Dependencies**: @meta-chat/shared, @meta-chat/database, amqplib, axios

---

### 4. LLM (packages/llm)

**Purpose**: Unified interface for multiple LLM providers

**Supported Providers**: OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-small), Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku), Ollama (Llama 3.1, Mistral, DeepSeek, mxbai-embed-large)

**Key Exports**: LLMClient (factory), OpenAIClient, AnthropicClient, OllamaClient, EmbeddingClient

**Features**: Streaming responses, Function calling, Retry with exponential backoff, Token counting, Temperature and max tokens configuration

**Dependencies**: @anthropic-ai/sdk, openai, node-fetch

---

### 5. RAG (packages/rag)

**Purpose**: Document processing, embedding generation, and retrieval

**Key Components**:
- DocumentLoader: Parse PDFs (pdf-parse), DOCX (mammoth), TXT/MD, extract metadata
- TextChunker: Fixed-size chunking (512 tokens, 50 token overlap), preserve sentence boundaries
- EmbeddingGenerator: mxbai-embed-large (1024 dimensions), batch processing (100 chunks), retry with p-retry
- Retriever: Hybrid search (keyword 30% + vector 70%), Top-K limiting (default 5), Min similarity threshold (0.7)

**Dependencies**: @meta-chat/database, @meta-chat/shared, mammoth, openai, pdf-parse, p-retry

---

### 6. Orchestrator (packages/orchestrator)

**Purpose**: Message processing orchestration and coordination

**Key Exports**: MessageOrchestrator, processMessage(), buildContext(), executeFunctions()

**Processing Pipeline**: Resolve Tenant → Lookup Conversation → Human Handoff Check → RAG Retrieval → Context Building → LLM Completion → Function Execution → Response Formatting → Send Response → Event Emission

**Confidence-Based Escalation**: Tracks LLM confidence scores, escalates to human if below threshold, per-tenant configuration

**Dependencies**: @meta-chat/shared, @meta-chat/events, @meta-chat/database, @meta-chat/llm, @meta-chat/rag, amqplib

---

### 7. Channels (packages/channels)

**Purpose**: Platform-specific channel adapters for WhatsApp, Messenger, and WebChat

**Key Exports**: ChannelAdapter (base), WhatsAppAdapter, MessengerAdapter, WebChatAdapter

**Adapter Responsibilities**: Webhook verification, Message normalization, Sending messages via platform APIs, Media download/upload, Typing indicators, Read receipts

**WhatsAppAdapter**: HMAC-SHA256 signature verification, media downloads, text/media/location/contact messages, interactive buttons and lists, template messages

**MessengerAdapter**: HMAC-SHA1 signature verification, quick replies and buttons, text/images/generic templates, typing indicators and read receipts

**WebChatAdapter**: Socket.IO for real-time communication, JWT auth on connection, typing events, presence tracking

**Dependencies**: @meta-chat/shared, socket.io

---

## Build & Development

### Monorepo Structure

**Turbo Pipelines**: build, dev, test, lint, clean

**Build Order**: 1. shared → 2. database → 3. events, llm, rag, channels → 4. orchestrator → 5. api, worker → 6. dashboard, web-widget

### Testing

**Unit Tests**: Vitest with coverage via @vitest/coverage-v8 (npm run test:unit)
**Integration Tests**: Testcontainers for PostgreSQL/Redis (npm run test:integration)
**Performance Tests**: Artillery for load testing (npm run test:perf)

---

## Related Documentation

- [System Design](./system-design.md) - Overall architecture and data flow
- [Deployment Guide](/home/deploy/meta-chat-platform/docs/DEPLOYMENT.md) - Production deployment
- [API Reference](/home/deploy/meta-chat-platform/docs/API.md) - REST API endpoints
- [LLM Providers](/home/deploy/meta-chat-platform/docs/LLM-PROVIDERS.md) - LLM integration details
