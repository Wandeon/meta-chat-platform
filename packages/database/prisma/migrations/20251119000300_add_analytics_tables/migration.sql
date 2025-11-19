-- Analytics daily aggregation table for dashboard metrics
CREATE TABLE IF NOT EXISTS analytics_daily (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Usage metrics
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  documents_queried INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms INTEGER,
  rag_queries INTEGER DEFAULT 0,
  rag_avg_similarity DECIMAL(5,4),
  conversations_resolved INTEGER DEFAULT 0,
  conversations_escalated INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  
  -- Business metrics
  widget_impressions INTEGER DEFAULT 0,
  widget_conversations INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, date)
);

-- Indexes for efficient analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_tenant_date ON analytics_daily(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date DESC);

-- Real-time message metrics tracking table
CREATE TABLE IF NOT EXISTS message_metrics (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255),
  message_id VARCHAR(255),
  tenant_id VARCHAR(255) NOT NULL,
  
  -- Timing metrics
  sent_at TIMESTAMP,
  response_at TIMESTAMP,
  response_time_ms INTEGER,
  
  -- RAG metrics
  rag_used BOOLEAN DEFAULT false,
  rag_similarity DECIMAL(5,4),
  rag_chunks_retrieved INTEGER,
  rag_top_document_id VARCHAR(255),
  
  -- Quality metrics
  confidence_score DECIMAL(5,4),
  escalated BOOLEAN DEFAULT false,
  error_occurred BOOLEAN DEFAULT false,
  
  -- Content for analysis
  user_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for message metrics
CREATE INDEX IF NOT EXISTS idx_message_metrics_tenant ON message_metrics(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_metrics_conversation ON message_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_metrics_created_at ON message_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_metrics_rag_used ON message_metrics(tenant_id, rag_used, created_at DESC);

-- Widget analytics tracking
CREATE TABLE IF NOT EXISTS widget_analytics (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- impression, open, message_sent, close
  session_id VARCHAR(255),
  user_id VARCHAR(255),
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  metadata JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for widget analytics
CREATE INDEX IF NOT EXISTS idx_widget_analytics_tenant ON widget_analytics(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_event_type ON widget_analytics(tenant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_session ON widget_analytics(session_id);
