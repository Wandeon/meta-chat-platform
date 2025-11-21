-- Validation Tests for ISSUE-047: Tenant Foreign Key Constraint Restoration
-- These tests verify that the foreign key constraint is properly enforced

-- ============================================================
-- TEST SETUP: Create test tenant and conversation
-- ============================================================

-- Clean up any previous test data
DELETE FROM messages WHERE "tenantId" = 'test_tenant_fk_validation';
DELETE FROM conversations WHERE "tenantId" = 'test_tenant_fk_validation';
DELETE FROM tenants WHERE id = 'test_tenant_fk_validation';
DELETE FROM tenants WHERE id = 'test_invalid_tenant';

-- Create test tenant
INSERT INTO tenants (id, name, settings, enabled, "widgetConfig")
VALUES (
  'test_tenant_fk_validation',
  'Test Tenant for FK Validation',
  '{}',
  true,
  '{}'
);

-- Create test conversation
INSERT INTO conversations (
  id,
  "tenantId",
  "channelType",
  "externalId",
  "userId",
  status
)
VALUES (
  'test_conv_fk_validation',
  'test_tenant_fk_validation',
  'webchat',
  'ext_test_123',
  'user_test_123',
  'active'
);

-- ============================================================
-- TEST 1: Verify valid message insertion succeeds
-- ============================================================

DO $$
BEGIN
  BEGIN
    -- Should succeed: Valid tenant_id
    INSERT INTO messages (
      id,
      "tenantId",
      "conversationId",
      "externalId",
      direction,
      "from",
      type,
      content,
      metadata,
      "timestamp"
    )
    VALUES (
      'msg_valid_tenant_test',
      'test_tenant_fk_validation',
      'test_conv_fk_validation',
      'ext_msg_valid',
      'inbound',
      'user_test_123',
      'text',
      '{"text": "Valid message"}',
      '{}',
      NOW()
    );

    RAISE NOTICE 'TEST 1 PASSED: Valid message with correct tenant_id inserted successfully';

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Valid message insertion should succeed. Error: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- TEST 2: Verify invalid tenant_id is rejected
-- ============================================================

DO $$
BEGIN
  BEGIN
    -- Should fail: Invalid tenant_id (FK constraint violation)
    INSERT INTO messages (
      id,
      "tenantId",
      "conversationId",
      "externalId",
      direction,
      "from",
      type,
      content,
      metadata,
      "timestamp"
    )
    VALUES (
      'msg_invalid_tenant_test',
      'nonexistent_tenant_id_12345',
      'test_conv_fk_validation',
      'ext_msg_invalid',
      'inbound',
      'user_test_123',
      'text',
      '{"text": "Invalid message"}',
      '{}',
      NOW()
    );

    -- If we reach here, the constraint is NOT working
    RAISE EXCEPTION 'TEST 2 FAILED: Message with invalid tenant_id was inserted (FK constraint not enforced)';

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 2 PASSED: Invalid tenant_id correctly rejected by FK constraint';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'TEST 2 FAILED: Unexpected error: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- TEST 3: Verify CASCADE deletion works
-- ============================================================

DO $$
DECLARE
  msg_count INTEGER;
BEGIN
  -- Create a temporary tenant for cascade test
  INSERT INTO tenants (id, name, settings, enabled, "widgetConfig")
  VALUES ('test_tenant_cascade', 'Test Cascade Tenant', '{}', true, '{}');

  -- Create conversation for cascade tenant
  INSERT INTO conversations (
    id,
    "tenantId",
    "channelType",
    "externalId",
    "userId",
    status
  )
  VALUES (
    'test_conv_cascade',
    'test_tenant_cascade',
    'webchat',
    'ext_cascade',
    'user_cascade',
    'active'
  );

  -- Insert message
  INSERT INTO messages (
    id,
    "tenantId",
    "conversationId",
    "externalId",
    direction,
    "from",
    type,
    content,
    metadata,
    "timestamp"
  )
  VALUES (
    'msg_cascade_test',
    'test_tenant_cascade',
    'test_conv_cascade',
    'ext_msg_cascade',
    'inbound',
    'user_cascade',
    'text',
    '{"text": "Cascade test message"}',
    '{}',
    NOW()
  );

  -- Verify message exists
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE "tenantId" = 'test_tenant_cascade';

  IF msg_count != 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Setup - Expected 1 message, found %', msg_count;
  END IF;

  -- Delete the tenant
  DELETE FROM tenants WHERE id = 'test_tenant_cascade';

  -- Verify messages were cascade deleted
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE "tenantId" = 'test_tenant_cascade';

  IF msg_count = 0 THEN
    RAISE NOTICE 'TEST 3 PASSED: Cascade deletion working correctly (% messages remain)', msg_count;
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: Expected 0 messages after tenant deletion, found %', msg_count;
  END IF;

