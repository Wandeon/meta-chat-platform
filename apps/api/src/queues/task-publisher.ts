import amqp, { Channel, ChannelModel, Options } from 'amqplib';
import { ChannelType, createLogger, MessageDirection } from '@meta-chat/shared';
import {
  ORCHESTRATOR_EXCHANGE,
  ensureChannelTopology,
  getChannelRoutingKey,
} from '@meta-chat/events';

const logger = createLogger('TenantQueuePublisher');

export interface QueuePublishOptions {
  tenantId: string;
  channel: ChannelType;
  direction?: MessageDirection;
  body: unknown;
  headers?: Options.Publish['headers'];
}

export class TenantQueuePublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private ensuredKeys = new Set<string>();

  async init(): Promise<void> {
    if (this.connection) {
      return;
    }

    const url = process.env.RABBITMQ_URL;
    if (!url) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    this.connection = await amqp.connect(url);
    this.connection.on('error', (error) => {
      logger.error('Queue publisher connection error', error);
      this.reset();
    });
    this.connection.on('close', () => {
      logger.warn('Queue publisher connection closed');
      this.reset();
    });

    this.channel = await this.connection.createChannel();
  }

  async publish(options: QueuePublishOptions): Promise<void> {
    if (!this.channel) {
      await this.init();
    }
    if (!this.channel) {
      throw new Error('Unable to publish message, channel unavailable');
    }

    const key = `${options.tenantId}:${options.channel}:${options.direction ?? 'inbound'}`;
    if (!this.ensuredKeys.has(key)) {
      await ensureChannelTopology(this.channel, {
        tenantId: options.tenantId,
        channel: options.channel,
        direction: options.direction,
      });
      this.ensuredKeys.add(key);
    }

    const routingKey = getChannelRoutingKey({
      tenantId: options.tenantId,
      channel: options.channel,
      direction: options.direction,
    });

    this.channel.publish(ORCHESTRATOR_EXCHANGE, routingKey, Buffer.from(JSON.stringify(options.body)), {
      persistent: true,
      contentType: 'application/json',
      headers: {
        ...(options.headers ?? {}),
      },
    } as Options.Publish);

    logger.debug('Published orchestrator job', {
      tenantId: options.tenantId,
      channel: options.channel,
      direction: options.direction ?? 'inbound',
      routingKey,
    });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.ensuredKeys.clear();
  }

  private reset(): void {
    this.channel = null;
    this.connection = null;
    this.ensuredKeys.clear();
  }
}
