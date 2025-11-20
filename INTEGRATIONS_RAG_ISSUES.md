# Channel Integrations and RAG/LLM System Analysis

**Analysis Date:** 2025-11-20
**Platform:** Meta Chat Platform
**VPS:** VPS-00
**Status:** CRITICAL - Multiple integration gaps identified

---

## Executive Summary

### Critical Findings

The Meta Chat Platform has **implemented core components** for channel integrations (WhatsApp, Messenger, WebChat) and RAG document processing with pgvector, but **critical integration gaps prevent these systems from functioning end-to-end**. While the underlying libraries are feature-complete, the API layer does not wire them together properly.

**Channel Status:** 🟡 PARTIAL - Adapters exist but API routing is incomplete
**RAG Status:** 🟡 PARTIAL - Pipeline exists but API uses legacy processor
**Vector Search:** 🟢 IMPLEMENTED - Database functions working
**Integration Testing:** 🔴 BLOCKED - Cannot validate end-to-end flows

### Key Issues

1. **RAG Pipeline Disconnected** - API routes use legacy `processDocument` service instead of `DocumentUploadPipeline`, bypassing PDF/DOCX loaders
2. **WhatsApp Webhook Missing** - No API route to receive WhatsApp messages
3. **WebChat Auth Mismatch** - Server authentication doesn't match adapter requirements
4. **Channel Message Routing Broken** - Server Socket.IO handlers don't call channel adapters
5. **Code Duplication** - Webhook validation logic repeated across adapters

---

## 1. RAG/LLM System Analysis

### PR #58: RAG Pipeline Review

**Status:** RAG components fully implemented but not integrated into API

#### Problem Statement

The `DocumentUploadPipeline` in `packages/rag` provides a complete RAG processing flow with file-type-specific loaders (PDF, DOCX, text), configurable chunking strategies, embedding generation, and metadata preservation. However, the API route at `apps/api/src/routes/documents.ts` **never uses this pipeline**.

#### Affected Components

- **File:** `/home/admin/meta-chat-platform/apps/api/src/routes/documents.ts` (lines 51-99)
- **File:** `/home/admin/meta-chat-platform/apps/api/src/services/documentProcessor.ts`
- **Package:** `@meta-chat/rag`

#### Completeness Assessment

| Component | Status | Evidence |
|-----------|--------|----------|
| Document Loaders (PDF, DOCX, Text) | ✅ IMPLEMENTED | `packages/rag/src/loaders/` - Full implementations with metadata extraction |
| Chunking Strategies (Fixed, Semantic, Recursive) | ✅ IMPLEMENTED | `packages/rag/src/chunker/index.ts` - Lines 7-254 |
| Embedding Generation with Caching | ✅ IMPLEMENTED | `packages/rag/src/embeddings.ts` - SHA-256 keyed cache, batch processing |
| Vector Storage with pgvector | ✅ IMPLEMENTED | Raw SQL insertion in upload-pipeline.ts (lines 287-311) |
| Hybrid Retrieval (Keyword + Vector) | ✅ IMPLEMENTED | `packages/rag/src/retriever.ts` - Configurable fusion weights |
| API Integration | ❌ MISSING | API uses separate `documentProcessor` service, not the pipeline |

#### Root Cause

The API was built with a legacy document processing flow (`documentProcessor.ts`) that only handles raw text content from `metadata.content`. When the RAG package was developed with proper file loaders, **the API routes were never updated** to use the new pipeline.

**Evidence:**
```typescript
// apps/api/src/routes/documents.ts:56-60
const content = payload.metadata?.content || '';
if (!content || typeof content !== 'string') {
  throw createHttpError(400, 'Document content is required in metadata.content');
}
```

The API expects raw text, not file uploads. It then calls `processDocument()` which re-chunks the raw text without using loaders.

#### Proposed Solution

**Option A: Minimal Integration (4-6 hours)**
1. Add multipart file upload handling to POST `/api/documents`
2. Pass buffer to `DocumentUploadPipeline.upload()` instead of `processDocument()`
3. Remove text-only restriction
4. Update tests to verify PDF/DOCX processing

