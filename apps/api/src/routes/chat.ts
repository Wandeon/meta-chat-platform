import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const chatRequestSchema = z.object({
  tenantId: z.string(),
  message: z.string().min(1),
  conversationId: z.string().optional().nullable(),
});

router.use(authenticateAdmin);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(chatRequestSchema, req.body);

    // For now, return a simple test response
    // TODO: Integrate with actual LLM providers (OpenAI, Ollama, etc.)
    const response = {
      message: `Echo: ${payload.message}`,
      conversationId: payload.conversationId || `test-conv-${Date.now()}`,
      metadata: {
        model: 'test-model',
        tokens: {
          prompt: 10,
          completion: 5,
          total: 15,
        },
        latency: 100,
      },
    };

    respondSuccess(res, response);
  }),
);

export default router;
