# System Inspection Prompt - Meta Chat Platform

**Use this prompt with an AI inspector to thoroughly review the system design**

---

## INSPECTION PROMPT

You are a senior software architect and security auditor performing a comprehensive design review of the Meta Chat Platform. Your goal is to identify potential issues, breaking points, inconsistencies, outdated components, security loopholes, and architectural flaws before any major development begins.

### Context

Review the following documentation in this repository:
- `README.md` - Project introduction and overview
- `PROJECT-OVERVIEW.md` - High-level system design
- `docs/ARCHITECTURE.md` - Detailed technical architecture
- `docs/DEPLOYMENT.md` - VPS deployment plan
- `docs/SYSTEM-CONSTRAINTS.md` - Development constraints
- `docs/TODO.md` - Task breakdown
- `docs/LLM-PROVIDERS.md` - Multi-LLM provider support
- `packages/database/prisma/schema.prisma` - Database schema
- `packages/shared/src/types.ts` - TypeScript type definitions
- `packages/events/src/` - Event system implementation
- `.env.example` - Configuration template

### Your Task

Perform a thorough inspection covering these areas:

---

## 1. ARCHITECTURE REVIEW

**Analyze the overall system architecture:**

- [ ] Is the monorepo structure appropriate for this scale?
- [ ] Are the package boundaries well-defined and maintainable?
- [ ] Is there tight coupling between packages that will cause issues?
- [ ] Are there missing packages or components?
- [ ] Is the event-driven architecture overengineered or underengineered?
- [ ] Will EventEmitter2 + RabbitMQ cause complexity issues?
- [ ] Is the separation between API, channels, orchestrator, and RAG logical?
- [ ] Are there circular dependencies lurking?
- [ ] Is the technology stack modern and well-supported?
- [ ] Are there better alternatives to any chosen technologies?

**Specific questions:**
1. Why use both EventEmitter2 AND RabbitMQ? Is this redundant?
2. Why pgvector instead of a dedicated vector database?
3. Is Express.js the right choice or should we use Fastify/NestJS?
4. Is the packages/ structure going to create dependency hell?

---

## 2. DATABASE SCHEMA REVIEW

**Examine `packages/database/prisma/schema.prisma`:**

- [ ] Are indexes placed correctly for query patterns?
- [ ] Is multi-tenancy properly isolated?
- [ ] Could there be N+1 query problems?
- [ ] Are cascade deletes safe or will they cause data loss?
- [ ] Is the `settings Json` field a bad idea (should be structured)?
- [ ] Are there missing foreign keys?
- [ ] Is the `Chunk.embedding` field properly indexed?
- [ ] Will the `Message` table grow too large without partitioning?
- [ ] Are there missing fields for audit trails?
- [ ] Is the `ApiLog` table going to cause disk space issues?

**Specific issues to check:**
1. **Tenant isolation**: Can one tenant access another's data through any query?
2. **Vector search performance**: Will cosine similarity queries be slow at scale?
3. **Message retention**: No TTL or archival strategy for old messages
4. **Document storage**: Storing file paths in DB - what if files get deleted?
5. **Channel config**: Storing credentials in JSON - encryption handled where?

**Potential breaking points:**
- What happens when `Message` table hits 10M rows?
- What happens when `Chunk` table hits 1M vectors?
- How do we handle tenant deletion cascades safely?

---

## 3. SECURITY ANALYSIS

**Identify security vulnerabilities:**

- [ ] **Authentication**: Is API key auth sufficient or do we need OAuth?
- [ ] **Authorization**: Can tenant A access tenant B's resources?
- [ ] **Injection attacks**: Are Prisma queries safe from SQL injection?
- [ ] **XSS**: Is user content sanitized before rendering?
- [ ] **CORS**: Is CORS configuration too permissive?
- [ ] **Rate limiting**: Per-tenant limits can be bypassed how?
- [ ] **Webhook signatures**: Are all webhook verifications implemented correctly?
- [ ] **API key storage**: Are tenant API keys properly encrypted in DB?
- [ ] **Environment variables**: Are secrets exposed in logs?
- [ ] **File uploads**: Can malicious files be uploaded?

**Specific loopholes:**
1. **Global API key**: Single key for all admin operations - no rotation strategy
2. **Tenant API keys**: Stored in `Tenant.apiKey` - hashed or plaintext?
3. **Channel credentials**: Stored in `Channel.config` JSON - encrypted?
4. **Webhook endpoints**: No mutual TLS or advanced auth
5. **WebSocket auth**: JWT tokens - how are they invalidated?

**Attack vectors to consider:**
- API key leakage
- Tenant impersonation
- Message injection
- Document poisoning (malicious RAG content)
- Cost attacks (spam LLM calls)
- Webhook flooding

