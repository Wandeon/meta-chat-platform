import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, respondSuccess } from '../utils/http';

const router = Router();

router.use(authenticateAdmin);

/**
 * GET /api/ollama/openai-models
 * Fetch available models from OpenAI API
 */
router.get(
  '/openai-models',
  asyncHandler(async (req, res) => {
    const { apiKey } = req.query;

    console.log('[OpenAI Models] Request received:', {
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? String(apiKey).substring(0, 10) : 'none',
    });

    if (!apiKey || typeof apiKey !== 'string') {
      console.log('[OpenAI Models] No API key provided, returning defaults');
      // Return default models if no API key provided
      return respondSuccess(res, {
        models: [
          { id: 'gpt-4o', name: 'GPT-4o (Best, ~$2.50/1M tokens)', created: Date.now() },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast, ~$0.15/1M tokens)', created: Date.now() },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', created: Date.now() },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cheapest)', created: Date.now() },
          { id: 'o1', name: 'o1 (Reasoning)', created: Date.now() },
          { id: 'o1-mini', name: 'o1-mini (Reasoning, Fast)', created: Date.now() },
        ],
      });
    }

    console.log('[OpenAI Models] Fetching from OpenAI API...');
    try {
      // Fetch models from OpenAI API with 10 second timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      console.log('[OpenAI Models] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAI] Failed to fetch models: ${response.status} ${response.statusText}`, errorText);
        // Return default models on error
        return respondSuccess(res, {
          models: [
            { id: 'gpt-4o', name: 'GPT-4o (Best)', created: Date.now() },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)', created: Date.now() },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', created: Date.now() },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', created: Date.now() },
            { id: 'o1', name: 'o1 (Reasoning)', created: Date.now() },
            { id: 'o1-mini', name: 'o1-mini (Reasoning)', created: Date.now() },
          ],
        });
      }

      const data: any = await response.json();

      console.log('[OpenAI Models] Total models from API:', data.data?.length || 0);

      // Filter to only chat completion models
      const chatModels = (data.data || [])
        .filter((model: any) => {
          const id = model.id.toLowerCase();
          return (
            id.includes('gpt') ||
            id.includes('o1') ||
            id.includes('chatgpt')
          );
        })
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          created: model.created,
        }))
        .sort((a: any, b: any) => b.created - a.created); // Sort by newest first

      console.log('[OpenAI Models] Chat models after filtering:', chatModels.length);
      console.log('[OpenAI Models] Models:', chatModels.slice(0, 10).map((m: any) => m.id).join(', '));

      respondSuccess(res, { models: chatModels });
    } catch (error: any) {
      console.error('[OpenAI] Error fetching models:', error.message);
      // Return default models on error
      respondSuccess(res, {
        models: [
          { id: 'gpt-4o', name: 'GPT-4o', created: Date.now() },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', created: Date.now() },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', created: Date.now() },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', created: Date.now() },
          { id: 'o1', name: 'o1', created: Date.now() },
          { id: 'o1-mini', name: 'o1-mini', created: Date.now() },
        ],
      });
    }
  }),
);

/**
 * GET /api/ollama/models
 * Fetch available models from Ollama server
 */
router.get(
  '/models',
  asyncHandler(async (req, res) => {
    const { baseUrl } = req.query;

    if (!baseUrl || typeof baseUrl !== 'string') {
      return respondSuccess(res, { models: [] });
    }

    try {
      // Fetch models from Ollama API
      const response = await fetch(`${baseUrl}/api/tags`);

      if (!response.ok) {
        console.error(`[Ollama] Failed to fetch models from ${baseUrl}: ${response.statusText}`);
        return respondSuccess(res, { models: [] });
      }

      const data: any = await response.json();

      // Extract model names and format them
      const models = (data.models || []).map((model: any) => ({
        name: model.name || model.model,
        size: model.size,
        modified: model.modified_at,
        details: model.details,
      }));

      respondSuccess(res, { models });
    } catch (error: any) {
      console.error('[Ollama] Error fetching models:', error.message);
      respondSuccess(res, { models: [] });
    }
  }),
);

export default router;
