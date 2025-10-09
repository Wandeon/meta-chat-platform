import { describe, expect, it } from 'vitest';
import {
  DEAD_LETTER_EXCHANGE,
  ORCHESTRATOR_EXCHANGE,
  ensureChannelTopology,
  getChannelQueueName,
  getChannelRoutingKey,
  getDeadLetterQueueName,
} from '../queue-topics';
import { MockAmqpChannel } from '../../tests/amqp-mock';

describe('queue topology helpers', () => {
  it('computes queue and routing keys deterministically', () => {
    const parts = { tenantId: 'tenant123', channel: 'whatsapp' as const, direction: 'inbound' as const };
    expect(getChannelRoutingKey(parts)).toBe('tenant.tenant123.channel.whatsapp.inbound');
    expect(getChannelQueueName(parts)).toBe('tenant.tenant123.channel.whatsapp.inbound.queue');
    expect(getDeadLetterQueueName('tenant.tenant123.channel.whatsapp.inbound.queue')).toBe(
      'tenant.tenant123.channel.whatsapp.inbound.queue.dead-letter',
    );
  });

  it('ensures exchanges, queues, and bindings exist', async () => {
    const channel = new MockAmqpChannel();
    const parts = { tenantId: 'tenant123', channel: 'webchat' as const };

    const result = await ensureChannelTopology(channel as any, parts);

    expect(result.queueName).toBe('tenant.tenant123.channel.webchat.inbound.queue');
    expect(result.deadLetterQueueName).toBe('tenant.tenant123.channel.webchat.inbound.queue.dead-letter');

    const assertExchangeCalls = channel.calls.filter((call) => call.method === 'assertExchange');
    expect(assertExchangeCalls).toHaveLength(2);
    expect(assertExchangeCalls[0].args).toEqual([ORCHESTRATOR_EXCHANGE, 'topic', { durable: true, autoDelete: false }]);
    expect(assertExchangeCalls[1].args).toEqual([DEAD_LETTER_EXCHANGE, 'topic', { durable: true, autoDelete: false }]);

    const assertQueueCalls = channel.calls.filter((call) => call.method === 'assertQueue');
    expect(assertQueueCalls).toHaveLength(2);
    expect(assertQueueCalls[0].args[0]).toBe(result.queueName);
    expect(assertQueueCalls[1].args[0]).toBe(result.deadLetterQueueName);
  });
});
