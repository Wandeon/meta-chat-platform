import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const tenantSettingsSchema = z.record(z.string(), z.any()).default({});

const createTenantSchema = z.object({
  name: z.string().min(1),
  settings: tenantSettingsSchema.optional(),
  enabled: z.boolean().optional(),
});

const updateTenantSchema = createTenantSchema.partial();

router.use(authenticateAdmin);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    respondSuccess(res, tenants);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createTenantSchema, req.body);

    const tenant = await prisma.tenant.create({
      data: {
        name: payload.name,
        settings: payload.settings ?? {},
        enabled: payload.enabled ?? true,
      },
    });

    respondCreated(res, tenant);
  }),
);

router.get(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      throw createHttpError(404, 'Tenant not found');
    }

    respondSuccess(res, tenant);
  }),
);

router.put(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const payload = parseWithSchema(updateTenantSchema, req.body);

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      throw createHttpError(404, 'Tenant not found');
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: payload.name ?? existing.name,
        settings: payload.settings ?? existing.settings,
        enabled: payload.enabled ?? existing.enabled,
      },
    });

    respondSuccess(res, tenant);
  }),
);

router.patch(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const payload = parseWithSchema(updateTenantSchema, req.body);

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      throw createHttpError(404, 'Tenant not found');
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: payload.name ?? existing.name,
        settings: payload.settings ?? existing.settings,
        enabled: payload.enabled ?? existing.enabled,
      },
    });

    respondSuccess(res, tenant);
  }),
);

export default router;
