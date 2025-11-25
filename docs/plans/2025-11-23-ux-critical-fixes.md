# UX Critical Issues Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical UX blockers preventing dashboard usage: infinite loading states, silent failures, and missing user feedback

**Architecture:** Dashboard uses JWT authentication for TenantUser accounts. API routes need JWT middleware. Add proper error handling and user feedback for tenant creation and document ingestion.

**Tech Stack:** TypeScript, Express, React Query, JWT, Prisma

**Deployment:** VPS-00 at `/home/deploy/meta-chat-platform`

---

## Investigation Phase

### Task 1: Verify JWT Authentication Flow

**Goal:** Understand current authentication mechanism and identify the gap

**Files:**
- Read: `/home/deploy/meta-chat-platform/apps/dashboard/src/api/client.ts`
- Read: `/home/deploy/meta-chat-platform/apps/api/src/middleware/auth.ts`
- Read: `/home/deploy/meta-chat-platform/apps/api/dist/routes/channels.js`

**Step 1: Check dashboard auth implementation**

```bash
ssh admin@vps-00 "cat /home/deploy/meta-chat-platform/apps/dashboard/src/api/client.ts | grep -A5 'x-admin-key\|Authorization'"
```

Expected: Should show JWT token being sent as header

**Step 2: Check API middleware**

```bash
ssh admin@vps-00 "cat /home/deploy/meta-chat-platform/apps/api/src/middleware/auth.ts | grep -A10 'export.*authenticate'"
```

Expected: Should show available authentication functions

**Step 3: Check compiled route authentication**

```bash
ssh admin@vps-00 "head -25 /home/deploy/meta-chat-platform/apps/api/dist/routes/channels.js"
```

Expected: Should show which auth middleware is being used

**Step 4: Document findings**

Create: `/tmp/auth-investigation.md` with:
- Current auth flow
- Missing middleware (if any)
- Routes that need updating

---

## Phase 1: Fix Authentication for Channels/Webhooks/MCP Servers

### Task 2: Find or Create JWT Authentication Middleware

**Files:**
- Check: `/home/deploy/meta-chat-platform/apps/api/src/middleware/`
- Create (if missing): `/home/deploy/meta-chat-platform/apps/api/src/middleware/authenticateTenantUser.ts`

**Step 1: Search for existing JWT middleware**

```bash
ssh admin@vps-00 "find /home/deploy/meta-chat-platform/apps/api/src -name '*tenant*' -o -name '*jwt*' | grep -i middleware"
```

Expected: May find existing file or return empty

**Step 2: Check server.ts for JWT handling**

```bash
ssh admin@vps-00 "grep -n 'jwt.verify\|jsonwebtoken' /home/deploy/meta-chat-platform/apps/api/src/server.ts | head -10"
```

Expected: Should show JWT verification code exists somewhere

**Step 3: Locate login endpoint to understand JWT structure**

```bash
ssh admin@vps-00 "grep -r \"'/login'\" /home/deploy/meta-chat-platform/apps/api/src --include='*.ts' | head -5"
```

Expected: Should find login route that issues JWT tokens

**Step 4: Check what authentication analytics routes use (working example)**

```bash
ssh admin@vps-00 "head -15 /home/deploy/meta-chat-platform/apps/api/src/routes/analytics.ts"
```

Expected: Should show which middleware analytics uses (this route works)

**Step 5: Document the correct authentication pattern**

Save findings to `/tmp/auth-pattern.md`

---

### Task 3: Create or Identify JWT Middleware Implementation

**Outcome:** Either find existing JWT middleware or create new one

**If middleware exists:**
- Document its location
- Verify it handles JWT properly
- Move to Task 4

**If middleware doesn't exist, create:**

**File:** `/home/deploy/meta-chat-platform/apps/api/src/middleware/authenticateTenantUser.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

interface JWTPayload {
  sub: string;  // tenant user ID
  tenantId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      tenantUser?: {
        id: string;
        tenantId: string;
        email: string;
      };
    }
  }
}

export function authenticateTenantUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createHttpError(401, 'Authentication required'));
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.tenantUser = {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return next(createHttpError(401, 'Invalid or expired token'));
  }
}
```

