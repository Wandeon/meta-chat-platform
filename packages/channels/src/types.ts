import type { ChannelType, NormalizedMessage } from '@meta-chat/shared';

export interface TenantRecord {
  id: string;
  name?: string;
  settings?: Record<string, any>;
}

export interface ChannelRecord {
  id: string;
  type: ChannelType;
  config: Record<string, any>;
  secrets?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ChannelContext {
  tenant: TenantRecord;
  channel: ChannelRecord;
}

export type HeaderValue = string | string[] | undefined;
export type QueryValue = string | string[] | undefined;

export interface ChannelWebhookPayload {
  headers: Record<string, HeaderValue>;
  query: Record<string, QueryValue>;
  body: unknown;
  rawBody: string;
}

export type ChannelVerifyPayload = ChannelWebhookPayload;

export interface ChannelVerifyResponse {
  success: boolean;
  status: number;
  body?: string | Record<string, any>;
  headers?: Record<string, string>;
}

export type ChannelReceivePayload = ChannelWebhookPayload;

export interface ChannelReceiveResult {
  messages: NormalizedMessage[];
  raw?: unknown;
}

export interface ChannelSendPayload {
  message: NormalizedMessage;
  to?: string;
  metadata?: Record<string, any>;
}

export interface ChannelSendResponse {
  externalId?: string;
  raw?: unknown;
}

export type ChannelMessageHandler = (message: NormalizedMessage) => Promise<void> | void;
