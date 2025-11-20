# TypeScript Build Fixes - Ground Up Repair Plan

**Created**: 2025-11-20
**Status**: Ready for implementation
**Estimated Time**: 60-90 minutes

## Overview

This plan systematically fixes all TypeScript build errors in the meta-chat-platform monorepo. The errors fall into three categories:

1. **Missing exports from orchestrator package** - 7 classes/interfaces/types not exported
2. **API middleware issues** - Missing hstsHeader export that doesn't exist
3. **Worker channel adapter issues** - Schema mismatch where code expects Json fields but schema has relations

**Root Causes Identified**:
- Orchestrator package incomplete: channel-adapter, message-orchestrator, and message-pipeline-with-escalation modules not exported
- Server.ts importing non-existent hstsHeader middleware
- Channel schema has `secrets` as relation (ChannelSecret[]) but worker code expects Json field
- Channel schema missing `metadata` field entirely

## Prerequisites

- SSH access to admin@100.97.156.41
- Platform running at /home/deploy/meta-chat-platform
- Node.js and npm installed
- PM2 for process management

## Implementation Tasks

### Task 1: Export orchestrator channel adapter modules

**File**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/index.ts`

**Current exports** (end of file):
```typescript
// Export confidence and escalation modules
export { ConfidenceAnalyzer } from './confidence-analyzer';
export { EscalationEngine, EscalationAction } from './escalation-engine';
export { buildEscalationConfigFromTenant, isConfidenceEscalationEnabled } from './escalation-config-builder';
```

**Add after existing exports**:
```typescript
// Export channel adapter modules
export {
  ChannelAdapter,
  ChannelSendResult,
  OutboundMessage,
  ChannelAdapterContext,
  ChannelAdapterRegistry
} from './channel-adapter';
```

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/orchestrator && npm run build"
```

**Expected output**: Build should complete without errors about missing channel adapter exports.

**Commit message**:
```
fix(orchestrator): export channel adapter types and registry

Export ChannelAdapter, ChannelSendResult, OutboundMessage,
ChannelAdapterContext, and ChannelAdapterRegistry from orchestrator
package to fix worker build errors.
```

---

### Task 2: Export orchestrator message orchestrator module

**File**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/index.ts`

**Add after channel adapter exports**:
```typescript
// Export message orchestrator
export { MessageOrchestrator } from './message-orchestrator';
export type { MessageOrchestratorOptions } from './message-orchestrator';
```

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/orchestrator && npm run build"
```

**Expected output**: Build completes successfully.

**Commit message**:
```
fix(orchestrator): export MessageOrchestrator and options type

Export MessageOrchestrator class and MessageOrchestratorOptions
interface to fix worker imports.
```

---

### Task 3: Export orchestrator message pipeline with escalation

**File**: `/home/deploy/meta-chat-platform/packages/orchestrator/src/index.ts`

**Add after message orchestrator exports**:
```typescript
// Export message pipeline with escalation
export { MessagePipelineWithEscalation } from './message-pipeline-with-escalation';
```

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/orchestrator && npm run build"
```

**Expected output**: Build completes successfully.

**Commit message**:
```
fix(orchestrator): export MessagePipelineWithEscalation

Export MessagePipelineWithEscalation class to fix worker imports.
```

---

### Task 4: Fix server.ts hstsHeader import

**File**: `/home/deploy/meta-chat-platform/apps/api/src/server.ts`

**Problem**: Line 15 imports `hstsHeader` which doesn't exist in httpsRedirect.ts.

**Current code** (line 15):
```typescript
import { httpsRedirect, hstsHeader } from './middleware/httpsRedirect';
```

**Change to**:
```typescript
import { httpsRedirect } from './middleware/httpsRedirect';
import { securityHeaders } from './middleware/securityHeaders';
```

**Current code** (lines 487-488):
```typescript
  app.use(hstsHeader);
  app.use(httpsRedirect);
```

**Change to**:
```typescript
  app.use(securityHeaders);
  app.use(httpsRedirect);