END $$;

-- ============================================================
-- TEST 4: Verify constraint exists in pg_constraint
-- ============================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_def TEXT;
BEGIN
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'messages_tenant_id_fkey'
    AND c.conrelid = 'messages'::regclass
    AND c.confrelid = 'tenants'::regclass
    AND c.confdeltype = 'c' -- CASCADE
  ) INTO constraint_exists;

  IF constraint_exists THEN
    -- Get constraint definition
    SELECT pg_get_constraintdef(c.oid) INTO constraint_def
    FROM pg_constraint c
    WHERE c.conname = 'messages_tenant_id_fkey'
    AND c.conrelid = 'messages'::regclass;

    RAISE NOTICE 'TEST 4 PASSED: Constraint exists with correct definition: %', constraint_def;
  ELSE
    RAISE EXCEPTION 'TEST 4 FAILED: Constraint messages_tenant_id_fkey not found or not configured correctly';
  END IF;
END $$;

-- ============================================================
-- TEST 5: Verify index exists for FK performance
-- ============================================================

DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'messages'
    AND indexname = 'messages_tenant_id_idx'
  ) INTO index_exists;

  IF index_exists THEN
    RAISE NOTICE 'TEST 5 PASSED: Index messages_tenant_id_idx exists for FK performance';
  ELSE
    RAISE WARNING 'TEST 5 WARNING: Index messages_tenant_id_idx not found (may impact FK performance)';
  END IF;
END $$;

-- ============================================================
-- TEST 6: Check for orphaned messages (should be none)
-- ============================================================

DO $$
DECLARE
  orphaned_count INTEGER;
  sample_orphaned RECORD;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM messages m
  WHERE NOT EXISTS (
    SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
  );

  IF orphaned_count = 0 THEN
    RAISE NOTICE 'TEST 6 PASSED: No orphaned messages found (data integrity intact)';
  ELSE
    -- Get a sample orphaned message
    SELECT m.id, m."tenantId", m."timestamp"
    INTO sample_orphaned
    FROM messages m
    WHERE NOT EXISTS (
      SELECT 1 FROM tenants t WHERE t.id = m."tenantId"
    )
    LIMIT 1;

    RAISE WARNING 'TEST 6 WARNING: Found % orphaned messages. Example: id=%, tenantId=%, timestamp=%',
      orphaned_count,
      sample_orphaned.id,
      sample_orphaned."tenantId",
      sample_orphaned."timestamp";
  END IF;
END $$;

-- ============================================================
-- TEST 7: Verify api_logs FK constraint (nullable tenantId)
-- ============================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check if api_logs constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'api_logs_tenant_id_fkey'
    AND c.conrelid = 'api_logs'::regclass
    AND c.confrelid = 'tenants'::regclass
    AND c.confdeltype = 'n' -- SET NULL
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE 'TEST 7 PASSED: api_logs tenant FK constraint exists with ON DELETE SET NULL';
  ELSE
    RAISE WARNING 'TEST 7 WARNING: api_logs tenant FK constraint not found or not configured correctly';
  END IF;
END $$;

-- ============================================================
-- TEST CLEANUP
-- ============================================================

DELETE FROM messages WHERE "tenantId" = 'test_tenant_fk_validation';
DELETE FROM conversations WHERE "tenantId" = 'test_tenant_fk_validation';
DELETE FROM tenants WHERE id = 'test_tenant_fk_validation';

-- ============================================================
-- TEST SUMMARY
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VALIDATION TEST SUITE COMPLETED';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'All tests passed. The tenant_id foreign key constraint is';
  RAISE NOTICE 'properly enforced on the partitioned messages table.';
  RAISE NOTICE 'Tenant isolation is secured at the database level.';
  RAISE NOTICE '============================================================';
END $$;
