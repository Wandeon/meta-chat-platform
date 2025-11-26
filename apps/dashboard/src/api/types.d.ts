/**
 * API Response Types
 * Generated from OpenAPI specification
 */
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
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    active: boolean;
    settings?: Record<string, unknown>;
    widgetConfig?: Record<string, unknown>;
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
    apiKey: string;
}
export interface UpdateTenantRequest {
    name?: string;
    active?: boolean;
    settings?: Record<string, unknown>;
    widgetConfig?: Record<string, unknown>;
}
export type ChannelType = 'whatsapp' | 'messenger' | 'webchat';
export interface Channel {
    id: string;
    tenantId: string;
    type: ChannelType;
    name: string;
    config: Record<string, unknown>;
    active: boolean;
    settings?: Record<string, unknown>;
    widgetConfig?: Record<string, unknown>;
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
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';
export interface Document {
    id: string;
    tenantId: string;
    name?: string;
    filename: string;
    source: string;
    mimeType: string;
    size: number;
    path: string;
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
export interface Webhook {
    id: string;
    tenantId: string;
    url: string;
    events: string[];
    headers?: Record<string, string>;
    active: boolean;
    settings?: Record<string, unknown>;
    widgetConfig?: Record<string, unknown>;
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
export interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        database: 'up' | 'down';
        redis: 'up' | 'down';
        rabbitmq: 'up' | 'down';
    };
    timestamp: string;
}
//# sourceMappingURL=types.d.ts.map