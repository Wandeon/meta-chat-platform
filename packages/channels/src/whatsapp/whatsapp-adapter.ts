import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
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

type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location';

type WhatsAppWebhookMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; filename?: string; mime_type?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  context?: Record<string, any>;
};

type WhatsAppChangeValue = {
  metadata: {
    display_phone_number?: string;
    phone_number_id: string;
  };
  contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
  messages?: WhatsAppWebhookMessage[];
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    id: string;
    changes?: Array<{
      field: string;
      value: WhatsAppChangeValue;
    }>;
  }>;
  object?: string;
};

type GraphRequestOptions = RequestInit & { skipAuth?: boolean };

interface MediaMetadataResponse {
  url: string;
  mime_type: string;
  sha256?: string;
  file_size?: number;
  id?: string;
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export class WhatsAppAdapter extends ChannelAdapter {
  private get config() {
    const { config } = this.context.channel;
    return {
      phoneNumberId: config.phoneNumberId ?? config.whatsapp?.phoneNumberId,
      businessAccountId: config.businessAccountId ?? config.whatsapp?.businessAccountId,
      accessToken: this.resolveSecret('accessToken') ?? config.accessToken ?? config.whatsapp?.accessToken,
      verifyToken: config.webhookVerifyToken ?? config.whatsapp?.webhookVerifyToken,
      appSecret: this.resolveSecret('appSecret') ?? config.appSecret ?? config.whatsapp?.appSecret
    };
  }

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

    const body = typeof payload.body === 'string' ? JSON.parse(payload.body) : (payload.body as WhatsAppWebhookPayload);
    const messages = await this.normalizeWebhook(body);
    await this.deliver(messages);
    return { messages, raw: body };
  }

