// Core types shared across all packages
import type { LogContext } from './logging';

export type ChannelType = 'whatsapp' | 'messenger' | 'webchat';

export type MessageDirection = 'inbound' | 'outbound';

export type ConversationStatus = 'active' | 'assigned_human' | 'closed';

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';

// Normalized message format (internal representation)
export interface NormalizedMessage {
  id: string;
  conversationId: string;
  externalId?: string; // Platform-specific ID (wamid, messenger mid)
  direction: MessageDirection;
  from: string; // Phone number, PSID, or user ID
  timestamp: Date;
  type: MessageType;
  content: MessageContent;
  metadata?: Record<string, any>;
}

export interface MessageContent {
  text?: string;
  media?: {
    url: string;
    mimeType: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// Channel configuration
export interface ChannelConfig {
  whatsapp?: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
    webhookVerifyToken: string;
  };
  messenger?: {
    pageId: string;
    pageAccessToken: string;
    appSecret: string;
    verifyToken: string;
  };
  webchat?: {
    enabled: boolean;
    allowedOrigins: string[];
  };
}

// Tenant settings
export interface TenantSettings {
  brandName: string;
  tone: 'friendly' | 'professional' | 'casual';
  locale: string[];
  enableRag: boolean;
  enableFunctionCalling: boolean;
  enableHumanHandoff: boolean;
  humanHandoffKeywords: string[];
  ragConfig?: {
    topK: number;
    minSimilarity: number;
    hybridWeights: {
      keyword: number;
      vector: number;
    };
  };
  rateLimits?: {
    messagesPerHour: number;
    messagesPerDay: number;
  };
  retention?: {
    messages: {
      retentionDays: number;
      archive?: boolean;
      archiveTable?: string;
    };
    apiLogs: {
      retentionDays: number;
    };
  };
  // Confidence-based escalation settings
  confidenceEscalation?: {
    enabled: boolean;
    mode: 'standard' | 'strict' | 'lenient';
    immediateEscalationThreshold?: number; // 0-1, default: 0.3
    suggestReviewThreshold?: number; // 0-1, default: 0.6
    addDisclaimers?: boolean; // default: true
    disclaimerText?: string;
    selfAssessmentStrategy?: 'explicit_marker' | 'chain_of_thought' | 'uncertainty_acknowledgment';
    highStakesDomains?: string[]; // Custom domains beyond default
  };
}

// RAG types
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    source: string;
  };
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  type: 'keyword' | 'vector' | 'hybrid';
}

// Function calling types
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  handler: (params: any, context: FunctionContext) => Promise<string>;
}

export interface FunctionContext {
  tenantId: string;
  conversationId: string;
  message: NormalizedMessage;
}

// Event types
export enum EventType {
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  CONVERSATION_CREATED = 'conversation.created',
  CONVERSATION_UPDATED = 'conversation.updated',
  HUMAN_HANDOFF_REQUESTED = 'human_handoff.requested',
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_INDEXED = 'document.indexed',
}

export interface Event {
  id: string;
  type: EventType;
  tenantId: string;
  timestamp: Date;
  data: any;
  correlationId?: string;
  context?: LogContext;
}

// Webhook types
export interface WebhookPayload {
  event: EventType;
  tenant: {
    id: string;
    name: string;
  };
  data: any;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    rabbitmq: 'up' | 'down';
  };
  timestamp: string;
}
