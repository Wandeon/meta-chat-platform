import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { asyncHandler, respondSuccess } from '../../utils/http';

const prisma = getPrismaClient();
const router = Router();

/**
 * Public endpoint to fetch widget configuration by widget ID or tenant ID
 * NO AUTHENTICATION REQUIRED - This is publicly accessible for widget installation
 * 
 * GET /api/public/widget/:widgetId/config
 * GET /api/public/widget/config?tenantId=xxx
 */
router.get(
  '/config',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.query;

    if (!tenantId || typeof tenantId !== 'string') {
      throw createHttpError(400, 'tenantId query parameter is required');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        enabled: true,
        widgetConfig: true,
      },
    });

    if (!tenant) {
      throw createHttpError(404, 'Widget configuration not found');
    }

    if (!tenant.enabled) {
      throw createHttpError(403, 'Widget is disabled');
    }

    // Parse widget config from JSONB
    const widgetConfig = tenant.widgetConfig as Record<string, any>;

    // Build the public widget configuration
    const config = {
      widgetId: tenant.id,
      tenantId: tenant.id,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      websocketUrl: process.env.WS_URL || 'ws://localhost:3000/ws',
      initialMessage: widgetConfig.initialMessage || 'Hi! How can I help you today?',
      theme: {
        primaryColor: widgetConfig.primaryColor || '#4f46e5',
        backgroundColor: widgetConfig.backgroundColor || '#ffffff',
        textColor: widgetConfig.textColor || '#0f172a',
        borderRadius: widgetConfig.borderRadius || 12,
        showBranding: widgetConfig.showBranding !== false,
      },
      metadata: {
        brandName: widgetConfig.brandName || tenant.name,
        agentName: widgetConfig.agentName || 'Assistant',
        composerPlaceholder: widgetConfig.composerPlaceholder || 'Type your message...',
        quickReplies: widgetConfig.quickReplies || '',
      },
    };

    respondSuccess(res, config);
  }),
);

router.get(
  '/:widgetId/config',
  asyncHandler(async (req, res) => {
    const { widgetId } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: widgetId },
      select: {
        id: true,
        name: true,
        enabled: true,
        widgetConfig: true,
      },
    });

    if (!tenant) {
      throw createHttpError(404, 'Widget configuration not found');
    }

    if (!tenant.enabled) {
      throw createHttpError(403, 'Widget is disabled');
    }

    // Parse widget config from JSONB
    const widgetConfig = tenant.widgetConfig as Record<string, any>;

    // Build the public widget configuration
    const config = {
      widgetId: tenant.id,
      tenantId: tenant.id,
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      websocketUrl: process.env.WS_URL || 'ws://localhost:3000/ws',
      initialMessage: widgetConfig.initialMessage || 'Hi! How can I help you today?',
      theme: {
        primaryColor: widgetConfig.primaryColor || '#4f46e5',
        backgroundColor: widgetConfig.backgroundColor || '#ffffff',
        textColor: widgetConfig.textColor || '#0f172a',
        borderRadius: widgetConfig.borderRadius || 12,
        showBranding: widgetConfig.showBranding !== false,
      },
      metadata: {
        brandName: widgetConfig.brandName || tenant.name,
        agentName: widgetConfig.agentName || 'Assistant',
        composerPlaceholder: widgetConfig.composerPlaceholder || 'Type your message...',
        quickReplies: widgetConfig.quickReplies || '',
      },
    };

    respondSuccess(res, config);
  }),
);

export default router;
