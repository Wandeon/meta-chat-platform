import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QueueConsumerOptions } from '../queue-consumer';

const startMock = vi.fn();
const stopMock = vi.fn();
let capturedOptions: QueueConsumerOptions<any> | null = null;

vi.mock('../queue-consumer', async () => {
  const actual = await vi.importActual<typeof import('../queue-consumer')>('../queue-consumer');
  return {
    ...actual,
    QueueConsumer: vi.fn().mockImplementation((options: QueueConsumerOptions<any>) => {
      capturedOptions = options;
      return {
        start: startMock,
        stop: stopMock,
      };
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  capturedOptions = null;
});

describe('MessageOrchestrator', () => {
  it('delegates message handling and acknowledges success', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { MessageOrchestrator } = await import('../message-orchestrator');

    const orchestrator = new MessageOrchestrator({
      handler,
      tenantId: 'tenant-id',
      channel: 'whatsapp',
      visibilityTimeoutMs: 1000,
      maxRetries: 3,
    });

    expect(capturedOptions).toBeTruthy();
    const payload = { id: 'message-1', content: 'hello' };
    const ack = vi.fn();
    await capturedOptions!.onMessage(payload, {
      ack,
      retryCount: 0,
      raw: { content: Buffer.from(JSON.stringify(payload)) } as any,
    });

    expect(handler).toHaveBeenCalledWith(payload);
    expect(ack).toHaveBeenCalledTimes(1);
    await orchestrator.start();
    expect(startMock).toHaveBeenCalled();
    await orchestrator.stop();
    expect(stopMock).toHaveBeenCalled();
  });

  it('propagates handler errors for observability', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const { MessageOrchestrator } = await import('../message-orchestrator');

    new MessageOrchestrator({
      handler,
      tenantId: 'tenant-id',
      channel: 'webchat',
      visibilityTimeoutMs: 1000,
      maxRetries: 3,
    });

    await expect(
      capturedOptions!.onMessage({ id: '2' }, {
        ack: vi.fn(),
        retryCount: 0,
        raw: { content: Buffer.from('{"id":"2"}') } as any,
      }),
    ).rejects.toThrow('boom');
  });
});