**Option B: Full Refactor (8-12 hours)**
1. Implement Option A
2. Deprecate `documentProcessor.ts` service entirely
3. Consolidate all document processing through RAG pipeline
4. Add file type validation and size limits
5. Update dashboard UI to support file uploads (currently only accepts text)

#### Dependencies

- Multipart form parser (already available: `express-fileupload` or `multer`)
- Storage provider configuration (local storage already implemented)
- Dashboard changes if Option B chosen

#### Effort Estimate

- **Option A:** 4-6 hours (backend only, maintains backward compatibility)
- **Option B:** 8-12 hours (includes frontend changes, cleaner architecture)
- **Testing:** 2-3 hours (integration tests for each file type)

#### Integration Testing Needed

**VPS-00 Database Validation:**
```sql
-- Check if embeddings are being generated
SELECT
  d.id,
  d.filename,
  d.status,
  COUNT(c.id) as chunk_count,
  COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as embedded_chunks
FROM documents d
LEFT JOIN chunks c ON c."documentId" = d.id
WHERE d."tenantId" = '<tenant_id>'
GROUP BY d.id;

-- Test vector search functionality
SELECT
  id,
  content,
  1 - (embedding <=> '[0.1,0.2,...]'::vector) as similarity
FROM chunks
WHERE embedding IS NOT NULL
LIMIT 5;
```

**API Test:**
```bash
# Current behavior - only accepts text
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "test-tenant",
    "name": "test.pdf",
    "metadata": {"content": "raw text only"}
  }'

# Desired behavior - accepts file uploads
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -F "tenantId=test-tenant" \
  -F "name=test.pdf"
```

### Vector Search and Embeddings

**Status:** ✅ FULLY FUNCTIONAL

The database layer has working vector search implementations:

- **File:** `/home/admin/meta-chat-platform/packages/database/src/client.ts`
- **Functions:** `vectorSearch()` (lines 46-80), `keywordSearch()` (lines 83-109)
- **Database:** pgvector extension with IVFFlat index on `chunks.embedding`

**Evidence of Completeness:**
- Cosine similarity search with configurable threshold
- Normalized embeddings for consistent scoring
- Hybrid retrieval with keyword fallback
- Full-text search using PostgreSQL tsvector

**Can be validated on VPS-00:** YES ✅

---

## 2. Channel Integration Analysis

### PR #65: WhatsApp Adapter Review

**Status:** Adapter implemented, webhook route missing

#### Problem Statement

The `WhatsAppAdapter` in `packages/channels/src/whatsapp/whatsapp-adapter.ts` provides complete webhook verification, message normalization, sending, and media handling for WhatsApp Business API. However, **the API server does not expose a webhook endpoint** to receive incoming WhatsApp messages.

#### Affected Components

- **File:** `/home/admin/meta-chat-platform/packages/channels/src/whatsapp/whatsapp-adapter.ts` (Full implementation)
- **File:** `/home/admin/meta-chat-platform/apps/api/src/server.ts` (Missing route)
- **File:** `/home/admin/meta-chat-platform/apps/worker/src/channel-adapters.ts` (Outbound only)

#### Completeness Assessment

| Component | Status | Evidence |
|-----------|--------|----------|
| Webhook Verification (hub.challenge) | ✅ IMPLEMENTED | Lines 93-111 |
| Signature Validation (x-hub-signature-256) | ✅ IMPLEMENTED | HMAC verification with app secret |
| Message Normalization (text, media, location) | ✅ IMPLEMENTED | Lines 113-120, 244-329 |
| Outbound Sending (all message types) | ✅ IMPLEMENTED | Lines 122-221 |
| Media Upload/Download | ✅ IMPLEMENTED | Lines 350-466 |
| Status Notifications | ❌ NOT IMPLEMENTED | Webhook normalizer only processes messages, not statuses |
| API Webhook Route | ❌ MISSING | No route to receive webhooks |

#### Root Cause

The API server only has Stripe webhook routes under `/api/webhooks/`. There is **no generic webhook router** for channel webhooks. The channels package expects the API to:
1. Receive POST to `/api/webhooks/whatsapp`
2. Validate signature
3. Call `whatsappAdapter.receive(payload)`
4. Deliver normalized messages to orchestrator

This routing layer was never implemented.

