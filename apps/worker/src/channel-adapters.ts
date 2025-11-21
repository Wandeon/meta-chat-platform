import { getPrismaClient } from '@meta-chat/database';
import { ChannelType, NormalizedMessage } from '@meta-chat/shared';
import {
  ChannelAdapter,
  ChannelSendResult,
  OutboundMessage,
  ChannelAdapterContext,
} from '@meta-chat/orchestrator';
import { WhatsAppAdapter } from '@meta-chat/channels/dist/whatsapp/whatsapp-adapter';
import { MessengerAdapter } from '@meta-chat/channels/dist/messenger/messenger-adapter';
import type {
  ChannelContext,
  ChannelSendPayload,
} from '@meta-chat/channels/dist/types';

const prisma = getPrismaClient();

/**
 * Base wrapper that bridges orchestrator's ChannelAdapter interface
 * to the channels package adapter implementations
 */
abstract class ChannelAdapterWrapper implements ChannelAdapter {
  async send(
    payload: OutboundMessage,
    context: ChannelAdapterContext,
  ): Promise<ChannelSendResult> {
    // Fetch full channel configuration from database
    const channel = await prisma.channel.findFirst({
      where: {
        tenantId: context.tenantId,
        type: context.channel,
        enabled: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
      },
    });

    if (!channel) {
      throw new Error(
        `No enabled ${context.channel} channel found for tenant ${context.tenantId}`,
      );
    }

    // Build channel context for the underlying adapter
    const channelContext: ChannelContext = {
      tenant: {
        id: channel.tenant.id,
        name: channel.tenant.name || undefined,
        settings: (channel.tenant.settings as Record<string, any>) || {},
      },
      channel: {
        id: channel.id,
        type: channel.type as ChannelType,
        config: (channel.config as Record<string, any>) || {},
        secrets: undefined,
        metadata: undefined,
      },
    };

    // Convert OutboundMessage to NormalizedMessage
    const message: NormalizedMessage = {
      id: `outbound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId: payload.conversationExternalId || payload.to,
      direction: 'outbound',
      from: 'bot',
      timestamp: new Date(),
      type: payload.content.text ? 'text' : 'document',
      content: payload.content,
      metadata: payload.metadata,
    };

    const sendPayload: ChannelSendPayload = {
      message,
      to: payload.to,
      metadata: payload.metadata,
    };

    // Create and use the underlying channel adapter
    const adapter = this.createAdapter(channelContext);
    const result = await adapter.send(sendPayload);

    return {
      messageId: result.externalId,
      externalId: result.externalId,
      raw: result.raw,
    };
  }

  protected abstract createAdapter(context: ChannelContext): {
    send(payload: ChannelSendPayload): Promise<{ externalId?: string; raw?: unknown }>;
  };
}

/**
 * WhatsApp adapter wrapper for orchestrator
 */
export class WhatsAppAdapterWrapper extends ChannelAdapterWrapper {
  protected createAdapter(context: ChannelContext) {
    return new WhatsAppAdapter(context);
  }
}

/**
 * Messenger adapter wrapper for orchestrator
 */
export class MessengerAdapterWrapper extends ChannelAdapterWrapper {
  protected createAdapter(context: ChannelContext) {
    return new MessengerAdapter(context);
  }
}
