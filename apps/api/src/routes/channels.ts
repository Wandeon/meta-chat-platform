import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenant } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';
import { requireTenant, withTenantScope } from '../utils/tenantScope';

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
    const tenantId = requireTenant(req);

    const channels = await prisma.channel.findMany(
      withTenantScope(tenantId, {
        orderBy: { createdAt: 'desc' },
      }),
    );

    respondSuccess(res, channels);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const tenantId = requireTenant(req);
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
    const tenantId = requireTenant(req);
    const payload = parseWithSchema(updateChannelSchema, req.body);

    const existing = await prisma.channel.findFirst(
      withTenantScope(tenantId, {
        where: { id: channelId },
      }),
    );

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
    const tenantId = requireTenant(req);

    const existing = await prisma.channel.findFirst(
      withTenantScope(tenantId, {
        where: { id: channelId },
      }),
    );

    if (!existing) {
      throw createHttpError(404, 'Channel not found');
    }

    await prisma.channel.delete({ where: { id: channelId } });

    respondSuccess(res, { id: channelId, deleted: true });
  }),
);

export default router;