#### Proposed Solution

**Webhook Router Implementation (3-4 hours)**

```typescript
// apps/api/src/routes/webhooks/channels.ts
import { Router } from 'express';
import { createChannelAdapter } from '@meta-chat/channels';
import { getPrismaClient } from '@meta-chat/database';

const router = Router();
const prisma = getPrismaClient();

router.get('/whatsapp', async (req, res) => {
  // Webhook verification
  const channel = await fetchChannelConfig(tenantId, 'whatsapp');
  const adapter = createChannelAdapter(buildContext(channel));
  const result = await adapter.verify({ query: req.query });
  res.status(result.status).send(result.body);
});

router.post('/whatsapp', async (req, res) => {
  // Receive webhook
  const channel = await fetchChannelConfig(tenantId, 'whatsapp');
  const adapter = createChannelAdapter(buildContext(channel));
  const result = await adapter.receive({
    body: req.body,
    headers: req.headers,
    rawBody: req.rawBody
  });
  // Route messages to orchestrator queue
  await publishToOrchestrator(result.messages);
  res.status(200).send('ok');
});

export default router;
```

**Add to server.ts:**
```typescript
import channelWebhookRouter from './routes/webhooks/channels';
app.use('/api/webhooks', channelWebhookRouter);
```

#### Dependencies

- Tenant resolution from webhook (may need channel-specific subdomain or token parameter)
- Orchestrator queue integration for inbound messages
- Error handling and retry logic for webhook failures

#### Effort Estimate

- **Webhook Router:** 3-4 hours
- **Tenant Resolution:** 2-3 hours
- **Orchestrator Integration:** 2-3 hours
- **Testing:** 2 hours (ngrok tunnel to Meta webhooks)
- **Total:** 9-12 hours

#### Integration Testing Needed

**Cannot validate on VPS-00 without Meta webhook access.** Requires:
- WhatsApp Business Account with approved phone number
- Meta Graph API app with webhook configuration
- Public webhook endpoint (ngrok or production domain)

**Testing Steps:**
1. Configure Meta webhook to point to `https://domain.com/api/webhooks/whatsapp?tenantId=xxx`
2. Send test message from WhatsApp to business number
3. Verify message appears in database and triggers orchestrator
4. Send outbound message via API
5. Verify delivery and read receipts

---

### PR #66: WebChat Implementation Review

**Status:** Adapter implemented, authentication and routing broken

#### Problem Statement

The `WebChatAdapter` expects clients to authenticate with `tenantId`, `userId`, `conversationId`, and optional token. The API server's Socket.IO middleware only validates `tenantId` and `userId` using JWT or HMAC. **Conversation ID is never validated or propagated**, and the server never joins sockets to conversation rooms, breaking all message delivery.

#### Affected Components

- **File:** `/home/admin/meta-chat-platform/packages/channels/src/webchat/webchat-adapter.ts` (Lines 81-156)
- **File:** `/home/admin/meta-chat-platform/apps/api/src/server.ts` (Lines 271-354)

#### Completeness Assessment

| Component | Status | Evidence |
|-----------|--------|----------|
| Socket.IO Setup | ✅ IMPLEMENTED | server.ts lines 252-369 |
| JWT Authentication | ✅ IMPLEMENTED | server.ts lines 280-297 |
| HMAC Authentication | ✅ IMPLEMENTED | server.ts lines 299-321 |
| Conversation Room Joining | ❌ BROKEN | Server joins tenant/user rooms, not conversation rooms |
| Message Routing to Adapter | ❌ BROKEN | Server logs messages but doesn't call adapter |
| Outbound Message Delivery | ❌ BROKEN | Adapter emits to conversation room server never joined |
| Reconnection Handling | ❌ MISSING | No message replay or session restoration |

#### Root Cause

The adapter and server were developed **separately without a shared contract**. The adapter expects:
- Conversation-level room isolation
- Messages routed through channel pipeline
- Conversation ID in authentication

The server provides:
- Tenant-level and user-level room isolation
- Direct message acknowledgment without processing
- No conversation ID validation

#### Proposed Solution

**Align Server with Adapter (4-6 hours)**