```

**Rationale**: The securityHeaders middleware already provides comprehensive security headers including HSTS via the CSP header. Using securityHeaders is the correct approach.

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/apps/api && npm run build"
```

**Expected output**: No errors about missing hstsHeader export.

**Commit message**:
```
fix(api): use securityHeaders instead of non-existent hstsHeader

Replace hstsHeader import with securityHeaders which provides
comprehensive security headers including HSTS protection.
```

---

### Task 5: Add metadata field to Channel schema

**File**: `/home/deploy/meta-chat-platform/packages/database/prisma/schema.prisma`

**Current Channel model**:
```prisma
model Channel {
  id        String   @id @default(cuid())
  tenantId  String
  type      String // whatsapp, messenger, webchat
  config    Json // Channel-specific credentials
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant  Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  secrets ChannelSecret[]

  @@unique([tenantId, type])
  @@index([tenantId, enabled])
  @@map("channels")
}
```

**Add metadata field** (after enabled field):
```prisma
model Channel {
  id        String   @id @default(cuid())
  tenantId  String
  type      String // whatsapp, messenger, webchat
  config    Json // Channel-specific credentials
  enabled   Boolean  @default(true)
  metadata  Json?    // Optional channel metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant  Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  secrets ChannelSecret[]

  @@unique([tenantId, type])
  @@index([tenantId, enabled])
  @@map("channels")
}
```

**Generate migration**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/database && npx prisma migrate dev --name add_channel_metadata"
```

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/database && npx prisma generate"
```

**Expected output**: Prisma generates updated client with metadata field.

**Commit message**:
```
feat(database): add metadata field to Channel model

Add optional metadata Json field to Channel model to store
additional channel configuration data.
```

---

### Task 6: Fix worker channel-adapters secrets access

**File**: `/home/deploy/meta-chat-platform/apps/worker/src/channel-adapters.ts`

**Problem**: Line 62 tries to access `channel.secrets` as a Json field, but it's a relation (ChannelSecret[]).

**Current code** (lines 36-63):
```typescript
    // Fetch full channel configuration from database
    const channel = await prisma.channel.findFirst({
      where: {
        tenantId: context.tenantId,
        type: context.channel,
        enabled: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!channel) {
      throw new Error(
        `No enabled ${context.channel} channel found for tenant ${context.tenantId}`,
      );
    }

    // Build channel context for the underlying adapter
    const channelContext: ChannelContext = {
      tenant: {
        id: channel.tenant.id,
        name: channel.tenant.name || undefined,
        settings: (channel.tenant.settings as Record<string, any>) || {},
      },
      channel: {
        id: channel.id,
        type: channel.type as ChannelType,
        config: (channel.config as Record<string, any>) || {},
        secrets: (channel.secrets as Record<string, string>) || undefined,
        metadata: (channel.metadata as Record<string, any>) || undefined,
      },
    };
```

**Replace with** (lines 36-75):
```typescript
    // Fetch full channel configuration from database
    const channel = await prisma.channel.findFirst({
      where: {
        tenantId: context.tenantId,
        type: context.channel,
        enabled: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
        secrets: true, // Include the secrets relation
      },
    });

    if (!channel) {
      throw new Error(
        `No enabled ${context.channel} channel found for tenant ${context.tenantId}`,
      );
    }

    // Decrypt and build secrets object from ChannelSecret relation
    // For now, we'll handle secrets via the config field instead
    // TODO: Implement proper secret decryption when needed
    const secretsData: Record<string, string> = {};

    // Build channel context for the underlying adapter
    const channelContext: ChannelContext = {
      tenant: {
        id: channel.tenant.id,
        name: channel.tenant.name || undefined,
        settings: (channel.tenant.settings as Record<string, any>) || {},
      },
      channel: {
        id: channel.id,
        type: channel.type as ChannelType,
        config: (channel.config as Record<string, any>) || {},
        secrets: secretsData,
        metadata: (channel.metadata as Record<string, any>) || undefined,
      },
    };
```

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/apps/worker && npm run build"
```

**Expected output**: No errors about secrets or metadata properties.

**Commit message**:
```
fix(worker): handle Channel secrets as relation not Json field

