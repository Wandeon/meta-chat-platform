import { createHmac } from 'crypto';
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
import {
  createNormalizedMessage,
  normalizeLocationContent,
  normalizeMediaContent,
  normalizeTextContent
} from '../utils/normalization';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v17.0';

type MessengerAttachmentType = 'image' | 'audio' | 'video' | 'file' | 'location';

type MessengerAttachment = {
  type: MessengerAttachmentType;
  payload: {
    url?: string;
    mime_type?: string;
    name?: string;
    coordinates?: { lat: number; long: number };
  };
};

type MessengerMessage = {
  mid: string;
  text?: string;
  attachments?: MessengerAttachment[];
  quick_reply?: { payload: string };
  is_echo?: boolean;
};

type MessengerMessagingEvent = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MessengerMessage;
};

type MessengerWebhookPayload = {
  object: string;
  entry: Array<{
    id: string;
    messaging: MessengerMessagingEvent[];
  }>;
};

interface MessengerConfig {
  pageId: string;
  pageAccessToken: string;
  verifyToken: string;
  appSecret: string;
}

export class MessengerAdapter extends ChannelAdapter {
  async verify(payload: ChannelVerifyPayload): Promise<ChannelVerifyResponse> {
    const mode = this.firstValue(payload.query['hub.mode']);
    const token = this.firstValue(payload.query['hub.verify_token']);
    const challenge = this.firstValue(payload.query['hub.challenge']);

    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return {
        success: true,
        status: 200,
        body: challenge ?? 'verified'
      };
    }

    return {
      success: false,
      status: 403,
      body: 'Invalid verify token'
    };
  }

  async receive(payload: ChannelReceivePayload): Promise<ChannelReceiveResult> {
    this.ensureSignature(payload);

    const body = typeof payload.body === 'string' ? JSON.parse(payload.body) : (payload.body as MessengerWebhookPayload);
    const messages: NormalizedMessage[] = [];

    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        if (!event.message || event.message.is_echo) {
          continue;
        }

        messages.push(...(await this.normalizeEvent(event)));
      }
    }

    await this.deliver(messages);
    return { messages, raw: body };
  }

  async send(payload: ChannelSendPayload): Promise<ChannelSendResponse> {
    const { pageId } = this.config;
    const { message } = payload;
    const to = payload.to ?? payload.metadata?.to ?? message.metadata?.to;

    if (!to) {
      throw new Error('Messenger adapter requires a recipient (to) value to send messages');
    }

    const requestBody: Record<string, any> = {
      messaging_type: 'RESPONSE',
      recipient: { id: to }
    };

    switch (message.type) {
      case 'text':
        requestBody.message = { text: message.content.text ?? '' };
        break;
      case 'image':
      case 'audio':
      case 'video':
      case 'document': {
        const media = message.content.media;
        if (!media) {
          throw new Error(`Messenger adapter missing media content for ${message.type}`);
        }

        const attachmentType = message.type === 'document' ? 'file' : message.type;
        requestBody.message = {
          attachment: {
            type: attachmentType,
            payload: {
              url: media.url,
              is_reusable: true
            }
          }
        };
        break;
      }
      case 'location': {
        const location = message.content.location;
        if (!location) {
          throw new Error('Messenger adapter missing location content');
        }

        requestBody.message = {
          attachment: {
            type: 'location',
            payload: {
              coordinates: {
                lat: location.latitude,
                long: location.longitude
              }
            }
          }
        };
        break;
      }
      default:
        throw new Error(`Unsupported Messenger message type: ${message.type}`);
    }

    const response = await this.graphRequest<{ message_id: string }>(`/${pageId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    return { externalId: response.message_id, raw: response };
  }

  async setTypingIndicator(recipientId: string, action: 'typing_on' | 'typing_off' | 'mark_seen'): Promise<void> {
    const { pageId } = this.config;
    await this.graphRequest(`/${pageId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: action
      })
    });
  }

  private get config(): MessengerConfig {
    const { config, secrets } = this.context.channel;
    const resolved: Partial<MessengerConfig> = {
      pageId: config.pageId ?? config.messenger?.pageId,
      pageAccessToken: secrets?.pageAccessToken ?? config.pageAccessToken ?? config.messenger?.pageAccessToken,
      verifyToken: config.verifyToken ?? config.messenger?.verifyToken,
      appSecret: secrets?.appSecret ?? config.appSecret ?? config.messenger?.appSecret
    };

    if (!resolved.pageId || !resolved.pageAccessToken || !resolved.verifyToken || !resolved.appSecret) {
      throw new Error('Messenger channel configuration is incomplete');
    }

    return resolved as MessengerConfig;
  }

  private async normalizeEvent(event: MessengerMessagingEvent): Promise<NormalizedMessage[]> {
    const messages: NormalizedMessage[] = [];
    const baseId = event.message?.mid ?? `${event.sender.id}-${event.timestamp}`;
    const conversationId = `${this.context.channel.id}:${event.sender.id}`;

    if (event.message?.text) {
      messages.push(
        createNormalizedMessage({
          id: baseId,
          externalId: baseId,
          conversationId,
          direction: 'inbound',
          from: event.sender.id,
          timestamp: event.timestamp,
          type: 'text',
          content: normalizeTextContent(event.message.text),
          metadata: {
            recipientId: event.recipient.id,
            quickReply: event.message.quick_reply?.payload
          }
        })
      );
    }

    (event.message?.attachments ?? []).forEach((attachment, index) => {
      const normalized = this.normalizeAttachment(event, attachment, index, conversationId, baseId);
      if (normalized) {
        messages.push(normalized);
      }
    });

    return messages;
  }

  private normalizeAttachment(
    event: MessengerMessagingEvent,
    attachment: MessengerAttachment,
    index: number,
    conversationId: string,
    baseId: string
  ): NormalizedMessage | null {
    const attachmentId = `${baseId}:${index}`;
    const common = {
      id: attachmentId,
      externalId: attachmentId,
      conversationId,
      direction: 'inbound' as const,
      from: event.sender.id,
      timestamp: event.timestamp,
      metadata: {
        recipientId: event.recipient.id,
        attachmentType: attachment.type
      }
    };

    if (attachment.type === 'location' && attachment.payload.coordinates) {
      return createNormalizedMessage({
        ...common,
        type: 'location',
        content: normalizeLocationContent({
          latitude: attachment.payload.coordinates.lat,
          longitude: attachment.payload.coordinates.long
        })
      });
    }

    if (!attachment.payload.url) {
      return null;
    }

    const messageType = attachment.type === 'file' ? 'document' : attachment.type;
    return createNormalizedMessage({
      ...common,
      type: messageType,
      content: normalizeMediaContent({
        url: attachment.payload.url,
        mimeType: attachment.payload.mime_type ?? 'application/octet-stream',
        filename: attachment.payload.name
      })
    });
  }

  private ensureSignature(payload: ChannelReceivePayload): void {
    const signature = this.firstValue(payload.headers['x-hub-signature-256'] as string | string[] | undefined);
    if (!signature) {
      throw new Error('Missing X-Hub-Signature-256 header');
    }

    const expected = `sha256=${createHmac('sha256', this.config.appSecret).update(payload.rawBody, 'utf8').digest('hex')}`;
    if (signature !== expected) {
      throw new Error('Invalid Messenger webhook signature');
    }
  }

  private async graphRequest<T>(path: string, init: RequestInit): Promise<T> {
    const { pageAccessToken } = this.config;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${pageAccessToken}`
    };

    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    const response = await fetch(`${GRAPH_BASE_URL}${path}`, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Graph API request failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private firstValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
