# Meta Chat Platform - Milestone Roadmap

**Milestone Tracking** | Last Updated: 2025-10-09

---

## 🚀 Milestone Summary

| Milestone | Owner | Deadline | Status | Focus |
|-----------|-------|----------|--------|-------|
| 0. Foundation Complete | Dana Morgan (Foundations Guild) | 2025-09-30 | ✅ Done | Monorepo, shared packages, infrastructure analysis |
| 1. AI Core & Security Baseline | Priya Sharma (AI Platform Lead) | 2025-11-15 | ✅ Done | LLM/RAG services, secure API skeleton, secret management |
| 2. Channel & Orchestration Launch | Marco Díaz (Channel Integrations Lead) | 2025-12-20 | ✅ Done | WhatsApp/Messenger/WebChat adapters, orchestrator pipeline |
| 3. Tenant Experience Platform | Tiana Lee (Product Platform Lead) | 2026-01-31 | 🔄 In Progress | REST APIs, dashboard, embeddable widget |
| 4. Deployment & Observability | Omar Nasser (DevOps Lead) | 2026-03-14 | 🔄 In Progress | Docker delivery, infrastructure automation, monitoring |
| 5. Production Hardening | Riley Chen (QA Lead) | 2026-04-25 | ⏳ Not Started | Testing matrix, load/security audits, go-live playbook |

---

## ✅ Milestone 0: Foundation Complete
- **Owner:** Dana Morgan (Foundations Guild)
- **Deadline:** 2025-09-30 (Completed)

### 0.1 Project Structure
- [x] Initialize monorepo with Turbo
- [x] Set up TypeScript configuration
- [x] Create workspace packages structure
- [x] Add development scripts

### 0.2 Shared Package (`packages/shared`)
- [x] Define core TypeScript types
- [x] Create constants (limits, error codes)
- [x] Implement utilities (retry, logger, ID generation)
- [x] Export all shared functionality
- [x] Add structured logging with Pino - ✅ PR #8
- [x] Add security utilities (API key generation, hashing) - ✅ PR #13
- [x] Add secret encryption/decryption with AES-256-GCM - ✅ PR #16

### 0.3 Database Package (`packages/database`)
- [x] Design Prisma schema (multi-tenant)
- [x] Add pgvector extension support
- [x] Create Tenant, Channel, Conversation models
- [x] Create Message, Document, Chunk models
- [x] Create Webhook, Event, ApiLog models
- [x] Implement vector search functions
- [x] Implement keyword search functions
- [x] Create Prisma client singleton
- [x] Add TypeScript types generation
- [x] Add monthly partitions for messages and api_logs - ✅ PR #11
- [x] Implement data retention and archival jobs - ✅ PR #11
- [x] Add IVFFlat index for vector similarity search - ✅ PR #14
- [x] Implement tenant isolation with Row Level Security - ✅ PR #15
- [x] Add TenantApiKey and AdminApiKey models - ✅ PR #13
- [x] Add TenantSecret and ChannelSecret models - ✅ PR #16

### 0.4 Events Package (`packages/events`)
- [x] Set up EventEmitter2 for internal events
- [x] Create webhook emitter with retry logic
- [x] Implement RabbitMQ emitter
- [x] Build event manager to coordinate emitters
- [x] Define event type constants
- [x] Add event logging functionality

### 0.5 Documentation Baseline
- [x] Write main README.md
- [x] Create ARCHITECTURE.md
- [x] Create DEPLOYMENT.md (VPS-specific)
- [x] Create SYSTEM-CONSTRAINTS.md
- [x] Create PROJECT-OVERVIEW.md
- [x] Create TODO.md (this file)

### 0.6 System Analysis
- [x] Audit VPS resources (CPU, RAM, disk)
- [x] Identify existing services and ports
- [x] Plan port allocation
- [x] Verify Node.js version
- [x] Confirm Docker availability
- [x] Document deployment constraints

---

## ✅ Milestone 1: AI Core & Security Baseline
- **Owner:** Priya Sharma (AI Platform Lead)
- **Deadline:** 2025-11-15 (Completed 2025-10-09)

