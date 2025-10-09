import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';
import type { NormalizedMessage } from '@meta-chat/shared';
import { ChannelAdapter } from '../adapter';
import type {
  ChannelReceivePayload,
  ChannelReceiveResult,
  ChannelSendPayload,
  ChannelSendResponse,
  ChannelVerifyPayload,
  ChannelVerifyResponse
} from '../types';
import { createNormalizedMessage, normalizeMediaContent, normalizeTextContent } from '../utils/normalization';

interface WebChatConfig {
  enabled: boolean;
  allowedOrigins: string[];
  token?: string;
}

interface WebChatAdapterOptions {
  io: Server;
}

interface WebChatInboundPayload {
  id?: string;
  type?: NormalizedMessage['type'];
  text?: string;
  media?: {
    url: string;
    mimeType: string;
    filename?: string;
    caption?: string;
  };
  metadata?: Record<string, any>;
}

interface WebChatTypingPayload {
  state: 'on' | 'off';
}

export class WebChatAdapter extends ChannelAdapter {
  private readonly io: Server;

  constructor(context: ConstructorParameters<typeof ChannelAdapter>[0], options: WebChatAdapterOptions) {
    super(context);
    this.io = options.io;
    this.configureCors();
    this.registerHandlers();
  }

  async verify(_: ChannelVerifyPayload): Promise<ChannelVerifyResponse> {
    return { success: true, status: 200, body: 'ok' };
  }

  async receive(payload: ChannelReceivePayload): Promise<ChannelReceiveResult> {
    // WebChat relies on Socket.IO events instead of HTTP webhook payloads.
    // The receive method returns an empty result to satisfy the base contract.
    return { messages: [], raw: payload.body };
  }

  async send(payload: ChannelSendPayload): Promise<ChannelSendResponse> {
    const conversationId = payload.to ?? payload.message.conversationId;
    if (!conversationId) {
      throw new Error('WebChat adapter requires a conversation id to broadcast messages');
    }

    this.io.to(conversationId).emit('message', payload.message);
    return { externalId: payload.message.externalId ?? payload.message.id, raw: payload.message };
  }

  async broadcastTyping(conversationId: string, typing: { userId: string; state: 'on' | 'off'; actor?: 'agent' | 'user' }): Promise<void> {
    this.io.to(conversationId).emit('typing', {
      conversationId,
      userId: typing.userId,
      state: typing.state,
      actor: typing.actor ?? 'agent'
    });
  }

  private get config(): WebChatConfig {
    const { config, secrets } = this.context.channel;
    const resolved: WebChatConfig = {
      enabled: config.enabled ?? config.webchat?.enabled ?? true,
      allowedOrigins: config.allowedOrigins ?? config.webchat?.allowedOrigins ?? [],
      token: secrets?.token ?? secrets?.webchatToken ?? config.token ?? config.webchat?.token
    };

    return resolved;
  }

  private configureCors(): void {
    const { allowedOrigins } = this.config;
    if (allowedOrigins.length > 0) {
      this.io.engine.opts.cors = this.io.engine.opts.cors ?? {};
      (this.io.engine.opts.cors as any).origin = allowedOrigins;
    }
  }

  private registerHandlers(): void {
    this.io.use((socket, next) => {
      try {
        this.authenticate(socket);
        next();
      } catch (error) {
        next(error as Error);
      }
    });

    this.io.on('connection', (socket) => {
      const conversationId = this.getConversationId(socket);
      socket.join(conversationId);

      socket.on('message', async (payload: WebChatInboundPayload) => {
        const normalized = this.normalizeInbound(socket, payload);
        await this.deliver([normalized]);
        socket.to(conversationId).emit('message', normalized);
      });

      socket.on('typing', (payload: WebChatTypingPayload) => {
        socket.to(conversationId).emit('typing', {
          conversationId,
          userId: this.getUserId(socket),
          state: payload.state
        });
      });
    });
  }

  private authenticate(socket: Socket): void {
    const config = this.config;
    if (!config.enabled) {
      throw new Error('WebChat channel is disabled');
    }

    const auth = socket.handshake.auth as Record<string, any>;
    const token = auth?.token as string | undefined;
    if (config.token && token !== config.token) {
      throw new Error('Invalid WebChat authentication token');
    }

    const tenantId = auth?.tenantId as string | undefined;
    if (!tenantId || tenantId !== this.context.tenant.id) {
      throw new Error('Tenant mismatch');
    }

    const conversationId = auth?.conversationId as string | undefined;
    if (!conversationId) {
      throw new Error('Missing conversation id');
    }

    const userId = auth?.userId as string | undefined;
    if (!userId) {
      throw new Error('Missing user id');
    }
  }

  private getConversationId(socket: Socket): string {
    return (socket.handshake.auth?.conversationId as string) ?? '';
  }

  private getUserId(socket: Socket): string {
    return (socket.handshake.auth?.userId as string) ?? '';
  }

  private normalizeInbound(socket: Socket, payload: WebChatInboundPayload): NormalizedMessage {
    const conversationId = this.getConversationId(socket);
    const userId = this.getUserId(socket);
    const type = payload.type ?? (payload.media ? 'image' : 'text');

    const content = payload.media
      ? normalizeMediaContent(payload.media)
      : normalizeTextContent(payload.text ?? '');

    return createNormalizedMessage({
      id: payload.id ?? randomUUID(),
      externalId: payload.id,
      conversationId,
      direction: 'inbound',
      from: userId,
      timestamp: new Date(),
      type,
      content,
      metadata: {
        clientSocketId: socket.id,
        ...payload.metadata
      }
    });
  }
}
