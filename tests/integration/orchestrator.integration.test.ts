import amqp from 'amqplib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageOrchestrator } from '../../packages/orchestrator/src/message-orchestrator';
import { ensureChannelTopology, getChannelRoutingKey, ORCHESTRATOR_EXCHANGE } from '../../packages/events/src/queue-topics';
import type { NormalizedMessage } from '@meta-chat/shared';

let orchestrator: MessageOrchestrator | undefined;

afterEach(async () => {
  if (orchestrator) {
    await orchestrator.stop();
    orchestrator = undefined;
  }
});

describe('Message orchestrator integration', () => {
  it('consumes messages from RabbitMQ and invokes the handler', async () => {
    const handlerInvocations: NormalizedMessage[] = [];
    orchestrator = new MessageOrchestrator({
      tenantId: 'tenant-int',
      channel: 'whatsapp',
      visibilityTimeoutMs: 5000,
      maxRetries: 3,
      handler: async (message) => {
        handlerInvocations.push(message);
      },
    });

    await orchestrator.start();

    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    const channel = await connection.createChannel();
    await ensureChannelTopology(channel, { tenantId: 'tenant-int', channel: 'whatsapp' });

    const payload: NormalizedMessage = {
      id: 'message-1',
      tenantId: 'tenant-int',
      channel: 'whatsapp',
      direction: 'inbound',
      type: 'text',
      content: { text: 'Hello integration!' },
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    const routingKey = getChannelRoutingKey({ tenantId: 'tenant-int', channel: 'whatsapp', direction: 'inbound' });

    await channel.publish(
      ORCHESTRATOR_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { contentType: 'application/json', persistent: false },
    );

    await channel.close();
    await connection.close();

    await vi.waitFor(() => {
      expect(handlerInvocations).toHaveLength(1);
    }, { timeout: 10_000 });
    expect(handlerInvocations[0]).toMatchObject({ id: 'message-1', content: { text: 'Hello integration!' } });
  });
});
