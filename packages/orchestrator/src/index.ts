import { getPrismaClient } from '@meta-chat/database';
import { ChannelType, createLogger, NormalizedMessage, MessageDirection, generateId } from '@meta-chat/shared';
import { CompletionMessage, CompletionParams, createLLMProvider, ProviderConfig } from '@meta-chat/llm';
import { TenantConfigCache } from './config-cache';
import { ConversationManager } from './conversation-manager';
import { RagRetriever } from './rag-retriever';
import { ConfidenceAnalyzer } from './confidence-analyzer';
import { EscalationEngine, EscalationAction } from './escalation-engine';
import { buildEscalationConfigFromTenant, isConfidenceEscalationEnabled } from './escalation-config-builder';

const prisma = getPrismaClient();
const logger = createLogger('Orchestrator');

export interface ProcessMessageOptions {
  tenantId: string;
  conversationId?: string;
  messageId?: string;
  skipRAG?: boolean;
  skipStreaming?: boolean;
  enableConfidenceEscalation?: boolean;
}

export interface ProcessMessageResponse {
  response: string;
  messageId: string;
  conversationId: string;
  sources?: Array<{
    documentId: string;
    content: string;
    similarity: number;
  }>;
  confidence?: {
    score: number;
    level: string;
    escalated: boolean;
    action: string;
  };
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costInUsd?: number;
  };
}

/**
 * Orchestrator class for processing messages via REST API
 *
 * This is a synchronous, stateless processor designed for REST API use.
 * For queue-based async processing, use MessageOrchestrator with MessagePipeline.
 */
export class Orchestrator {
  private readonly tenantCache: TenantConfigCache;
  private readonly conversationManager: ConversationManager;
  private readonly ragRetriever: RagRetriever;

  constructor() {
    this.tenantCache = new TenantConfigCache();
    this.conversationManager = new ConversationManager();
    this.ragRetriever = new RagRetriever();
  }

  async processMessage(
    message: string,
    channelType: string,
    options: ProcessMessageOptions
  ): Promise<ProcessMessageResponse> {
    logger.info('Processing message via Orchestrator', {
      tenantId: options.tenantId,
      conversationId: options.conversationId,
      channelType,
    });

    // Validate channel type
    const validChannelType = channelType as ChannelType;

    // Get tenant configuration
    const config = await this.tenantCache.get(options.tenantId, validChannelType);

    // Ensure conversation exists
    const normalizedMessage: NormalizedMessage = {
      id: options.messageId || generateId(),
      conversationId: options.conversationId || generateId(),
      from: 'user',
      type: 'text',
      direction: 'inbound' as MessageDirection,
      content: { text: message },
      timestamp: new Date(),
    };

    const conversation = await this.conversationManager.ensureConversation(
      options.tenantId,
      validChannelType,
      normalizedMessage
    );

    // Record inbound message
    await this.conversationManager.recordInboundMessage(
      options.tenantId,
      conversation,
      normalizedMessage
    );

    // Get conversation history
    const history = await this.conversationManager.getRecentMessages(conversation.id, 20);

    // Get RAG context if enabled
    let ragResults: any[] = [];
    if (!options.skipRAG && config.settings.enableRag) {
      try {
        ragResults = await this.ragRetriever.retrieve(options.tenantId, message, config);
        logger.debug('RAG retrieval completed', {
          tenantId: options.tenantId,
          resultsCount: ragResults.length,
        });
      } catch (error) {
        logger.error('RAG retrieval failed', { error });
        // Continue without RAG if it fails
      }
    }

    // Check if LLM is configured
    if (!config.llm) {
      throw new Error(`LLM configuration missing for tenant: ${options.tenantId}`);
    }

    // Build system prompt with RAG context
    const systemPrompt = this.buildSystemPrompt(config, ragResults);

    // Build message history
    const messages: CompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((record) => ({
        role: record.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        content: this.extractText(record.content),
      })),
    ];

    // Call LLM
    const provider = createLLMProvider(config.llm.config);
    const params: CompletionParams = {
      messages,
      temperature: config.llm.options.temperature ?? 0.7,
      topP: config.llm.options.topP,
      maxTokens: config.llm.options.maxTokens ?? 2000,
      metadata: {
        tenantId: options.tenantId,
        conversationId: conversation.id,
      },
    };

    let responseContent = '';
    let usage: ProcessMessageResponse['usage'];

    // Stream completion
    const stream = provider.streamComplete(params);
    for await (const chunk of stream) {
      if (chunk.delta.content) {
        responseContent += chunk.delta.content;
      }
      if (chunk.delta.usage) {
        usage = chunk.delta.usage;
      }
    }

    // Handle confidence escalation if enabled
    let finalResponse = responseContent;
    let confidenceInfo: ProcessMessageResponse['confidence'] | undefined;

