import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const headersSchema = z.record(z.string(), z.string()).default({});

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: headersSchema.optional(),
  enabled: z.boolean().optional(),
});

const updateWebhookSchema = createWebhookSchema.partial();

router.use(authenticateAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.query;
    const webhooks = await prisma.webhook.findMany({
      where: tenantId ? { tenantId: String(tenantId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    respondSuccess(res, webhooks);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createWebhookSchema.extend({ tenantId: z.string() }), req.body);

    const webhook = await prisma.webhook.create({
      data: {
        tenantId: payload.tenantId,
        url: payload.url,
        events: payload.events,
        headers: payload.headers ?? {},
        enabled: payload.enabled ?? true,
      },
    });

    respondCreated(res, webhook);
  }),
);

router.get(
  '/:webhookId',
  asyncHandler(async (req, res) => {
    const { webhookId } = req.params;
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw createHttpError(404, 'Webhook not found');
    }

    respondSuccess(res, webhook);
  }),
);

router.put(
  '/:webhookId',
  asyncHandler(async (req, res) => {
    const { webhookId } = req.params;
    const payload = parseWithSchema(updateWebhookSchema, req.body);

    const existing = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!existing) {
      throw createHttpError(404, 'Webhook not found');
    }

    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        url: payload.url ?? existing.url,
        events: payload.events ?? existing.events,
        headers: payload.headers ?? existing.headers,
        enabled: payload.enabled ?? existing.enabled,
      },
    });

    respondSuccess(res, webhook);
  }),
);

router.delete(
  '/:webhookId',
  asyncHandler(async (req, res) => {
    const { webhookId } = req.params;

    const existing = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!existing) {
      throw createHttpError(404, 'Webhook not found');
    }

    await prisma.webhook.delete({ where: { id: webhookId } });

    respondSuccess(res, { id: webhookId, deleted: true });
  }),
);

export default router;