---

## 4. MULTI-TENANCY ISOLATION

**Verify tenant isolation is bulletproof:**

- [ ] Can tenant A read tenant B's messages?
- [ ] Can tenant A delete tenant B's documents?
- [ ] Can tenant A trigger tenant B's webhooks?
- [ ] Are all database queries filtered by `tenantId`?
- [ ] Is there a global admin bypass that could be exploited?
- [ ] Are tenant settings validated before saving?
- [ ] Can a tenant set infinite rate limits?
- [ ] Can a tenant use another tenant's LLM API key?

**Missing features:**
- Tenant quotas (messages per day, documents, API calls)
- Tenant billing/usage tracking
- Tenant suspension mechanism
- Tenant data export (GDPR)

---

## 5. LLM PROVIDER INTEGRATION

**Review multi-LLM provider design:**

- [ ] Is the provider abstraction too leaky?
- [ ] Will switching providers mid-conversation cause issues?
- [ ] Are all providers properly error-handled?
- [ ] What happens if OpenAI is down?
- [ ] Is there a circuit breaker pattern?
- [ ] Are LLM responses validated before use?
- [ ] Can malicious LLM responses break the system?
- [ ] Is function calling safe (no arbitrary code execution)?

**Specific concerns:**
1. **OpenAI vs Anthropic format differences**: How are they normalized?
2. **Ollama local model**: What if the model isn't downloaded?
3. **Streaming**: Are all providers streaming compatible?
4. **Rate limits**: OpenAI has 10K TPM, Anthropic has different limits
5. **Cost explosion**: What if a tenant sends 1M tokens?

**Edge cases:**
- LLM returns malformed JSON
- LLM refuses to respond (content policy)
- LLM gets stuck in function calling loop (5 iterations enough?)
- Embedding model is down but chat model is up

---

## 6. RAG IMPLEMENTATION

**Analyze document processing and retrieval:**

- [ ] Can malicious PDFs crash the system?
- [ ] Is OCR needed for scanned PDFs?
- [ ] Are document upload sizes limited?
- [ ] Will chunking strategy work for all document types?
- [ ] Is hybrid search (keyword + vector) properly weighted?
- [ ] Can RAG return wrong tenant's documents?
- [ ] Is embedding generation batched properly?
- [ ] What happens if OpenAI embeddings API is down?

**Potential issues:**
1. **Document processing**: No queue, will block on large files
2. **Chunk metadata**: Lost during chunking (page numbers, sections)
3. **Vector search**: No re-ranking after retrieval
4. **Keyword search**: PostgreSQL tsvector might not be BM25-quality
5. **Document updates**: No versioning, can't reindex efficiently

**Breaking points:**
- 1000-page PDF upload
- 100 documents uploaded at once
- Document with non-UTF8 encoding
- Embedding API returns error mid-batch

---

## 7. CHANNEL ADAPTERS

**Examine messaging channel integrations:**

- [ ] Are webhook signatures verified correctly (HMAC)?
- [ ] What if WhatsApp changes their API format?
- [ ] Are media files stored securely?
- [ ] Is there a media file size limit?
- [ ] Can message delivery fail silently?
- [ ] Is there a message retry mechanism?
- [ ] Are typing indicators properly cleaned up?
- [ ] Can webhook endpoints be DDoSed?

**WhatsApp specific:**
- Webhook verification token stored where?
- Phone number ID can change - handled?
- Message status updates tracked?
- Media download can timeout - retry?

**Messenger specific:**
- App secret validation correct?
- Page access tokens can expire - refresh?
- Attachment limits respected?

**WebChat specific:**
- WebSocket reconnection logic?
- Message ordering guaranteed?
- Session management strategy?

---

## 8. MESSAGE ORCHESTRATION

**Review message processing pipeline:**

- [ ] Is the pipeline too rigid (hard to modify)?
- [ ] Are pipeline steps properly isolated?
- [ ] Can the pipeline handle errors gracefully?
- [ ] Is there a dead letter queue for failed messages?
- [ ] Can messages be processed out of order?
- [ ] Is conversation locking needed (concurrent messages)?
- [ ] Are long-running LLM calls timing out requests?
- [ ] Is the pipeline idempotent (can retry safely)?

**Specific issues:**
1. **No queue**: Messages processed synchronously, will block
2. **No retry**: If LLM fails, message is lost
3. **No timeout**: LLM call could hang forever
4. **No circuit breaker**: If LLM is down, all messages fail
5. **No rate limiting**: Can overwhelm LLM API

**Edge cases:**
- User sends 100 messages in 1 second
- LLM takes 30 seconds to respond
- Conversation has 10K messages (context too long)
- Function calling takes 60 seconds to execute

---

## 9. API DESIGN