### 1.1 LLM Package (`packages/llm`)
- [x] Create `LLMProvider` interface - ✅ PR #23
- [x] Define `LLMConfig` type - ✅ PR #23
- [x] Create `LLMResponse` type - ✅ PR #23
- [x] Implement provider factory pattern - ✅ PR #23
- [x] Add streaming support interface - ✅ PR #23
- [x] Create function calling types - ✅ PR #23

#### 1.1.a OpenAI Provider
- [x] Install `openai` SDK - ✅ PR #23
- [x] Implement OpenAI chat completions - ✅ PR #23
- [x] Add streaming support - ✅ PR #23
- [x] Implement function calling - ✅ PR #23
- [x] Add embeddings generation - ✅ PR #23
- [x] Handle rate limits and errors - ✅ PR #23
- [x] Add retry logic with exponential backoff - ✅ PR #23

#### 1.1.b Anthropic Provider
- [x] Install `@anthropic-ai/sdk` - ✅ PR #23
- [x] Implement Claude chat completions - ✅ PR #23
- [x] Add streaming support - ✅ PR #23
- [x] Implement tool use (function calling) - ✅ PR #23
- [x] Map Anthropic format to unified format - ✅ PR #23
- [x] Handle rate limits and errors - ✅ PR #23
- [x] Add retry logic - ✅ PR #23

#### 1.1.c Ollama Provider (Local)
- [x] Install `ollama` client or use REST API - ✅ PR #23
- [x] Implement chat completions - ✅ PR #23
- [x] Add streaming support - ✅ PR #23
- [x] Implement function calling (if supported) - ✅ PR #23
- [x] Handle connection errors - ✅ PR #23
- [x] Add timeout configuration - ✅ PR #23
- [x] Document performance considerations - ✅ PR #23

#### 1.1.d Provider Manager
- [x] Create factory to instantiate providers - ✅ PR #23
- [x] Add provider switching logic - ✅ PR #23
- [x] Implement fallback mechanism - ✅ PR #23
- [x] Add cost tracking per provider - ✅ PR #23
- [x] Cache provider instances - ✅ PR #23
- [x] Add provider health checks - ✅ PR #23

### 1.2 RAG Package (`packages/rag`)
- [x] Add Document model with checksum, storageProvider, and version fields - ✅ PR #10
- [x] Implement storage provider interface - ✅ PR #10
- [x] Create LocalStorageProvider with SHA-256 checksums - ✅ PR #10
- [x] Build storage provider registry - ✅ PR #10
- [x] Create document upload pipeline with integrity checks - ✅ PR #10
- [x] Implement document integrity checker - ✅ PR #10
- [x] Add remediation support for corrupted documents - ✅ PR #10
- [x] Create metadata merge utilities - ✅ PR #10
- [x] Install `pdf-parse` for PDF files - ✅ PR #22
- [x] Install `mammoth` for DOCX files - ✅ PR #22
- [x] Implement PDF text extraction - ✅ PR #22
- [x] Implement DOCX text extraction - ✅ PR #22
- [x] Implement TXT/MD reading - ✅ PR #22
- [x] Extract metadata (title, author, pages) - ✅ PR #22
- [x] Handle encoding issues - ✅ PR #22
- [x] Add progress tracking for large files - ✅ PR #22

#### 1.2.a Text Chunker
- [x] Implement fixed-size chunking (512 tokens) - ✅ PR #22
- [x] Add overlap configuration (50-100 tokens) - ✅ PR #22
- [x] Implement semantic chunking (paragraph-based) - ✅ PR #22
- [x] Implement recursive chunking - ✅ PR #22
- [x] Preserve metadata in chunks - ✅ PR #22
- [x] Add chunk position tracking - ✅ PR #22
- [x] Test with various document types - ✅ PR #22

