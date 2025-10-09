import axios, { AxiosInstance } from 'axios';
import {
  Event,
  EventType,
  WebhookPayload,
  retry,
  createLogger,
  withRequestContext,
  getRequestContext,
} from '@meta-chat/shared';
import { getPrismaClient } from '@meta-chat/database';

const logger = createLogger('WebhookEmitter');

export class WebhookEmitter {
  private httpClient: AxiosInstance;
  private maxRetries: number;
  private initialDelay: number;

  constructor() {
    this.httpClient = axios.create({
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000'),
    });

    this.maxRetries = parseInt(process.env.WEBHOOK_RETRY_MAX_ATTEMPTS || '5');
    this.initialDelay = parseInt(process.env.WEBHOOK_RETRY_INITIAL_DELAY_MS || '1000');
  }

  async emit(event: Event): Promise<void> {
    const prisma = getPrismaClient();

    // Fetch webhooks for this tenant and event type
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId: event.tenantId,
        enabled: true,
        events: {
          has: event.type,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (webhooks.length === 0) {
      return;
    }

    // Emit to all webhooks in parallel
    const promises = webhooks.map((webhook: any) =>
      this.sendWebhook(webhook, event).catch(error => {
        logger.error(`Webhook delivery failed: ${webhook.url}`, error as Error);
      })
    );

    await Promise.allSettled(promises);
  }

  private async sendWebhook(webhook: any, event: Event): Promise<void> {
    return withRequestContext({ webhookUrl: webhook.url }, async () => {
      const payload: WebhookPayload = {
        event: event.type as EventType,
        tenant: {
          id: webhook.tenant.id,
          name: webhook.tenant.name,
        },
        data: event.data,
        timestamp: event.timestamp.toISOString(),
      };

      const requestContext = getRequestContext();
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'MetaChat-Webhook/1.0',
        'X-Webhook-Event': event.type,
        'X-Webhook-Id': event.id,
        'X-Webhook-Timestamp': event.timestamp.toISOString(),
        ...(requestContext.correlationId
          ? { 'X-Correlation-Id': requestContext.correlationId }
          : {}),
        ...(typeof webhook.headers === 'object' ? webhook.headers : {}),
      };

      await retry(
        async () => {
          const response = await this.httpClient.post(webhook.url, payload, { headers });

          if (response.status < 200 || response.status >= 300) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          logger.debug(`Webhook delivered: ${webhook.url}`, {
            event: event.type,
            status: response.status,
          });
        },
        this.maxRetries,
        this.initialDelay
      );
    });
  }
}

// Singleton instance
let webhookEmitter: WebhookEmitter;

export function getWebhookEmitter(): WebhookEmitter {
  if (!webhookEmitter) {
    webhookEmitter = new WebhookEmitter();
  }
  return webhookEmitter;
}
