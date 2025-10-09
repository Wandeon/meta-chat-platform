import { Channel, ChannelModel, connect } from 'amqplib';
import { Event, Logger } from '@meta-chat/shared';
import { EventBroker } from './event-broker';

const logger = new Logger('RabbitMQBroker');

export class RabbitMQBroker implements EventBroker {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private exchangeName: string = process.env.RABBITMQ_EXCHANGE || 'metachat.events';
  private reconnectDelay: number = Number(process.env.RABBITMQ_RECONNECT_DELAY_MS || 5000);
  private isConnecting: boolean = false;
  private url: string | null = null;

  async init(): Promise<void> {
    const url = process.env.RABBITMQ_URL;

    if (!url) {
      logger.warn('RABBITMQ_URL not configured, skipping RabbitMQ initialization');
      return;
    }

    this.url = url;
    await this.connect(url);
  }

  private async connect(url: string): Promise<void> {
    if (this.isConnecting || this.channel) {
      return;
    }
    this.isConnecting = true;

    try {
      const connection: ChannelModel = await connect(url);
      this.connection = connection;

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.handleDisconnect();
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleDisconnect();
      });

      this.channel = await connection.createChannel();

      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
        autoDelete: false,
      });

      logger.info('RabbitMQ connected successfully');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', error);
      this.handleDisconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private handleDisconnect(): void {
    this.channel = null;

    const { connection } = this;
    if (connection) {
      connection.removeAllListeners();
      this.connection = null;
    }

    if (!this.url) {
      return;
    }

    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ');
      this.connect(this.url!);
    }, this.reconnectDelay);
  }

  async publish(event: Event): Promise<void> {
    if (!this.channel) {
      logger.warn('RabbitMQ not connected, skipping event publish');
      return;
    }

    try {
      const routingKey = `${event.tenantId}.${event.type.replace(/_/g, '.')}`;
      const message = Buffer.from(JSON.stringify(event));

      this.channel.publish(this.exchangeName, routingKey, message, {
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
let rabbitmqBroker: RabbitMQBroker;

export function getRabbitMQBroker(): RabbitMQBroker {
  if (!rabbitmqBroker) {
    rabbitmqBroker = new RabbitMQBroker();
  }
  return rabbitmqBroker;
}