```typescript
// apps/api/src/server.ts - Update authentication
io.use((socket, next) => {
  const auth = socket.handshake.auth;
  // ... existing JWT/HMAC validation ...

  // Add conversation ID validation
  const conversationId = auth.conversationId;
  if (!conversationId) {
    return next(new Error('Conversation ID required'));
  }

  socket.data.conversationId = conversationId;
  next();
});

// Update connection handler
io.on('connection', async (socket) => {
  const { tenantId, userId, conversationId } = socket.data;

  // Join conversation room (required for adapter broadcasts)
  await socket.join(conversationId);

  // Fetch channel config and create adapter
  const channel = await fetchWebChatChannel(tenantId);
  const adapter = new WebChatAdapter(buildContext(channel), { io });

  // Route messages through adapter
  socket.on('message', async (payload) => {
    const normalized = adapter.normalizeInbound(socket, payload);
    await adapter.deliver([normalized]); // Triggers channel pipeline
    socket.to(conversationId).emit('message', normalized);
  });

  // Adapter handles outbound via io.to(conversationId).emit()
});
```

#### Dependencies

- Conversation ID must be included in widget authentication flow
- Widget SDK needs to generate or fetch conversation ID before connecting
- Orchestrator needs to know which conversation to route responses to

#### Effort Estimate

- **Server Updates:** 4-6 hours
- **Widget SDK Updates:** 2-3 hours (if conversation creation needed)
- **Testing:** 2 hours
- **Total:** 8-11 hours

#### Integration Testing Needed

**Can partially validate on VPS-00:**

```bash
# Test Socket.IO connection with conversation ID
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3000', {
  auth: {
    tenantId: 'test-tenant',
    userId: 'test-user',
    conversationId: 'test-conversation',
    token: 'test-token'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('message', { type: 'text', text: 'Hello' });
});

socket.on('message', (msg) => {
  console.log('Received:', msg);
});
"
```

---

### PR #67: Channel Connector Pattern Review

**Status:** Pattern implemented, code duplication exists

#### Problem Statement

The `ChannelAdapter` base class provides a clean abstraction, and all adapters (WhatsApp, Messenger, WebChat) implement the required methods (`verify`, `receive`, `send`). However, **webhook verification logic is duplicated** across WhatsApp and Messenger adapters, and the factory function requires editing for each new channel.

#### Affected Components

- **File:** `/home/admin/meta-chat-platform/packages/channels/src/adapter.ts` (Base class)
- **File:** `/home/admin/meta-chat-platform/packages/channels/src/index.ts` (Factory)
- All adapter implementations

#### Completeness Assessment

| Component | Status | Evidence |
|-----------|--------|----------|
| Base Interface | ✅ CLEAN | Abstract methods well-defined |
| Adapter Implementations | ✅ CONSISTENT | All implement verify/receive/send |
| Factory Pattern | 🟡 LEAKY | Requires editing createChannelAdapter() for new channels |
| Code Duplication | ❌ PRESENT | Webhook verification repeated in WhatsApp/Messenger |

#### Root Cause

Rapid development without refactoring. Webhook verification was copy-pasted between adapters instead of extracting to shared utilities.

#### Proposed Solution

**Extract Shared Utilities (2-3 hours)**

```typescript
// packages/channels/src/utils/webhook-verification.ts
export function verifyHubChallenge(
  query: Record<string, any>,
  expectedToken: string
): { success: boolean; status: number; body: string } {
  const mode = firstValue(query['hub.mode']);
  const token = firstValue(query['hub.verify_token']);
  const challenge = firstValue(query['hub.challenge']);

  if (mode === 'subscribe' && token === expectedToken) {
    return { success: true, status: 200, body: challenge ?? 'verified' };
  }
  return { success: false, status: 403, body: 'Invalid verify token' };
}

export function verifyHmacSignature(
  body: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expected = createHmac(algorithm, secret).update(body).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
```

**Use in Adapters:**
```typescript
// whatsapp-adapter.ts
async verify(payload: ChannelVerifyPayload) {
  return verifyHubChallenge(payload.query, this.config.verifyToken);
}

async receive(payload: ChannelReceivePayload) {
  const signature = getHeader(payload.headers, 'x-hub-signature-256');
  if (!verifyHmacSignature(payload.rawBody, signature, this.config.appSecret)) {
    throw new Error('Invalid signature');
  }
  // ... rest of processing ...
}
```

