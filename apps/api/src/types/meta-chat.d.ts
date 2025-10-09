declare module '@meta-chat/shared' {
  export type ChannelType = 'whatsapp' | 'messenger' | 'webchat';
  export type MessageDirection = 'inbound' | 'outbound';
  export type NormalizedMessage = {
    id: string;
    conversationId: string;
    externalId?: string;
    direction: MessageDirection;
    from: string;
    timestamp: Date;
    type: string;
    content: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  export type HealthCheck = {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      database: 'up' | 'down';
      redis: 'up' | 'down';
      rabbitmq: 'up' | 'down';
    };
    timestamp: string;
  };

  export interface AppLogger {
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
    debug(message: string, meta?: unknown): void;
    child(scope: string, defaultMeta?: Record<string, unknown>): AppLogger;
  }

  export function createLogger(scope: string, defaultMeta?: Record<string, unknown>): AppLogger;
  export function ensureCorrelationId(): string;
  export function withRequestContext<T>(context: Record<string, unknown>, fn: () => T): T;
  export function addToRequestContext(context: Record<string, unknown>): void;
  export function deriveApiKeyMetadata(apiKey: string, prefixLength?: number): { prefix: string };
  export function verifySecret(candidate: string, hash: string, salt: string): Promise<boolean>;
  export function generateApiKey(
    prefixLabel?: string,
    randomBytesLength?: number,
    prefixLength?: number,
  ): { apiKey: string; prefix: string; lastFour: string };
  export function generateRotationToken(
    validityMinutes?: number,
    entropyBytes?: number,
  ): Promise<{ token: string; hash: string; salt: string; expiresAt: Date }>;
  export function hashSecret(secret: string, salt?: string): Promise<{ hash: string; salt: string }>;
}

declare module '@meta-chat/database' {
  export namespace Prisma {
    type InputJsonValue = any;
  }

  export type AdminKey = any;
  export type AdminKeyStatus = 'active' | 'disabled' | 'revoked';
  export const AdminKeyStatus: {
    active: AdminKeyStatus;
    disabled: AdminKeyStatus;
    revoked: AdminKeyStatus;
  };
  export const PrismaClient: any;
  export const ADMIN_KEY_PREFIX: string;
  export function getPrismaClient(): any;
  export function createAdminKey(options: any): Promise<{ record: any; token: string; secret: string }>;
  export function markAdminKeyUsed(options: any): Promise<void>;
  export function parseAdminKey(token: string): { id: string; secret: string };
  export function recordAdminAuditLog(entry: any): Promise<void>;
  export function revokeAdminKey(id: string, options?: any): Promise<any>;
  export function rotateAdminKey(id: string, options?: any): Promise<any>;
  export function verifyAdminKeySecret(id: string, secret: string): Promise<boolean>;
}

declare module '@meta-chat/events' {
  import type { ChannelType, MessageDirection } from '@meta-chat/shared';
  export const ORCHESTRATOR_EXCHANGE: string;
  export function ensureWebhookAckTopology(channel: any, tenantId: string, channel: ChannelType): Promise<void>;
  export function getWebhookAckRoutingKey(tenantId: string, channel: ChannelType): string;
  export function ensureChannelTopology(channel: any, options: {
    tenantId: string;
    channel: ChannelType;
    direction?: MessageDirection;
  }): Promise<void>;
  export function getChannelRoutingKey(options: {
    tenantId: string;
    channel: ChannelType;
    direction?: MessageDirection;
  }): string;
}
