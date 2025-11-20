# Meta Chat Platform: Database, API & Architecture Issues Analysis

**Platform**: VPS-00 (chat.genai.hr)
**Port**: 3007
**Analysis Date**: 2025-11-20
**Repository**: Wandeon/meta-chat-platform

---

## Executive Summary

This analysis reviews 7 open pull requests (#51, #55, #57, #60, #61, #68, #73) that document critical architecture, database, and API issues in the Meta Chat Platform. The platform is a multi-tenant WhatsApp/Messenger/WebChat system with RAG-powered AI assistants running on a monorepo structure with 11 packages and 4 applications.

### Critical Findings

**HIGH SEVERITY**:
- Missing authentication on billing and webhook integration endpoints (Security Risk)
- Broken RAG functionality in chat endpoint due to incomplete code block (Core Feature Broken)
- Inconsistent internal package dependencies causing build order issues (CI/CD Risk)
- Missing database indexes for vector search operations (Performance Risk)
- Database migration schema mismatches causing data integrity risks (Data Corruption Risk)

**MEDIUM SEVERITY**:
- Missing input validation on analytics and webhook routes
- Unsafe raw SQL in database maintenance operations
- Missing foreign key constraints detection needed
- 6 packages missing vitest devDependency declarations
- Error responses leaking internal details to clients

**LOW SEVERITY**:
- Documentation gaps for public endpoints
- Version conflicts in dependencies (React Router, socket.io)
- Missing TypeScript project references for incremental builds

### Impact Assessment

| Category | Scalability | Reliability | Data Integrity | Security |
|----------|-------------|-------------|----------------|----------|
| Architecture | ⚠️ Medium | ⚠️ Medium | ✅ Low | ✅ Low |
| Database | 🔴 High | ⚠️ Medium | 🔴 High | ⚠️ Medium |
| API | ⚠️ Medium | 🔴 High | ⚠️ Medium | 🔴 High |

---

## 1. Architecture Issues (PR #51)

### Problem Statement
The monorepo's package dependency graph has multiple structural issues that undermine build reliability, CI/CD predictability, and workspace isolation.

### Affected Components
- All 7 packages: `@meta-chat/events`, `@meta-chat/orchestrator`, `@meta-chat/rag`, `@meta-chat/shared`, `@meta-chat/database`, `@meta-chat/channels`, `@meta-chat/llm`
- API app: `@meta-chat/api`
- Build system: Turborepo + TypeScript composite builds

### Root Cause Analysis

#### 1.1 Missing Test Runner Dependencies
**Root Cause**: 6 packages define `vitest` test scripts but don't declare `vitest` in their own `devDependencies`. They rely on root-level hoisting, which breaks:
- Isolated package installs
- Docker multi-stage builds
- CI environments without workspace hoisting

**Affected Packages**:
```
packages/events/package.json
packages/orchestrator/package.json
packages/rag/package.json
packages/shared/package.json
packages/database/package.json
apps/api/package.json
```

#### 1.2 Inconsistent Internal Package Versions
**Root Cause**: Three different versioning strategies are used simultaneously:
- `file:../shared` (relative file links)
- `*` (workspace protocol wildcard)
- `1.0.0` (pinned versions)

**Example from `packages/rag/package.json`**:
```json
{
  "@meta-chat/database": "1.0.0",
  "@meta-chat/shared": "1.0.0"
}
```

**Example from `packages/channels/package.json`**:
```json
{
  "@meta-chat/shared": "file:../shared"
}
```

**Example from `packages/orchestrator/package.json`**:
```json
{
  "@meta-chat/database": "*",
  "@meta-chat/events": "*"
}
```

**Risk**: NPM may resolve to published packages instead of local workspace sources, causing version mismatches between development and production.

#### 1.3 Socket.io Version Conflict
**Root Cause**: Two packages require different minor versions:
- `@meta-chat/channels`: `socket.io@^4.7.5`
- `@meta-chat/api`: `socket.io@^4.8.1`

**Risk**: Client/server protocol mismatches if dependency deduplication behaves unexpectedly.

#### 1.4 React Router Type Mismatch
**Root Cause**: Dashboard app uses `react-router-dom` v6 but has `@types/react-router-dom` v5 installed.

**Location**: `apps/dashboard/package.json`

**Risk**: Type errors don't match runtime behavior since v6 ships its own types.

#### 1.5 Missing TypeScript Project References
**Root Cause**: `tsconfig.base.json` enables composite builds, but dependent packages don't declare `references` arrays.

**Example**: `packages/orchestrator/tsconfig.json` imports from `@meta-chat/database` and `@meta-chat/events` but has no `references` field.

**Risk**: `tsc -b` cannot determine correct build order, breaking incremental compilation.

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ⚠️ Medium | Build ordering issues will worsen as packages grow |
| **Reliability** | ⚠️ Medium | CI/CD failures likely with isolated builds |
| **Data Integrity** | ✅ Low | No direct data risk |
| **Security** | ✅ Low | Dependency confusion risk is theoretical |

### Proposed Solution

**Phase 1: Immediate Fixes (2-3 hours)**
1. Add `vitest` to `devDependencies` in all 6 affected packages
2. Standardize all internal dependencies to use `"workspace:*"` protocol
3. Remove `@types/react-router-dom` from dashboard (v6 has built-in types)
4. Pin `socket.io` to `^4.8.1` in all packages

**Phase 2: Build System Hardening (4-6 hours)**
1. Add TypeScript project references to all packages:
   ```json
   {
     "references": [
       { "path": "../shared" },
       { "path": "../database" }
     ]
   }
   ```
2. Update root `tsconfig.json` with workspace references
3. Modify Turborepo config to respect TypeScript build order
4. Add `turbo.json` dependency declarations

**Phase 3: Validation (1-2 hours)**
1. Test isolated package builds with `npm install --workspace=@meta-chat/events`
2. Verify `tsc -b` correctly orders compilation
3. Add CI check for dependency consistency

### Dependencies
- No blocking dependencies
- Can be implemented immediately
- Requires coordination with active development branches

### Effort Estimate
**Total: 8-11 hours** (1-1.5 days)

### VPS-00 Validation Needed?
✅ **YES** - After fixes:
1. Run full monorepo build: `npm run build`
2. Verify tests pass: `npm run test`
3. Check port 3007 still serves API correctly
4. Validate hot-reload works in development mode

---

## 2. Database Security: SQL Injection Risk (PR #55)

### Problem Statement
While most database operations use Prisma's safe query builder, the maintenance module uses `$executeRawUnsafe` with string interpolation, creating a SQL injection attack surface if inputs ever become dynamic.

### Affected Components
- `packages/database/src/maintenance.ts`
- Database: PostgreSQL partition management
- Affected tables: `messages`, `api_logs`

### Root Cause Analysis

#### 2.1 Prisma Safety (Good News)
✅ **Safe**: All application-level queries use Prisma ORM with parameterized queries:
- `apps/api/services/vectorSearch.ts`: Uses `where` clauses
- `apps/api/src/services/documentProcessor.ts`: Uses `$executeRaw` tagged templates
- `apps/api/src/services/AnalyticsService.ts`: Uses `$executeRaw` with bound parameters
- `packages/database/src/client.ts`: `vectorSearch` and `keywordSearch` use `$queryRaw` templates

#### 2.2 Unsafe Raw SQL (Risk Area)
🔴 **Risk**: `packages/database/src/maintenance.ts` uses `$executeRawUnsafe`:

```typescript
// Example from maintenance.ts
await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS messages_y${year}m${month}
  PARTITION OF messages
  FOR VALUES FROM ('${year}-${month}-01') TO ('${year}-${month+1}-01')
`);
```

**Current Mitigation**: Variables come from `Date` objects and internal constants, not user input.

**Risk**: If this code path is ever called with external input (e.g., admin API to create partitions), it becomes exploitable.

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ✅ Low | Maintenance operations are infrequent |
| **Reliability** | ⚠️ Medium | Unsafe SQL could corrupt partition tables |
| **Data Integrity** | ⚠️ Medium | Bad partition creation could lose data |
| **Security** | ⚠️ Medium | Injection possible if inputs change |

### Proposed Solution

**Phase 1: Secure Maintenance Operations (3-4 hours)**
1. Replace `$executeRawUnsafe` with `Prisma.sql` template literals:
   ```typescript
   import { Prisma } from '@prisma/client';

   const tableName = Prisma.raw(`messages_y${year}m${month}`);
   const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
   const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

   await prisma.$executeRaw`
     CREATE TABLE IF NOT EXISTS ${tableName}
     PARTITION OF messages
     FOR VALUES FROM (${startDate}) TO (${endDate})
   `;
   ```

2. Add input validation for partition identifiers:
   ```typescript
   const VALID_TABLES = ['messages', 'api_logs'];
   const VALID_YEAR_RANGE = [2024, 2030];

   function validatePartitionInput(table: string, year: number, month: number) {
     if (!VALID_TABLES.includes(table)) throw new Error('Invalid table');
     if (year < VALID_YEAR_RANGE[0] || year > VALID_YEAR_RANGE[1]) throw new Error('Invalid year');
     if (month < 1 || month > 12) throw new Error('Invalid month');
   }
   ```

3. Create unit tests for maintenance operations with malicious inputs

**Phase 2: Security Audit Trail (1-2 hours)**
1. Add logging for all DDL operations
2. Create admin audit log table for schema changes
3. Implement approval workflow for partition creation

### Dependencies
- Requires understanding current partition creation frequency
- May need coordination with database backup schedule

### Effort Estimate
**Total: 4-6 hours** (0.5-1 day)

### VPS-00 Validation Needed?
✅ **YES** - After fixes:
1. Run maintenance operations: `npm run db:maintenance` (if exists)
2. Verify partition tables exist:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename LIKE 'messages_y%';
   ```
