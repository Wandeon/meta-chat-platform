import { EventEmitter2 } from 'eventemitter2';
import { Event, EventType, Logger } from '@meta-chat/shared';
import { getPrismaClient } from '@meta-chat/database';
import { EventPersistenceWorker } from './persistence-worker';

const logger = new Logger('EventBus');

export class EventBus {
  private emitter: EventEmitter2;
  private persistenceWorker: EventPersistenceWorker;

  constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
    });
    this.persistenceWorker = new EventPersistenceWorker();
  }

  async emit(event: Omit<Event, 'id'>): Promise<void> {
    const eventWithId: Event = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Emit to internal listeners
    this.emitter.emit(event.type, eventWithId);
    logger.debug(`Emitted event: ${event.type}`, { tenantId: event.tenantId });

    // Queue for asynchronous persistence
    this.persistenceWorker.enqueue(eventWithId);
  }

  on(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.emitter.on(eventType, handler);
  }

  off(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.emitter.off(eventType, handler);
  }

  once(eventType: EventType | string, handler: (event: Event) => void | Promise<void>): void {
    this.emitter.once(eventType, handler);
  }

  // Get event history from database
  async getEvents(tenantId: string, type?: EventType, limit: number = 100): Promise<Event[]> {
    const prisma = getPrismaClient();

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        ...(type && { type }),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events as Event[];
  }

  async close(): Promise<void> {
    await this.persistenceWorker.stop();
  }
}

// Singleton instance
let eventBus: EventBus;

export function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new EventBus();
  }
  return eventBus;
}
