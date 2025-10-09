import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { ChannelType, NormalizedMessage, createLogger } from '@meta-chat/shared';
import { TenantQueuePublisher } from '../queues/task-publisher';
import { WebhookAckStrategy } from '../webhooks/ack-strategy';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

const prisma = getPrismaClient();
const logger = createLogger('WebhookIntegrations');

interface IntegrationDependencies {
  publisher: TenantQueuePublisher;
  ackStrategy: WebhookAckStrategy;
}

type RawBodyRequest = Request & { rawBody?: Buffer };

function extractRoute(req: Request): string {
  return `${req.baseUrl}${req.route?.path ?? ''}` || req.originalUrl;
}

function resolveChannelConfig(channel: any): Record<string, any> {
  if (!channel?.config || typeof channel.config !== 'object') {
    return {};
  }

  return channel.config as Record<string, any>;
}

function verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined, secret: string | undefined): boolean {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  const signature = signatureHeader.replace(/^sha256=/, '');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

function normalizeWhatsappMessage(tenantId: string, body: any): NormalizedMessage[] {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const messages: NormalizedMessage[] = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      const incomingMessages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of incomingMessages) {
        const id = message.id ?? randomUUID();
        const from = message.from ?? 'unknown';
        const timestamp = message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date();
        const type = message.type ?? 'text';

        const normalized: NormalizedMessage = {
          id,
          conversationId: `${tenantId}:${from}`,
          externalId: message.id,
          direction: 'inbound',
          from,
          timestamp,
          type,
          content: {
            text: message.text?.body,
            media: message.image || message.audio || message.video || message.document
              ? {
                  url:
                    message.image?.link ||
                    message.audio?.link ||
                    message.video?.link ||
                    message.document?.link ||
                    '',
                  mimeType:
                    message.image?.mime_type ||
                    message.audio?.mime_type ||
                    message.video?.mime_type ||
                    message.document?.mime_type ||
                    'application/octet-stream',
                  filename: message.document?.filename,
                  caption: message.caption ?? message.image?.caption,
                }
              : undefined,
            location: message.location
              ? {
                  latitude: message.location.latitude,
                  longitude: message.location.longitude,
                  name: message.location.name,
                  address: message.location.address,
                }
              : undefined,
          },
          metadata: {
            raw: message,
          },
        };

        messages.push(normalized);
      }
    }
  }

  return messages;
}

function normalizeMessengerMessage(tenantId: string, body: any): NormalizedMessage[] {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const messages: NormalizedMessage[] = [];

  for (const entry of entries) {
    const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const event of messagingEvents) {
      if (!event?.message) {
        continue;
      }

      const message = event.message;
      const id = message.mid ?? randomUUID();
      const from = event.sender?.id ?? 'unknown';
      const timestamp = event.timestamp ? new Date(Number(event.timestamp)) : new Date();
      const attachments = Array.isArray(message.attachments) ? message.attachments : [];

      let type: NormalizedMessage['type'] = 'text';
      const content: NormalizedMessage['content'] = {};

      if (message.text) {
        content.text = message.text;
      }

      if (attachments.length > 0) {
        const attachment = attachments[0];
        if (attachment.type === 'location' && attachment.payload?.coordinates) {
          type = 'location';
          content.location = {
            latitude: attachment.payload.coordinates.lat,
            longitude: attachment.payload.coordinates.long,
          };
        } else if (attachment.payload?.url) {
          type = (attachment.type as NormalizedMessage['type']) ?? 'document';
          content.media = {
            url: attachment.payload.url,
            mimeType: attachment.mime_type ?? 'application/octet-stream',
            filename: attachment.payload.filename,
          };
        }
      }

      const normalized: NormalizedMessage = {
        id,
        conversationId: `${tenantId}:${from}`,
        externalId: message.mid,
        direction: 'inbound',
        from,
        timestamp,
        type,
        content,
        metadata: {
          raw: event,
        },
      };

      messages.push(normalized);
    }
  }

  return messages;
}