#### Dependencies

None - pure refactoring

#### Effort Estimate

- **Utility Extraction:** 2-3 hours
- **Adapter Updates:** 1-2 hours
- **Testing:** 1 hour
- **Total:** 4-6 hours

---

## 3. Integration Completeness Matrix

| Integration Point | WhatsApp | Messenger | WebChat | RAG/LLM |
|-------------------|----------|-----------|---------|---------|
| **Inbound Routing** | ❌ No webhook route | ❌ No webhook route | ❌ Auth mismatch | ✅ Can receive |
| **Outbound Sending** | ✅ Worker integrated | ✅ Worker integrated | ❌ Room mismatch | N/A |
| **Message Normalization** | ✅ Implemented | ✅ Implemented | ✅ Implemented | N/A |
| **Authentication** | ✅ HMAC signature | ✅ HMAC signature | ❌ Incomplete | N/A |
| **Media Handling** | ✅ Upload/download | ✅ Upload/download | ✅ URL-based | N/A |
| **Error Handling** | 🟡 No retry | 🟡 No retry | 🟡 No retry | ✅ Has retry |
| **Database Integration** | ✅ Worker queries | ✅ Worker queries | ✅ Server queries | ❌ Uses legacy service |
| **End-to-End Flow** | ❌ Blocked by webhook | ❌ Blocked by webhook | ❌ Blocked by auth | ❌ Blocked by API |

**Legend:**
- ✅ Fully implemented and functional
- 🟡 Implemented with limitations
- ❌ Missing or broken

---

## 4. Validation Plan for VPS-00

### What CAN Be Validated

#### RAG/Vector Search
```sql
-- 1. Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Verify embedding storage
SELECT
  COUNT(*) as total_chunks,
  COUNT(embedding) as embedded_chunks,
  AVG(pg_column_size(embedding)) as avg_embedding_size
FROM chunks;

-- 3. Test vector search
SELECT vectorSearch('tenant-id', ARRAY[0.1, 0.2, ...], 5, 0.7);

-- 4. Test keyword search
SELECT keywordSearch('tenant-id', 'test query', 5);

-- 5. Check document processing status
SELECT status, COUNT(*)
FROM documents
GROUP BY status;
```

#### Database Schema
```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('chunks', 'documents', 'channels', 'conversations');

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'chunks';
```

#### Channel Configuration
```sql
-- List configured channels
SELECT
  c.id,
  c.type,
  c.enabled,
  t.name as tenant_name,
  (c.config->>'phoneNumberId') as whatsapp_phone,
  (c.config->>'pageId') as messenger_page
FROM channels c
JOIN tenants t ON t.id = c."tenantId";
```

### What CANNOT Be Validated

#### Channel Webhooks
- Requires external webhook delivery from Meta
- Requires public endpoint (ngrok or production domain)
- Requires WhatsApp Business Account / Facebook Page

#### Document Upload
- Requires API route changes first
- Cannot test PDF/DOCX processing until pipeline integrated

#### WebChat E2E
- Requires widget deployed with proper auth
- Requires conversation ID propagation
- Requires server Socket.IO changes

---

## 5. Recommendations

### Immediate Priorities (Week 1)

#### 1. Fix RAG API Integration (4-6 hours)
**Impact:** HIGH - Unblocks document processing tests
**Risk:** LOW - Additive change, no breaking changes

**Action:**
- Add multipart upload to POST `/api/documents`
- Call `DocumentUploadPipeline.upload()` instead of `processDocument()`
- Test with PDF and DOCX files

**Validation:**
```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "tenantId=test-tenant"
```

#### 2. Add WhatsApp Webhook Route (3-4 hours)
**Impact:** HIGH - Unblocks WhatsApp inbound messages
**Risk:** MEDIUM - Requires tenant resolution strategy

**Action:**
- Create `/api/webhooks/channels.ts` router
- Implement GET and POST handlers for WhatsApp
- Integrate with orchestrator queue

**Validation:**
- Setup Meta webhook in test mode
- Send message to business number
- Verify entry in conversations table

