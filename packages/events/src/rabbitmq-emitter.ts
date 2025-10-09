import { connect as connectToRabbitMQ, Channel, ChannelModel } from 'amqplib';
import { Event, createLogger, withRequestContext } from '@meta-chat/shared';

const logger = createLogger('RabbitMQEmitter');

export class RabbitMQEmitter {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private exchangeName: string = 'metachat.events';
  private reconnectDelay: number = 5000;
  private isConnecting: boolean = false;

  async init(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      logger.warn('RABBITMQ_URL not configured, skipping RabbitMQ initialization');
      return;
    }

    await this.connect(url);
  }

  private async connect(url: string): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const connection = await connectToRabbitMQ(url);
      this.connection = connection;

      connection.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error', err);
        this.handleDisconnect();
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleDisconnect();
      });

      const channel = await connection.createChannel();
      this.channel = channel;

      await channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
        autoDelete: false,
      });

      logger.info('RabbitMQ connected successfully');
      this.isConnecting = false;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error as Error);
      this.isConnecting = false;
      this.handleDisconnect();
    }
  }

  private handleDisconnect(): void {
    this.connection = null;
    this.channel = null;

    setTimeout(() => {
      const url = process.env.RABBITMQ_URL;
      if (url) {
        logger.info('Attempting to reconnect to RabbitMQ');
        this.connect(url);
      }
    }, this.reconnectDelay);
  }

  async emit(event: Event): Promise<void> {
    const channel = this.channel;

    if (!channel) {
      logger.warn('RabbitMQ not connected, skipping event emission');
      return;
    }

    const routingKey = `${event.tenantId}.${event.type.replace(/_/g, '.')}`;

    await withRequestContext({ routingKey }, async () => {
      try {
        const message = Buffer.from(JSON.stringify(event));

        channel.publish(this.exchangeName, routingKey, message, {
          persistent: true,
          contentType: 'application/json',
          timestamp: event.timestamp.getTime(),
        });

        logger.debug(`Published to RabbitMQ: ${routingKey}`, {
          eventId: event.id,
        });
      } catch (error) {
        logger.error('Failed to publish event to RabbitMQ', error as Error);
      }
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

    logger.info('RabbitMQ connection closed');
  }
}

// Singleton instance
let rabbitmqEmitter: RabbitMQEmitter;

export function getRabbitMQEmitter(): RabbitMQEmitter {
  if (!rabbitmqEmitter) {
    rabbitmqEmitter = new RabbitMQEmitter();
  }
  return rabbitmqEmitter;
}