#### 1.2.b Embeddings Generator
- [x] Use OpenAI `text-embedding-3-small` - ✅ PR #22
- [x] Implement batch processing (up to 2048 chunks) - ✅ PR #22
- [x] Add retry logic for API failures - ✅ PR #22
- [x] Cache embeddings to avoid re-generation - ✅ PR #22
- [x] Track embedding costs - ✅ PR #22
- [x] Add progress tracking - ✅ PR #22
- [x] Handle rate limits - ✅ PR #22

#### 1.2.c Retrieval Engines
- [x] Implement cosine similarity search - ✅ PR #22
- [x] Add top-K retrieval - ✅ PR #22
- [x] Add minimum similarity threshold - ✅ PR #22
- [x] Optimize pgvector query performance - ✅ PR #22
- [x] Add vector index creation helper - ✅ PR #22
- [x] Use PostgreSQL `tsvector` - ✅ PR #22
- [x] Implement BM25-style ranking - ✅ PR #22
- [x] Add top-K retrieval for keyword search - ✅ PR #22
- [x] Create text search indexes - ✅ PR #22
- [x] Combine keyword + vector results - ✅ PR #22
- [x] Implement weighted fusion (0.3 keyword, 0.7 vector) - ✅ PR #22
- [x] Add re-ranking algorithm - ✅ PR #22
- [x] Deduplicate results - ✅ PR #22
- [x] Return top 5 chunks with scores - ✅ PR #22
- [x] Add configurable weights - ✅ PR #22

#### 1.2.d Function Definitions
- [x] Define `search_knowledge_base` function - ✅ PR #22
- [x] Add function parameter validation - ✅ PR #22
- [x] Implement function execution logic - ✅ PR #22
- [x] Add function result formatting - ✅ PR #22
- [x] Create function registry - ✅ PR #21

### 1.3 AI Integration Tests
- [x] Connect RAG to database package - ✅ PR #22
- [x] Connect LLM to RAG for embeddings - ✅ PR #22
- [x] Test end-to-end document indexing - ✅ PR #22
- [x] Test end-to-end retrieval - ✅ PR #22
- [x] Add unit tests - ✅ PR #24
- [x] Add integration tests - ✅ PR #24

### 1.4 Orchestrator Package (`packages/orchestrator`)
- [x] Create QueueConsumer with RabbitMQ - ✅ PR #9
- [x] Implement visibility timeout and retry logic - ✅ PR #9
- [x] Add exponential backoff with jitter - ✅ PR #9
- [x] Create MessageOrchestrator wrapper - ✅ PR #9
- [x] Implement queue topology management (per-tenant/channel) - ✅ PR #9
- [x] Add dead letter queue handling - ✅ PR #9
- [x] Create webhook acknowledgement queue utilities - ✅ PR #9
- [x] Add routing keys: {tenantId}.{channel}.{direction} - ✅ PR #9
- [x] Add tenant resolver logic - ✅ PR #21
- [x] Add conversation manager - ✅ PR #21
- [x] Implement message routing flow - ✅ PR #21
- [x] Add LLM integration - ✅ PR #21
- [x] Add context builder - ✅ PR #21

### 1.4 Admin Authentication (`apps/api`)
- [x] Create AdminKey model with hashed secrets - ✅ PR #12
- [x] Create AdminUser and AdminAuditLog models - ✅ PR #12
- [x] Implement admin key generation with scrypt - ✅ PR #12
- [x] Add admin key verification - ✅ PR #12
- [x] Implement JWT token issuance - ✅ PR #12
- [x] Add key rotation workflow - ✅ PR #12
- [x] Add key revocation support - ✅ PR #12
- [x] Implement audit logging for admin actions - ✅ PR #12
- [x] Export AdminAuthService from API package - ✅ PR #12

