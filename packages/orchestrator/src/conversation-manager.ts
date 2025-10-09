import { ChannelType, ConversationStatus, MessageDirection, MessageType, NormalizedMessage, createLogger, generateId } from '@meta-chat/shared';
import { Conversation, Message, Prisma, getPrismaClient } from '@meta-chat/database';

export interface ConversationManagerOptions {
  historyLimit?: number;
}

export interface PersistedMessageResult {
  record: Message;
}

const logger = createLogger('ConversationManager');

export class ConversationManager {
  private readonly prisma = getPrismaClient();
  private readonly historyLimit: number;

  constructor(options: ConversationManagerOptions = {}) {
    this.historyLimit = options.historyLimit ?? 20;
  }

  async ensureConversation(
    tenantId: string,
    channel: ChannelType,
    message: NormalizedMessage,
  ): Promise<Conversation> {
    const externalId = message.conversationId ?? message.from;
    const timestamp = this.coerceDate(message.timestamp);

    const conversation = await this.prisma.conversation.upsert({
      where: {
        tenantId_channelType_externalId: {
          tenantId,
          channelType: channel,
          externalId,
        },
      },
      create: {
        tenantId,
        channelType: channel,
        externalId,
        userId: message.from,
        status: 'active',
        lastMessageAt: timestamp,
        metadata: {},
      },
      update: {
        userId: message.from,
        lastMessageAt: timestamp,
        status: 'active',
      },
    });

    logger.debug('Ensured conversation', {
      tenantId,
      channel,
      conversationId: conversation.id,
      externalId,
    });

    return conversation;
  }

  async recordInboundMessage(
    tenantId: string,
    conversation: Conversation,
    message: NormalizedMessage,
  ): Promise<PersistedMessageResult> {
    return this.createMessage(tenantId, conversation, {
      id: message.id,
      externalId: message.externalId,
      direction: message.direction,
      from: message.from,
      type: message.type,
      content: message.content as unknown as Prisma.JsonObject,
      metadata: (message.metadata ?? {}) as Prisma.JsonValue,
      timestamp: message.timestamp,
    });
  }

  async recordOutboundMessage(
    tenantId: string,
    conversation: Conversation,
    payload: {
      content: Prisma.JsonObject;
      metadata?: Prisma.JsonValue;
      type?: MessageType;
      externalId?: string | null;
      from?: string;
      timestamp?: Date | string;
      id?: string;
    },
  ): Promise<PersistedMessageResult> {
    return this.createMessage(tenantId, conversation, {
      id: payload.id ?? generateId(),
      direction: 'outbound',
      from: payload.from ?? conversation.tenantId,
      type: payload.type ?? 'text',
      content: payload.content,
      metadata: payload.metadata ?? {},
      externalId: payload.externalId ?? undefined,
      timestamp: payload.timestamp ?? new Date(),
    });
  }

  async getRecentMessages(conversationId: string, limit?: number): Promise<Message[]> {
    const take = limit ?? this.historyLimit;
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take,
    });

    return messages.reverse();
  }

  async updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });
  }

  private async createMessage(
    tenantId: string,
    conversation: Conversation,
    message: {
      id: string;
      direction: MessageDirection;
      from: string;
      type: MessageType;
      content: Prisma.JsonObject;
      metadata: Prisma.JsonValue;
      externalId?: string;
      timestamp: Date | string;
    },
  ): Promise<PersistedMessageResult> {
    const timestamp = this.coerceDate(message.timestamp);

    const record = await this.prisma.message.create({
      data: {
        id: message.id,
        tenantId,
        conversationId: conversation.id,
        externalId: message.externalId,
        direction: message.direction,
        from: message.from,
        type: message.type,
        content: message.content,
        metadata: message.metadata ?? {},
        timestamp,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: timestamp },
    });

    logger.debug('Persisted message', {
      tenantId,
      conversationId: conversation.id,
      messageId: record.id,
      direction: message.direction,
    });

    return { record };
  }

  private coerceDate(input: Date | string): Date {
    if (input instanceof Date) {
      return input;
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }
}