3. Test with edge cases (year 9999, month 13, etc.)
4. Verify error handling doesn't expose SQL syntax

---

## 3. API Error Handling (PR #57)

### Problem Statement
Health and metrics endpoints throw unhandled promise rejections on errors, and error responses expose internal error messages and stack traces to clients.

### Affected Components
- `apps/api/src/server.ts` - Health endpoints (`/health`, `/metrics`)
- Global error handler middleware

### Root Cause Analysis

#### 3.1 Missing Async Handler Wrapper
**Before (Vulnerable)**:
```typescript
app.get('/health', async (_req, res) => {
  const health = await getHealthStatus(redisClients, deps);
  res.json(health);
});
```

**Issue**: If `getHealthStatus()` throws, the promise rejection is unhandled and crashes the process or logs uncaught errors.

#### 3.2 Error Response Information Leakage
**Before (Vulnerable)**:
```typescript
app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
  res.status(status).json({
    success: false,
    error: {
      code,
      message: error.message,           // ❌ Exposes internal details
      details: error.errors ?? error.details,  // ❌ Exposes stack traces
    },
  });
});
```

**Issue**: Internal error messages, stack traces, and database errors are sent to clients, aiding attackers.

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ✅ Low | Error handling doesn't affect throughput |
| **Reliability** | 🔴 High | Unhandled rejections cause service crashes |
| **Data Integrity** | ✅ Low | No data corruption risk |
| **Security** | ⚠️ Medium | Information disclosure aids reconnaissance |

### Proposed Solution