    if (
      options.enableConfidenceEscalation !== false &&
      isConfidenceEscalationEnabled(config.settings)
    ) {
      try {
        const escalationConfig = buildEscalationConfigFromTenant(config.settings);
        const escalationEngine = new EscalationEngine(escalationConfig);

        // Create completion response for analysis
        const completionResponse = {
          id: generateId(),
          created: Date.now(),
          model: config.llm.config.model,
          content: responseContent,
          usage: usage as any,
        };

        const decision = await escalationEngine.decide(completionResponse, {
          tenantId: options.tenantId,
          conversationId: conversation.id,
          userMessage: message,
          conversationHistory: history.map((h) => this.extractText(h.content)),
        });

        confidenceInfo = {
          score: decision.analysis.overallScore,
          level: decision.analysis.level,
          escalated: decision.action === EscalationAction.IMMEDIATE_ESCALATION,
          action: decision.action,
        };

        // Use modified response if available
        if (decision.modifiedResponse) {
          finalResponse = decision.modifiedResponse;
        }

        // Handle immediate escalation
        if (decision.action === EscalationAction.IMMEDIATE_ESCALATION) {
          await this.conversationManager.updateConversationStatus(
            conversation.id,
            'assigned_human'
          );

          // Create human handoff event
          await prisma.event.create({
            data: {
              type: 'human_handoff.requested',
              tenantId: options.tenantId,
              data: {
                conversationId: conversation.id,
                reason: 'low_confidence',
                confidenceScore: decision.analysis.overallScore,
                confidenceLevel: decision.analysis.level,
                userMessage: message,
                aiResponse: responseContent,
              },
            },
          });
        }

        logger.info('Confidence escalation analyzed', {
          tenantId: options.tenantId,
          conversationId: conversation.id,
          action: decision.action,
          score: decision.analysis.overallScore,
        });
      } catch (error) {
        logger.error('Confidence escalation failed', { error });
        // Continue without escalation if it fails
      }
    }

    // Record outbound message
    await this.conversationManager.recordOutboundMessage(options.tenantId, conversation, {
      content: { text: finalResponse } as any,
      metadata: {
        usage: usage ?? null,
        ragEnabled: !options.skipRAG && config.settings.enableRag,
        ragResults: ragResults.length,
        confidence: confidenceInfo,
      } as any,
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    logger.info('Message processing completed', {
      tenantId: options.tenantId,
      conversationId: conversation.id,
    });

    return {
      response: finalResponse,
      messageId: normalizedMessage.id,
      conversationId: conversation.id,
      sources: ragResults.map((result) => ({
        documentId: result.chunk.documentId,
        content: result.chunk.content || '',
        similarity: result.similarity,
      })),
      confidence: confidenceInfo,
      usage,
    };
  }

  private buildSystemPrompt(config: any, ragResults: any[]): string {
    const parts: string[] = [];
    parts.push(`You are ${config.settings.brandName} virtual assistant.`);
    parts.push(`Adopt a ${config.settings.tone} tone.`);

    if (config.settings.locale?.length) {
      parts.push(`Prefer responses in the following locales: ${config.settings.locale.join(', ')}.`);
    }

    const extraPrompt = config.llm?.options.systemPrompt;
    if (extraPrompt) {
      parts.push(extraPrompt);
    }

    if (ragResults.length) {
      parts.push('Use the following knowledge base context when composing responses.');
      ragResults.forEach((result: any, index: number) => {
        const source = result.chunk.metadata?.source ?? result.chunk.documentId;
        const snippet = result.chunk.content?.substring(0, 400) || '';
        parts.push(`Context ${index + 1} (source: ${source}):\n${snippet}`);
      });
    }

    return parts.join('\n\n');
  }

  private extractText(content: any): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object' && content !== null) {
      if (content.text) {
        return String(content.text);
      }
      if (content.caption) {
        return String(content.caption);
      }
    }

    return JSON.stringify(content);
  }
}

export default new Orchestrator();

// Export confidence and escalation modules
export { ConfidenceAnalyzer } from './confidence-analyzer';
export { EscalationEngine, EscalationAction } from './escalation-engine';
export { buildEscalationConfigFromTenant, isConfidenceEscalationEnabled } from './escalation-config-builder';

// Export channel adapter modules
export {
  ChannelAdapter,
  ChannelSendResult,
  OutboundMessage,
  ChannelAdapterContext,
  ChannelAdapterRegistry
} from './channel-adapter';

// Export message orchestrator
export { MessageOrchestrator } from './message-orchestrator';
export type { MessageOrchestratorOptions } from './message-orchestrator';

// Export message pipeline with escalation
export { MessagePipelineWithEscalation } from './message-pipeline-with-escalation';
