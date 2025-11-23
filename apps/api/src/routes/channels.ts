import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
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

// Apply JWT authentication to all channel routes
router.use(authenticateTenantUser);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;

    const channels = await prisma.channel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    respondSuccess(res, channels);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    const payload = parseWithSchema(createChannelSchema, req.body);

    const channel = await prisma.channel.create({
      data: {
        tenantId,
        type: payload.type,
        config: payload.config ?? {},
        enabled: payload.enabled ?? true,
      },
    });

    respondCreated(res, channel);
  }),
);

router.patch(
  '/:channelId',
  asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const tenantId = req.tenantUser!.tenantId;
    const payload = parseWithSchema(updateChannelSchema, req.body);

    const existing = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!existing) {
      throw createHttpError(404, 'Channel not found');
    }

    // Verify tenant ownership
    if (existing.tenantId !== tenantId) {
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
    const tenantId = req.tenantUser!.tenantId;

    const existing = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!existing) {
      throw createHttpError(404, 'Channel not found');
    }

    // Verify tenant ownership
    if (existing.tenantId !== tenantId) {
      throw createHttpError(404, 'Channel not found');
    }

    await prisma.channel.delete({ where: { id: channelId } });

    respondSuccess(res, { id: channelId, deleted: true });
  }),
);

export default router;