**Step 1: Create the middleware file**

```bash
ssh admin@vps-00 "cat > /home/deploy/meta-chat-platform/apps/api/src/middleware/authenticateTenantUser.ts << 'EOF'
[paste code above]
EOF"
```

**Step 2: Verify file created**

```bash
ssh admin@vps-00 "ls -la /home/deploy/meta-chat-platform/apps/api/src/middleware/authenticateTenantUser.ts"
```

Expected: File exists with ~60 lines

---

### Task 4: Update Channels Route to Use JWT Auth

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/routes/channels.ts`

**Step 1: Read current channels route**

```bash
ssh admin@vps-00 "head -45 /home/deploy/meta-chat-platform/apps/api/src/routes/channels.ts"
```

Expected: Shows current authentication import and usage

**Step 2: Update imports**

Change from:
```typescript
import { authenticateAdmin } from '../middleware/auth';
```

To:
```typescript
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
```

Command:
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && sed -i 's/import { authenticateAdmin }/import { authenticateTenantUser }/' src/routes/channels.ts && sed -i \"s/'..\/middleware\/auth'/'..\/middleware\/authenticateTenantUser'/\" src/routes/channels.ts"
```

**Step 3: Update middleware usage**

Change from:
```typescript
router.use(authenticateAdmin);
```

To:
```typescript
router.use(authenticateTenantUser);
```

