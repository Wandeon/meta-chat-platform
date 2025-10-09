import { Event, EventType, createLogger } from '@meta-chat/shared';
import { getEventBus } from './event-bus';
import { getWebhookEmitter } from './webhook-emitter';
import { getRabbitMQEmitter } from './rabbitmq-emitter';

const logger = createLogger('EventManager');

export class EventManager {
  private eventBus = getEventBus();
  private webhookEmitter = getWebhookEmitter();
  private rabbitmqEmitter = getRabbitMQEmitter();

  async init(): Promise<void> {
    await this.rabbitmqEmitter.init();

    // Subscribe to all events on the bus and forward to external emitters
    this.eventBus.on('*', async (event: Event) => {
      await Promise.allSettled([
        this.webhookEmitter.emit(event),
        this.rabbitmqEmitter.emit(event),
      ]);
    });

    logger.info('Event manager initialized');
  }

  async emit(event: Omit<Event, 'id'>): Promise<void> {
    await this.eventBus.emit(event);
  }

  on(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.eventBus.on(eventType, handler);
  }

  off(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.eventBus.off(eventType, handler);
  }

  once(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.eventBus.once(eventType, handler);
  }

  async getEvents(tenantId: string, type?: EventType, limit?: number): Promise<Event[]> {
    return this.eventBus.getEvents(tenantId, type, limit);
  }

  async close(): Promise<void> {
    await this.rabbitmqEmitter.close();
    logger.info('Event manager closed');
  }
}

// Singleton instance
let eventManager: EventManager;

export function getEventManager(): EventManager {
  if (!eventManager) {
    eventManager = new EventManager();
  }
  return eventManager;
}
