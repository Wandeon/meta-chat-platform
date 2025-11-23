# Migration: Restore Tenant Foreign Key Constraint

**Migration ID:** 20251121000002_restore_tenant_fk
**Issue:** ISSUE-047
**Severity:** CRITICAL
**Category:** Security / Data Integrity

## Problem Statement

The database migration that implemented monthly table partitioning (`20240520120000_partition_messages_api_logs`) lost the foreign key constraint between `messages.tenantId` and `tenants.id`. This creates a **critical security vulnerability**:

- Messages can be created with invalid tenant IDs
- Tenant isolation is broken at the database level
- No database-level enforcement of data integrity
- Orphaned messages could accumulate over time
- CASCADE deletion of tenant data doesn't work properly

### Root Cause

In the partitioning migration at line 13:
```sql
EXECUTE 'ALTER TABLE messages_partitioned ADD CONSTRAINT messages_partitioned_conversation_fkey
  FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE';
```

The migration only restored the `conversationId` foreign key but forgot to restore the `tenantId` foreign key constraint that existed before partitioning.

## Solution

This migration restores the missing foreign key constraint with proper CASCADE behavior:

```sql
ALTER TABLE messages
ADD CONSTRAINT messages_tenant_id_fkey
FOREIGN KEY ("tenantId")
REFERENCES tenants(id)
ON DELETE CASCADE;
```

Additionally:
- Adds the same constraint to `api_logs` table (also affected)
- Creates performance index on `tenantId` column
- Validates data integrity before applying constraints
- Uses idempotent operations (safe to run multiple times)

## Files in This Migration

1. **migration.sql** - Main migration file that restores FK constraints
2. **check_orphaned_data.sql** - Pre-migration data integrity check
3. **validation_tests.sql** - Post-migration validation test suite
4. **README.md** - This documentation file

## Pre-Migration Steps

### 1. Check for Orphaned Data

**IMPORTANT:** Run this check BEFORE applying the migration:

```bash
cd /home/admin/meta-chat-platform/packages/database
psql $DATABASE_URL -f prisma/migrations/20251121000002_restore_tenant_fk/check_orphaned_data.sql
```

This will scan for:
- Messages with invalid `tenantId` values
- API logs with invalid `tenantId` values
- Current constraint status
- Partitioning configuration

### 2. Clean Up Orphaned Data (if found)

If orphaned records are found, you must clean them up BEFORE applying the migration:

**For orphaned messages:**
```sql
-- Option 1: Delete orphaned messages (RECOMMENDED)
DELETE FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
);

-- Option 2: Archive orphaned messages for investigation
CREATE TABLE orphaned_messages_backup AS
SELECT * FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
);

-- Then delete them
DELETE FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
);
```

**For orphaned api_logs:**
```sql
-- Set tenantId to NULL for orphaned logs (preserves logs)
UPDATE api_logs
SET "tenantId" = NULL
WHERE "tenantId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = api_logs."tenantId"
);
```

## Applying the Migration

### Using Prisma Migrate

```bash
cd /home/admin/meta-chat-platform/packages/database
npx prisma migrate deploy
```

### Manual Application (if needed)

```bash
psql $DATABASE_URL -f prisma/migrations/20251121000002_restore_tenant_fk/migration.sql
```

## Post-Migration Validation

### Run Validation Tests

```bash
cd /home/admin/meta-chat-platform/packages/database
psql $DATABASE_URL -f prisma/migrations/20251121000002_restore_tenant_fk/validation_tests.sql
```

The validation suite tests:

1. ✅ Valid message insertion succeeds
2. ✅ Invalid tenant_id is rejected (FK violation)
3. ✅ CASCADE deletion works (deleting tenant cascades to messages)
4. ✅ Constraint exists in pg_constraint catalog
5. ✅ Performance index exists
6. ✅ No orphaned messages remain
7. ✅ api_logs FK constraint configured correctly

### Expected Output

```
NOTICE:  TEST 1 PASSED: Valid message with correct tenant_id inserted successfully
NOTICE:  TEST 2 PASSED: Invalid tenant_id correctly rejected by FK constraint
NOTICE:  TEST 3 PASSED: Cascade deletion working correctly (0 messages remain)
NOTICE:  TEST 4 PASSED: Constraint exists with correct definition
NOTICE:  TEST 5 PASSED: Index messages_tenant_id_idx exists for FK performance
NOTICE:  TEST 6 PASSED: No orphaned messages found (data integrity intact)
NOTICE:  TEST 7 PASSED: api_logs tenant FK constraint exists with ON DELETE SET NULL
NOTICE:  ============================================================
NOTICE:  VALIDATION TEST SUITE COMPLETED
NOTICE:  ============================================================
```

## Technical Details

### PostgreSQL Partitioning + Foreign Keys

- PostgreSQL 11+ supports foreign keys on partitioned tables
- The FK constraint is applied to the parent table and inherited by all partitions
- CASCADE behavior works correctly across partitioned tables
- Performance impact is minimal with proper indexing

### Constraints Added

#### messages table
```sql
CONSTRAINT messages_tenant_id_fkey
  FOREIGN KEY ("tenantId")
  REFERENCES tenants(id)
  ON DELETE CASCADE
```

#### api_logs table
```sql
CONSTRAINT api_logs_tenant_id_fkey
  FOREIGN KEY ("tenantId")
  REFERENCES tenants(id)
  ON DELETE SET NULL
```

Note: `api_logs` uses `SET NULL` because `tenantId` is nullable (some logs are not tenant-specific).

### Indexes Added

```sql
CREATE INDEX messages_tenant_id_idx ON messages ("tenantId");
```

This index improves:
- FK constraint validation performance
- Tenant-specific message queries
- CASCADE deletion performance

## Rollback (Not Recommended)

If you absolutely must rollback this migration:

```sql
-- Drop FK constraints
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_tenant_id_fkey;
ALTER TABLE api_logs DROP CONSTRAINT IF EXISTS api_logs_tenant_id_fkey;

-- Drop index
DROP INDEX IF EXISTS messages_tenant_id_idx;
```

**WARNING:** Rolling back this migration reintroduces the security vulnerability. Only rollback if absolutely necessary and have a plan to restore the constraint.

## Impact Analysis

### Security Impact
- ✅ Restores tenant isolation at database level
- ✅ Prevents messages with invalid tenant IDs
- ✅ Ensures data integrity during tenant operations

### Performance Impact
- ✅ Minimal impact on reads (index already recommended)
- ✅ Slight overhead on message inserts (FK validation)
- ✅ Improved CASCADE deletion performance (with index)

### Application Impact
- ✅ No application code changes required
- ✅ Existing queries work unchanged
- ✅ Invalid operations will now fail fast at DB level (good!)

## Verification Checklist

After applying this migration, verify:

- [ ] Migration applied successfully without errors
- [ ] All validation tests pass
- [ ] No orphaned messages exist
- [ ] Message insertion with valid tenant works
- [ ] Message insertion with invalid tenant fails
- [ ] Tenant deletion cascades to messages
- [ ] FK constraint appears in pg_constraint
- [ ] Performance index exists
- [ ] Application can still create messages normally
- [ ] Multi-tenant isolation is enforced

## Related Issues

- **ISSUE-047:** Database partitioning lost tenant foreign key constraint (THIS ISSUE)
- **Audit Report #08:** Security audit that identified this vulnerability
- **Migration 20240520120000:** Original partitioning migration that introduced the bug

## References

- PostgreSQL Partitioning Documentation: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL Foreign Keys: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
- Prisma Schema: `/packages/database/prisma/schema.prisma`
