-- Add widget_config JSONB column to tenants table
-- This will store the widget configuration including theme, branding, and metadata

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "widget_config" JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance when accessing widget configs
CREATE INDEX IF NOT EXISTS "tenants_widget_config_idx" ON "tenants" USING gin ("widget_config");

-- Update statistics
ANALYZE "tenants";