### 1.5 Security & Platform Guardrails
- [x] Initialize Express.js app in `apps/api` - ✅ PR #18
- [x] Install dependencies (express, socket.io, etc.) - ✅ PR #18
- [x] Set up TypeScript configuration - ✅ PR #18
- [x] Create server entry point - ✅ PR #18
- [x] Add environment variable loading - ✅ PR #18
- [x] Set up graceful shutdown - ✅ PR #18
- [x] Implement request logging - ✅ PR #18
- [x] Add CORS configuration - ✅ PR #18
- [x] Add body parsing (JSON, multipart) - ✅ PR #18
- [x] Implement API key authentication (global + tenant) - ✅ PR #13
- [x] Add API key hashing in database - ✅ PR #13
- [x] Add admin authentication system - ✅ PR #12
- [x] Create async error handler wrapper - ✅ PR #18
- [x] Add request ID generation - ✅ PR #18
- [x] Encrypt sensitive channel configs - ✅ PR #16
- [x] Add ESLint and code quality checks - ✅ PR #24, #25, #26
- [x] Fix security vulnerabilities (70% reduction) - ✅ PR #26
- [ ] Add rate limiting (Redis-backed) - TODO Milestone 3
- [ ] Copy `.env.example` to `.env` - TODO Deployment
- [ ] Generate production secrets - TODO Deployment

---

## ✅ Milestone 2: Channel & Orchestration Launch
- **Owner:** Marco Díaz (Channel Integrations Lead)
- **Deadline:** 2025-12-20 (Completed 2025-10-09)

### 2.1 Channels Package (`packages/channels`)
- [x] Create `ChannelAdapter` abstract class - ✅ PR #17
- [x] Define `NormalizedMessage` type - ✅ PR #17
- [x] Define adapter interface methods - ✅ PR #17
- [x] Add error handling patterns - ✅ PR #17
- [x] Create adapter factory - ✅ PR #17

#### 2.1.a WhatsApp Adapter
- [x] Install WhatsApp Business SDK/API client - ✅ PR #17
- [x] Implement webhook verification (GET) - ✅ PR #17
- [x] Implement webhook receiver (POST) - ✅ PR #17
- [x] Validate HMAC-SHA256 signature - ✅ PR #17
- [x] Parse incoming message payload - ✅ PR #17
- [x] Normalize to `NormalizedMessage` - ✅ PR #17
- [x] Implement send message API - ✅ PR #17
- [x] Handle media download from WhatsApp CDN - ✅ PR #17
- [x] Handle media upload for sending - ✅ PR #17
- [x] Add typing indicators - ✅ PR #17
- [x] Handle message status updates - ✅ PR #17
- [x] Test with WhatsApp test numbers - ✅ PR #17

#### 2.1.b Messenger Adapter
- [x] Install Messenger SDK - ✅ PR #17
- [x] Implement webhook verification (GET) - ✅ PR #17
- [x] Implement webhook receiver (POST) - ✅ PR #17
- [x] Validate app_secret signature - ✅ PR #17
- [x] Parse incoming message payload - ✅ PR #17
- [x] Normalize to `NormalizedMessage` - ✅ PR #17
- [x] Implement send message API - ✅ PR #17
- [x] Handle attachments - ✅ PR #17
- [x] Add typing indicators - ✅ PR #17
- [x] Handle read receipts - ✅ PR #17
- [x] Test with Facebook test accounts - ✅ PR #17

#### 2.1.c WebChat Adapter
- [x] Install Socket.IO - ✅ PR #17
- [x] Implement WebSocket server - ✅ PR #17
- [x] Handle connection/disconnection - ✅ PR #17
- [x] Implement authentication (JWT/session) - ✅ PR #17
- [x] Handle incoming messages - ✅ PR #17
- [x] Normalize to `NormalizedMessage` - ✅ PR #17
- [x] Implement send message via WebSocket - ✅ PR #17
- [x] Handle typing events - ✅ PR #17
- [x] Add connection recovery - ✅ PR #17
- [x] Test with browser clients - ✅ PR #17

### 2.2 Channel Testing
- [x] Create mock webhook payloads - ✅ PR #17
- [x] Test message normalization - ✅ PR #17
- [x] Test message sending - ✅ PR #17
- [x] Test error scenarios - ✅ PR #17
- [x] Add unit tests for each adapter - ✅ PR #17
- [x] Add integration tests - ✅ PR #17

