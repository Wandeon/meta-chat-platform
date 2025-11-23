import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
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

// Apply JWT authentication to all tenant routes
router.use(authenticateTenantUser);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userTenantId = req.tenantUser!.tenantId;
    
    // Tenant users can only see their own tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: userTenantId },
    });

    if (!tenant) {
      throw createHttpError(404, 'Tenant not found');
    }

    // Return as array for consistency with previous API
    respondSuccess(res, [tenant]);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Tenant users cannot create new tenants
    throw createHttpError(403, 'Forbidden: Cannot create tenants');
  }),
);

router.get(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const userTenantId = req.tenantUser!.tenantId;

    // Security: users can only access their own tenant
    if (tenantId !== userTenantId) {
      throw createHttpError(403, 'Access denied');
    }

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
    const userTenantId = req.tenantUser!.tenantId;
    const payload = parseWithSchema(updateTenantSchema, req.body);

    // Security: users can only update their own tenant
    if (tenantId !== userTenantId) {
      throw createHttpError(403, 'Access denied');
    }

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      throw createHttpError(404, 'Tenant not found');
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: payload.name ?? existing.name,
        settings: payload.settings ?? existing.settings,
        // Prevent users from changing enabled status
        enabled: existing.enabled,
      },
    });

    respondSuccess(res, tenant);
  }),
);

router.patch(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const userTenantId = req.tenantUser!.tenantId;
    const payload = parseWithSchema(updateTenantSchema, req.body);

    // Security: users can only update their own tenant
    if (tenantId !== userTenantId) {
      throw createHttpError(403, 'Access denied');
    }

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      throw createHttpError(404, 'Tenant not found');
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: payload.name ?? existing.name,
        settings: payload.settings ?? existing.settings,
        // Prevent users from changing enabled status
        enabled: existing.enabled,
      },
    });

    respondSuccess(res, tenant);
  }),
);

router.delete(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    // Tenant users cannot delete tenants
    throw createHttpError(403, 'Forbidden: Cannot delete tenants');
  }),
);

export default router;
