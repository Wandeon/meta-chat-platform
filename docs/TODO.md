# Meta Chat Platform - Milestone Roadmap

**Milestone Tracking** | Last Updated: 2025-10-09

---

## 🚀 Milestone Summary

| Milestone | Owner | Deadline | Status | Focus |
|-----------|-------|----------|--------|-------|
| 0. Foundation Complete | Dana Morgan (Foundations Guild) | 2025-09-30 | ✅ Done | Monorepo, shared packages, infrastructure analysis |
| 1. AI Core & Security Baseline | Priya Sharma (AI Platform Lead) | 2025-11-15 | 🔄 In Progress | LLM/RAG services, secure API skeleton, secret management |
| 2. Channel & Orchestration Launch | Marco Díaz (Channel Integrations Lead) | 2025-12-20 | ⏳ Not Started | WhatsApp/Messenger/WebChat adapters, orchestrator pipeline |
| 3. Tenant Experience Platform | Tiana Lee (Product Platform Lead) | 2026-01-31 | ⏳ Not Started | REST APIs, dashboard, embeddable widget |
| 4. Deployment & Observability | Omar Nasser (DevOps Lead) | 2026-03-14 | ⏳ Not Started | Docker delivery, infrastructure automation, monitoring |
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

## 🔄 Milestone 1: AI Core & Security Baseline
- **Owner:** Priya Sharma (AI Platform Lead)
- **Deadline:** 2025-11-15

### 1.1 LLM Package (`packages/llm`)
- [ ] Create `LLMProvider` interface
- [ ] Define `LLMConfig` type
- [ ] Create `LLMResponse` type
- [ ] Implement provider factory pattern
- [ ] Add streaming support interface
- [ ] Create function calling types

#### 1.1.a OpenAI Provider
- [ ] Install `openai` SDK
- [ ] Implement OpenAI chat completions
- [ ] Add streaming support
- [ ] Implement function calling
- [ ] Add embeddings generation
- [ ] Handle rate limits and errors
- [ ] Add retry logic with exponential backoff

#### 1.1.b Anthropic Provider
- [ ] Install `@anthropic-ai/sdk`
- [ ] Implement Claude chat completions
- [ ] Add streaming support
- [ ] Implement tool use (function calling)
- [ ] Map Anthropic format to unified format
- [ ] Handle rate limits and errors
- [ ] Add retry logic

#### 1.1.c Ollama Provider (Local)
- [ ] Install `ollama` client or use REST API
- [ ] Implement chat completions
- [ ] Add streaming support
- [ ] Implement function calling (if supported)
- [ ] Handle connection errors
- [ ] Add timeout configuration
- [ ] Document performance considerations

#### 1.1.d Provider Manager
- [ ] Create factory to instantiate providers
- [ ] Add provider switching logic
- [ ] Implement fallback mechanism
- [ ] Add cost tracking per provider
- [ ] Cache provider instances
- [ ] Add provider health checks

### 1.2 RAG Package (`packages/rag`)
- [ ] Install `pdf-parse` for PDF files
- [ ] Install `mammoth` for DOCX files
- [ ] Implement PDF text extraction
- [ ] Implement DOCX text extraction
- [ ] Implement TXT/MD reading
- [ ] Extract metadata (title, author, pages)
- [ ] Handle encoding issues
- [ ] Add progress tracking for large files

#### 1.2.a Text Chunker
- [ ] Implement fixed-size chunking (512 tokens)
- [ ] Add overlap configuration (50-100 tokens)
- [ ] Implement semantic chunking (paragraph-based)
- [ ] Implement recursive chunking
- [ ] Preserve metadata in chunks
- [ ] Add chunk position tracking
- [ ] Test with various document types

#### 1.2.b Embeddings Generator
- [ ] Use OpenAI `text-embedding-3-small`
- [ ] Implement batch processing (up to 2048 chunks)
- [ ] Add retry logic for API failures
- [ ] Cache embeddings to avoid re-generation
- [ ] Track embedding costs
- [ ] Add progress tracking
- [ ] Handle rate limits

#### 1.2.c Retrieval Engines
- [ ] Implement cosine similarity search
- [ ] Add top-K retrieval
- [ ] Add minimum similarity threshold
- [ ] Optimize pgvector query performance
- [ ] Add vector index creation helper
- [ ] Use PostgreSQL `tsvector`
- [ ] Implement BM25-style ranking
- [ ] Add top-K retrieval for keyword search
- [ ] Create text search indexes
- [ ] Combine keyword + vector results
- [ ] Implement weighted fusion (0.3 keyword, 0.7 vector)
- [ ] Add re-ranking algorithm
- [ ] Deduplicate results
- [ ] Return top 5 chunks with scores
- [ ] Add configurable weights

#### 1.2.d Function Definitions
- [ ] Define `search_knowledge_base` function
- [ ] Add function parameter validation
- [ ] Implement function execution logic
- [ ] Add function result formatting
- [ ] Create function registry

### 1.3 AI Integration Tests
- [ ] Connect RAG to database package
- [ ] Connect LLM to RAG for embeddings
- [ ] Test end-to-end document indexing
- [ ] Test end-to-end retrieval
- [ ] Add unit tests
- [ ] Add integration tests