### 2.3 Orchestrator Package (`packages/orchestrator`)
- [x] Implement tenant lookup from channel config - ✅ PR #21
- [x] Cache tenant configurations - ✅ PR #21
- [x] Handle tenant not found errors - ✅ PR #21
- [x] Add tenant enablement check - ✅ PR #21
- [x] Implement conversation lookup - ✅ PR #21
- [x] Create new conversation if not exists - ✅ PR #21
- [x] Update conversation metadata - ✅ PR #21
- [x] Update `lastMessageAt` timestamp - ✅ PR #21
- [x] Handle conversation status transitions - ✅ PR #21
- [x] Check for handoff keywords in settings - ✅ PR #21
- [x] Match against message content - ✅ PR #21
- [x] Update conversation status to "assigned_human" - ✅ PR #21
- [x] Emit handoff event - ✅ PR #21
- [x] Stop AI processing when handed off - ✅ PR #21
- [x] Fetch conversation history from database - ✅ PR #21
- [x] Format messages for LLM (system, user, assistant) - ✅ PR #21
- [x] Add RAG context chunks to system message - ✅ PR #21
- [x] Apply token limits (e.g., last 10 messages) - ✅ PR #21
- [x] Add tenant-specific instructions - ✅ PR #21
- [x] Implement main processing pipeline - ✅ PR #21
- [x] Coordinate all steps in order - ✅ PR #21
- [x] Handle errors at each step - ✅ PR #21
- [x] Add logging and tracing - ✅ PR #21
- [x] Emit events at each stage - ✅ PR #21
- [x] Get LLM provider from tenant config - ✅ PR #21
- [x] Build messages array with context - ✅ PR #21
- [x] Add function definitions - ✅ PR #21
- [x] Call LLM with streaming - ✅ PR #21
- [x] Parse LLM response - ✅ PR #21
- [x] Handle function calls - ✅ PR #21
- [x] Execute function handlers - ✅ PR #21
- [x] Continue conversation if function called - ✅ PR #21
- [x] Limit to 5 function call iterations - ✅ PR #21
- [x] Check if RAG enabled for tenant - ✅ PR #21
- [x] Extract query from user message - ✅ PR #21
- [x] Call hybrid retrieval - ✅ PR #21
- [x] Format chunks for context - ✅ PR #21
- [x] Add to system message - ✅ PR #21
- [x] Format response for channel - ✅ PR #21
- [x] Call channel adapter send method - ✅ PR #21
- [x] Handle send failures with retry - ✅ PR #21
- [x] Log sent message to database - ✅ PR #21
- [x] Emit message sent event - ✅ PR #21

### 2.4 Orchestration Testing & Guardrails
- [x] Create mock tenant configurations - ✅ PR #21
- [x] Test full message flow end-to-end - ✅ PR #21
- [x] Test with each LLM provider - ✅ PR #23
- [x] Test RAG retrieval integration - ✅ PR #22
- [x] Test function calling - ✅ PR #21
- [x] Test human handoff - ✅ PR #21
- [x] Add unit tests - ✅ PR #24
- [x] Add integration tests - ✅ PR #24
- [x] `GET /webhooks/whatsapp` - Verify webhook - ✅ PR #18
- [x] `POST /webhooks/whatsapp` - Receive WhatsApp messages - ✅ PR #18
- [x] `GET /webhooks/messenger` - Verify webhook - ✅ PR #18
- [x] `POST /webhooks/messenger` - Receive Messenger messages - ✅ PR #18
- [x] Validate webhook signatures - ✅ PR #18
- [x] Return 200 OK immediately - ✅ PR #18
- [x] Process messages asynchronously - ✅ PR #21

---

## ⏳ Milestone 3: Tenant Experience Platform
- **Owner:** Tiana Lee (Product Platform Lead)
- **Deadline:** 2026-01-31

### 3.1 API Server Feature Expansion (`apps/api`)
#### Authentication & Middleware Hardening
- [ ] Verify HMAC signatures with timestamp drift checks
- [ ] Create tenant secret rotation workflow
- [ ] Issue service-to-service tokens for internal jobs
- [ ] Document signing process and required headers

