import amqp, { Channel, Connection, Options } from 'amqplib';
import { Response } from 'express';
import { ChannelType, Logger } from '@meta-chat/shared';
import {
  ORCHESTRATOR_EXCHANGE,
  ensureWebhookAckTopology,
  getWebhookAckRoutingKey,
} from '@meta-chat/events';

const logger = new Logger('WebhookAckStrategy');

export interface WebhookAckPayload {
  webhookId?: string;
  externalMessageId?: string;
  rawPayload: unknown;
}

export interface WebhookAckOptions {
  tenantId: string;
  channel: ChannelType;
  payload: WebhookAckPayload;
  respond?: boolean;
}

export class WebhookAckStrategy {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly ensuredQueues = new Set<string>();

  constructor(private readonly responseBody: string = 'EVENT_RECEIVED') {}

  async init(): Promise<void> {
    if (this.connection) {
      return;
    }

    const url = process.env.RABBITMQ_URL;
    if (!url) {
      logger.warn('RABBITMQ_URL not configured, webhook acknowledgements will not be queued');
      return;
    }

    this.connection = await amqp.connect(url);
    this.connection.on('error', (error) => {
      logger.error('Webhook ack connection error', error);
      this.reset();
    });
    this.connection.on('close', () => {
      logger.warn('Webhook ack connection closed');
      this.reset();
    });

    this.channel = await this.connection.createChannel();
  }

  async acknowledge(res: Response, options: WebhookAckOptions): Promise<void> {
    if (options.respond !== false) {
      res.status(200).send(this.responseBody);
    }

    await this.publishAck(options).catch((error) => {
      logger.error('Failed to enqueue webhook acknowledgement', error);
    });
  }

  async publishAck(options: WebhookAckOptions): Promise<void> {
    if (!this.channel) {
      await this.init();
    }

    if (!this.channel) {
      // still unavailable, skip queuing but do not throw to avoid webhook retries
      return;
    }

    const key = `${options.tenantId}:${options.channel}`;
    if (!this.ensuredQueues.has(key)) {
      await ensureWebhookAckTopology(this.channel, options.tenantId, options.channel);
      this.ensuredQueues.add(key);
    }

    const routingKey = getWebhookAckRoutingKey(options.tenantId, options.channel);
    const payload = {
      ...options.payload,
      tenantId: options.tenantId,
      channel: options.channel,
      ackedAt: new Date().toISOString(),
    };

    this.channel.publish(ORCHESTRATOR_EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    } as Options.Publish);

    logger.debug('Webhook acknowledgement queued', {
      tenantId: options.tenantId,
      channel: options.channel,
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
  }

  private reset(): void {
    this.channel = null;
    this.connection = null;
    this.ensuredQueues.clear();
  }
}
