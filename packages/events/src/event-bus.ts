import { EventEmitter2 } from 'eventemitter2';
import { Event, EventType, createLogger, withRequestContext, createCorrelationId } from '@meta-chat/shared';
import { getPrismaClient } from '@meta-chat/database';

const logger = createLogger('EventBus');

export class EventBus {
  private emitter: EventEmitter2;

  constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
    });
  }

  async emit(event: Omit<Event, 'id'>): Promise<void> {
    const correlationId = event.correlationId ?? event.context?.correlationId ?? createCorrelationId();
    const eventContext = { ...(event.context ?? {}), correlationId };
    const eventWithId: Event = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      correlationId,
      context: eventContext,
    };

    await withRequestContext(
      {
        ...eventContext,
        tenantId: event.tenantId,
        eventType: event.type,
      },
      async () => {
        // Emit to internal listeners
        this.emitter.emit(event.type, eventWithId);
        logger.debug(`Emitted event: ${event.type}`, {
          tenantId: event.tenantId,
          eventId: eventWithId.id,
        });

        // Persist to database
        try {
          const prisma = getPrismaClient();
          await prisma.event.create({
            data: {
              id: eventWithId.id,
              tenantId: event.tenantId,
              type: event.type,
              data: event.data,
              timestamp: event.timestamp,
            },
          });
        } catch (error) {
          logger.error('Failed to persist event', error as Error);
        }
      }
    );
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
}

// Singleton instance
let eventBus: EventBus;

export function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new EventBus();
  }
  return eventBus;
}