### 1.4 Security & Platform Guardrails
- [ ] Initialize Express.js app in `apps/api`
- [ ] Install dependencies (express, socket.io, etc.)
- [ ] Set up TypeScript configuration
- [ ] Create server entry point
- [ ] Add environment variable loading
- [ ] Set up graceful shutdown
- [ ] Implement request logging
- [ ] Add CORS configuration
- [ ] Add body parsing (JSON, multipart)
- [ ] Implement API key authentication (global + tenant)
- [ ] Add API key hashing in database
- [ ] Add rate limiting (Redis-backed)
- [ ] Create async error handler wrapper
- [ ] Add request ID generation
- [ ] Encrypt sensitive channel configs
- [ ] Copy `.env.example` to `.env`
- [ ] Generate database password
- [ ] Generate Redis password (optional)
- [ ] Generate RabbitMQ credentials
- [ ] Generate `GLOBAL_API_KEY`
- [ ] Add OpenAI/Anthropic API keys
- [ ] Configure Ollama URL (if using)
- [ ] Set production values

---

## ⏳ Milestone 2: Channel & Orchestration Launch
- **Owner:** Marco Díaz (Channel Integrations Lead)
- **Deadline:** 2025-12-20

### 2.1 Channels Package (`packages/channels`)
- [ ] Create `ChannelAdapter` abstract class
- [ ] Define `NormalizedMessage` type
- [ ] Define adapter interface methods
- [ ] Add error handling patterns
- [ ] Create adapter factory

#### 2.1.a WhatsApp Adapter
- [ ] Install WhatsApp Business SDK/API client
- [ ] Implement webhook verification (GET)
- [ ] Implement webhook receiver (POST)
- [ ] Validate HMAC-SHA256 signature
- [ ] Parse incoming message payload
- [ ] Normalize to `NormalizedMessage`
- [ ] Implement send message API
- [ ] Handle media download from WhatsApp CDN
- [ ] Handle media upload for sending
- [ ] Add typing indicators
- [ ] Handle message status updates
- [ ] Test with WhatsApp test numbers

#### 2.1.b Messenger Adapter
- [ ] Install Messenger SDK
- [ ] Implement webhook verification (GET)
- [ ] Implement webhook receiver (POST)
- [ ] Validate app_secret signature
- [ ] Parse incoming message payload
- [ ] Normalize to `NormalizedMessage`
- [ ] Implement send message API
- [ ] Handle attachments
- [ ] Add typing indicators
- [ ] Handle read receipts
- [ ] Test with Facebook test accounts

#### 2.1.c WebChat Adapter
- [ ] Install Socket.IO
- [ ] Implement WebSocket server
- [ ] Handle connection/disconnection
- [ ] Implement authentication (JWT/session)
- [ ] Handle incoming messages
- [ ] Normalize to `NormalizedMessage`
- [ ] Implement send message via WebSocket
- [ ] Handle typing events
- [ ] Add connection recovery
- [ ] Test with browser clients

### 2.2 Channel Testing
- [ ] Create mock webhook payloads
- [ ] Test message normalization
- [ ] Test message sending
- [ ] Test error scenarios
- [ ] Add unit tests for each adapter
- [ ] Add integration tests

### 2.3 Orchestrator Package (`packages/orchestrator`)
- [ ] Implement tenant lookup from channel config
- [ ] Cache tenant configurations
- [ ] Handle tenant not found errors
- [ ] Add tenant enablement check
- [ ] Implement conversation lookup
- [ ] Create new conversation if not exists
- [ ] Update conversation metadata
- [ ] Update `lastMessageAt` timestamp
- [ ] Handle conversation status transitions
- [ ] Check for handoff keywords in settings
- [ ] Match against message content
- [ ] Update conversation status to "assigned_human"
- [ ] Emit handoff event
- [ ] Stop AI processing when handed off
- [ ] Fetch conversation history from database
- [ ] Format messages for LLM (system, user, assistant)
- [ ] Add RAG context chunks to system message
- [ ] Apply token limits (e.g., last 10 messages)
- [ ] Add tenant-specific instructions
- [ ] Implement main processing pipeline
- [ ] Coordinate all steps in order
- [ ] Handle errors at each step
- [ ] Add logging and tracing
- [ ] Emit events at each stage
- [ ] Get LLM provider from tenant config
- [ ] Build messages array with context
- [ ] Add function definitions
- [ ] Call LLM with streaming
- [ ] Parse LLM response
- [ ] Handle function calls
- [ ] Execute function handlers
- [ ] Continue conversation if function called
- [ ] Limit to 5 function call iterations
- [ ] Check if RAG enabled for tenant
- [ ] Extract query from user message
- [ ] Call hybrid retrieval
- [ ] Format chunks for context
- [ ] Add to system message
- [ ] Format response for channel
- [ ] Call channel adapter send method
- [ ] Handle send failures with retry
- [ ] Log sent message to database
- [ ] Emit message sent event

### 2.4 Orchestration Testing & Guardrails
- [ ] Create mock tenant configurations
- [ ] Test full message flow end-to-end
- [ ] Test with each LLM provider
- [ ] Test RAG retrieval integration
- [ ] Test function calling
- [ ] Test human handoff
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] `GET /webhooks/whatsapp` - Verify webhook
- [ ] `POST /webhooks/whatsapp` - Receive WhatsApp messages
- [ ] `GET /webhooks/messenger` - Verify webhook
- [ ] `POST /webhooks/messenger` - Receive Messenger messages
- [ ] Validate webhook signatures
- [ ] Return 200 OK immediately
- [ ] Process messages asynchronously

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
- [ ] Create `apps/api/Dockerfile`
- [ ] Create `apps/dashboard/Dockerfile`
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
