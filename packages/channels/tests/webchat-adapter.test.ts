import { describe, expect, it, beforeEach } from 'vitest';
import type { NormalizedMessage } from '@meta-chat/shared';
import { WebChatAdapter } from '../src/webchat/webchat-adapter';
import type { ChannelSendPayload } from '../src/types';
import { MockServer } from './utils/mock-socket';

function createAdapter(server: MockServer) {
  const context = {
    tenant: { id: 'tenant-1' },
    channel: {
      id: 'channel-1',
      type: 'webchat' as const,
      config: {
        enabled: true,
        allowedOrigins: ['https://app.example.com']
      },
      secrets: {
        token: 'shared-token'
      }
    }
  };

  return new WebChatAdapter(context, { io: server as unknown as any });
}

describe('WebChatAdapter', () => {
  let server: MockServer;

  beforeEach(() => {
    server = new MockServer();
  });

  it('rejects connections with invalid token', () => {
    const adapter = createAdapter(server);
    expect(adapter).toBeDefined();
    expect(() => server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-1', token: 'invalid' })).toThrow(
      /Invalid WebChat authentication token/
    );
  });

  it('normalizes inbound socket messages and broadcasts to peers', async () => {
    const adapter = createAdapter(server);
    const messages: NormalizedMessage[] = [];
    adapter.setMessageHandler(async (message) => {
      messages.push(message);
    });

    const socketA = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-1', token: 'shared-token' });
    const socketB = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-2', token: 'shared-token' });

    socketA.emit('message', { text: 'Hello WebChat' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(messages).toHaveLength(1);
    expect(messages[0].content.text).toBe('Hello WebChat');
    expect(socketB.received.some((event) => event.event === 'message')).toBe(true);
  });

  it('broadcasts typing events to other clients', () => {
    createAdapter(server);
    const socketA = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-1', token: 'shared-token' });
    const socketB = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-2', token: 'shared-token' });

    socketA.emit('typing', { state: 'on' });
    expect(socketB.received.some((event) => event.event === 'typing')).toBe(true);
  });

  it('sends outbound messages to connected clients', async () => {
    const adapter = createAdapter(server);
    const socketA = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-1', token: 'shared-token' });
    const socketB = server.simulateConnection({ tenantId: 'tenant-1', conversationId: 'conv-1', userId: 'user-2', token: 'shared-token' });
    socketA.received = [];
    socketB.received = [];

    const message: NormalizedMessage = {
      id: 'server-message',
      conversationId: 'conv-1',
      direction: 'outbound',
      from: 'agent',
      timestamp: new Date(),
      type: 'text',
      content: { text: 'Agent reply' }
    };

    const payload: ChannelSendPayload = {
      message,
      to: 'conv-1'
    } as ChannelSendPayload;

    await adapter.send(payload);

    expect(socketA.received.some((event) => event.event === 'message')).toBe(true);
    expect(socketB.received.some((event) => event.event === 'message')).toBe(true);
  });
});
