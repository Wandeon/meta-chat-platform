import { createHmac } from 'crypto';
import { describe, expect, beforeEach, it, vi } from 'vitest';
import type { NormalizedMessage } from '@meta-chat/shared';
import whatsappText from './fixtures/whatsapp-text.json';
import whatsappImage from './fixtures/whatsapp-image.json';
import { WhatsAppAdapter } from '../src/whatsapp/whatsapp-adapter';
import type { ChannelReceivePayload, ChannelSendPayload } from '../src/types';

const APP_SECRET = 'test-app-secret';
const ACCESS_TOKEN = 'test-access-token';

function createAdapter() {
  const context = {
    tenant: { id: 'tenant-1' },
    channel: {
      id: 'channel-1',
      type: 'whatsapp' as const,
      config: {
        phoneNumberId: '123456789',
        webhookVerifyToken: 'verify-token'
      },
      secrets: {
        appSecret: APP_SECRET,
        accessToken: ACCESS_TOKEN
      }
    }
  };

  return new WhatsAppAdapter(context);
}

function createPayload(body: object): ChannelReceivePayload {
  const rawBody = JSON.stringify(body);
  const signature = `sha256=${createHmac('sha256', APP_SECRET).update(rawBody, 'utf8').digest('hex')}`;
  return {
    headers: { 'x-hub-signature-256': signature },
    query: {},
    body,
    rawBody
  };
}

describe('WhatsAppAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies webhook challenge', async () => {
    const adapter = createAdapter();
    const response = await adapter.verify({
      headers: {},
      query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-token', 'hub.challenge': '1234' },
      body: undefined,
      rawBody: ''
    });

    expect(response).toEqual({ success: true, status: 200, body: '1234' });
  });

  it('normalizes text messages', async () => {
    const adapter = createAdapter();
    const handler = vi.fn(async (_message: NormalizedMessage) => {});
    adapter.setMessageHandler(handler);

    const result = await adapter.receive(createPayload(whatsappText));

    expect(result.messages).toHaveLength(1);
    const [message] = result.messages;
    expect(message.type).toBe('text');
    expect(message.content.text).toBe('Hello there');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fetches media metadata for attachments', async () => {
    const adapter = createAdapter();
    const mockFetch = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://cdn.example.com/image.jpg', mime_type: 'image/jpeg' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

    const result = await adapter.receive(createPayload(whatsappImage));

    expect(result.messages).toHaveLength(1);
    const [message] = result.messages;
    expect(message.type).toBe('image');
    expect(message.content.media?.url).toBe('https://cdn.example.com/image.jpg');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/MEDIA_IMAGE_ID'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('sends text messages via Graph API', async () => {
    const adapter = createAdapter();
    const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(async (url, _init) => {
      if (typeof url === 'string' && url.includes('/messages')) {
        return new Response(JSON.stringify({ messages: [{ id: 'wamid.sent' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const payload: ChannelSendPayload = {
      to: '16315551212',
      message: {
        id: 'local-id',
        conversationId: 'conv-1',
        direction: 'outbound',
        from: 'business',
        timestamp: new Date(),
        type: 'text',
        content: { text: 'Reply' }
      }
    } as ChannelSendPayload;

    const response = await adapter.send(payload);
    expect(response.externalId).toBe('wamid.sent');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('uploads media before sending', async () => {
    const adapter = createAdapter();
    const mockFetch = vi.spyOn(global, 'fetch').mockImplementation(async (url, _init) => {
      if (typeof url === 'string' && url.startsWith('https://graph.facebook.com')) {
        if (url.includes('/media')) {
          return new Response(JSON.stringify({ id: 'uploaded-media-id' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ messages: [{ id: 'wamid.media.sent' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(new ArrayBuffer(8), { status: 200 });
    });

    const payload: ChannelSendPayload = {
      to: '16315551212',
      message: {
        id: 'local-id',
        conversationId: 'conv-1',
        direction: 'outbound',
        from: 'business',
        timestamp: new Date(),
        type: 'image',
        content: {
          media: {
            url: 'https://files.example.com/image.jpg',
            mimeType: 'image/jpeg',
            filename: 'image.jpg'
          }
        }
      }
    } as ChannelSendPayload;

    const response = await adapter.send(payload);
    expect(response.externalId).toBe('wamid.media.sent');

    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall[0]).toBe('https://files.example.com/image.jpg');

    const mediaCall = mockFetch.mock.calls.find(([url]) => typeof url === 'string' && url.includes('/media'));
    expect(mediaCall).toBeDefined();
  });
});
