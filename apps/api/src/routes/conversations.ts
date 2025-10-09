import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
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

router.use(authenticateAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseWithSchema(listQuerySchema, req.query);
    const { tenantId } = req.query;
    const conversations = await prisma.conversation.findMany({
      where: {
        ...(tenantId ? { tenantId: String(tenantId) } : {}),
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
    const payload = parseWithSchema(createConversationSchema.extend({ tenantId: z.string() }), req.body);

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: payload.tenantId,
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
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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

    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