**Evaluate REST API and WebSocket design:**

- [ ] Are REST endpoints RESTful?
- [ ] Is versioning considered (/api/v1/...)?
- [ ] Are responses consistently formatted?
- [ ] Is pagination implemented for list endpoints?
- [ ] Are query parameters validated?
- [ ] Is there API documentation (OpenAPI/Swagger)?
- [ ] Are error codes consistent?
- [ ] Is the WebSocket protocol well-defined?

**Missing features:**
- API versioning strategy
- Bulk operations (upload 100 documents)
- Webhook testing endpoint
- API usage analytics
- GraphQL consideration

**Inconsistencies:**
- Some endpoints return `data`, others return direct object
- Error format not standardized
- Date formats (ISO 8601? Unix timestamps?)

---

## 10. DEPLOYMENT STRATEGY

**Review VPS deployment plan:**

- [ ] Is Docker Compose appropriate for production?
- [ ] Are container restart policies correct?
- [ ] Is health check monitoring sufficient?
- [ ] Are logs properly aggregated?
- [ ] Is there a rollback strategy?
- [ ] Are database migrations handled safely?
- [ ] Is zero-downtime deployment possible?
- [ ] Are secrets managed properly?

**VPS-specific concerns:**
1. **Single point of failure**: One VPS, no redundancy
2. **Resource limits**: 5.4GB RAM - what if exceeded?
3. **Disk space**: 370GB - what's the growth plan?
4. **Backup strategy**: Daily backups - who tests restores?
5. **Nginx**: Single reverse proxy - what if it crashes?

**Missing:**
- Container orchestration (Kubernetes)
- Load balancing
- Auto-scaling
- Disaster recovery plan
- Monitoring/alerting (beyond Netdata)

---

## 11. SCALABILITY ASSESSMENT

**Identify scalability bottlenecks:**

- [ ] Can the system handle 1000 messages/second?
- [ ] Can the system handle 100 concurrent WebSocket connections?
- [ ] Will PostgreSQL connection pool be exhausted?
- [ ] Will Redis become a bottleneck?
- [ ] Can the system scale horizontally?
- [ ] Are there stateful components preventing scaling?
- [ ] Will file storage become an issue?

**Bottlenecks:**
1. **Single PostgreSQL instance**: No read replicas
2. **Local file storage**: Can't share across multiple API instances
3. **EventEmitter2**: In-process, won't work across instances
4. **WebSocket sticky sessions**: Required but not configured
5. **LLM API rate limits**: Shared across all tenants

**At what scale does this break?**
- 10 tenants? ✅ Fine
- 100 tenants? ⚠️ Maybe
- 1000 tenants? ❌ Will fail

---

## 12. ERROR HANDLING

**Evaluate error handling strategy:**

- [ ] Are all external API calls wrapped in try-catch?
- [ ] Are errors logged with sufficient context?
- [ ] Are errors exposed to users safely (no stack traces)?
- [ ] Is there a global error handler?
- [ ] Are async errors caught properly?
- [ ] Are database errors handled gracefully?
- [ ] Are webhook delivery failures retried?

**Missing:**
- Error tracking service (Sentry)
- Error codes enumeration
- User-friendly error messages
- Retry strategies documented
- Circuit breaker patterns

---

## 13. COST ANALYSIS

**Identify cost explosion risks:**

- [ ] Can a malicious user drain LLM credits?
- [ ] Are there per-tenant spending limits?
- [ ] Is embedding generation cost-optimized?
- [ ] Are LLM responses cached?
- [ ] Is there cost alerting?

**Cost scenarios:**
1. **Tenant sends 1M messages**: No daily limit
2. **Tenant uploads 10GB of documents**: No size limit
3. **Embedding regeneration**: No caching, costly
4. **GPT-4o vs GPT-4o-mini**: 10x price difference
5. **Streaming responses**: Charged for all tokens, even if user disconnects

---

## 14. DOCUMENTATION CONSISTENCY

**Check for documentation issues:**

- [ ] Do code examples work?
- [ ] Are environment variable names consistent?
- [ ] Is the TODO.md realistic?
- [ ] Are architecture diagrams accurate?
- [ ] Are there contradictions between docs?

**Found issues:**
- README says "PostgreSQL 15+", .env.example shows localhost:5432 (not containerized)
- ARCHITECTURE.md mentions "Passport" but package.json doesn't include it
- TODO.md has 400+ tasks - is this achievable?
- LLM-PROVIDERS.md mentions encryption but no implementation yet

---

## 15. EDGE CASES & FAILURE MODES

**Think of weird scenarios:**

