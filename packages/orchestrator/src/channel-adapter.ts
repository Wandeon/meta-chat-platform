import { ChannelType, MessageContent } from '@meta-chat/shared';

export interface OutboundMessage {
  to: string;
  content: MessageContent;
  metadata?: Record<string, unknown>;
  conversationExternalId?: string;
}

export interface ChannelSendResult {
  messageId?: string;
  externalId?: string;
  raw?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
  send(payload: OutboundMessage, context: ChannelAdapterContext): Promise<ChannelSendResult>;
}

export interface ChannelAdapterContext {
  tenantId: string;
  channel: ChannelType;
  channelConfig: Record<string, unknown>;
}

export class ChannelAdapterRegistry {
  private readonly adapters = new Map<ChannelType, ChannelAdapter>();

  register(channel: ChannelType, adapter: ChannelAdapter): void {
    this.adapters.set(channel, adapter);
  }

  get(channel: ChannelType): ChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`No channel adapter registered for ${channel}`);
    }
    return adapter;
  }
}