#### REST API Routes - Tenants
- [ ] `POST /api/tenants` - Create tenant
- [ ] `GET /api/tenants/:id` - Get tenant
- [ ] `PUT /api/tenants/:id` - Update tenant
- [ ] `DELETE /api/tenants/:id` - Delete tenant
- [ ] `GET /api/tenants` - List tenants (admin)
- [ ] Add input validation
- [ ] Add authorization checks
- [ ] `POST /api/tenants/:id/channels` - Add channel
- [ ] `GET /api/tenants/:id/channels` - List channels
- [ ] `GET /api/tenants/:id/channels/:channelId` - Get channel
- [ ] `PUT /api/tenants/:id/channels/:channelId` - Update channel
- [ ] `DELETE /api/tenants/:id/channels/:channelId` - Remove channel
- [ ] `POST /api/tenants/:id/documents` - Upload document
- [ ] `GET /api/tenants/:id/documents` - List documents
- [ ] `GET /api/tenants/:id/documents/:docId` - Get document
- [ ] `DELETE /api/tenants/:id/documents/:docId` - Delete document
- [ ] `POST /api/tenants/:id/documents/:docId/reindex` - Reindex
- [ ] Handle multipart file upload
- [ ] Validate file types and sizes
- [ ] Store files to disk/S3
- [ ] Trigger async document processing
- [ ] `GET /api/tenants/:id/conversations` - List conversations
- [ ] `GET /api/tenants/:id/conversations/:convId` - Get conversation
- [ ] `GET /api/tenants/:id/conversations/:convId/messages` - Get messages
- [ ] `PUT /api/tenants/:id/conversations/:convId` - Update status
- [ ] Add pagination
- [ ] Add filtering (by status, channel)
- [ ] `POST /api/tenants/:id/webhooks` - Add webhook
- [ ] `GET /api/tenants/:id/webhooks` - List webhooks
- [ ] `PUT /api/tenants/:id/webhooks/:webhookId` - Update webhook
- [ ] `DELETE /api/tenants/:id/webhooks/:webhookId` - Delete webhook
- [ ] Validate webhook URLs
- [ ] Add webhook secret support
- [ ] Set up Socket.IO server
- [ ] Implement connection handling
- [ ] Add JWT authentication for WebSocket
- [ ] Handle `message` event
- [ ] Handle `typing` event
- [ ] Emit `message` to clients
- [ ] Emit `typing` to clients
- [ ] Handle disconnections
- [ ] Add Redis adapter for scaling
- [ ] `GET /api/health` - Health check
- [ ] Check PostgreSQL connection
- [ ] Check Redis connection
- [ ] Check RabbitMQ connection (optional)
- [ ] Return service status
- [ ] Add metrics endpoint (Prometheus format)
- [ ] Implement global error handler
- [ ] Format error responses consistently
- [ ] Log errors with context
- [ ] Handle validation errors
- [ ] Handle database errors
- [ ] Handle external API errors

### 3.2 Web Widget (`apps/web-widget`)
- [ ] Create vanilla JS/TS widget
- [ ] Implement iframe-based injection
- [ ] Create one-line embed script
- [ ] Set up WebSocket client
- [ ] Add reconnection logic
- [ ] Create chat bubble button
- [ ] Create chat window
- [ ] Implement message list
- [ ] Add message input box
- [ ] Add typing indicator
- [ ] Add timestamp display
- [ ] Make responsive (mobile/desktop)
- [ ] Add brand color configuration
- [ ] Add position configuration (left/right)
- [ ] Add greeting message
- [ ] Add avatar support
- [ ] Add custom CSS option
- [ ] Set up build pipeline
- [ ] Minify and bundle
- [ ] Host on CDN (or serve from API)
- [ ] Create demo page

