/**
 * API Response Types
 * Generated from OpenAPI specification
 */

// Common API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  apiKey: string; // The generated tenant API key
}

export interface UpdateTenantRequest {
  name?: string;
  active?: boolean;
  settings?: Record<string, unknown>;
}

// Channel types
export type ChannelType = 'whatsapp' | 'messenger' | 'webchat';

export interface Channel {
  id: string;
  tenantId: string;
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelRequest {
  type: ChannelType;
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  active?: boolean;
}

// Document types
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface Document {
  id: string;
  tenantId: string;
  name: string;
  source: string;
  status: DocumentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRequest {
  name: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentRequest {
  name?: string;
  status?: DocumentStatus;
  metadata?: Record<string, unknown>;
}

// Conversation types
export type ConversationStatus = 'active' | 'closed' | 'escalated';
export type MessageDirection = 'inbound' | 'outbound';

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  channelId: string;
  userId: string;
  status: ConversationStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface CreateConversationRequest {
  channelId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateConversationRequest {
  status?: ConversationStatus;
  metadata?: Record<string, unknown>;
}

// Webhook types
export interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: string[];
  headers?: Record<string, string>;
  active?: boolean;
}

// Health Check types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    rabbitmq: 'up' | 'down';
  };
  timestamp: string;
}
