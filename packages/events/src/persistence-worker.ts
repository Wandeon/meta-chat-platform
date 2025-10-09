import { getPrismaClient } from '@meta-chat/database';
import { Event, Logger } from '@meta-chat/shared';

interface QueueItem {
  event: Event;
  attempts: number;
}

export class EventPersistenceWorker {
  private readonly logger = new Logger('EventPersistenceWorker');
  private readonly queue: QueueItem[] = [];
  private readonly waitingResolvers: Array<(value: QueueItem | null) => void> = [];
  private readonly processor: Promise<void>;

  private running = true;
  private readonly maxAttempts = 5;
  private readonly baseBackoffMs = 1000;
  private readonly maxBackoffMs = 30000;
  private readonly backlogWarningThreshold = 200;

  constructor() {
    this.processor = this.processLoop();
  }

  enqueue(event: Event): void {
    const item: QueueItem = { event, attempts: 0 };
    this.pushItem(item);
  }

  async stop(): Promise<void> {
    this.running = false;

    // Resolve any pending waits so the processor can exit.
    while (this.waitingResolvers.length) {
      const resolve = this.waitingResolvers.shift();
      if (resolve) {
        resolve(null);
      }
    }

    await this.processor;
  }

  private pushItem(item: QueueItem): void {
    if (this.waitingResolvers.length > 0) {
      const resolve = this.waitingResolvers.shift();
      if (resolve) {
        resolve(item);
      }
      return;
    }

    this.queue.push(item);

    if (this.queue.length > this.backlogWarningThreshold) {
      this.logger.warn('Event persistence backlog detected', {
        backlogSize: this.queue.length,
      });
    }
  }

  private async processLoop(): Promise<void> {
    while (this.running || this.queue.length > 0) {
      const item = await this.nextItem();
      if (!item) {
        continue;
      }

      await this.persistWithRetry(item);
    }
  }

  private async nextItem(): Promise<QueueItem | null> {
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    if (!this.running) {
      return null;
    }

    return new Promise((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  private async persistWithRetry(item: QueueItem): Promise<void> {
    const prisma = getPrismaClient();

    while (item.attempts < this.maxAttempts) {
      try {
        await prisma.event.create({
          data: {
            id: item.event.id,
            tenantId: item.event.tenantId,
            type: item.event.type,
            data: item.event.data,
            timestamp: item.event.timestamp,
          },
        });

        if (item.attempts > 0) {
          this.logger.info('Event persisted after retries', {
            eventId: item.event.id,
            attempts: item.attempts + 1,
          });
        }

        return;
      } catch (error) {
        item.attempts += 1;

        if (item.attempts >= this.maxAttempts) {
          this.logger.error('Failed to persist event after maximum retries', {
            eventId: item.event.id,
            attempts: item.attempts,
            error: error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
          });
          return;
        }

        const delayMs = Math.min(
          this.baseBackoffMs * 2 ** (item.attempts - 1),
          this.maxBackoffMs,
        );

        this.logger.warn('Event persistence failed, scheduling retry', {
          eventId: item.event.id,
          attempt: item.attempts,
          delayMs,
          error: error instanceof Error
            ? { message: error.message }
            : error,
        });

        this.scheduleRetry(item, delayMs);
        return;
      }
    }
  }

  private scheduleRetry(item: QueueItem, delayMs: number): void {
    setTimeout(() => {
      if (!this.running) {
        return;
      }

      this.pushItem(item);
    }, delayMs);
  }
}