### 3.3 Dashboard (`apps/dashboard`)
- [ ] Choose framework (Alpine.js or React)
- [ ] Set up build pipeline
- [ ] Create layout structure
- [ ] Add routing
- [ ] Create login page
- [ ] Implement API key auth
- [ ] Store session token
- [ ] Add logout functionality
- [ ] Create tenants list page
- [ ] Add create tenant form
- [ ] Add edit tenant form
- [ ] Add delete confirmation
- [ ] Display tenant settings (JSON editor)
- [ ] Create channels list page
- [ ] Add WhatsApp configuration form
- [ ] Add Messenger configuration form
- [ ] Add WebChat configuration
- [ ] Test channel connections
- [ ] Create documents list page
- [ ] Add drag-drop upload
- [ ] Show indexing progress
- [ ] Display chunk count
- [ ] Add delete functionality
- [ ] Add reindex button
- [ ] Create conversations list
- [ ] Add filtering (by status, channel, date)
- [ ] Add search functionality
- [ ] Display conversation messages
- [ ] Show message metadata
- [ ] Add pagination
- [ ] Create webhooks list
- [ ] Add create webhook form
- [ ] Display webhook delivery logs
- [ ] Show success/failure stats
- [ ] Add webhook testing tool
- [ ] Display system status
- [ ] Show database connection
- [ ] Show Redis connection
- [ ] Show RabbitMQ connection
- [ ] Display API response times
- [ ] Show error rates
- [ ] Message volume charts
- [ ] Response time metrics
- [ ] LLM cost tracking
- [ ] User engagement stats

---

## ⏳ Milestone 4: Deployment & Observability
- **Owner:** Omar Nasser (DevOps Lead)
- **Deadline:** 2026-03-14

### 4.1 Docker Configuration
- [ ] Create `docker/api.Dockerfile`
- [ ] Create `docker/dashboard.Dockerfile`
- [ ] Optimize layer caching
- [ ] Use multi-stage builds
- [ ] Add health checks
- [ ] Create `docker-compose.yml`
- [ ] Add PostgreSQL service (ankane/pgvector)
- [ ] Add Redis service
- [ ] Add RabbitMQ service (optional)
- [ ] Add API service
- [ ] Add Dashboard service
- [ ] Configure networks
- [ ] Configure volumes
- [ ] Set up environment variables
- [ ] Add restart policies

### 4.2 Infrastructure Setup
- [ ] Create project directory `/home/deploy/meta-chat-platform`
- [ ] Clone repository
- [ ] Set up `.env` file
- [ ] Create storage directory
- [ ] Set proper permissions
- [ ] Start Docker Compose
- [ ] Verify PostgreSQL running
- [ ] Verify Redis running
- [ ] Verify RabbitMQ running (optional)
- [ ] Check container logs
- [ ] Run Prisma migrations (`npm run db:push`)
- [ ] Enable pgvector extension
- [ ] Verify tables created
- [ ] Create initial admin tenant (optional)
- [ ] Create `/etc/nginx/sites-available/chat.genai.hr`
- [ ] Configure API proxy (port 3000)
- [ ] Configure Dashboard proxy (port 3001)
- [ ] Enable WebSocket support
- [ ] Test nginx config
- [ ] Create symlink to sites-enabled
- [ ] Reload nginx
- [ ] Run certbot for `chat.genai.hr`
- [ ] Run certbot for `chat-admin.genai.hr`
- [ ] Verify SSL certificates
- [ ] Test HTTPS access
- [ ] Set up auto-renewal

### 4.3 Backup & Monitoring Foundations
- [ ] Create backup script for PostgreSQL
- [ ] Create backup script for storage files
- [ ] Add to cron (daily backups)
- [ ] Set 7-day retention
- [ ] Test backup restoration
- [ ] Add services to Netdata
- [ ] Configure log rotation
- [ ] Set up error alerting (optional)
- [ ] Monitor disk usage
- [ ] Monitor memory usage
- [ ] Track API response times

---

## ⏳ Milestone 5: Production Hardening
- **Owner:** Riley Chen (QA Lead)
- **Deadline:** 2026-04-25

