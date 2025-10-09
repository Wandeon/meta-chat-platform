import amqp, { Channel, ChannelModel, ConsumeMessage, Options } from 'amqplib';
import { createLogger, ChannelType } from '@meta-chat/shared';
import { DEAD_LETTER_EXCHANGE, ensureChannelTopology, getDeadLetterRoutingKey } from '@meta-chat/events';

const logger = createLogger('QueueConsumer');

export interface QueueConsumerOptions<T> {
  tenantId: string;
  channel: ChannelType;
  visibilityTimeoutMs: number;
  maxRetries: number;
  prefetch?: number;
  initialRetryDelayMs?: number;
  backoffMultiplier?: number;
  parse?: (payload: Buffer) => T;
  onMessage: (payload: T, context: MessageContext) => Promise<void>;
}

export interface MessageContext {
  ack: () => void;
  retryCount: number;
  raw: ConsumeMessage;
}

export class QueueConsumer<T = Record<string, unknown>> {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private queueName: string | null = null;
  private isConsuming = false;
  private readonly options: QueueConsumerOptions<T>;

  constructor(options: QueueConsumerOptions<T>) {
    this.options = {
      initialRetryDelayMs: 1000,
      backoffMultiplier: 2,
      prefetch: 5,
      parse: (payload: Buffer) => JSON.parse(payload.toString()) as T,
      ...options,
    };
  }

  async start(): Promise<void> {
    if (this.isConsuming) {
      return;
    }

    const url = process.env.RABBITMQ_URL;
    if (!url) {
      throw new Error('RABBITMQ_URL is not configured');
    }

    await this.connect(url);
    if (!this.channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    const { queueName } = await ensureChannelTopology(this.channel, {
      tenantId: this.options.tenantId,
      channel: this.options.channel,
    });
    this.queueName = queueName;

    await this.channel.prefetch(this.options.prefetch ?? 5);
    await this.channel.consume(queueName, (message) => {
      if (!message) {
        return;
      }
      void this.handleMessage(message);
    });

    this.isConsuming = true;
    logger.info('Queue consumer started', {
      queue: queueName,
      tenantId: this.options.tenantId,
      channel: this.options.channel,
    });
  }

  async stop(): Promise<void> {
    this.isConsuming = false;
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private async connect(url: string): Promise<void> {
    this.connection = await amqp.connect(url);
    this.connection.on('error', (error) => {
      logger.error('RabbitMQ connection error', error);
      this.isConsuming = false;
    });
    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      this.isConsuming = false;
    });

    this.channel = await this.connection.createChannel();
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    if (!this.channel || !this.queueName) {
      logger.error('Channel or queue not initialised');
      return;
    }

    const retryCount = Number(message.properties.headers?.['x-retry-count'] ?? 0);
    const payload = this.options.parse!(message.content);

    let settled = false;

    const ack = () => {
      if (settled) return;
      this.channel!.ack(message);
      settled = true;
    };

    const timer = setTimeout(() => {
      if (settled) return;
      this.handleRetry(message, retryCount, new Error('Visibility timeout exceeded'));
    }, this.options.visibilityTimeoutMs);

    try {
      await this.options.onMessage(payload, {
        ack: () => {
          clearTimeout(timer);
          ack();
        },
        retryCount,
        raw: message,
      });

      if (!settled) {
        clearTimeout(timer);
        ack();
      }
    } catch (error) {
      clearTimeout(timer);
      this.handleRetry(message, retryCount, error as Error);
    }
  }

  private handleRetry(message: ConsumeMessage, retryCount: number, error: Error): void {
    if (!this.channel || !this.queueName) {
      return;
    }

    const nextRetryCount = retryCount + 1;
    if (nextRetryCount <= this.options.maxRetries) {
      const delay = this.computeDelay(nextRetryCount);
      const headers = {
        ...(message.properties.headers ?? {}),
        'x-retry-count': nextRetryCount,
        'x-last-error': error.message,
      };

      const publish = () => {
        this.channel!.sendToQueue(this.queueName!, message.content, {
          headers,
          contentType: message.properties.contentType ?? 'application/json',
          persistent: true,
        } as Options.Publish);
        logger.warn('Message requeued for retry', {
          queue: this.queueName,
          retryCount: nextRetryCount,
          delay,
        });
      };

      if (delay > 0) {
        setTimeout(publish, delay);
      } else {
        publish();
      }

      this.channel.ack(message);
      return;
    }

    // Move to DLQ
    const routingKey = getDeadLetterRoutingKey(this.queueName);
    this.channel.publish(DEAD_LETTER_EXCHANGE, routingKey, message.content, {
      headers: {
        ...(message.properties.headers ?? {}),
        'x-last-error': error.message,
        'x-retry-count': retryCount,
      },
      persistent: true,
      contentType: message.properties.contentType ?? 'application/json',
    } as Options.Publish);

    this.channel.ack(message);
    logger.error('Message moved to DLQ', {
      queue: this.queueName,
      routingKey,
      error: error.message,
    });
  }

  private computeDelay(retryCount: number): number {
    const base = this.options.initialRetryDelayMs ?? 1000;
    const multiplier = this.options.backoffMultiplier ?? 2;
    return Math.round(base * Math.pow(multiplier, retryCount - 1));
  }
}
