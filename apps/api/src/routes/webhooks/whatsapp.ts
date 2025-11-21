import { Router, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';
import { createHmac, timingSafeEqual } from 'crypto';

const prisma = getPrismaClient();
const logger = createLogger('WhatsAppWebhook');
const router = Router();

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Resolve channel configuration from database
 */
function resolveChannelConfig(channel: any): Record<string, any> {
  if (!channel?.config || typeof channel.config !== 'object') {
    return {};
  }
  return channel.config as Record<string, any>;
}

/**
 * Verify webhook signature using X-Hub-Signature-256 header
 */
function verifySignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string | undefined
): boolean {
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

/**
 * GET /api/webhooks/whatsapp/:channelId
 * Handle WhatsApp webhook verification (hub.mode=subscribe)
 */
router.get('/:channelId', async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('WhatsApp webhook verification requested', {
      channelId,
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge,
    });

    if (mode !== 'subscribe' || typeof token !== 'string') {
      throw createHttpError(400, 'Invalid verification payload');
    }

    // Find channel by ID
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || channel.type !== 'whatsapp') {
      throw createHttpError(404, 'WhatsApp channel not found');
    }

    // Get verify token from channel config or environment
    const config = resolveChannelConfig(channel);
    const verifyToken =
      config.webhookVerifyToken ??
      config.verifyToken ??
      config.whatsapp?.webhookVerifyToken ??
      process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken || token !== verifyToken) {
      logger.warn('WhatsApp webhook verification failed', {
        channelId,
        hasConfigToken: !!verifyToken,
        tokenMatch: token === verifyToken,
      });
      throw createHttpError(403, 'Verification failed');
    }

    // Return challenge to complete verification
    if (typeof challenge === 'string') {
      logger.info('WhatsApp webhook verified successfully', { channelId });
      res.status(200).send(challenge);
      return;
    }

    res.status(200).json({ success: true, verified: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/webhooks/whatsapp/:channelId
 * Handle incoming WhatsApp messages and events
 */
router.post('/:channelId', async (req: RawBodyRequest, res, next) => {
  try {
    const { channelId } = req.params;

    logger.info('WhatsApp webhook received', {
      channelId,
      hasBody: !!req.body,
      hasRawBody: !!req.rawBody,
    });

    // Find channel by ID
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || channel.type !== 'whatsapp') {
      throw createHttpError(404, 'WhatsApp channel not found');
    }

    if (!channel.enabled) {
      throw createHttpError(403, 'WhatsApp channel is disabled');
    }

    // Get app secret for signature verification
    const config = resolveChannelConfig(channel);
    const appSecret =
      config.appSecret ??
      config.webhookSecret ??
      config.whatsapp?.appSecret ??
      process.env.WHATSAPP_APP_SECRET;

    // Verify webhook signature
    const signatureHeader = (req.get('x-hub-signature-256') ?? req.get('x-hub-signature')) as string | undefined;

    if (!verifySignature(req.rawBody, signatureHeader, appSecret)) {
      logger.warn('WhatsApp webhook signature verification failed', {
        channelId,
        hasSignature: !!signatureHeader,
        hasSecret: !!appSecret,
        hasRawBody: !!req.rawBody,
      });
      throw createHttpError(401, 'Invalid webhook signature');
    }

    // Log the webhook payload for debugging
    logger.info('WhatsApp webhook authenticated', {
      channelId,
      tenantId: channel.tenantId,
      object: req.body?.object,
      entryCount: req.body?.entry?.length ?? 0,
    });

    // Process webhook payload
    const body = req.body;
    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        const messages = Array.isArray(value?.messages) ? value.messages : [];

        logger.info('WhatsApp messages received', {
          channelId,
          tenantId: channel.tenantId,
          messageCount: messages.length,
          phoneNumberId: value?.metadata?.phone_number_id,
        });

        // Store webhook events in database for processing
        for (const message of messages) {
          await prisma.webhookEvent.create({
            data: {
              tenantId: channel.tenantId,
              channelId: channel.id,
              source: 'whatsapp',
              eventType: 'message.received',
              payload: {
                message,
                metadata: value?.metadata,
                contacts: value?.contacts,
              },
              status: 'pending',
            },
          });
        }
      }
    }

    // Return 200 OK immediately (async processing)
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