async function publishMessages(
  publisher: TenantQueuePublisher,
  tenantId: string,
  channel: ChannelType,
  messages: NormalizedMessage[],
) {
  if (messages.length === 0) {
    return;
  }

  for (const message of messages) {
    await publisher.publish({
      tenantId,
      channel,
      direction: 'inbound',
      body: {
        type: 'message.received',
        message,
      },
    });
  }
}

async function handleWebhook(
  req: RawBodyRequest,
  res: Response,
  tenantId: string,
  channelType: ChannelType,
  deps: IntegrationDependencies,
): Promise<void> {
  const channel = await prisma.channel.findFirst({
    where: {
      tenantId,
      type: channelType,
      enabled: true,
    },
  });

  if (!channel) {
    throw createHttpError(404, 'Channel configuration not found');
  }

  const config = resolveChannelConfig(channel);
  const secret = config.appSecret ?? config.webhookSecret ?? config.verifyToken ?? config.webhookVerifyToken;

  const signatureHeader = (req.get('x-hub-signature-256') ?? req.get('x-hub-signature')) as string | undefined;

  if (!verifySignature(req.rawBody, signatureHeader, secret)) {
    logger.warn('Rejected webhook with invalid signature', {
      tenantId,
      channel: channelType,
      route: extractRoute(req),
    });
    throw createHttpError(401, 'Invalid webhook signature');
  }

  let normalized: NormalizedMessage[] = [];

  if (channelType === 'whatsapp') {
    normalized = normalizeWhatsappMessage(tenantId, req.body);
  } else {
    normalized = normalizeMessengerMessage(tenantId, req.body);
  }

  await deps.ackStrategy.acknowledge(res, {
    tenantId,
    channel: channelType,
    payload: {
      webhookId: channel.id,
      rawPayload: req.body,
    },
  });

  await publishMessages(deps.publisher, tenantId, channelType, normalized).catch((error) => {
    logger.error('Failed to publish normalized message', error);
  });
}

export function createWebhookIntegrationsRouter(deps: IntegrationDependencies): Router {
  const router = Router();

  router.get('/whatsapp/:tenantId', async (req, res, next) => {
    try {
      const { tenantId } = req.params;
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode !== 'subscribe' || typeof token !== 'string') {
        throw createHttpError(400, 'Invalid verification payload');
      }

      const channel = await prisma.channel.findFirst({
        where: { tenantId, type: 'whatsapp' },
      });

      const config = resolveChannelConfig(channel);
      const verifyToken = config.webhookVerifyToken ?? config.verifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN;

      if (!channel || !verifyToken || token !== verifyToken) {
        throw createHttpError(403, 'Verification failed');
      }

      if (typeof challenge === 'string') {
        res.status(200).send(challenge);
        return;
      }

      respondSuccess(res, { verified: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/whatsapp/:tenantId', async (req: RawBodyRequest, res, next) => {
    try {
      await handleWebhook(req, res, req.params.tenantId, 'whatsapp', deps);
    } catch (error) {
      next(error);
    }
  });

  router.get('/messenger/:tenantId', async (req, res, next) => {
    try {
      const { tenantId } = req.params;
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode !== 'subscribe' || typeof token !== 'string') {
        throw createHttpError(400, 'Invalid verification payload');
      }

      const channel = await prisma.channel.findFirst({
        where: { tenantId, type: 'messenger' },
      });

      const config = resolveChannelConfig(channel);
      const verifyToken = config.verifyToken ?? process.env.MESSENGER_VERIFY_TOKEN;

      if (!channel || !verifyToken || token !== verifyToken) {
        throw createHttpError(403, 'Verification failed');
      }

      if (typeof challenge === 'string') {
        res.status(200).send(challenge);
        return;
      }

      respondSuccess(res, { verified: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/messenger/:tenantId', async (req: RawBodyRequest, res, next) => {
    try {
      await handleWebhook(req, res, req.params.tenantId, 'messenger', deps);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function respondSuccess(res: Response, data: unknown): void {
  res.json({ success: true, data });
}
