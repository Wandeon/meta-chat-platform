-- Add admin bypass policies for RLS
-- Admins can access all tenant data by setting app.is_admin = 'true'

-- Drop existing policies if they exist (to recreate with admin bypass)
DROP POLICY IF EXISTS "channels_tenant_isolation" ON "channels";
DROP POLICY IF EXISTS "conversations_tenant_isolation" ON "conversations";
DROP POLICY IF EXISTS "messages_tenant_isolation" ON "messages";
DROP POLICY IF EXISTS "documents_tenant_isolation" ON "documents";
DROP POLICY IF EXISTS "chunks_tenant_isolation" ON "chunks";

-- Recreate policies with admin bypass
CREATE POLICY "channels_tenant_isolation" ON "channels"
  USING (
    current_setting('app.is_admin', true) = 'true' 
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY "conversations_tenant_isolation" ON "conversations"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY "messages_tenant_isolation" ON "messages"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY "documents_tenant_isolation" ON "documents"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  );

CREATE POLICY "chunks_tenant_isolation" ON "chunks"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR "tenantId" = current_setting('app.tenant_id', true)
  );
