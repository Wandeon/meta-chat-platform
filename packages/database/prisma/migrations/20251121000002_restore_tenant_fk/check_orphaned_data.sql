-- Pre-Migration Data Integrity Check
-- ISSUE-047: Check for orphaned messages before applying FK constraint
--
-- This script should be run BEFORE applying the migration to identify
-- any data integrity issues that would prevent the FK constraint from being added.

\echo '============================================================'
\echo 'PRE-MIGRATION DATA INTEGRITY CHECK'
\echo 'ISSUE-047: Checking for orphaned messages and api_logs'
\echo '============================================================'
\echo ''

-- ============================================================
-- Check 1: Orphaned Messages (messages without valid tenant)
-- ============================================================

\echo 'Check 1: Scanning for orphaned messages...'

SELECT
  COUNT(*) as orphaned_messages_count,
  COUNT(DISTINCT m."tenantId") as invalid_tenant_ids_count
FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
);

\echo ''
\echo 'Sample orphaned messages (if any):'

SELECT
  m.id,
  m."tenantId",
  m."conversationId",
  m."timestamp",
  m.direction,
  m.type
FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
)
ORDER BY m."timestamp" DESC
LIMIT 10;

-- ============================================================
-- Check 2: Orphaned API Logs (api_logs with invalid tenant)
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'Check 2: Scanning for orphaned api_logs...'

SELECT
  COUNT(*) as orphaned_api_logs_count,
  COUNT(DISTINCT a."tenantId") as invalid_tenant_ids_count
FROM api_logs a
WHERE a."tenantId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = a."tenantId"
);

\echo ''
\echo 'Sample orphaned api_logs (if any):'

SELECT
  a.id,
  a."tenantId",
  a.method,
  a.path,
  a."statusCode",
  a."timestamp"
FROM api_logs a
WHERE a."tenantId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = a."tenantId"
)
ORDER BY a."timestamp" DESC
LIMIT 10;

-- ============================================================
-- Check 3: List invalid tenant IDs found
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'Check 3: Invalid tenant IDs referenced by messages:'

SELECT DISTINCT
  m."tenantId" as invalid_tenant_id,
  COUNT(*) as message_count,
  MIN(m."timestamp") as first_message_at,
  MAX(m."timestamp") as last_message_at
FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
)
GROUP BY m."tenantId"
ORDER BY message_count DESC;

-- ============================================================
-- Check 4: Verify current constraints
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'Check 4: Current foreign key constraints on messages table:'

SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
AND contype = 'f'
ORDER BY conname;

\echo ''
\echo 'Current foreign key constraints on api_logs table:'

SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'api_logs'::regclass
AND contype = 'f'
ORDER BY conname;

-- ============================================================
-- Check 5: Verify partitioning status
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'Check 5: Verify partitioning configuration:'

SELECT
  pt.partrelid::regclass as partitioned_table,
  pt.partstrat as partition_strategy,
  pg_get_partkeydef(pt.partrelid) as partition_key
FROM pg_partitioned_table pt
WHERE pt.partrelid IN ('messages'::regclass, 'api_logs'::regclass);

\echo ''
\echo 'Number of message partitions:'

SELECT COUNT(*) as partition_count
FROM pg_inherits
WHERE inhparent = 'messages'::regclass;

-- ============================================================
-- Check 6: Statistics
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'Check 6: Database statistics:'

SELECT
  'tenants' as table_name,
  COUNT(*) as record_count
FROM tenants
UNION ALL
SELECT
  'messages' as table_name,
  COUNT(*) as record_count
FROM messages
UNION ALL
SELECT
  'conversations' as table_name,
  COUNT(*) as record_count
FROM conversations
UNION ALL
SELECT
  'api_logs' as table_name,
  COUNT(*) as record_count
FROM api_logs;

-- ============================================================
-- Final Summary
-- ============================================================

\echo ''
\echo '============================================================'
\echo 'DATA INTEGRITY CHECK SUMMARY'
\echo '============================================================'
\echo ''

DO $$
DECLARE
  orphaned_messages INTEGER;
  orphaned_logs INTEGER;
  fk_exists BOOLEAN;
BEGIN
  -- Count orphaned messages
  SELECT COUNT(*) INTO orphaned_messages
  FROM messages m
  WHERE NOT EXISTS (
    SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
  );

  -- Count orphaned logs
  SELECT COUNT(*) INTO orphaned_logs
  FROM api_logs a
  WHERE a."tenantId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenants t WHERE t.id = a."tenantId"
  );

  -- Check if FK already exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_tenant_id_fkey'
    AND conrelid = 'messages'::regclass
  ) INTO fk_exists;

  RAISE NOTICE 'Orphaned messages: %', orphaned_messages;
  RAISE NOTICE 'Orphaned api_logs: %', orphaned_logs;
  RAISE NOTICE 'FK constraint exists: %', fk_exists;
  RAISE NOTICE '';

  IF fk_exists THEN
    RAISE NOTICE 'STATUS: FK constraint already exists. Migration may be redundant.';
  ELSIF orphaned_messages > 0 OR orphaned_logs > 0 THEN
    RAISE WARNING 'STATUS: MIGRATION WILL FAIL - Orphaned records found!';
    RAISE WARNING 'ACTION REQUIRED: Clean up orphaned records before applying migration.';
    RAISE WARNING '';
    RAISE WARNING 'To clean up orphaned messages, run:';
    RAISE WARNING 'DELETE FROM messages m WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m."tenantId");';
    RAISE WARNING '';
    RAISE WARNING 'To clean up orphaned api_logs, run:';
    RAISE WARNING 'UPDATE api_logs SET "tenantId" = NULL WHERE "tenantId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = api_logs."tenantId");';
  ELSE
    RAISE NOTICE 'STATUS: READY - No orphaned records found. Migration can be applied safely.';
  END IF;

  RAISE NOTICE '============================================================';
END $$;