- [ ] User sends empty message
- [ ] User sends 10MB message
- [ ] User sends message in Emoji only
- [ ] Conversation has 0 messages (RAG query fails?)
- [ ] Tenant has 0 documents (RAG disabled?)
- [ ] LLM returns empty response
- [ ] LLM returns response in wrong language
- [ ] Webhook URL is localhost (SSRF?)
- [ ] Channel credentials expire mid-conversation
- [ ] Database runs out of connections
- [ ] Redis crashes (rate limiting breaks?)
- [ ] RabbitMQ is down (events lost?)

---

## 16. TECHNOLOGY CHOICES

**Question the technology stack:**

- [ ] Why TypeScript instead of Go/Rust for performance?
- [ ] Why Express instead of Fastify/NestJS for structure?
- [ ] Why Prisma instead of raw SQL or TypeORM?
- [ ] Why pgvector instead of Pinecone/Weaviate/Qdrant?
- [ ] Why EventEmitter2 instead of just RabbitMQ?
- [ ] Why Redis instead of Valkey (Redis fork)?
- [ ] Why Turbo instead of Nx or pnpm workspaces?

**Outdated components:**
- Node.js 20 (latest is 20.x, but 22 LTS coming)
- Prisma 5.11.0 (check for security updates)
- Express.js (no major updates, consider alternatives)

---

## 17. MISSING FEATURES

**What's not in the plan:**

- [ ] User management (human agents)
- [ ] Role-based access control (RBAC)
- [ ] Conversation tags/categories
- [ ] Sentiment analysis
- [ ] A/B testing framework
- [ ] Multi-language support (i18n)
- [ ] Analytics dashboard
- [ ] Conversation transcripts export
- [ ] GDPR compliance tools (data deletion)
- [ ] SLA monitoring
- [ ] Custom function definitions per tenant

---

## YOUR DELIVERABLE

Provide a comprehensive report with:

### 1. CRITICAL ISSUES (Must Fix Before Launch)
List issues that will cause:
- Data loss
- Security breaches
- System crashes
- Tenant data leaks

### 2. HIGH-PRIORITY ISSUES (Fix Before Production)
List issues that will cause:
- Performance problems
- Scalability limitations
- Cost explosions
- Poor UX

### 3. MEDIUM-PRIORITY ISSUES (Fix Before Scale)
List issues that will cause:
- Maintenance headaches
- Technical debt
- Limited flexibility

### 4. LOW-PRIORITY ISSUES (Nice to Have)
List issues that are:
- Minor improvements
- Edge cases
- Future enhancements

### 5. ARCHITECTURAL RECOMMENDATIONS
Suggest:
- Better patterns
- Alternative technologies
- Simplifications
- Missing components

### 6. SECURITY HARDENING CHECKLIST
Provide specific actions:
- [ ] Implement X
- [ ] Add validation for Y
- [ ] Encrypt Z

### 7. SCALABILITY ROADMAP
Answer:
- At what scale will this system break?
- What needs to change to handle 10x load?
- What needs to change to handle 100x load?

### 8. COST OPTIMIZATION SUGGESTIONS
Recommend:
- Where to cache
- Where to optimize
- Where to set limits

---

## INSPECTION GUIDELINES

**Be brutally honest. Assume:**
- Developers will make mistakes
- Users will be malicious
- APIs will fail
- Networks will be slow
- Disks will fill up
- Memory will leak

**Think like:**
- A hacker trying to break in
- A user trying to abuse the system
- A competitor trying to DDoS
- A regulator auditing for compliance

**Look for:**
- Race conditions
- Deadlocks
- Memory leaks
- N+1 queries
- Unbounded loops
- Unbounded growth
- Single points of failure
- Hard-coded values
- Magic numbers
- TODO comments in wrong places

---

## OUTPUT FORMAT

```markdown
# Meta Chat Platform - Design Inspection Report

## Executive Summary
[3-5 sentences on overall system health]

## Critical Issues (MUST FIX)
1. **Issue Name**
   - **Description**: What's wrong
   - **Impact**: What will break
   - **Recommendation**: How to fix
   - **Priority**: CRITICAL

## High-Priority Issues
[Same format]

## Medium-Priority Issues
[Same format]

## Low-Priority Issues
[Same format]

## Architectural Recommendations
[Bullet points]

## Security Hardening Checklist
- [ ] Action 1
- [ ] Action 2

## Scalability Analysis
- Current capacity: X
- Breaks at: Y
- To scale 10x: Z

## Cost Analysis
- Monthly cost estimate: $X
- Cost explosion risks: [list]

## Technology Stack Assessment
- Keep: [list]
- Replace: [list with alternatives]
- Upgrade: [list]

## Final Verdict
✅ Ready for production
⚠️ Needs fixes before production
❌ Major redesign required
```

---

**BEGIN INSPECTION NOW.**

Review all documentation and provide your detailed report.
