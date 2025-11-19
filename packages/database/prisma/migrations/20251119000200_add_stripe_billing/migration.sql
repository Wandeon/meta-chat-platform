-- Add Stripe billing fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS current_plan_id VARCHAR(50) DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id ON tenants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- Create invoices table for billing history
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'eur',
  status VARCHAR(50) NOT NULL,
  invoice_pdf VARCHAR(500),
  hosted_invoice_url VARCHAR(500),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Create usage tracking table for plan limits enforcement
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  conversations_count INTEGER DEFAULT 0,
  documents_count INTEGER DEFAULT 0,
  team_members_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_id ON usage_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(tenant_id, period_start, period_end);

-- Create unique constraint to prevent duplicate period records
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_tenant_period ON usage_tracking(tenant_id, period_start);
