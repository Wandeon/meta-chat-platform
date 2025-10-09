import amqp, { Channel, Connection } from 'amqplib';
import { Event, Logger } from '@meta-chat/shared';
import { EVENTS_EXCHANGE, getEventRoutingKey } from './queue-topics';

const logger = new Logger('RabbitMQEmitter');

export class RabbitMQEmitter {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
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
      this.connection = await amqp.connect(url);

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleDisconnect();
      });

      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(EVENTS_EXCHANGE, 'topic', {
        durable: true,
        autoDelete: false,
      });

      logger.info('RabbitMQ connected successfully');
      this.isConnecting = false;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
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
    if (!this.channel) {
      logger.warn('RabbitMQ not connected, skipping event emission');
      return;
    }

    try {
      const routingKey = getEventRoutingKey(event);
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(EVENTS_EXCHANGE, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: event.timestamp.getTime(),
      });

      logger.debug(`Published to RabbitMQ: ${routingKey}`);
    } catch (error) {
      logger.error('Failed to publish event to RabbitMQ', error);
    }
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
