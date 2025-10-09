import { Event, EventType, Logger } from '@meta-chat/shared';
import { getPrismaClient } from '@meta-chat/database';
import { EventBroker } from './event-broker';
import { getRabbitMQBroker } from './rabbitmq-broker';

const logger = new Logger('EventBus');

type EventHandler = (event: Event) => void | Promise<void>;

class LocalEventCache {
  private readonly enabled: boolean;
  private readonly maxPerTenant: number;
  private readonly store = new Map<string, Event[]>();
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly wildcardHandlers = new Set<EventHandler>();
  private readonly onceWrappers = new Map<EventHandler, { type: string; wrapper: EventHandler }>();

  constructor() {
    const flag = (process.env.EVENTS_ENABLE_LOCAL_CACHE || 'true').toLowerCase();
    this.enabled = flag !== 'false';
    this.maxPerTenant = Number(process.env.EVENTS_CACHE_MAX_EVENTS || 200);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  record(event: Event): void {
    if (!this.enabled) {
      return;
    }

    const events = this.store.get(event.tenantId) ?? [];
    events.unshift(event);
    if (events.length > this.maxPerTenant) {
      events.length = this.maxPerTenant;
    }
    this.store.set(event.tenantId, events);

    this.dispatch(event);
  }

  getEvents(tenantId: string, type?: EventType, limit: number = 100): Event[] {
    if (!this.enabled) {
      return [];
    }

    const events = this.store.get(tenantId) ?? [];
    const filtered = type ? events.filter((event) => event.type === type) : events;
    return filtered.slice(0, limit);
  }

  on(eventType: EventType | string, handler: EventHandler): void {
    if (!this.enabled) {
      logger.debug('Local cache disabled, skipping handler registration', { eventType });
      return;
    }

    if (eventType === '*') {
      this.wildcardHandlers.add(handler);
      return;
    }

    const handlers = this.handlers.get(eventType) ?? new Set<EventHandler>();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);
  }

  once(eventType: EventType | string, handler: EventHandler): void {
    if (!this.enabled) {
      return;
    }

    const wrapper: EventHandler = async (event) => {
      try {
        await handler(event);
      } finally {
        this.off(eventType, handler);
      }
    };

    this.onceWrappers.set(handler, { type: String(eventType), wrapper });
    this.on(eventType, wrapper);
  }

  off(eventType: EventType | string, handler: EventHandler): void {
    if (!this.enabled) {
      return;
    }

    const record = this.onceWrappers.get(handler);
    let targetHandler = handler;

    if (record && (record.type === eventType || eventType === '*')) {
      targetHandler = record.wrapper;
      this.onceWrappers.delete(handler);
    }

    if (eventType === '*') {
      this.wildcardHandlers.delete(targetHandler);
      return;
    }

    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    handlers.delete(targetHandler);

    if (handlers.size === 0) {
      this.handlers.delete(eventType);
    }
  }

  private dispatch(event: Event): void {
    if (!this.enabled) {
      return;
    }

    const wildcard = Array.from(this.wildcardHandlers);
    const specific = Array.from(this.handlers.get(event.type) ?? []);
    const handlers = [...wildcard, ...specific];

    handlers.forEach((handler) => {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error) => logger.error('Local event handler failed', error));
    });
  }
}

export class EventBus {
  private readonly broker: EventBroker;
  private readonly cache: LocalEventCache;

  constructor(broker: EventBroker = getRabbitMQBroker(), cache: LocalEventCache = new LocalEventCache()) {
    this.broker = broker;
    this.cache = cache;
  }

  async init(): Promise<void> {
    await this.broker.init();
  }

  async emit(event: Omit<Event, 'id'>): Promise<Event> {
    const eventWithId: Event = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp),
    };

    logger.debug(`Emitting event: ${eventWithId.type}`, { tenantId: eventWithId.tenantId });

    await this.persistEvent(eventWithId);
    await this.broker.publish(eventWithId);
    this.cache.record(eventWithId);

    return eventWithId;
  }

  on(eventType: EventType | string, handler: EventHandler): void {
    this.cache.on(eventType, handler);
  }

  off(eventType: EventType | string, handler: EventHandler): void {
    this.cache.off(eventType, handler);
  }

  once(eventType: EventType | string, handler: EventHandler): void {
    this.cache.once(eventType, handler);
  }

  async getEvents(tenantId: string, type?: EventType, limit: number = 100): Promise<Event[]> {
    const cached = this.cache.getEvents(tenantId, type, limit);
    if (cached.length > 0) {
      return cached;
    }

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
    await this.broker.close();
  }

  private async persistEvent(event: Event): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.event.create({
        data: {
          id: event.id,
          tenantId: event.tenantId,
          type: event.type,
          data: event.data,
          timestamp: event.timestamp,
        },
      });
    } catch (error) {
      logger.error('Failed to persist event', error);
    }
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
