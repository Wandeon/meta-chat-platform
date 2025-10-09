-- Add tenantId columns to shared tables
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "chunks" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Backfill tenantId using existing relations
UPDATE "messages" m
SET "tenantId" = c."tenantId"
FROM "conversations" c
WHERE m."conversationId" = c.id
  AND m."tenantId" IS NULL;

UPDATE "chunks" ch
SET "tenantId" = d."tenantId"
FROM "documents" d
WHERE ch."documentId" = d.id
  AND ch."tenantId" IS NULL;

-- Enforce NOT NULL and add foreign keys
ALTER TABLE "messages"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ADD CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chunks"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ADD CONSTRAINT "chunks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite indexes for tenant-scoped lookups
CREATE INDEX IF NOT EXISTS "messages_tenantId_conversationId_idx" ON "messages"("tenantId", "conversationId");
CREATE INDEX IF NOT EXISTS "chunks_tenantId_documentId_idx" ON "chunks"("tenantId", "documentId");

-- Enable Row Level Security on tenant-scoped tables
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "channels" FORCE ROW LEVEL SECURITY;
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE "chunks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "webhooks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;
ALTER TABLE "api_logs" FORCE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY IF NOT EXISTS "tenants_isolation" ON "tenants"
  USING (id = current_setting('app.tenant_id', true))
  WITH CHECK (id = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "channels_tenant_isolation" ON "channels"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "conversations_tenant_isolation" ON "conversations"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "messages_tenant_isolation" ON "messages"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "documents_tenant_isolation" ON "documents"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "chunks_tenant_isolation" ON "chunks"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "webhooks_tenant_isolation" ON "webhooks"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "events_tenant_isolation" ON "events"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY IF NOT EXISTS "api_logs_tenant_isolation" ON "api_logs"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
