import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenant } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const channelConfigSchema = z.record(z.string(), z.any()).default({});

const createChannelSchema = z.object({
  type: z.enum(['whatsapp', 'messenger', 'webchat']),
  config: channelConfigSchema.optional(),
  enabled: z.boolean().optional(),
});

const updateChannelSchema = createChannelSchema.partial();

router.use(authenticateTenant);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const channels = await prisma.channel.findMany({
      where: { tenantId: req.tenant!.id },
      orderBy: { createdAt: 'desc' },
    });

    respondSuccess(res, channels);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createChannelSchema, req.body);

    const channel = await prisma.channel.create({
      data: {
        tenantId: req.tenant!.id,
        type: payload.type,
        config: payload.config ?? {},
        enabled: payload.enabled ?? true,
      },
    });

    respondCreated(res, channel);
  }),
);

router.put(
  '/:channelId',
  asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const payload = parseWithSchema(updateChannelSchema, req.body);

    const existing = await prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId: req.tenant!.id,
      },
    });

    if (!existing) {
      throw createHttpError(404, 'Channel not found');
    }

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        type: payload.type ?? existing.type,
        config: payload.config ?? existing.config,
        enabled: payload.enabled ?? existing.enabled,
      },
    });

    respondSuccess(res, channel);
  }),
);

router.delete(
  '/:channelId',
  asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const existing = await prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId: req.tenant!.id,
      },
    });

    if (!existing) {
      throw createHttpError(404, 'Channel not found');
    }

    await prisma.channel.delete({ where: { id: channelId } });

    respondSuccess(res, { id: channelId, deleted: true });
  }),
);

export default router;
