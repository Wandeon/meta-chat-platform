import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdminOrTenant } from '../middleware/auth';
import { authenticateTenantUser } from '../middleware/authenticateTenantUser';
import { asyncHandler, parseWithSchema, respondSuccess } from '../utils/http';
import { z } from 'zod';
import createHttpError from 'http-errors';
import { searchSimilarChunks } from '../services/vectorSearch';
import { getEmbeddingConfig } from '../services/documentProcessor';
import { getAvailableMcpTools, executeMcpTool } from '../services/mcpClient';
import { callLlm, LlmMessage, LlmConfig } from '../services/llmProviders';
import {
  ConfidenceAnalyzer,
  EscalationEngine,
  EscalationAction,
  buildEscalationConfigFromTenant,
  isConfidenceEscalationEnabled
} from '@meta-chat/orchestrator';
import { chatLimiter } from '../middleware/rateLimiting';
import { AnalyticsService } from '../services/AnalyticsService';

const prisma = getPrismaClient();
const router = Router();
const analyticsService = new AnalyticsService(prisma);

const chatRequestSchema = z.object({
  tenantId: z.string(),
  message: z.string().min(1),
  conversationId: z.string().optional().nullable(),
});

// Combined auth middleware: supports both JWT (dashboard) and API key (widget)
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // If Bearer token is present, use JWT auth
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateTenantUser(req, res, (err?: any) => {
      if (err) {
        // JWT auth failed, try API key auth as fallback
        return authenticateAdminOrTenant(req, res, next);
      }
      // JWT auth succeeded - set tenant context from tenantUser
      if (req.tenantUser?.tenantId) {
        req.tenant = { id: req.tenantUser.tenantId, apiKeyId: 'jwt' };
      }
      return next();
    });
  }

  // No Bearer token, use API key auth
  return authenticateAdminOrTenant(req, res, next);
});
router.use(chatLimiter);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(chatRequestSchema, req.body);

    // If authenticated with a tenant API key (not admin), verify tenant ID matches
    if (req.tenant && !req.adminUser && req.tenant.id !== payload.tenantId) {
      throw createHttpError(403, 'Tenant ID mismatch: you can only access your own tenant');
    }

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
    const apiKey = llmConfig.apiKey;
    const baseUrl = llmConfig.baseUrl;
    let systemPrompt = llmConfig.systemPrompt || '';
    const enableRag = settings?.enableRag || false;
    const ragConfig = settings?.ragConfig || {};
    const enabledMcpServers = settings?.enabledMcpServers || [];

    // Create or find conversation
    let conversation;
    if (payload.conversationId) {
      // Use findFirst with tenantId to enforce tenant isolation
      conversation = await prisma.conversation.findFirst({
        where: {
          id: payload.conversationId,
          tenantId: payload.tenantId,
        },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
            take: 20, // Load last 20 messages for context
          },
        },
      });

      // If conversation exists but doesn't belong to this tenant, treat as not found
      if (!conversation && payload.conversationId) {
        throw createHttpError(404, 'Conversation not found or does not belong to this tenant');
      }
    }

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          tenantId: payload.tenantId,
          channelType: 'webchat',
          externalId: payload.conversationId || `web-${Date.now()}`,
          userId: req.tenant?.id || req.adminUser?.id || 'anonymous',
          status: 'active',
        },
        include: {
          messages: true,
        },
      });
    }

    // If RAG is enabled, search for relevant context
    let contextUsed = false;
    let searchResults: any[] = [];
    if (enableRag) {
      try {
        const embeddingConfig = await getEmbeddingConfig(payload.tenantId);

        // Import generateQueryEmbedding
        const { generateQueryEmbedding } = await import('../services/embedding');

        // Generate embedding for the user's query
        const queryEmbedding = await generateQueryEmbedding(payload.message, embeddingConfig);

        // Search for similar chunks using the pgvector implementation
        const ragTopK = ragConfig.topK || 5;
        const ragMinSimilarity = ragConfig.minSimilarity || 0.7;

        searchResults = await searchSimilarChunks(
          payload.tenantId,
          queryEmbedding,
          {
            limit: ragTopK,
            minSimilarity: ragMinSimilarity,
            useHybridSearch: true,
            keywordQuery: payload.message
          }
        );

        if (searchResults.length > 0) {
          contextUsed = true;

          // Build context string from search results
          const contextText = searchResults
            .map((result, idx) => {
              const similarity = (result.similarity * 100).toFixed(1);
              return `[Document ${idx + 1}] (Similarity: ${similarity}%)\nSource: ${result.document?.title || 'Unknown'}\n${result.content}`;
            })
            .join('\n\n');

          // Prepend context to system prompt
          const ragPrompt = `You are a helpful assistant. Use the following context from the knowledge base to answer questions accurately. If the context doesn't contain relevant information, you can still provide a helpful response based on your general knowledge, but mention that it's not from the knowledge base.

CONTEXT FROM KNOWLEDGE BASE:
${contextText}

---

Now answer the user's question using this context when relevant.`;

          systemPrompt = ragPrompt + (systemPrompt ? '\n\n' + systemPrompt : '');

          console.log('[RAG] Retrieved context:', {
            chunks: searchResults.length,
            topSimilarity: searchResults[0]?.similarity,
            hybridSearch: true
          });
        } else {
          console.log('[RAG] No relevant context found');
        }
      } catch (error) {
        console.error("[RAG] Error during RAG retrieval:", error);
        // Continue without RAG if embedding or search fails
      }
    }
    const messages: LlmMessage[] = [];


    // Add system prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history (last 20 messages)
    if (conversation.messages && conversation.messages.length > 0) {
      for (const msg of conversation.messages) {
        const role = msg.direction === 'inbound' ? 'user' : 'assistant';
        const content = typeof msg.content === 'object' ? (msg.content as any).text || '' : String(msg.content);
        messages.push({ role, content });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: payload.message });

    // Get available MCP tools
    const mcpToolServers = enabledMcpServers.length > 0
      ? await getAvailableMcpTools(payload.tenantId)
      : [];
    const allTools = mcpToolServers.flatMap((s) => s.tools);
    const hasTools = allTools.length > 0;

    // ============= CONFIDENCE ESCALATION SETUP =============

    // Check if confidence escalation is enabled for this tenant
    const enableConfidenceEscalation = isConfidenceEscalationEnabled(settings);
    const escalationConfig = enableConfidenceEscalation
      ? buildEscalationConfigFromTenant(settings)
      : undefined;

    let confidenceAnalyzer: ConfidenceAnalyzer | undefined;
    let escalationEngine: EscalationEngine | undefined;

    if (enableConfidenceEscalation && escalationConfig) {
      confidenceAnalyzer = new ConfidenceAnalyzer();
      escalationEngine = new EscalationEngine(escalationConfig);
    }

    // ============= SMART ROUTER LOGIC =============

    let result;
    let toolsUsed = false;

    // If tools are available, use OpenAI/DeepSeek (they support function calling)
    // If no tools or provider is Ollama, use configured provider
    const shouldUseFunctionCalling = hasTools && (provider === 'openai' || provider === 'deepseek');

    if (shouldUseFunctionCalling) {
      // Use OpenAI/DeepSeek with function calling
      const llmConfigWithTools: LlmConfig = {
        provider: provider as 'openai' | 'deepseek',
        model,
        apiKey,
        baseUrl,
        temperature: llmConfig.temperature ?? 0.7,
        maxTokens: llmConfig.maxTokens ?? 2000,
      };

      // First call: Let LLM decide if it needs tools
      const firstResponse = await callLlm(llmConfigWithTools, messages, allTools);

      if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
        // Tools needed! Send quick Ollama response first if available
        if (provider === 'ollama' && baseUrl) {
          try {
            const quickResponse = await callLlm(
              { provider: 'ollama', model, baseUrl, temperature: 0.7 },
              [
                { role: 'system', content: 'You are a helpful assistant. Tell the user you are checking their request and will get back to them shortly. Be brief and friendly.' },
                { role: 'user', content: `A user asked: "${payload.message}". Quickly acknowledge you are checking this for them.` },
              ]
            );

            // Send quick acknowledgment to user (not saving to DB yet)
            console.log(`[Chat] Quick response: ${quickResponse.message}`);
          } catch (error) {
            console.error('[Chat] Failed to send quick response:', error);
          }
        }

        // Execute tool calls
        console.log(`[Chat] Executing ${firstResponse.toolCalls.length} tool calls`);
        toolsUsed = true;

        for (const toolCall of firstResponse.toolCalls) {
          // Find which server has this tool
          const serverWithTool = mcpToolServers.find((s) =>
            s.tools.some((t) => t.name === toolCall.name)
          );

          if (serverWithTool) {
            const toolResult = await executeMcpTool(
              serverWithTool.connectionKey,
              toolCall.name,
              toolCall.arguments
            );

            // Add tool result to messages
            messages.push({
              role: 'tool',
              content: toolResult.content,
              name: toolCall.name,
              tool_call_id: toolCall.id,
            });
          }
        }

        // Second call: Get final response with tool results
        result = await callLlm(llmConfigWithTools, messages);
      } else {
        // No tools needed, use first response
        result = firstResponse;
      }
    } else {
      // No tools or Ollama - use configured provider without function calling
      const llmConfigNoTools: LlmConfig = {
        provider: provider as 'openai' | 'deepseek' | 'ollama',
        model,
        apiKey,
        baseUrl,
        temperature: llmConfig.temperature ?? 0.7,
        maxTokens: llmConfig.maxTokens ?? 2000,
      };

      result = await callLlm(llmConfigNoTools, messages);
    }

    // ============= CONFIDENCE ESCALATION ANALYSIS =============

    let escalationDecision;
    let confidenceEscalated = false;
    let responseToSend = result.message;

    if (escalationEngine && confidenceAnalyzer) {
      try {
        // Analyze confidence and make escalation decision
        // Create a mock CompletionResponse for analysis
        const responseForAnalysis = {
          id: 'chat-' + Date.now(),
          created: Date.now(),
          model: model,
          content: result.message,
        };

        escalationDecision = await escalationEngine.decide(
          responseForAnalysis,
          {
            tenantId: payload.tenantId,
            conversationId: conversation.id,
            userMessage: payload.message,
            conversationHistory: conversation.messages?.map((m: any) => {
              const content = typeof m.content === 'object' ? (m.content as any).text || '' : String(m.content);
              return content;
            }),
          }
        );

        // Check if we need to escalate
        if (escalationDecision.action === EscalationAction.IMMEDIATE_ESCALATION) {
          confidenceEscalated = true;

          // Create escalation event
          await prisma.event.create({
            data: {
              type: 'human_handoff.requested',
              tenantId: payload.tenantId,
              conversationId: conversation.id,
              data: {
                reason: 'low_confidence',
                confidenceScore: escalationDecision.analysis.overallScore,
                confidenceLevel: escalationDecision.analysis.level,
                userMessage: payload.message,
                aiResponse: result.message,
                signals: escalationDecision.analysis.signals,
                shouldEscalate: escalationDecision.analysis.shouldEscalate,
                escalationReason: escalationDecision.analysis.escalationReason,
              },
            },
          });

          // Update conversation to mark as needing human attention
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: 'assigned_human',
              metadata: {
                humanHandoffRequested: true,
                handoffReason: 'low_confidence',
                requestedAt: new Date().toISOString(),
              },
            },
          });

          console.log('[Chat] Confidence escalation triggered', {
            conversationId: conversation.id,
            confidenceScore: escalationDecision.analysis.overallScore,
            confidenceLevel: escalationDecision.analysis.level,
          });
        }

        // Use modified response if available (e.g., with disclaimer added)
        if (escalationDecision.modifiedResponse) {
          responseToSend = escalationDecision.modifiedResponse;
        }
      } catch (error) {
        console.error('[Chat] Confidence analysis error:', error);
        // Continue without escalation if analysis fails
      }
    }

    // Save user message and assistant response to database
    const now = new Date();

    // Save user message
    await prisma.message.create({
      data: {
        tenantId: payload.tenantId,
        conversationId: conversation.id,
        direction: 'inbound',
        from: req.tenant?.id || req.adminUser?.id || 'anonymous',
        type: 'text',
        content: { text: payload.message },
        timestamp: now,
      },
    });

    // Save assistant response
    await prisma.message.create({
      data: {
        tenantId: payload.tenantId,
        conversationId: conversation.id,
        direction: 'outbound',
        from: 'assistant',
        type: 'text',
        content: { text: responseToSend },
        metadata: {
          ...result.metadata,
          ragEnabled: enableRag,
          contextUsed,
          toolsUsed,
          mcpEnabled: hasTools,
          confidenceEscalation: enableConfidenceEscalation
            ? {
                enabled: true,
                escalated: confidenceEscalated,
                action: escalationDecision?.action,
                confidenceScore: escalationDecision?.analysis.overallScore,
                confidenceLevel: escalationDecision?.analysis.level,
              }
            : undefined,
        },
        timestamp: new Date(),
      },
    });

    // Update conversation last message timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Track analytics metrics
    try {
      const responseAt = new Date();
      const ragSimilarity = searchResults && searchResults.length > 0
        ? searchResults[0].similarity
        : undefined;
      const ragChunks = searchResults ? searchResults.length : undefined;
      const ragTopDoc = searchResults && searchResults.length > 0 && searchResults[0].chunk
        ? searchResults[0].chunk.documentId
        : undefined;

      await analyticsService.trackMessageMetric({
        conversationId: conversation.id,
        messageId: `${conversation.id}-${now.getTime()}`,
        tenantId: payload.tenantId,
        sentAt: now,
        responseAt,
        ragUsed: contextUsed,
        ragSimilarity,
        ragChunksRetrieved: ragChunks,
        ragTopDocumentId: ragTopDoc,
        confidenceScore: escalationDecision?.analysis.overallScore,
        escalated: confidenceEscalated,
        errorOccurred: false,
        userMessage: payload.message,
      });
    } catch (analyticsError) {
      console.error('[Analytics] Failed to track metrics:', analyticsError);
      // Don't fail the request if analytics tracking fails
    }

    const response = {
      message: responseToSend,
      conversationId: conversation.id,
      metadata: {
        ...result.metadata,
        ragEnabled: enableRag,
        contextUsed,
        toolsUsed,
        mcpEnabled: hasTools,
        confidenceEscalation: enableConfidenceEscalation
      },
    };

    respondSuccess(res, response);
  }));

export default router;
