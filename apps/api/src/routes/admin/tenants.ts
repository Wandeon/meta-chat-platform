import { Router } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '@meta-chat/database';
import { asyncHandler, respondSuccess } from '../../utils/http';

const prisma = getPrismaClient();
const router = Router();

// Schema for updating tenant - whitelist allowed fields
const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subscriptionStatus: z.enum(['active', 'inactive', 'trial', 'suspended']).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          select: { email: true, name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit results
    });
    respondSuccess(res, tenants);
  }),
);

router.patch(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    
    // Validate tenant exists
    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    
    // Validate and whitelist input fields
    const parseResult = updateTenantSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parseResult.error.issues });
    }
    
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: parseResult.data,
    });
    respondSuccess(res, tenant);
  }),
);

export default router;