**Phase 1: Implement Error Handling (Already in PR #57)** ✅
The PR correctly implements:
1. Async handler wrapper for health/metrics endpoints
2. Error sanitization based on HTTP status code
3. Only expose error details for 4xx errors (client errors)

**After (Fixed)**:
```typescript
app.get('/health', asyncHandler(async (_req, res) => {
  const health = await getHealthStatus(redisClients, deps);
  res.json(health);
}));

app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
  const expose = error.expose === true || (status >= 400 && status < 500);

  res.status(status).json({
    success: false,
    error: {
      code,
      message: expose ? error.message : 'Internal Server Error',
      details: expose ? error.errors ?? error.details : undefined,
    },
  });
});
```

**Phase 2: Extend to All Routes (2-3 hours)**
Audit all routes and wrap any async handlers:
```bash
# Find potentially unsafe async routes
grep -r "app\.(get|post|put|delete|patch)" apps/api/src/routes/
```

**Phase 3: Add Error Monitoring (1-2 hours)**
1. Integrate with Sentry or similar for error tracking
2. Add structured logging for 5xx errors
3. Create alerts for error rate spikes

### Dependencies
- PR #57 can be merged immediately
- Phase 2 depends on route audit completion

### Effort Estimate
**Total: 3-5 hours** (0.5 day) for remaining work after PR #57

### VPS-00 Validation Needed?
✅ **YES** - After PR #57 merges:
1. Test health endpoint with Redis down: `curl http://localhost:3007/health`
2. Verify error response doesn't contain stack traces
3. Test metrics endpoint with monitoring failure
4. Check logs for proper error recording

---

## 4. API Validation Gaps (PR #60)

### Problem Statement
Multiple API routes accept unvalidated query parameters, request bodies, and metadata fields, allowing malformed data to reach business logic and be persisted to the database.

### Affected Components
- `apps/api/src/routes/analytics.ts` - All analytics endpoints
- `apps/api/src/routes/documents.ts` - Document CRUD operations
- `apps/api/src/routes/webhookIntegrations.ts` - WhatsApp/Messenger webhooks

### Root Cause Analysis

#### 4.1 Analytics Routes: Manual Type Coercion
**Location**: `apps/api/src/routes/analytics.ts` lines 19-155

**Issue**: Query parameters use manual `typeof` checks and `parseInt` without validation:
```typescript
const days = parseInt(req.query.days as string) || 30;  // No max limit
const limit = parseInt(req.query.limit as string) || 100;  // No max limit
```

**Risk**:
- `days=999999999` could cause massive database queries
- `limit=0` or `limit=-1` could bypass pagination
- Non-numeric values coerce to `NaN`, falling back to defaults silently

#### 4.2 Document Metadata: Arbitrary JSON
**Location**: `apps/api/src/routes/documents.ts` lines 13-99, 128-179

**Issue**: Metadata validation accepts any fields:
```typescript
const documentSchema = z.object({
  metadata: z.record(z.string(), z.any()),  // ❌ Accepts anything
});
```

**Risk**:
- Unbounded JSON size (DOS via memory exhaustion)
- No type validation for `fileType`, `fileSize`, etc.
- Unexpected nested objects could break downstream processing

#### 4.3 Tenant Scoping on Document Listing
**Location**: `apps/api/src/routes/documents.ts` lines 34-48

**Issue**: `GET /documents` accepts optional `tenantId` without validation:
```typescript
const tenantId = req.query.tenantId as string;  // No validation
const documents = await prisma.document.findMany({
  where: tenantId ? { tenantId } : {},  // Could be empty!
});
```

**Risk**:
- Missing `tenantId` returns ALL documents across all tenants
- Admin-only endpoint, but still violates least privilege

#### 4.4 Webhook Payloads: No Validation
**Location**: `apps/api/src/routes/webhookIntegrations.ts` lines 47-173, 200-320

**Issue**: Direct `req.body` access without schema validation:
```typescript
const entry = req.body.entry?.[0];  // No validation
const changes = entry?.changes?.[0];  // Could be undefined
```

**Risk**:
- Malformed webhook causes crashes via undefined access
- Type coercion issues with nested properties
- No size limits (DOS risk)

#### 4.5 File Type/Size: User-Controlled
**Location**: `apps/api/src/routes/documents.ts` lines 54-99

**Issue**: `mimeType` and `size` come from user metadata:
```typescript
const metadata = req.body.metadata || {};
const mimeType = metadata.fileType || 'application/octet-stream';
const size = metadata.fileSize || 0;
```

**Risk**:
- User claims `fileSize: 1` but uploads 1GB file
- Malicious MIME types could bypass security scans
- No allowlist for acceptable document types

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ⚠️ Medium | Unbounded queries could exhaust database |
| **Reliability** | 🔴 High | Invalid inputs cause crashes |
| **Data Integrity** | ⚠️ Medium | Bad metadata persisted to database |
| **Security** | ⚠️ Medium | DOS, information disclosure risks |

### Proposed Solution

**Phase 1: Add Schema Validation (6-8 hours)**

1. **Analytics Routes** - Add Zod schemas:
```typescript
const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  range: z.enum(['day', 'week', 'month']).optional(),
});

router.get('/usage', asyncHandler(async (req, res) => {
  const query = parseWithSchema(analyticsQuerySchema, req.query);
  // Use validated query.days, query.limit
}));
```

2. **Document Metadata** - Define explicit schema:
```typescript
const documentMetadataSchema = z.object({
  fileType: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']),
  fileSize: z.number().int().min(1).max(100 * 1024 * 1024), // Max 100MB
  content: z.string().optional(),
  // Explicitly allow only known fields
}).strict();  // Reject extra fields

const createDocumentSchema = z.object({
  tenantId: z.string().cuid(),
  filename: z.string().min(1).max(255),
  metadata: documentMetadataSchema,
});
```

3. **Webhook Payloads** - Add envelope validation:
```typescript
const whatsappWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        messages: z.array(z.any()).optional(),
        statuses: z.array(z.any()).optional(),
      }),
    })),
  })),
}).strict();
```

4. **Require Tenant Scoping**:
```typescript
router.get('/documents', authenticateAdmin, asyncHandler(async (req, res) => {
  const { tenantId } = parseWithSchema(
    z.object({ tenantId: z.string().cuid() }),  // Required!
    req.query
  );
  // Now guaranteed to have tenantId
}));
```

**Phase 2: File Upload Validation (3-4 hours)**
1. Integrate with file upload middleware to verify actual size
2. Validate MIME type matches file signature (magic bytes)
3. Add virus scanning integration point
4. Implement rate limiting per tenant

**Phase 3: Integration Testing (2-3 hours)**
1. Create test cases with malformed inputs
2. Verify error messages don't expose schema details
3. Load test with large payloads
4. Test boundary conditions (max limits)

### Dependencies
- Requires coordination with webhook providers (WhatsApp, Messenger)
- May need frontend updates if API contracts change
- Should implement alongside PR #57 error handling

### Effort Estimate
**Total: 11-15 hours** (1.5-2 days)

### VPS-00 Validation Needed?
✅ **YES** - After implementation:
1. Test analytics with invalid params: `curl "http://localhost:3007/api/analytics/usage?days=abc&limit=-1"`
2. Verify 400 error with clear validation message
3. Upload document with wrong MIME type
4. Send malformed webhook payload
5. Try to list documents without tenantId

---

## 5. API Endpoint Security Audit (PR #61)

### Problem Statement
Comprehensive endpoint audit reveals missing authentication on billing routes and webhook integrations, broken RAG functionality, and undocumented public endpoints.

### Affected Components
- `apps/api/src/routes/billing/index.ts` - All billing routes (6 endpoints)
- `apps/api/src/routes/webhookIntegrations.ts` - WhatsApp/Messenger webhooks
- `apps/api/src/routes/chat.ts` - RAG retrieval logic
- Health/metrics endpoints

### Critical Findings

#### 5.1 CRITICAL: Missing Authentication on Billing Routes
**Location**: `apps/api/src/routes/billing/index.ts`

**Issue**: All billing endpoints rely on `req.tenant` but have NO authentication middleware:
```typescript
router.post('/create-checkout-session', async (req, res, next) => {
  const tenantId = req.tenant?.id;  // ❌ req.tenant is undefined!
  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});
```

**Affected Endpoints**:
- `POST /api/billing/create-checkout-session` - Create Stripe subscription
- `POST /api/billing/create-portal-session` - Access billing portal
- `GET /api/billing/subscription` - View subscription details
- `GET /api/billing/usage` - View usage metrics
- `POST /api/billing/cancel` - Cancel subscription
- `GET /api/billing/plans` - List available plans (OK to be public)

**Risk**:
- Unauthenticated users can attempt to create subscriptions
- ALWAYS returns 401 because `req.tenant` is never set
- **Currently non-functional - all requests fail**

#### 5.2 CRITICAL: Missing Authentication on Webhook Integrations
**Location**: `apps/api/src/routes/webhookIntegrations.ts`

**Endpoints**:
- `GET/POST /api/integrations/whatsapp/:tenantId` - WhatsApp webhook
- `GET/POST /api/integrations/messenger/:tenantId` - Messenger webhook

**Issue**: No authentication middleware, only signature verification:
```typescript
// No auth middleware!
router.post('/whatsapp/:tenantId', async (req, res) => {
  // Signature verification happens inside, but anyone can POST
});
```

**Risk**:
- While signature verification provides security, missing auth violates defense-in-depth
- Tenant ID is in URL path (information disclosure)
- Potential DOS if signature verification is expensive

#### 5.3 CRITICAL: Broken RAG Functionality
**Location**: `apps/api/src/routes/chat.ts` lines 103-140

**Issue**: Incomplete code block duplicates `messages` declaration:
```typescript
if (enableRag) {
  try {
    const embeddingConfig = await getEmbeddingConfig(payload.tenantId);
    const messages: LlmMessage[] = [];  // ❌ Declares messages but never uses
  } catch (error) {
    console.error("[RAG] Error getting embedding config:", error);
  }
}
const messages: LlmMessage[] = [];  // ❌ Redeclares messages, RAG context never added
```

**Impact**:
- RAG-enabled tenants don't get document context in responses
- Core feature is completely non-functional
- No error visible to users (silently degrades to non-RAG mode)

**Expected Code**:
```typescript
if (enableRag) {
  try {
    const embeddingConfig = await getEmbeddingConfig(payload.tenantId);
    const searchResults = await searchSimilarChunks(
      payload.tenantId,
      payload.message,
      embeddingConfig,
      ragConfig.topK || 3
    );

    if (searchResults.length > 0) {
      const ragContext = searchResults.map(r => r.content).join('\n\n');
      systemPrompt += `\n\nRelevant context:\n${ragContext}`;
      contextUsed = true;
    }
  } catch (error) {
    console.error("[RAG] Error during search:", error);
  }
}
```

#### 5.4 Documentation Gaps
**Undocumented Public Endpoints**:
- `GET /api/health/live` - Kubernetes liveness probe
- `GET /api/health/ready` - Kubernetes readiness probe
- `GET /api/public/widget/sdk` - Widget JavaScript bundle

**Undocumented Authenticated Endpoints**:
- All MCP server routes (`/api/mcp-servers/*`)
- All analytics routes (`/api/analytics/*`)
- Channel management routes (`/api/channels/*`)

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ⚠️ Medium | Broken RAG prevents scaling to knowledge-intensive use cases |
| **Reliability** | 🔴 High | Billing completely broken, RAG silently fails |
| **Data Integrity** | ⚠️ Medium | No risk to existing data |
| **Security** | 🔴 High | Missing auth on financial operations |

### Proposed Solution

**Phase 1: Critical Security Fixes (2-3 hours)**

1. **Fix Billing Authentication**:
```typescript
import { authenticateAdmin } from '../middleware/auth';

// Option 1: Admin-only billing (recommended for admin portal)
router.use(authenticateAdmin);

// Option 2: Tenant-scoped billing (if tenants manage own billing)
router.use(authenticateTenant);
```

2. **Fix Webhook Authentication**:
```typescript
// Add rate limiting as first defense
router.use('/integrations', webhookRateLimiter);

// Keep signature verification but add audit logging
router.post('/whatsapp/:tenantId', asyncHandler(async (req, res) => {
  // Log all webhook attempts
  logger.info('Webhook received', {
    tenantId: req.params.tenantId,
    ip: req.ip,
    signature: req.headers['x-hub-signature-256']
  });

  // Existing signature verification...
}));
```

**Phase 2: Fix Broken RAG (1-2 hours)**

Complete the RAG implementation:
```typescript
if (enableRag) {
  try {
    const embeddingConfig = await getEmbeddingConfig(payload.tenantId);

    // Generate embedding for user message
    const searchResults = await searchSimilarChunks(
      payload.tenantId,
      payload.message,
      embeddingConfig,
      ragConfig.topK || 3
    );

    // Add context to system prompt
    if (searchResults.length > 0) {
      const ragContext = searchResults
        .map(r => `[${r.document.filename}]: ${r.content}`)
        .join('\n\n');

      systemPrompt += `\n\nRelevant information from knowledge base:\n${ragContext}`;
      contextUsed = true;

      // Store for analytics
      searchResults = searchResults.map(r => ({
        documentId: r.documentId,
        chunkId: r.id,
        score: r.score,
      }));
    }
  } catch (error) {
    logger.error("[RAG] Error during context retrieval:", error);
    // Continue without RAG - don't block user
  }
}

// Initialize messages array AFTER RAG processing
const messages: LlmMessage[] = [];
```

**Phase 3: Documentation & Testing (3-4 hours)**

1. Create OpenAPI spec for all endpoints
2. Add authentication requirements to API docs
3. Document public vs. authenticated endpoints
4. Add integration tests for:
   - Billing flow with auth
   - RAG context injection
   - Webhook signature verification

**Phase 4: Monitoring (1-2 hours)**
1. Add metrics for RAG context usage
2. Alert on billing auth failures
3. Monitor webhook verification failure rates

### Dependencies
- Billing fix requires deciding: admin-only or tenant-scoped?
- RAG fix needs embedding service to be running
- Documentation needs coordination with frontend team

### Effort Estimate
**Total: 7-11 hours** (1-1.5 days)

### VPS-00 Validation Needed?
✅ **YES - CRITICAL** - After fixes:

1. **Test Billing Authentication**:
   ```bash
   # Should return 401 without auth
   curl -X POST http://localhost:3007/api/billing/create-checkout-session

   # Should work with admin token
   curl -X POST http://localhost:3007/api/billing/create-checkout-session \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"planId": "pro"}'
   ```

2. **Test RAG Functionality**:
   ```bash
   # Enable RAG for test tenant
   # Upload test document
   # Send chat message related to document
   # Verify response includes document context
   ```

3. **Test Webhook Security**:
   ```bash
   # Try webhook without signature - should reject
   curl -X POST http://localhost:3007/api/integrations/whatsapp/test-tenant-id

   # Verify rate limiting works
   for i in {1..100}; do curl http://localhost:3007/api/integrations/whatsapp/test; done
   ```

---

## 6. Data Integrity SQL Checks (PR #68)

### Problem Statement
The database lacks systematic checks for orphaned records, invalid states, missing foreign keys, and data type mismatches that could accumulate over time and cause application errors.

### Affected Components
- All database tables (particularly: `conversations`, `messages`, `documents`, `chunks`, `channels`)
- Prisma schema at `packages/database/prisma/schema.prisma`
- Foreign key relationships

### Root Cause Analysis

#### 6.1 Potential Orphaned Records
The schema uses `onDelete: Cascade` for most relationships, but cascade failures or manual SQL could create orphans.

**High-Risk Orphan Scenarios**:
1. **Conversations without tenants** - If tenant deleted outside Prisma
2. **Messages without conversations** - If conversation deleted but cascade failed
3. **Documents without tenants** - Same risk
4. **Chunks without documents** - If document deleted during processing

**Detection Queries** (from PR #68):
```sql
-- Find conversations without tenants
SELECT c.*
FROM conversations AS c
LEFT JOIN tenants AS t ON t.id = c.tenant_id
WHERE t.id IS NULL;

-- Find messages without conversations
SELECT m.*
FROM messages AS m
LEFT JOIN conversations AS c ON c.id = m.conversation_id
WHERE c.id IS NULL;

-- Find chunks without documents
SELECT c.*
FROM chunks AS c
LEFT JOIN documents AS d ON d.id = c.document_id
WHERE d.id IS NULL;
```

#### 6.2 Missing Foreign Key Constraints
The PR provides a query to verify all expected FKs exist:
```sql
-- Verify foreign keys exist
WITH expected AS (
  SELECT * FROM (VALUES
    ('conversations', 'tenant_id', 'tenants', 'id'),
    ('messages', 'tenant_id', 'tenants', 'id'),
    ('messages', 'conversation_id', 'conversations', 'id'),
    ('channels', 'tenant_id', 'tenants', 'id'),
    ('documents', 'tenant_id', 'tenants', 'id'),
    ('chunks', 'tenant_id', 'tenants', 'id'),
    ('chunks', 'document_id', 'documents', 'id')
  ) AS v(src_table, src_column, target_table, target_column)
)
SELECT e.*
FROM expected AS e
LEFT JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema = current_schema()
-- ... (full query in PR #68)
WHERE kcu.constraint_name IS NULL;
```

#### 6.3 Invalid State Values
Tables use string enums that could have invalid values if inserted via raw SQL:

**Conversations Status**: Should be `active`, `assigned_human`, or `closed`
**Documents Status**: Should be `pending`, `processing`, `ready`, `failed`, or `stale`
**Messages Direction**: Should be `inbound` or `outbound`
**Messages Type**: Should be `text`, `image`, `audio`, `video`, `document`, or `location`

**Detection Queries**:
```sql
-- Find invalid conversation statuses
SELECT id, tenant_id, status
FROM conversations
WHERE status NOT IN ('active', 'assigned_human', 'closed');

-- Find invalid document statuses
SELECT id, tenant_id, status
FROM documents
WHERE status NOT IN ('pending', 'processing', 'ready', 'failed', 'stale');
```

#### 6.4 Data Type Issues

**Invalid Sizes/Counts**:
- Documents with `size <= 0`
- Documents with `version < 1`
- Chunks with `position IS NULL OR position < 0`

**Detection Queries**:
```sql
-- Find documents with invalid sizes
SELECT id, tenant_id, size
FROM documents
WHERE size <= 0;

-- Find chunks with invalid positions
SELECT id, document_id, position
FROM chunks
WHERE position IS NULL OR position < 0;
```

#### 6.5 Uniqueness Violations

The schema defines unique constraints but bulk imports or race conditions could violate them:

**Unique Constraints**:
- `channels(tenant_id, type)` - One channel per type per tenant
- `conversations(tenant_id, channel_type, external_id)` - One conversation per external ID

**Detection Queries**:
```sql
-- Find duplicate channels per tenant/type
SELECT tenant_id, type, COUNT(*)
FROM channels
GROUP BY tenant_id, type
HAVING COUNT(*) > 1;

-- Find duplicate conversations
SELECT tenant_id, channel_type, external_id, COUNT(*)
FROM conversations
GROUP BY tenant_id, channel_type, external_id
HAVING COUNT(*) > 1;
```

#### 6.6 Channel Configuration Integrity

Channels have type-specific required config fields:

**WhatsApp requires**:
- `phoneNumberId`
- `accessToken`

**Messenger requires**:
- `pageId`
- `pageAccessToken`
- `verifyToken`
- `appSecret`

**Detection Query** (from PR #68):
```sql
-- Find channels with invalid config
SELECT c.*,
       CASE c.type
         WHEN 'whatsapp' THEN
           CASE WHEN config->>'phoneNumberId' IS NULL
                  OR config->>'accessToken' IS NULL
                THEN 'missing phoneNumberId or accessToken'
           END
         WHEN 'messenger' THEN
           CASE WHEN config->>'pageId' IS NULL
                  OR config->>'pageAccessToken' IS NULL
                THEN 'missing required messenger fields'
           END
       END AS config_issue
FROM channels AS c
WHERE (
  c.type = 'whatsapp' AND (
    config->>'phoneNumberId' IS NULL OR config->>'accessToken' IS NULL
  )
) OR (
  c.type = 'messenger' AND (
    config->>'pageId' IS NULL OR config->>'pageAccessToken' IS NULL
  )
);
```

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ⚠️ Medium | Orphans accumulate over time, bloating indexes |
| **Reliability** | 🔴 High | Invalid states cause application crashes |
| **Data Integrity** | 🔴 High | Orphaned records break joins and queries |
| **Security** | ⚠️ Medium | Orphaned data may leak between tenants |

### Proposed Solution

**Phase 1: Create Integrity Check Script (3-4 hours)**

Create `packages/database/src/integrity-checker.ts`:
```typescript
import { getPrismaClient } from './client';

export interface IntegrityIssue {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  query: string;
  description: string;
}

export async function runIntegrityChecks(): Promise<IntegrityIssue[]> {
  const prisma = getPrismaClient();
  const issues: IntegrityIssue[] = [];

  // Check 1: Orphaned conversations
  const orphanedConversations = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM conversations AS c
    LEFT JOIN tenants AS t ON t.id = c.tenant_id
    WHERE t.id IS NULL
  `;

  if (orphanedConversations[0].count > 0) {
    issues.push({
      category: 'orphaned_records',
      severity: 'critical',
      count: orphanedConversations[0].count,
      query: 'SELECT c.* FROM conversations c LEFT JOIN tenants t...',
      description: `Found ${orphanedConversations[0].count} conversations without tenants`
    });
  }

  // Check 2: Invalid conversation statuses
  const invalidStatuses = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM conversations
    WHERE status NOT IN ('active', 'assigned_human', 'closed')
  `;

  if (invalidStatuses[0].count > 0) {
    issues.push({
      category: 'invalid_states',
      severity: 'high',
      count: invalidStatuses[0].count,
      query: 'SELECT * FROM conversations WHERE status NOT IN...',
      description: `Found ${invalidStatuses[0].count} conversations with invalid status`
    });
  }

  // ... add all other checks

  return issues;
}
```

**Phase 2: Add Database Indexes (2-3 hours)**

Based on the integrity queries, add missing indexes:
```sql
-- Speed up orphan detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_id
  ON conversations(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id) WHERE conversation_id IS NOT NULL;

-- Speed up status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_status_tenant
  ON documents(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status_tenant
  ON conversations(tenant_id, status);
```

**Phase 3: Automated Monitoring (3-4 hours)**

1. Create cron job to run integrity checks daily:
```typescript
// apps/worker/src/jobs/integrity-check.ts
import { runIntegrityChecks } from '@meta-chat/database';
import { logger } from '@meta-chat/shared';

export async function dailyIntegrityCheck() {
  const issues = await runIntegrityChecks();

  if (issues.length > 0) {
    const criticalIssues = issues.filter(i => i.severity === 'critical');

    if (criticalIssues.length > 0) {
      // Send alert to ops team
      logger.error('Critical data integrity issues detected', { issues: criticalIssues });
      // TODO: Send to Slack/PagerDuty
    }

    // Log all issues
    logger.warn('Data integrity issues detected', { issues });
  }
}
```

2. Add to worker cron schedule
3. Create dashboard widget showing integrity status

**Phase 4: Remediation Scripts (4-5 hours)**

Create scripts to fix common issues:
```typescript
// packages/database/src/integrity-fixes.ts

export async function deleteOrphanedRecords(dryRun: boolean = true) {
  const prisma = getPrismaClient();

  // Delete orphaned messages
  const result = await prisma.$executeRaw`
    DELETE FROM messages
    WHERE id IN (
      SELECT m.id
      FROM messages AS m
      LEFT JOIN conversations AS c ON c.id = m.conversation_id
      WHERE c.id IS NULL
    )
    ${dryRun ? 'RETURNING id' : ''}
  `;

  return { deletedCount: result };
}

export async function fixInvalidStatuses() {
  // Set invalid conversation statuses to 'active'
  await prisma.conversation.updateMany({
    where: {
      status: { notIn: ['active', 'assigned_human', 'closed'] }
    },
    data: { status: 'active' }
  });
}
```

**Phase 5: Database Constraints (2-3 hours)**

Add database CHECK constraints to prevent future issues:
```sql
-- Add status constraints
ALTER TABLE conversations
ADD CONSTRAINT conversations_status_check
CHECK (status IN ('active', 'assigned_human', 'closed'));

ALTER TABLE documents
ADD CONSTRAINT documents_status_check
CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'stale'));

-- Add size constraints
ALTER TABLE documents
ADD CONSTRAINT documents_size_positive
CHECK (size > 0);

ALTER TABLE documents
ADD CONSTRAINT documents_version_positive
CHECK (version >= 1);

ALTER TABLE chunks
ADD CONSTRAINT chunks_position_valid
CHECK (position >= 0);
```

### Dependencies
- Requires database write access for indexes and constraints
- Should coordinate with backup schedule for large cleanups
- May need maintenance window if fixing large numbers of orphans

### Effort Estimate
**Total: 14-19 hours** (2-2.5 days)

### VPS-00 Validation Needed?
✅ **YES** - After implementation:

1. **Run Initial Integrity Check**:
   ```bash
   npm run db:integrity-check
   ```
   Document all existing issues before fixes

2. **Test Orphan Detection**:
   ```sql
   -- Manually create orphan for testing
   BEGIN;
   INSERT INTO messages (id, tenant_id, conversation_id, direction, from, type, content, timestamp)
   VALUES ('test-orphan', 'tenant-id', 'nonexistent-conv', 'inbound', 'test', 'text', '{}', NOW());
   COMMIT;

   -- Run integrity check - should detect orphan
   npm run db:integrity-check

   -- Clean up
   DELETE FROM messages WHERE id = 'test-orphan';
   ```

3. **Verify Indexes Created**:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename IN ('conversations', 'messages', 'documents', 'chunks')
   ORDER BY tablename, indexname;
   ```

4. **Test Constraints**:
   ```sql
   -- Should fail with constraint violation
   INSERT INTO conversations (id, tenant_id, channel_type, external_id, user_id, status)
   VALUES ('test', 'tenant', 'webchat', 'test', 'user', 'invalid_status');
   ```

---

## 7. Database Migration Review (PR #73)

### Problem Statement
Database migrations lack reversibility, have data loss risks, and contain schema alignment issues that could cause production failures.

### Affected Components
- All migrations in `packages/database/prisma/migrations/`
- Partitioning migrations: `20240520120000_partition_messages_api_logs`
- Embedding dimensions: `20251010000000_update_embedding_dimensions`
- Verification tokens: `20251119000000_email_verification` and `20251119104827_add_transactional_signup`

### Root Cause Analysis

#### 7.1 No Rollback Scripts
**Issue**: All migrations are forward-only SQL files with no DOWN scripts.

**Example**: `20240520120000_partition_messages_api_logs/migration.sql`
```sql
-- Creates partitions but no way to reverse
CREATE TABLE messages_partitioned (LIKE messages INCLUDING ALL);
-- ... partition setup ...
DROP TABLE messages;
ALTER TABLE messages_partitioned RENAME TO messages;
```

**Risk**: If migration fails midway or causes issues, must manually restore from backup.

#### 7.2 Data Loss on Embedding Dimension Change
**Location**: `20251010000000_update_embedding_dimensions/migration.sql`

**Issue**: Migration notes:
> "Existing embeddings will be cleared, leading to data loss unless re-embedded."

**Code**:
```sql
ALTER TABLE chunks
ALTER COLUMN embedding TYPE vector(1024);
-- All existing 1536-dim embeddings are now invalid!
```

**Risk**:
- All documents lose RAG functionality until re-processed
- No backup of old embeddings
- Re-embedding is expensive (API costs)

#### 7.3 Schema Mismatch: Verification Tokens
**Root Cause**: Two migrations create conflicting schemas:

**Migration 1**: `20251119000000_email_verification/migration.sql`
```sql
CREATE TABLE IF NOT EXISTS verification_tokens (
  admin_id TEXT,  -- ❌ Nullable
  -- ...
);
```

**Migration 2**: `20251119104827_add_transactional_signup/migration.sql`
```sql
CREATE TABLE IF NOT EXISTS verification_tokens (
  admin_id TEXT NOT NULL,  -- ❌ NOT NULL
  -- ...
);
```

**Prisma Schema Expectation**:
```prisma
model VerificationToken {
  adminId String  // Expects NOT NULL based on migration 2
}
```

**Issue**:
- If database was created with migration 1, `admin_id` is nullable
- Prisma expects it to be NOT NULL
- Runtime constraint violations will occur

**Impact**: Production databases may have schema drift depending on migration order.

#### 7.4 Missing Partition Management Strategy
**Issue**: Partitioning migrations create initial partitions but don't document:
- How to create new partitions for future months
- When to create them (automated?)
- How to handle partition maintenance
- What happens if query spans non-existent partition

**Example**: `messages` table partitioned by month, but no docs on creating `messages_y2026m01`.

#### 7.5 RLS Policy Irreversibility
**Location**: `20240521120000_enable_rls/migration.sql`

**Issue**: Enables Row Level Security policies but no script to disable:
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants USING (id = current_setting('app.tenant_id')::text);
```

**Risk**: Cannot easily disable RLS for debugging or emergency access.

### Impact

| Metric | Impact Level | Details |
|--------|-------------|---------|
| **Scalability** | ⚠️ Medium | Partition management needed for growth |
| **Reliability** | 🔴 High | Schema drift causes runtime failures |
| **Data Integrity** | 🔴 High | Embedding data loss, nullable mismatches |
| **Security** | ✅ Low | RLS is good, just irreversible |

### Proposed Solution

**Phase 1: Create Rollback Migrations (6-8 hours)**

For each migration, create a corresponding `down.sql`:

```
migrations/
  20240520120000_partition_messages_api_logs/
    migration.sql      # UP
    rollback.sql       # DOWN (new)
```

**Example Rollback**: `20240520120000_partition_messages_api_logs/rollback.sql`
```sql
-- Rollback partitioning (requires data copy)
CREATE TABLE messages_unpartitioned (LIKE messages INCLUDING ALL);

-- Copy all data from partitions
INSERT INTO messages_unpartitioned
SELECT * FROM messages;

-- Drop partitioned table and partitions
DROP TABLE messages CASCADE;

-- Restore original table
ALTER TABLE messages_unpartitioned RENAME TO messages;

-- Recreate original indexes
CREATE INDEX idx_messages_tenant_conversation ON messages(tenant_id, conversation_id);
-- ... (recreate all indexes)
```

**Phase 2: Fix Schema Drift (2-3 hours)**

Create corrective migration:
```sql
-- Migration: 20251120000000_fix_verification_token_schema.sql

-- Drop and recreate with correct schema
DROP TABLE IF EXISTS verification_tokens CASCADE;

CREATE TABLE verification_tokens (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,  -- ✅ Enforced NOT NULL
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_verification_tokens_admin ON verification_tokens(admin_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
```

**Phase 3: Embedding Backup Strategy (3-4 hours)**

Before dimension change migration, add backup step:
```sql
-- Migration: 20251010000000_update_embedding_dimensions.sql (revised)

-- Step 1: Create backup table
CREATE TABLE chunks_embeddings_backup AS
SELECT id, document_id, embedding
FROM chunks
WHERE embedding IS NOT NULL;

-- Step 2: Alter dimension
ALTER TABLE chunks
ALTER COLUMN embedding TYPE vector(1024);

-- Step 3: Log backup
INSERT INTO migration_backups (migration, table_name, backup_table, created_at)
VALUES ('20251010000000', 'chunks', 'chunks_embeddings_backup', NOW());

-- NOTE: To restore, run:
-- ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536);
-- UPDATE chunks c SET embedding = b.embedding
-- FROM chunks_embeddings_backup b WHERE c.id = b.id;
```

**Phase 4: Partition Management Automation (5-6 hours)**

1. Create partition management script:
```typescript
// packages/database/src/partition-manager.ts

export async function createNextMonthPartitions() {
  const prisma = getPrismaClient();
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  const year = nextMonth.getFullYear();
  const month = nextMonth.getMonth() + 1;

  const startDate = nextMonth.toISOString().split('T')[0];
  const endDate = monthAfter.toISOString().split('T')[0];

  // Create messages partition
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS ${Prisma.raw(`messages_y${year}m${month.toString().padStart(2, '0')}`)}
    PARTITION OF messages
    FOR VALUES FROM (${startDate}) TO (${endDate})
  `;

  // Create api_logs partition
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS ${Prisma.raw(`api_logs_y${year}m${month.toString().padStart(2, '0')}`)}
    PARTITION OF api_logs
    FOR VALUES FROM (${startDate}) TO (${endDate})
  `;

  logger.info(`Created partitions for ${year}-${month}`);
}
```

2. Add to worker cron (run monthly):
```typescript
// apps/worker/src/jobs/partition-maintenance.ts
import { createNextMonthPartitions } from '@meta-chat/database';

export async function monthlyPartitionSetup() {
  // Run on 1st of each month to create next month's partitions
  await createNextMonthPartitions();
}
```

3. Document partition strategy in `docs/database-maintenance.md`

**Phase 5: Migration Testing Framework (4-5 hours)**

Create migration test suite:
```typescript
// packages/database/src/__tests__/migrations.test.ts

describe('Migration Reversibility', () => {
  it('should apply and rollback each migration', async () => {
    const migrations = getMigrationFiles();

    for (const migration of migrations) {
      // Apply UP
      await applyMigration(migration.up);

      // Verify schema
      const schemaAfterUp = await getSchemaSnapshot();

      // Apply DOWN (if exists)
      if (migration.down) {
        await applyMigration(migration.down);

        // Verify rollback
        const schemaAfterDown = await getSchemaSnapshot();
        expect(schemaAfterDown).toMatchBaseline();
      }
    }
  });

  it('should match Prisma schema expectations', async () => {
    const prismaSchema = await parsePrismaSchema();
    const databaseSchema = await introspectDatabase();

    expect(databaseSchema).toMatchPrismaSchema(prismaSchema);
  });
});
```

### Dependencies
- Requires database backup before implementing fixes
- Schema drift fix may need data migration for existing records
- Partition automation needs worker cron system

### Effort Estimate
**Total: 20-26 hours** (2.5-3.5 days)

### VPS-00 Validation Needed?
✅ **YES - CRITICAL** - After fixes:

1. **Verify Schema Matches Prisma**:
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Compare with actual database
   npm run db:introspect

   # Should show no differences
   git diff packages/database/prisma/schema.prisma
   ```

2. **Test Migration Rollback**:
   ```bash
   # Create test database
   createdb meta_chat_test

   # Apply all migrations
   DATABASE_URL=postgresql://localhost/meta_chat_test npm run db:migrate

   # Apply rollback scripts (once created)
   # Verify data integrity
   ```

3. **Test Partition Creation**:
   ```bash
   # Run partition manager
   npm run db:create-partitions

   # Verify partitions exist
   psql -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'messages_y%';"
   ```

4. **Verify Embedding Backup**:
   ```sql
   -- Check if backup table exists
   SELECT COUNT(*) FROM chunks_embeddings_backup;

   -- Verify dimensions
   SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL;
   ```

---

## 8. Cross-Cutting Concerns

### 8.1 Missing Database Indexes

While the schema has some indexes, several critical query patterns lack optimization:

**Needed Indexes**:
```sql
-- Message timestamp queries (for pagination)
CREATE INDEX CONCURRENTLY idx_messages_timestamp_desc
ON messages(timestamp DESC);

-- Document status queries
CREATE INDEX CONCURRENTLY idx_documents_status_updated
ON documents(status, updated_at);

-- Conversation last message queries
CREATE INDEX CONCURRENTLY idx_conversations_last_message
ON conversations(last_message_at DESC);

-- Event type filtering
CREATE INDEX CONCURRENTLY idx_events_type_timestamp
ON events(type, timestamp DESC);

-- Vector search (already exists but verify)
-- Should be IVFFlat index, not B-tree
```

**VPS-00 Test**: Run `EXPLAIN ANALYZE` on common queries to verify index usage.

### 8.2 Circular Dependencies

From PR #51, the package dependency graph shows:

```
@meta-chat/shared (base)
  ↓
@meta-chat/database
  ↓
@meta-chat/events
  ↓
@meta-chat/orchestrator
  ↓
@meta-chat/rag
  ↓
@meta-chat/api (app)
```

**Potential Issues**:
- `@meta-chat/database` imports from `@meta-chat/shared` (logger)
- `@meta-chat/orchestrator` imports from `@meta-chat/database` AND `@meta-chat/events`
- Risk of circular imports if `@meta-chat/events` needs database access

**Validation**: Run `madge --circular packages/` to detect cycles.

### 8.3 API Completeness Assessment

| Category | Completeness | Issues |
|----------|--------------|--------|
| **Authentication** | 60% | Missing on billing, webhooks partially protected |
| **Validation** | 40% | Analytics, webhooks, documents missing schemas |
| **Error Handling** | 70% | Core routes fixed in PR #57, need full audit |
| **Documentation** | 30% | Many undocumented endpoints |
| **Testing** | Unknown | No integration test coverage visible |
| **Rate Limiting** | 50% | Only chat and widget have limiters |

**Recommendation**: Create API audit spreadsheet tracking all endpoints.

### 8.4 Multi-Tenancy Enforcement

**Current State**:
- ✅ Prisma models have tenant foreign keys
- ✅ RLS policies enabled via migration
- ⚠️ Some queries allow optional tenant filtering (documents GET)
- ❌ Billing routes don't enforce tenant context

**Risk**: Cross-tenant data leakage if tenant context is accidentally omitted.

**Recommendation**: Create middleware that ALWAYS requires tenant context:
```typescript
export function requireTenantContext(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant && !req.adminUser) {
    throw createHttpError(401, 'Tenant context required');
  }
  next();
}
```

---

## 9. Architecture Recommendations

### 9.1 Package Structure

**Current Structure** (monorepo with 11 packages):
```
apps/
  api/           - Express REST API
  dashboard/     - React admin dashboard
  web-widget/    - Customer chat widget
  worker/        - Background job processor

packages/
  channels/      - WhatsApp/Messenger/WebChat adapters
  database/      - Prisma client and queries
  events/        - RabbitMQ event broker
  llm/           - OpenAI/Anthropic/Ollama providers
  orchestrator/  - Message routing and escalation
  rag/           - Document processing and retrieval
  shared/        - Common utilities
```

**Issues**:
1. Unclear separation between `orchestrator` and `rag` - both do retrieval
2. `database` package has too many responsibilities (client, maintenance, admin)
3. No clear API versioning strategy

**Recommended Refactoring**:
```
packages/
  core/
    database-client/     - Just Prisma client
    database-migrations/ - Migration files
    shared/              - Types and utilities

  domain/
    channels/            - Channel adapters
    conversations/       - Conversation logic (new - extracted from orchestrator)
    documents/           - Document processing (renamed from rag)
    billing/             - Billing logic (new - extracted from api)

  infrastructure/
    events/              - Event broker
    llm-providers/       - LLM integrations
    storage/             - File storage (new)

  services/
    chat-service/        - Chat orchestration (renamed from orchestrator)
    analytics-service/   - Analytics (new - extracted from api)
```

**Benefits**:
- Clear domain boundaries
- Easier to test in isolation
- Can scale services independently
- Reduces cognitive load

### 9.2 API Versioning Strategy

**Current State**: No versioning, all routes under `/api/*`

**Recommendation**:
```
/api/v1/tenants
/api/v1/channels
/api/v1/chat
/api/v1/documents
```

**Migration Path**:
1. Create `/api/v1/*` routes duplicating current behavior
2. Add deprecation warnings to unversioned routes
3. After 6 months, remove unversioned routes

### 9.3 Database Schema Evolution

**Current Issues**:
- Embedding dimension change caused data loss
- No schema versioning beyond migration timestamps
- No rollback capability

**Recommendations**:

1. **Schema Version Table**:
```sql
CREATE TABLE schema_versions (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  rollback_sql TEXT,
  description TEXT
);
```

2. **Breaking Change Process**:
   - Stage 1: Add new column alongside old (dual write)
   - Stage 2: Backfill data
   - Stage 3: Switch reads to new column
   - Stage 4: Drop old column (separate migration)

3. **Embedding Version Strategy**:
```prisma
model Chunk {
  embedding       Unsupported("vector(1024)")?
  embeddingModel  String @default("mxbai-embed-large")
  embeddingVersion Int @default(1)
}
```

Then migrations can support multiple versions simultaneously.

### 9.4 Error Handling Standards

**Current State**: Inconsistent error codes and responses

**Recommended Standard**:
```typescript
interface ApiError {
  code: string;           // Machine-readable: "TENANT_NOT_FOUND"
  message: string;        // Human-readable: "The specified tenant does not exist"
  details?: Record<string, any>;  // Context for debugging
  requestId: string;      // Correlation ID
  timestamp: string;      // ISO 8601
}

// Error code registry
enum ErrorCode {
  // 400 series
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',

  // 401 series
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // 500 series
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}
```

### 9.5 Observability

**Current State**: Basic logging, Prometheus metrics endpoint

**Recommendations**:

1. **Structured Logging**:
```typescript
logger.info('Chat request processed', {
  tenantId,
  conversationId,
  messageId,
  ragEnabled: contextUsed,
  responseTime: duration,
  tokens: usage.totalTokens,
});
```

2. **Distributed Tracing**:
   - Add OpenTelemetry instrumentation
   - Trace requests across API → Worker → Database → LLM
   - Add trace IDs to all logs

3. **Key Metrics**:
```typescript
// Request metrics
chat_requests_total{tenant_id, model}
chat_request_duration_seconds{tenant_id}

// RAG metrics
rag_context_used{tenant_id}
document_processing_duration_seconds{status}

// Business metrics
conversations_active{tenant_id, channel}
messages_total{tenant_id, direction}
```

4. **Alerting**:
   - 5xx error rate > 5%
   - Database connection failures
   - RAG search latency > 2s
   - Stripe webhook failures
   - Partition nearing capacity

---

## 10. Migration Strategy

### Phase 1: Critical Fixes (Week 1)
**Priority: URGENT**

1. **Day 1-2**: Fix billing authentication (PR #61)
   - Add auth middleware to billing routes
   - Test on VPS-00
   - Deploy immediately

2. **Day 2-3**: Fix broken RAG functionality (PR #61)
   - Complete RAG code block
   - Test with real documents
   - Deploy immediately

3. **Day 3-4**: Fix error handling (PR #57)
   - Merge PR #57
   - Audit remaining async routes
   - Add error sanitization

4. **Day 4-5**: Fix schema drift (PR #73)
   - Create corrective migration for verification_tokens
   - Test on staging database
   - Deploy to production

### Phase 2: Security Hardening (Week 2)
**Priority: HIGH**

1. **Day 1-2**: SQL injection mitigation (PR #55)
   - Replace `$executeRawUnsafe` in maintenance.ts
   - Add input validation
   - Create unit tests

2. **Day 3-4**: API validation (PR #60)
   - Add Zod schemas for analytics routes
   - Validate webhook payloads
   - Enforce document metadata schemas

3. **Day 4-5**: Webhook authentication
   - Add rate limiting
   - Improve audit logging
   - Test with real WhatsApp/Messenger webhooks

### Phase 3: Data Integrity (Week 3)
**Priority: MEDIUM**

1. **Day 1-2**: Implement integrity checker (PR #68)
   - Create integrity check script
   - Run on VPS-00 database
   - Document existing issues

2. **Day 3-4**: Add database constraints
   - Add CHECK constraints for status fields
   - Add positive value constraints
   - Test on staging

3. **Day 5**: Add missing indexes
   - Create performance-critical indexes
   - Run EXPLAIN ANALYZE on slow queries
   - Monitor index usage

### Phase 4: Architecture Improvements (Week 4)
**Priority: MEDIUM**

1. **Day 1-2**: Fix package dependencies (PR #51)
   - Add missing vitest dependencies
   - Standardize to `workspace:*` protocol
   - Fix socket.io version conflict

2. **Day 3-4**: Add TypeScript project references
   - Update all tsconfig.json files
   - Configure Turborepo build order
   - Test incremental builds

3. **Day 5**: Migration rollback scripts (PR #73)
   - Create DOWN migrations
   - Document rollback procedure
   - Test on staging database

### Phase 5: Operational Excellence (Week 5)
**Priority: LOW**

1. **Day 1-2**: Partition automation
   - Implement partition manager
   - Add to worker cron
   - Document maintenance procedures

2. **Day 3-4**: Enhanced monitoring
   - Add integrity check cron job
   - Create Grafana dashboards
   - Configure alerts

3. **Day 5**: Documentation
   - Update API documentation
   - Create runbooks for common issues
   - Document all VPS-00 validation procedures

---

## 11. Testing Strategy

### 11.1 Critical Path Testing

**Before any deployment to VPS-00**:

1. **Authentication Flow**:
   ```bash
   # Admin login
   curl -X POST http://localhost:3007/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "test"}'

   # Store token
   TOKEN=$(curl -s -X POST ... | jq -r '.token')

   # Test authenticated endpoint
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3007/api/tenants
   ```

2. **Tenant Isolation**:
   ```bash
   # Create test tenant 1
   TENANT1=$(curl -X POST .../api/tenants -d '{"name": "Tenant 1"}' | jq -r '.id')

   # Create test tenant 2
   TENANT2=$(curl -X POST .../api/tenants -d '{"name": "Tenant 2"}' | jq -r '.id')

   # Upload document to tenant 1
   curl -X POST .../api/documents \
     -H "X-Tenant-ID: $TENANT1" \
     -d '{"filename": "test.pdf", "content": "..."}'

   # Try to access from tenant 2 - should fail
   curl -H "X-Tenant-ID: $TENANT2" \
     .../api/documents?tenantId=$TENANT1
   ```

3. **RAG Functionality**:
   ```bash
   # Upload document
   DOC_ID=$(curl -X POST .../api/documents -d @test-doc.json | jq -r '.id')

   # Wait for processing
   while [ "$(curl .../api/documents/$DOC_ID | jq -r '.status')" != "ready" ]; do
     sleep 2
   done

   # Send chat with RAG enabled
   RESPONSE=$(curl -X POST .../api/chat \
     -d '{"tenantId": "$TENANT1", "message": "What does the document say?"}')

   # Verify context was used
   echo $RESPONSE | jq '.contextUsed'  # Should be true
   ```

4. **Error Handling**:
   ```bash
   # Test without auth
   curl -v .../api/billing/create-checkout-session  # Should be 401

   # Test with invalid input
   curl -X POST .../api/documents -d '{"invalid": "data"}'  # Should be 400

   # Test with malformed JSON
   curl -X POST .../api/documents -d 'not json'  # Should be 400
   ```

### 11.2 Load Testing

**After all fixes deployed**:

```bash
# Run existing perf test
npm run test:perf

# Custom load test for VPS-00
artillery quick --count 100 --num 10 \
  http://localhost:3007/api/health
```

### 11.3 Database Testing

```sql
-- Test data integrity checks
\i packages/database/reports/qa/data-integrity-queries.md

-- Test partition queries span correctly
SELECT COUNT(*) FROM messages
WHERE timestamp BETWEEN '2025-01-01' AND '2025-12-31';

-- Test vector search performance
EXPLAIN ANALYZE
SELECT * FROM chunks
WHERE tenant_id = 'test-tenant'
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector(1024)
LIMIT 5;
```

---

## 12. Risk Assessment

### High Risk Items

| Issue | Risk | Likelihood | Impact | Mitigation |
|-------|------|------------|--------|------------|
| Billing has no auth | Security breach, unauthorized subscriptions | HIGH | HIGH | Add auth middleware (2 hours) |
| RAG completely broken | Core feature doesn't work | HIGH | HIGH | Complete code block (1 hour) |
| Schema drift | Runtime crashes from NULL violations | MEDIUM | HIGH | Corrective migration (2 hours) |
| Orphaned records | Query failures, data leaks | MEDIUM | MEDIUM | Integrity checks (8 hours) |
| SQL injection in maintenance | Database corruption | LOW | CRITICAL | Use tagged templates (3 hours) |

### Medium Risk Items

| Issue | Risk | Likelihood | Impact | Mitigation |
|-------|------|------------|--------|------------|
| Missing validation | DOS, bad data persisted | MEDIUM | MEDIUM | Add Zod schemas (12 hours) |
| No rollback migrations | Cannot recover from bad deploy | MEDIUM | MEDIUM | Create DOWN scripts (20 hours) |
| Error info leakage | Aids attacker reconnaissance | MEDIUM | LOW | Sanitize errors (complete PR #57) |
| Missing indexes | Slow queries as data grows | HIGH | MEDIUM | Add indexes (2 hours) |

### Low Risk Items

| Issue | Risk | Likelihood | Impact | Mitigation |
|-------|------|------------|--------|------------|
| Package version conflicts | Build failures in CI | LOW | LOW | Standardize versions (2 hours) |
| Missing TypeScript refs | Slow incremental builds | LOW | LOW | Add references (4 hours) |
| Undocumented endpoints | Developer confusion | HIGH | LOW | Update docs (3 hours) |

---

## 13. Success Criteria

### Must Have (Before Production)
- ✅ All authentication gaps closed
- ✅ RAG functionality restored and tested
- ✅ Schema drift corrected
- ✅ Error handling prevents crashes
- ✅ Database integrity checks pass
- ✅ SQL injection vectors eliminated

### Should Have (Within 2 weeks)
- ✅ All API routes validated with Zod
- ✅ Database constraints added
- ✅ Missing indexes created
- ✅ Migration rollbacks documented
- ✅ Package dependencies fixed
- ✅ Integration tests for critical paths

### Nice to Have (Within 1 month)
- ✅ TypeScript project references
- ✅ Partition automation
- ✅ Enhanced monitoring
- ✅ API versioning strategy
- ✅ Complete API documentation
- ✅ Load testing passing

---

## 14. VPS-00 Validation Checklist

After each deployment, run this checklist on VPS-00:

### Application Health
```bash
# 1. Check service is running
systemctl status meta-chat-api

# 2. Verify port 3007 responding
curl http://localhost:3007/health

# 3. Check logs for errors
journalctl -u meta-chat-api -n 100 --no-pager

# 4. Verify database connectivity
curl http://localhost:3007/health | jq '.database'
```

### Authentication
```bash
# 5. Test admin login
curl -X POST http://localhost:3007/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@genai.hr", "password": "..."}'

# 6. Test protected route with token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3007/api/tenants
```

### Core Functionality
```bash
# 7. Test tenant creation
curl -X POST http://localhost:3007/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Tenant"}'

# 8. Test chat endpoint
curl -X POST http://localhost:3007/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tenantId": "...", "message": "Hello"}'

# 9. Test RAG with document
# (Upload doc, wait for processing, send related query)
```

### Database
```bash
# 10. Connect to database
psql $DATABASE_URL

# 11. Run integrity checks
\i /path/to/integrity-queries.sql

# 12. Check for orphaned records
SELECT COUNT(*) FROM conversations c
LEFT JOIN tenants t ON c.tenant_id = t.id
WHERE t.id IS NULL;

# 13. Verify partitions exist
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'messages_y%'
ORDER BY tablename;
```

### Performance
```bash
# 14. Check response times
curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:3007/api/health

# 15. Run light load test
ab -n 1000 -c 10 http://localhost:3007/api/health

# 16. Check database query performance
psql -c "SELECT * FROM pg_stat_statements
WHERE query LIKE '%messages%'
ORDER BY total_exec_time DESC LIMIT 10;"
```

### Security
```bash
# 17. Verify billing requires auth
curl -X POST http://localhost:3007/api/billing/create-checkout-session
# Should return 401

# 18. Test error sanitization
curl http://localhost:3007/api/tenants/invalid-id
# Should NOT contain stack traces

# 19. Test validation
curl -X POST http://localhost:3007/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"invalid": "data"}'
# Should return 400 with clear message
```

---

## 15. Conclusion

This analysis identified **7 critical issues** across architecture, database, and API layers:

1. **Missing authentication** on financial and webhook endpoints (CRITICAL)
2. **Broken RAG functionality** due to incomplete code (CRITICAL)
3. **Database schema drift** causing runtime errors (HIGH)
4. **No migration rollback capability** (HIGH)
5. **Missing input validation** on key routes (HIGH)
6. **Potential SQL injection** in maintenance code (MEDIUM)
7. **Inconsistent package dependencies** breaking builds (MEDIUM)

**Total Estimated Effort**: 60-85 hours (7.5-10.5 days) for complete resolution

**Recommended Approach**: Follow the phased migration strategy, focusing on Week 1 critical fixes before addressing lower-priority items.

**Next Steps**:
1. Review this analysis with the team
2. Prioritize based on business impact
3. Assign owners to each phase
4. Schedule VPS-00 maintenance windows
5. Execute Week 1 critical fixes immediately

All PRs are ready to merge pending the implementation of the fixes outlined in this document.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Author**: Claude Code (Architecture Analysis Agent)
**Review Status**: Pending Team Review
