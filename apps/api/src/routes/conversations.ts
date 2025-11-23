import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  channelType: z.enum(['whatsapp', 'messenger', 'webchat']).optional(),
  userId: z.string().optional(),
});

const createConversationSchema = z.object({
  channelType: z.enum(['whatsapp', 'messenger', 'webchat']),
  externalId: z.string().min(1),
  userId: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateConversationSchema = z.object({
  status: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Apply JWT authentication to all conversation routes
router.use(authenticateTenantUser);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseWithSchema(listQuerySchema, req.query);
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;
    
    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.channelType ? { channelType: query.channelType } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    respondSuccess(res, conversations);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createConversationSchema, req.body);
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenantId,
        channelType: payload.channelType,
        externalId: payload.externalId,
        userId: payload.userId,
        metadata: payload.metadata ?? {},
      },
    });

    respondCreated(res, conversation);
  }),
);

router.get(
  '/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;

    // Use findFirst with tenantId to enforce tenant isolation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: tenantId,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) {
      throw createHttpError(404, 'Conversation not found');
    }

    respondSuccess(res, conversation);
  }),
);

router.put(
  '/:conversationId',
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const payload = parseWithSchema(updateConversationSchema, req.body);
    // Use authenticated user's tenantId
    const tenantId = req.tenantUser!.tenantId;

    // Use findFirst with tenantId to enforce tenant isolation
    const existing = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: tenantId,
      },
    });

    if (!existing) {
      throw createHttpError(404, 'Conversation not found');
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: payload.status ?? existing.status,
        metadata: payload.metadata ?? existing.metadata,
      },
    });

    respondSuccess(res, conversation);
  }),
);

export default router;