Command:
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && sed -i 's/router.use(authenticateAdmin)/router.use(authenticateTenantUser)/' src/routes/channels.ts"
```

**Step 4: Update GET route to use authenticated tenant**

Change from:
```typescript
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  const channels = await prisma.channel.findMany({
    where: tenantId ? { tenantId: String(tenantId) } : undefined,
```

To:
```typescript
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.tenantUser!.tenantId;
  const channels = await prisma.channel.findMany({
    where: { tenantId },
```

Command:
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api/src/routes && cat > /tmp/channels-get-fix.sed << 'SED_EOF'
/router.get.*\/, asyncHandler/,/orderBy: { createdAt:/ {
  s/const { tenantId } = req.query;/const tenantId = req.tenantUser!.tenantId;/
  s/where: tenantId ? { tenantId: String(tenantId) } : undefined,/where: { tenantId },/
}
SED_EOF
sed -i -f /tmp/channels-get-fix.sed channels.ts"
```

**Step 5: Update POST route**

Change from:
```typescript
const tenantId = req.tenantUser!.tenantId;
const payload = parseWithSchema(createChannelSchema, req.body);
```

To:
```typescript
const tenantId = req.tenantUser!.tenantId;
const payload = parseWithSchema(createChannelSchema, req.body);
```

(Already uses tenantUser, verify it's correct)

**Step 6: Verify changes**

```bash
ssh admin@vps-00 "head -50 /home/deploy/meta-chat-platform/apps/api/src/routes/channels.ts"
```

Expected: authenticateTenantUser import and usage visible

---

### Task 5: Update Webhooks Route to Use JWT Auth

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/routes/webhooks.ts`

**Step 1: Update imports and middleware (same as channels)**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && \
  sed -i 's/import { authenticateAdmin }/import { authenticateTenantUser }/' src/routes/webhooks.ts && \
  sed -i \"s/'..\/middleware\/auth'/'..\/middleware\/authenticateTenantUser'/\" src/routes/webhooks.ts && \
  sed -i 's/router.use(authenticateAdmin)/router.use(authenticateTenantUser)/' src/routes/webhooks.ts"
```

**Step 2: Update GET route**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api/src/routes && cat > /tmp/webhooks-get-fix.sed << 'SED_EOF'
/router.get.*\/, asyncHandler/,/orderBy: { createdAt:/ {
  s/const tenantId = req.tenantUser!.tenantId;/const tenantId = req.tenantUser!.tenantId;/
  /const { tenantId } = req.query;/d
  s/where: { tenantId },/where: { tenantId },/
}
SED_EOF
sed -i -f /tmp/webhooks-get-fix.sed webhooks.ts"
```

**Step 3: Verify changes**

```bash
ssh admin@vps-00 "head -50 /home/deploy/meta-chat-platform/apps/api/src/routes/webhooks.ts"
```

---

### Task 6: Update MCP Servers Route to Use JWT Auth

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/routes/mcpServers.ts`

**Step 1: Update imports and middleware**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && \
  sed -i 's/import { authenticateAdmin }/import { authenticateTenantUser }/' src/routes/mcpServers.ts && \
  sed -i \"s/'..\/middleware\/auth'/'..\/middleware\/authenticateTenantUser'/\" src/routes/mcpServers.ts && \
  sed -i 's/router.use(authenticateAdmin)/router.use(authenticateTenantUser)/' src/routes/mcpServers.ts"
```

**Step 2: Verify changes**

```bash
ssh admin@vps-00 "head -15 /home/deploy/meta-chat-platform/apps/api/src/routes/mcpServers.ts"
```

**Note:** MCP servers are global resources, so they don't filter by tenantId

---

### Task 7: Update Dashboard to Send JWT as Bearer Token

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/api/client.ts`

**Step 1: Read current client implementation**

```bash
ssh admin@vps-00 "cat /home/deploy/meta-chat-platform/apps/dashboard/src/api/client.ts | head -80"
```

**Step 2: Update header from x-admin-key to Authorization**

Change from:
```typescript
headers: {
  'Content-Type': 'application/json',
  'x-admin-key': apiKey,
```

To:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
```

Command:
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/dashboard/src/api && \
  sed -i \"s/'x-admin-key': apiKey/'Authorization': \\\`Bearer \\\${apiKey}\\\`/\" client.ts"
```

**Step 3: Verify change**

```bash
ssh admin@vps-00 "grep -A2 'Authorization' /home/deploy/meta-chat-platform/apps/dashboard/src/api/client.ts"
```

Expected: Should show `'Authorization': \`Bearer ${apiKey}\``

---

### Task 8: Rebuild API and Dashboard

**Step 1: Rebuild API**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && npm run build 2>&1 | tail -20"
```

Expected: Build successful, no TypeScript errors

**Step 2: Rebuild Dashboard**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/dashboard && npm run build 2>&1 | tail -20"
```

Expected: Build successful

**Step 3: Restart API server**

```bash
ssh admin@vps-00 "pm2 restart meta-chat-api && sleep 3 && pm2 logs meta-chat-api --lines 30 --nostream"
```

Expected: Server starts without errors

**Step 4: Test channels endpoint with JWT**

First, get a valid JWT token by logging in, then test:

```bash
# This will be done manually in browser or via curl after login
echo "Test manually: Login to dashboard, open DevTools, copy JWT token from localStorage['meta-chat/admin-api-key'], then:"
echo "curl -H 'Authorization: Bearer <TOKEN>' https://chat.genai.hr/api/channels"
```

Expected: Should return `{"success":true,"data":[]}`

---

## Phase 2: Fix Tenant Creation Feedback

### Task 9: Add Success Toast to Tenant Creation

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/TenantsPage.tsx` (or similar)

**Step 1: Find tenant creation page**

```bash
ssh admin@vps-00 "find /home/deploy/meta-chat-platform/apps/dashboard/src -name '*enant*' -o -name '*Tenant*' | grep -i page"
```

**Step 2: Review mutation success handling**

```bash
ssh admin@vps-00 "grep -A10 'onSuccess' /home/deploy/meta-chat-platform/apps/dashboard/src/pages/*Tenant*.tsx 2>/dev/null"
```

**Step 3: Add success toast if missing**

Ensure mutation has:
```typescript
const mutation = useMutation({
  mutationFn: createTenant,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    toast.success('Tenant created successfully');
    // Reset form or close modal
  },
  onError: (error) => {
    toast.error(`Failed to create tenant: ${error.message}`);
  },
});
```

**Step 4: Rebuild dashboard**

```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/dashboard && npm run build"
```

---

## Phase 3: Fix Document Ingestion Status

### Task 10: Investigate Document Processing Pipeline

**Step 1: Check document creation endpoint**

```bash
ssh admin@vps-00 "grep -A30 'router.post' /home/deploy/meta-chat-platform/apps/api/src/routes/documents.ts"
```

**Step 2: Check worker processing**

```bash
ssh admin@vps-00 "pm2 logs meta-chat-worker --lines 50 --nostream | grep -i 'document\|embed'"
```

**Step 3: Check for processing queue**

```bash
ssh admin@vps-00 "grep -r 'documentQueue\|embedding' /home/deploy/meta-chat-platform/apps/api/src/queues --include='*.ts'"
```

**Step 4: Identify why documents immediately show "failed"**

Check database for document status:
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/api && node -e \"
const { getPrismaClient } = require('@meta-chat/database');
const prisma = getPrismaClient();
prisma.document.findMany({ take: 5, orderBy: { createdAt: 'desc' } }).then(docs => {
  console.log(JSON.stringify(docs, null, 2));
  prisma.\\\$disconnect();
});
\""
```

**Step 5: Document the issue**

Save findings to `/tmp/document-issue.md`

---

### Task 11: Fix Document Status Flow

**Based on investigation findings, typical fixes might include:**

**Option A: Worker not running**
```bash
ssh admin@vps-00 "pm2 start ecosystem.config.js --only meta-chat-worker"
```

**Option B: Queue not connected**
- Check RabbitMQ connection
- Verify environment variables

**Option C: Status not updating**
- Add proper status transitions in worker
- Add error handling and status updates

**Exact implementation depends on Task 10 findings**

---

## Verification

### Task 12: Manual Testing Checklist

**Step 1: Test Channels Page**
1. Login to https://chat.genai.hr
2. Navigate to /channels
3. Verify: Page loads (not stuck on "Loading...")
4. Verify: Empty state shows OR data shows

**Step 2: Test Webhooks Page**
1. Navigate to /webhooks
2. Verify: Page loads properly

**Step 3: Test MCP Servers Page**
1. Navigate to /mcp-servers
2. Verify: Page loads properly

**Step 4: Test Tenant Creation**
1. Navigate to /tenants
2. Click "Create Tenant"
3. Fill form
4. Submit
5. Verify: Success toast appears
6. Verify: New tenant appears in list

**Step 5: Test Document Upload**
1. Navigate to /documents
2. Click "Add Document"
3. Add document with text content
4. Verify: Status shows "processing" then "success" (not immediate "failed")

---

## Commit Strategy

```bash
git checkout -b fix/ux-critical-blockers
git add apps/api/src/middleware/authenticateTenantUser.ts
git add apps/api/src/routes/{channels,webhooks,mcpServers}.ts
git commit -m "fix: add JWT authentication middleware for tenant routes

- Create authenticateTenantUser middleware for JWT validation
- Update channels, webhooks, mcpServers routes to use JWT auth
- Fixes infinite loading states caused by 401 errors"

git add apps/dashboard/src/api/client.ts
git commit -m "fix: send JWT as Bearer token instead of x-admin-key

- Update API client to use Authorization: Bearer header
- Aligns with JWT authentication standard"

git add apps/dashboard/src/pages/TenantsPage.tsx
git commit -m "fix: add success feedback for tenant creation

- Add success toast when tenant is created
- Add error toast with message on failure
- Invalidate query to refresh tenant list"

git push origin fix/ux-critical-blockers
```

---

## Notes for Engineer

**Testing on production:**
- Use existing verified account: `uxreview@test.com`
- Check browser DevTools Network tab for 401 vs 200 responses
- Check PM2 logs: `ssh admin@vps-00 "pm2 logs meta-chat-api --lines 100"`

**If builds fail:**
- Check TypeScript errors carefully
- Ensure middleware types are exported correctly
- Verify JWT_SECRET is set in environment

**Rollback if needed:**
```bash
ssh admin@vps-00 "cd /home/deploy/meta-chat-platform && git checkout master && pm2 restart all"
```