  async send(payload: ChannelSendPayload): Promise<ChannelSendResponse> {
    const { phoneNumberId } = this.ensureConfig();
    const { message } = payload;
    const to = payload.to ?? payload.metadata?.to ?? message.metadata?.to;

    if (!to) {
      throw new Error('WhatsApp adapter requires a recipient (to) value to send messages');
    }

    const requestBody: Record<string, any> = {
      messaging_product: 'whatsapp',
      to,
      type: message.type
    };

    switch (message.type) {
      case 'text': {
        const text = message.content.text ?? '';
        requestBody.text = { body: text };
        break;
      }
      case 'image':
      case 'audio':
      case 'video':
      case 'document': {
        const media = message.content.media;
        if (!media) {
          throw new Error(`WhatsApp adapter missing media content for ${message.type} message`);
        }

        const uploaded = await this.uploadMediaFromUrl(media.url, media.mimeType, media.filename);
        requestBody[message.type] = { id: uploaded.id, caption: media.caption };
        break;
      }
      case 'location': {
        const location = message.content.location;
        if (!location) {
          throw new Error('WhatsApp adapter missing location content');
        }

        requestBody.location = location;
        break;
      }
      default:
        throw new Error(`Unsupported WhatsApp message type: ${message.type}`);
    }

    const response = await this.graphRequest<{ messages: Array<{ id: string }> }>(
      `/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    const externalId = response.messages?.[0]?.id;
    return { externalId, raw: response };
  }

  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType: string; sha256?: string; url: string }> {
    const metadata = await this.graphRequest<MediaMetadataResponse>(`/${mediaId}`, { method: 'GET' });
    const url = metadata.url;
    if (!url) {
      throw new Error(`Media ${mediaId} has no accessible URL`);
    }

    const response = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.config.accessToken}` },
      skipAuth: true
    });

    if (!response.ok) {
      throw new Error(`Failed to download media ${mediaId}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      mimeType: metadata.mime_type,
      sha256: metadata.sha256,
      url
    };
  }

  async uploadMediaFromUrl(url: string, mimeType: string, filename?: string): Promise<{ id: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to fetch media from ${url}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', blob, filename ?? this.defaultFilename(mimeType));

    const { phoneNumberId } = this.ensureConfig();
    const uploadResponse = await this.graphRequest<{ id: string }>(`/${phoneNumberId}/media`, {
      method: 'POST',
      body: form
    });

    if (!uploadResponse.id) {
      throw new Error('Media upload failed to return an id');
    }

    return { id: uploadResponse.id };
  }

  private defaultFilename(mimeType: string): string {
    const extension = mimeType.split('/')[1] ?? 'bin';
    return `${randomUUID()}.${extension}`;
  }

  private ensureSignature(payload: ChannelReceivePayload): void {
    const signatureHeader = getHeader(payload.headers, 'x-hub-signature-256');
    if (!signatureHeader) {
      throw new Error('Missing X-Hub-Signature-256 header');
    }

    const appSecret = this.config.appSecret;
    if (!appSecret) {
      throw new Error('WhatsApp app secret is not configured');
    }

    const expected = `sha256=${createHmac('sha256', appSecret).update(payload.rawBody, 'utf8').digest('hex')}`;
    if (!this.timingSafeEqual(expected, signatureHeader)) {
      throw new Error('Invalid webhook signature');
    }
  }

  private async normalizeWebhook(payload: WhatsAppWebhookPayload): Promise<NormalizedMessage[]> {
    const messages: NormalizedMessage[] = [];
    if (!payload.entry) {
      return messages;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        for (const message of value.messages ?? []) {
          const normalized = await this.normalizeMessage(value, message);
          if (normalized) {
            messages.push(normalized);
          }
        }
      }
    }

    return messages;
  }

  private async normalizeMessage(value: WhatsAppChangeValue, message: WhatsAppWebhookMessage): Promise<NormalizedMessage | null> {
    const metadata: Record<string, any> = {
      phoneNumberId: value.metadata.phone_number_id,
      displayPhoneNumber: value.metadata.display_phone_number,
      contacts: value.contacts,
      context: message.context
    };

    const conversationId = `${this.context.channel.id}:${message.from}`;

    switch (message.type) {
      case 'text':
        return createNormalizedMessage({
          id: message.id,
          externalId: message.id,
          conversationId,
          direction: 'inbound',
          from: message.from,
          timestamp: Number(message.timestamp),
          type: 'text',
          content: normalizeTextContent(message.text?.body ?? ''),
          metadata
        });
      case 'image':
      case 'audio':
      case 'video':
      case 'document': {
        const media = message[message.type];
        if (!media?.id) {
          return null;
        }

        const resolved = await this.graphRequest<MediaMetadataResponse>(`/${media.id}`, { method: 'GET' });
        const content = normalizeMediaContent({
          url: resolved.url,
          mimeType: resolved.mime_type,
          filename: 'filename' in media ? media.filename : undefined,
          caption: 'caption' in media ? media.caption : undefined
        });

        return createNormalizedMessage({
          id: message.id,
          externalId: message.id,
          conversationId,
          direction: 'inbound',
          from: message.from,
          timestamp: Number(message.timestamp),
          type: message.type,
          content,
          metadata: { ...metadata, mediaId: media.id }
        });
      }
      case 'location': {
        const location = message.location;
        if (!location) {
          return null;
        }

        return createNormalizedMessage({
          id: message.id,
          externalId: message.id,
          conversationId,
          direction: 'inbound',
          from: message.from,
          timestamp: Number(message.timestamp),
          type: 'location',
          content: normalizeLocationContent(location),
          metadata
        });
      }
      default:
        return null;
    }
  }

  private ensureConfig() {
    const { phoneNumberId, accessToken } = this.config;
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp channel is missing phone number id or access token');
    }

    return { phoneNumberId, accessToken };
  }

  private resolveSecret(key: string): string | undefined {
    return this.context.channel.secrets?.[key];
  }

  private firstValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private timingSafeEqual(expected: string, actual: string): boolean {
    const bufferA = Buffer.from(expected);
    const bufferB = Buffer.from(actual);
    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }

  private async graphRequest<T>(path: string, init: GraphRequestOptions): Promise<T> {
    const { accessToken } = this.ensureConfig();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`
    };

    if (init.headers) {
      const providedHeaders = init.headers as Record<string, string>;
      for (const [key, value] of Object.entries(providedHeaders)) {
        headers[key] = value;
      }
    }

    const response = await this.fetch(`${GRAPH_BASE_URL}${path}`, { ...init, headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Graph API request failed (${response.status}): ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private async fetch(url: string, init: GraphRequestOptions = {}): Promise<Response> {
    if (!init.skipAuth) {
      const { accessToken } = this.ensureConfig();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`
      };

      if (init.headers) {
        const providedHeaders = init.headers as Record<string, string>;
        for (const [key, value] of Object.entries(providedHeaders)) {
          headers[key] = value;
        }
      }

      init.headers = headers;
    }

    return fetch(url, init);
  }
}