#### 3. Fix WebChat Authentication (4-6 hours)
**Impact:** HIGH - Unblocks WebChat testing
**Risk:** MEDIUM - May require widget SDK changes

**Action:**
- Add conversation ID to Socket.IO authentication
- Join sockets to conversation rooms
- Route messages through WebChatAdapter

**Validation:**
- Connect widget with conversation ID
- Send message
- Verify room membership and message delivery

### Medium-Term Improvements (Week 2-3)

#### 4. Extract Shared Webhook Utilities (4-6 hours)
**Impact:** MEDIUM - Reduces duplication, easier maintenance
**Risk:** LOW - Refactoring only

#### 5. Add Messenger Webhook Route (2-3 hours)
**Impact:** MEDIUM - Completes Messenger integration
**Risk:** LOW - Similar to WhatsApp implementation

#### 6. Implement Status Notifications (3-4 hours)
**Impact:** MEDIUM - Better delivery tracking
**Risk:** LOW - Additive feature

### Long-Term Architecture (Month 2)

#### 7. Unified Webhook Registry
Replace hardcoded routes with database-driven webhook registry:
```typescript
// Webhooks table stores URL patterns and handler mappings
// Dynamic routing based on channel type
app.use('/api/webhooks/:channelType', dynamicWebhookHandler);
```

#### 8. Retry and Dead Letter Queues
Add retry logic for failed webhook deliveries and channel sends.

#### 9. Message Replay for WebChat
Store last N messages per conversation, replay on reconnect.

#### 10. Multi-Region Support
When channels are working, add region routing for global deployments.

---

## 6. Risk Assessment

### High Risk Issues

| Issue | Impact | Likelihood | Mitigation |
|-------|--------|-----------|------------|
| RAG pipeline API gap blocks PDF uploads | HIGH | Already present | Fix in Week 1 |
| WhatsApp webhooks never reach server | HIGH | Already present | Add route in Week 1 |
| WebChat messages lost due to room mismatch | HIGH | Already present | Fix auth in Week 1 |

### Medium Risk Issues

| Issue | Impact | Likelihood | Mitigation |
|-------|--------|-----------|------------|
| Tenant resolution ambiguity | MEDIUM | HIGH | Design multi-tenant webhook strategy |
| No webhook retry on failure | MEDIUM | MEDIUM | Add retry logic |
| Code duplication causes drift | MEDIUM | MEDIUM | Refactor shared utilities |

### Low Risk Issues

| Issue | Impact | Likelihood | Mitigation |
|-------|--------|-----------|------------|
| Missing status notifications | LOW | LOW | Document as known limitation |
| No message replay | LOW | LOW | Add when WebChat is stable |

---

## 7. Testing Strategy

### Unit Tests (Existing)
- ✅ RAG loaders have tests
- ✅ Channel adapters have tests
- ✅ Embeddings service has tests

### Integration Tests (Needed)

#### RAG Pipeline
```typescript
// Test: Upload PDF and verify processing
it('should process PDF with DocumentUploadPipeline', async () => {
  const pdf = fs.readFileSync('test.pdf');
  const response = await request(app)
    .post('/api/documents')
    .attach('file', pdf, 'test.pdf')
    .field('tenantId', 'test-tenant')
    .expect(201);

  const doc = await prisma.document.findUnique({
    where: { id: response.body.id },
    include: { chunks: true }
  });

  expect(doc.status).toBe('ready');
  expect(doc.chunks.length).toBeGreaterThan(0);
  expect(doc.chunks[0].embedding).not.toBeNull();
});
```

#### WhatsApp Webhook
```typescript
// Test: Receive webhook and normalize
it('should receive WhatsApp webhook and create message', async () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'account-id',
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: 'phone-id' },
          messages: [{
            id: 'msg-id',
            from: '1234567890',
            timestamp: '1234567890',
            type: 'text',
            text: { body: 'Hello' }
          }]
        }
      }]
    }]
  };

  const signature = createHmac('sha256', 'app-secret')
    .update(JSON.stringify(payload))
    .digest('hex');

  await request(app)
    .post('/api/webhooks/whatsapp')
    .set('x-hub-signature-256', `sha256=${signature}`)
    .send(payload)
    .expect(200);

  const message = await prisma.message.findFirst({
    where: { externalId: 'msg-id' }
  });

  expect(message).toBeDefined();
  expect(message.content).toBe('Hello');
});
```

