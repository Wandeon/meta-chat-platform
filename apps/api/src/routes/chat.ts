import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondSuccess } from '../utils/http';
import { z } from 'zod';
import createHttpError from 'http-errors';

const prisma = getPrismaClient();
const router = Router();

const chatRequestSchema = z.object({
  tenantId: z.string(),
  message: z.string().min(1),
  conversationId: z.string().optional().nullable(),
});

router.use(authenticateAdmin);

async function callOllama(baseUrl: string, model: string, messages: any[], systemPrompt?: string) {
  const startTime = Date.now();

  const ollamaMessages = [];
  if (systemPrompt) {
    ollamaMessages.push({ role: 'system', content: systemPrompt });
  }
  ollamaMessages.push(...messages);

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  const latency = Date.now() - startTime;

  return {
    message: data.message?.content || '',
    metadata: {
      model,
      tokens: {
        prompt: data.prompt_eval_count || 0,
        completion: data.eval_count || 0,
        total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      latency,
    },
  };
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(chatRequestSchema, req.body);

    // Fetch tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
    });

    if (!tenant) {
      throw createHttpError(404, 'Tenant not found');
    }

    const settings = tenant.settings as any;
    const llmConfig = settings?.llm || {};
    const provider = llmConfig.provider || 'openai';
    const model = llmConfig.model || 'gpt-4o';
    const baseUrl = llmConfig.baseUrl;
    const systemPrompt = llmConfig.systemPrompt;

    // Build messages array
    const messages = [{ role: 'user', content: payload.message }];

    let result;

    if (provider === 'ollama') {
      if (!baseUrl) {
        throw createHttpError(400, 'Ollama baseUrl not configured for this tenant');
      }
      result = await callOllama(baseUrl, model, messages, systemPrompt);
    } else {
      // For now, return an error for unsupported providers
      throw createHttpError(501, `Provider '${provider}' not yet implemented. Currently only Ollama is supported.`);
    }

    const response = {
      message: result.message,
      conversationId: payload.conversationId || `conv-${Date.now()}`,
      metadata: result.metadata,
    };

    respondSuccess(res, response);
  }),
);

export default router;
