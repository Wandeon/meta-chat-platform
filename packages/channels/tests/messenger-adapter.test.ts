import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedMessage } from '@meta-chat/shared';
import messengerPayload from './fixtures/messenger-message.json';
import { MessengerAdapter } from '../src/messenger/messenger-adapter';
import type { ChannelReceivePayload, ChannelSendPayload } from '../src/types';

const APP_SECRET = 'messenger-secret';
const PAGE_ACCESS_TOKEN = 'page-access-token';

function createAdapter() {
  const context = {
    tenant: { id: 'tenant-1' },
    channel: {
      id: 'channel-1',
      type: 'messenger' as const,
      config: {
        pageId: 'PAGE_ID',
        verifyToken: 'verify-token'
      },
      secrets: {
        appSecret: APP_SECRET,
        pageAccessToken: PAGE_ACCESS_TOKEN
      }
    }
  };

  return new MessengerAdapter(context);
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

describe('MessengerAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies webhook challenge', async () => {
    const adapter = createAdapter();
    const response = await adapter.verify({
      headers: {},
      query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-token', 'hub.challenge': '42' },
      body: undefined,
      rawBody: ''
    });

    expect(response).toEqual({ success: true, status: 200, body: '42' });
  });

  it('normalizes messenger messages and attachments', async () => {
    const adapter = createAdapter();
    const handler = vi.fn(async (_message: NormalizedMessage) => {});
    adapter.setMessageHandler(handler);

    const result = await adapter.receive(createPayload(messengerPayload));
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[1].type).toBe('image');
    expect(result.messages[1].content.media?.url).toContain('cdn.example.com');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('sends text messages using Graph API', async () => {
    const adapter = createAdapter();
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message_id: 'm_sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const payload: ChannelSendPayload = {
      to: 'USER_PSID',
      message: {
        id: 'local-id',
        conversationId: 'channel-1:USER_PSID',
        direction: 'outbound',
        from: 'PAGE_ID',
        timestamp: new Date(),
        type: 'text',
        content: { text: 'Hello back' }
      }
    } as ChannelSendPayload;

    const response = await adapter.send(payload);
    expect(response.externalId).toBe('m_sent');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends typing indicators', async () => {
    const adapter = createAdapter();
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await adapter.setTypingIndicator('USER_PSID', 'typing_on');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ body: expect.stringContaining('typing_on') })
    );
  });
});
