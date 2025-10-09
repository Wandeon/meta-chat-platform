import type { Channel } from 'amqplib';
import { ChannelType, MessageDirection, Event, EventType } from '@meta-chat/shared';

/**
 * Exchange and queue naming helpers that ensure multi-tenant isolation for
 * RabbitMQ based message routing. These helpers are shared between the events
 * package (producers) and orchestrator (consumers).
 */

export const EVENTS_EXCHANGE = 'metachat.events';
export const ORCHESTRATOR_EXCHANGE = 'metachat.orchestrator';
export const DEAD_LETTER_EXCHANGE = 'metachat.dlx';

export interface QueueNameParts {
  tenantId: string;
  channel: ChannelType;
  direction?: MessageDirection;
}

export function getChannelRoutingKey({ tenantId, channel, direction = 'inbound' }: QueueNameParts): string {
  return `tenant.${tenantId}.channel.${channel}.${direction}`;
}

export function getChannelQueueName(parts: QueueNameParts): string {
  return `${getChannelRoutingKey(parts)}.queue`;
}

export function getDeadLetterRoutingKey(queueName: string): string {
  return `${queueName}.dlq`;
}

export function getDeadLetterQueueName(queueName: string): string {
  return `${queueName}.dead-letter`;
}

export function getEventRoutingKey(event: Pick<Event, 'tenantId' | 'type'>): string {
  return `tenant.${event.tenantId}.events.${event.type.replace(/\./g, '-')}`;
}

export async function ensureChannelTopology(
  channel: Channel,
  parts: QueueNameParts,
): Promise<{ queueName: string; deadLetterQueueName: string }>
{
  const queueName = getChannelQueueName(parts);
  const dlqName = getDeadLetterQueueName(queueName);
  const routingKey = getChannelRoutingKey(parts);
  const deadLetterRoutingKey = getDeadLetterRoutingKey(queueName);

  await channel.assertExchange(ORCHESTRATOR_EXCHANGE, 'topic', {
    durable: true,
    autoDelete: false,
  });

  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', {
    durable: true,
    autoDelete: false,
  });

  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
      'x-dead-letter-routing-key': deadLetterRoutingKey,
    },
  });

  await channel.bindQueue(queueName, ORCHESTRATOR_EXCHANGE, routingKey);

  await channel.assertQueue(dlqName, {
    durable: true,
  });

  await channel.bindQueue(dlqName, DEAD_LETTER_EXCHANGE, deadLetterRoutingKey);

  return { queueName, deadLetterQueueName: dlqName };
}

export function getWebhookAckRoutingKey(tenantId: string, channel: ChannelType): string {
  return `tenant.${tenantId}.webhook.${channel}.ack`;
}

export function getWebhookAckQueueName(tenantId: string, channel: ChannelType): string {
  return `${getWebhookAckRoutingKey(tenantId, channel)}.queue`;
}

export function getSupportedEventTypes(): EventType[] {
  return Object.values(EventType);
}

export async function ensureWebhookAckTopology(
  amqpChannel: Channel,
  tenantId: string,
  channel: ChannelType,
): Promise<{ queueName: string }> {
  const queueName = getWebhookAckQueueName(tenantId, channel);
  const routingKey = getWebhookAckRoutingKey(tenantId, channel);

  await amqpChannel.assertExchange(ORCHESTRATOR_EXCHANGE, 'topic', {
    durable: true,
    autoDelete: false,
  });

  await amqpChannel.assertQueue(queueName, {
    durable: true,
  });

  await amqpChannel.bindQueue(queueName, ORCHESTRATOR_EXCHANGE, routingKey);

  return { queueName };
}