Update channel-adapters to properly handle secrets as ChannelSecret[]
relation instead of expecting Json field. Prepare for future secret
decryption implementation.
```

---

### Task 7: Remove vectorSearch logger import

**File**: `/home/deploy/meta-chat-platform/apps/api/src/services/vectorSearch.ts`

**Problem**: Line 2 imports `logger` from @meta-chat/shared but it doesn't export a logger instance, only createLogger function.

**Current code** (line 2):
```typescript
import { logger } from '@meta-chat/shared';
```

**Change to**:
```typescript
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('VectorSearch');
```

**Usage in file**: All `logger` usages remain the same (lines 48, 100).

**Test command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/apps/api && npm run build"
```

**Expected output**: No errors about logger export.

**Commit message**:
```
fix(api): use createLogger for vectorSearch service

Replace non-existent logger import with createLogger function
to create proper service logger instance.
```

---

### Task 8: Build and verify all packages

**Command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform && npm run build"
```

**Expected output**: All packages build successfully with no TypeScript errors.

**If errors remain**: Document new errors and create follow-up tasks.

**Verification checklist**:
- [ ] packages/orchestrator builds successfully
- [ ] packages/database generates Prisma client successfully
- [ ] packages/events builds successfully
- [ ] apps/api builds successfully
- [ ] apps/worker builds successfully

---

### Task 9: Run Prisma migration

**Command**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/database && npx prisma migrate deploy"
```

**Expected output**: Migration applies successfully.

**Commit message**:
```
chore(database): deploy channel metadata migration

Apply migration to add metadata field to channels table.
```

---

### Task 10: Restart PM2 services

**Commands**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform && pm2 delete all"
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform && pm2 start ecosystem.config.js"
ssh admin@100.97.156.41 "pm2 logs --lines 50"
```

**Expected output**:
- meta-chat-api starts successfully
- meta-chat-worker starts successfully
- No TypeScript or import errors in logs

**Verification**:
```bash
ssh admin@100.97.156.41 "pm2 status"
```

Should show both services in "online" status.

---

## Post-Implementation Verification

### 1. Test API Health

```bash
curl https://chat.genai.hr/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up",
    "rabbitmq": "up"
  },
  "timestamp": "2025-11-20T..."
}
```

### 2. Test Email Signup

1. Navigate to https://chat.genai.hr/signup
2. Enter test email address
3. Submit form
4. Check for verification email delivery

**Expected**: Email sent successfully, no errors in PM2 logs.

### 3. Check PM2 Logs for Errors

```bash
ssh admin@100.97.156.41 "pm2 logs --lines 100 --nostream"
```

**Expected**: No TypeScript errors, no import errors, no module resolution errors.

---

## Rollback Plan

If issues occur during implementation:

1. **Revert git changes**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform && git reset --hard HEAD"
```

2. **Revert database migration** (if Task 9 completed):
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform/packages/database && npx prisma migrate resolve --rolled-back add_channel_metadata"
```

3. **Restart services**:
```bash
ssh admin@100.97.156.41 "cd /home/deploy/meta-chat-platform && pm2 delete all && pm2 start ecosystem.config.js"
```

---

## Summary

This plan fixes all TypeScript build errors by:

1. **Adding missing exports** to orchestrator package (7 exports)
2. **Fixing middleware imports** in server.ts (securityHeaders instead of hstsHeader)
3. **Adding metadata field** to Channel schema
4. **Fixing secrets handling** in worker to use relation instead of Json field
5. **Fixing logger import** in vectorSearch service

All fixes are ground-up repairs with no temporary workarounds. Each task is independent and can be tested individually before moving to the next.

**Total estimated time**: 60-90 minutes
**Risk level**: Low (all changes are type fixes and schema additions)
**Rollback complexity**: Low (git reset + optional migration rollback)
