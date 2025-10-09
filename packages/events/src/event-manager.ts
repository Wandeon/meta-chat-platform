import { Event, EventType, Logger } from '@meta-chat/shared';
import { getEventBus } from './event-bus';
import { getWebhookEmitter } from './webhook-emitter';

const logger = new Logger('EventManager');

export class EventManager {
  private eventBus = getEventBus();
  private webhookEmitter = getWebhookEmitter();

  async init(): Promise<void> {
    await this.eventBus.init();
    logger.info('Event manager initialized');
  }

  async emit(event: Omit<Event, 'id'>): Promise<void> {
    const emittedEvent = await this.eventBus.emit(event);
    await this.webhookEmitter.emit(emittedEvent);
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
    await this.eventBus.close();
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