#### WebChat Socket.IO
```typescript
// Test: Connect and send message
it('should deliver WebChat message through adapter', (done) => {
  const socket = io('http://localhost:3000', {
    auth: {
      tenantId: 'test-tenant',
      userId: 'test-user',
      conversationId: 'test-conversation'
    }
  });

  socket.on('connect', () => {
    socket.emit('message', { type: 'text', text: 'Hello' });
  });

  socket.on('message', (msg) => {
    expect(msg.content.text).toBe('Hello');
    socket.close();
    done();
  });
});
```

---

## 8. Conclusion

The Meta Chat Platform has **solid foundational components** for channel integrations and RAG processing, but suffers from **integration gaps at the API layer**. The underlying packages (`@meta-chat/rag`, `@meta-chat/channels`) are feature-complete and well-architected, but the API server was built separately and never properly wired to them.

### Key Takeaways

1. **RAG is 80% done** - Pipeline exists, just needs API integration
2. **Channels are 70% done** - Adapters work, need webhook routes and auth fixes
3. **Database layer is solid** - Vector search and storage fully functional
4. **Worker is ready** - Outbound channel sending works
5. **Critical path:** Fix API integration → Add webhook routes → Align WebChat auth

### Recommended Action Plan

**Week 1:** Fix the three high-priority issues (RAG API, WhatsApp webhook, WebChat auth)
**Week 2:** Add Messenger webhook, extract shared utilities
**Week 3:** Integration testing and documentation
**Week 4:** Production deployment with monitoring

**Total Effort:** 35-45 hours to reach full functionality

### Success Criteria

- ✅ Upload PDF via API, verify chunks with embeddings in database
- ✅ Send WhatsApp message to business number, receive webhook, see in conversations
- ✅ Connect WebChat widget, send message, receive response
- ✅ Perform hybrid search query, get relevant results from vector + keyword
- ✅ Send outbound message through worker, verify delivery

---

## Appendix A: File Reference

### RAG System
- `/home/admin/meta-chat-platform/packages/rag/src/upload-pipeline.ts` - Main pipeline
- `/home/admin/meta-chat-platform/packages/rag/src/embeddings.ts` - Embedding service
- `/home/admin/meta-chat-platform/packages/rag/src/retriever.ts` - Hybrid retrieval
- `/home/admin/meta-chat-platform/packages/rag/src/loaders/` - File loaders
- `/home/admin/meta-chat-platform/packages/database/src/client.ts` - Vector search functions
- `/home/admin/meta-chat-platform/apps/api/src/routes/documents.ts` - API route (needs update)
- `/home/admin/meta-chat-platform/apps/api/src/services/documentProcessor.ts` - Legacy service (to be replaced)

### Channel System
- `/home/admin/meta-chat-platform/packages/channels/src/whatsapp/whatsapp-adapter.ts` - WhatsApp adapter
- `/home/admin/meta-chat-platform/packages/channels/src/messenger/messenger-adapter.ts` - Messenger adapter
- `/home/admin/meta-chat-platform/packages/channels/src/webchat/webchat-adapter.ts` - WebChat adapter
- `/home/admin/meta-chat-platform/packages/channels/src/adapter.ts` - Base adapter
- `/home/admin/meta-chat-platform/apps/api/src/server.ts` - Socket.IO setup (needs update)
- `/home/admin/meta-chat-platform/apps/worker/src/channel-adapters.ts` - Outbound integration

### PR Reports
- `/home/admin/meta-chat-platform/reports/rag-pipeline-review.md` - PR #58
- `/home/admin/meta-chat-platform/reports/whatsapp-adapter-review.md` - PR #65
- `/home/admin/meta-chat-platform/reports/webchat-review.md` - PR #66
- `/home/admin/meta-chat-platform/reports/channel-connector-review.md` - PR #67

---

**Document Prepared By:** Claude Code Analysis
**Repository:** https://github.com/Wandeon/meta-chat-platform
**Contact:** Review PRs #58, #65, #66, #67 for detailed findings
