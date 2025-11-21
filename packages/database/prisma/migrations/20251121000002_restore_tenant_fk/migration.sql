-- Fix CRITICAL SECURITY ISSUE: Restore missing tenant_id foreign key constraint
-- ISSUE-047: Database partitioning lost tenant foreign key constraint
--
-- The previous migration (20240520120000_partition_messages_api_logs) failed to
-- restore the tenant_id foreign key constraint when converting messages table
-- to use monthly partitioning. This breaks tenant isolation at the database level.
--
-- PostgreSQL 11+ supports foreign keys on partitioned tables, so this fix is safe.

DO $$
BEGIN
  -- Check if the constraint already exists to make migration idempotent
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_tenant_id_fkey'
    AND conrelid = 'messages'::regclass
  ) THEN

    -- First, verify data integrity: Check for orphaned messages
    -- This query will raise an error if any messages have invalid tenant_id
    PERFORM 1
    FROM messages m
    WHERE NOT EXISTS (
      SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
    )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Data integrity violation: Found messages with invalid tenant_id. Please clean up orphaned records before applying this migration.';
    END IF;

    -- Add the missing foreign key constraint with CASCADE deletion
    -- This ensures tenant isolation and proper cleanup on tenant deletion
    ALTER TABLE messages
    ADD CONSTRAINT messages_tenant_id_fkey
    FOREIGN KEY ("tenantId")
    REFERENCES tenants(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Successfully restored tenant_id foreign key constraint on messages table';

  ELSE
    RAISE NOTICE 'Foreign key constraint messages_tenant_id_fkey already exists, skipping';
  END IF;

  -- Also add missing index on tenantId for FK performance
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'messages'
    AND indexname = 'messages_tenant_id_idx'
  ) THEN
    CREATE INDEX messages_tenant_id_idx ON messages ("tenantId");
    RAISE NOTICE 'Created index messages_tenant_id_idx for FK performance';
  END IF;

  -- Add the same constraint for api_logs table (also partitioned, also missing tenant FK)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'api_logs_tenant_id_fkey'
    AND conrelid = 'api_logs'::regclass
  ) THEN

    -- Note: api_logs.tenantId is nullable, so we only add FK for non-null values
    -- Check for invalid non-null tenant references
    PERFORM 1
    FROM api_logs a
    WHERE a."tenantId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM tenants t WHERE t.id = a."tenantId"
    )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Data integrity violation: Found api_logs with invalid tenant_id. Please clean up orphaned records before applying this migration.';
    END IF;

    -- Add FK constraint for api_logs (ON DELETE SET NULL since tenantId is nullable)
    ALTER TABLE api_logs
    ADD CONSTRAINT api_logs_tenant_id_fkey
    FOREIGN KEY ("tenantId")
    REFERENCES tenants(id)
    ON DELETE SET NULL;

    RAISE NOTICE 'Successfully added tenant_id foreign key constraint on api_logs table';

  ELSE
    RAISE NOTICE 'Foreign key constraint api_logs_tenant_id_fkey already exists, skipping';
  END IF;

END $$;