### 5.1 Unit Tests
- [ ] Set up Jest/Vitest
- [ ] Write tests for shared utilities
- [ ] Write tests for database queries
- [ ] Write tests for event emitters
- [ ] Write tests for RAG functions
- [ ] Write tests for LLM providers
- [ ] Write tests for channel adapters
- [ ] Write tests for orchestrator
- [ ] Achieve >80% code coverage

### 5.2 Integration Tests
- [ ] Set up test database
- [ ] Test tenant CRUD operations
- [ ] Test channel configuration
- [ ] Test document upload and indexing
- [ ] Test message flow end-to-end
- [ ] Test webhook delivery
- [ ] Test WebSocket connections
- [ ] Test error scenarios

### 5.3 Load Testing
- [ ] Set up k6 or Artillery
- [ ] Test API endpoints under load
- [ ] Test WebSocket connections at scale
- [ ] Test database query performance
- [ ] Test RAG retrieval performance
- [ ] Test LLM response times
- [ ] Identify bottlenecks
- [ ] Optimize slow paths

### 5.4 Security Audit
- [ ] Review authentication implementation
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify input validation
- [ ] Check for XSS vulnerabilities
- [ ] Review CORS configuration
- [ ] Verify API key storage
- [ ] Check secrets management
- [ ] Review webhook signature validation
- [ ] Test rate limiting
- [ ] Run security scanner (e.g., OWASP ZAP)

### 5.5 Production Deployment
- [ ] Review all configuration
- [ ] Verify environment variables
- [ ] Run all tests
- [ ] Check database migrations
- [ ] Verify SSL certificates
- [ ] Review nginx config
- [ ] Test backup/restore
- [ ] Build production images
- [ ] Start Docker Compose
- [ ] Run database migrations
- [ ] Verify all services running
- [ ] Check health endpoints
- [ ] Test API functionality
- [ ] Test WebSocket connections
- [ ] Test webhook receivers
- [ ] Monitor logs for errors
- [ ] Check resource usage
- [ ] Test all critical paths
- [ ] Create test tenant
- [ ] Upload test document
- [ ] Send test messages on all channels
- [ ] Verify RAG retrieval works
- [ ] Verify LLM responses
- [ ] Verify webhooks deliver
- [ ] Monitor for 24 hours

### 5.6 Documentation Finalization
- [ ] Update README with deployment status
- [ ] Create API reference documentation
- [ ] Write admin user guide
- [ ] Document common issues and solutions
- [ ] Create video walkthrough (optional)
- [ ] Document API endpoints with examples
- [ ] Create Postman collection

---

## 🌟 Optional Enhancements (Future)

### Voice Channels
- [ ] Integrate Twilio for voice calls
- [ ] Add voice note support for WhatsApp
- [ ] Implement speech-to-text
- [ ] Implement text-to-speech

### Advanced Features
- [ ] Multi-language support
- [ ] A/B testing framework
- [ ] Conversation analytics
- [ ] Sentiment analysis
- [ ] Proactive messaging campaigns
- [ ] Cost tracking dashboard

### Self-Hosted LLM
- [ ] Optimize Ollama integration
- [ ] Add GPU support
- [ ] Test with Llama 3, Mistral, etc.
- [ ] Compare performance vs cloud APIs
- [ ] Document local deployment

### Scalability Horizons
- [ ] Kubernetes deployment
- [ ] Horizontal API scaling
- [ ] Redis cluster
- [ ] PostgreSQL replication
- [ ] CDN for static assets

---

## 🔁 Operating Rhythm

**Immediate Focus (Milestone 1):**
1. Finalize LLM provider abstractions
2. Build RAG ingestion and retrieval pipeline
3. Stand up secured API skeleton with keys, rate limiting, and logging

**This Month (Through Milestone 2):**
- Deliver WhatsApp/Messenger/WebChat adapters with signature verification
- Complete orchestrator flow with hybrid retrieval
- Validate webhook + channel integrations end-to-end

**Next Review:** After completing Milestone 1 (AI Core & Security Baseline)
