import {
  ChannelType,
  EventType,
  FunctionContext,
  FunctionDefinition,
  MessageContent,
  NormalizedMessage,
  createLogger,
  ensureCorrelationId,
  truncateText,
} from '@meta-chat/shared';
import { CompletionMessage, CompletionParams, CompletionResponse, CompletionChunk, LLMProvider, ProviderConfig, createLLMProvider } from '@meta-chat/llm';
import { EventManager, getEventManager } from '@meta-chat/events';
import { Prisma } from '@meta-chat/database';
import { TenantConfigCache, TenantRuntimeConfig } from './config-cache';
import { ConversationManager } from './conversation-manager';
import { RagRetriever } from './rag-retriever';
import { ChannelAdapterRegistry, OutboundMessage } from './channel-adapter';
import { FunctionRegistry } from './function-registry';

interface MessagePipelineOptions {
  tenantId: string;
  channel: ChannelType;
  tenantCache?: TenantConfigCache;
  conversationManager?: ConversationManager;
  ragRetriever?: RagRetriever;
  channelAdapters: ChannelAdapterRegistry;
  functionRegistry?: FunctionRegistry;
  eventManager?: EventManager;
  providerFactory?: (config: ProviderConfig) => LLMProvider;
  maxToolIterations?: number;
  historyLimit?: number;
}

interface ToolCallState {
  id: string;
  name?: string;
  arguments: string;
}

interface ToolCallResult {
  id: string;
  name: string;
  arguments: any;
}

interface CompletionOutcome {
  content: string;
  usage?: CompletionResponse['usage'];
}

const logger = createLogger('MessagePipeline');

export class MessagePipeline {
  private readonly tenantCache: TenantConfigCache;
  private readonly conversationManager: ConversationManager;
  private readonly ragRetriever: RagRetriever;
  private readonly eventManager: EventManager;
  private readonly functionRegistry: FunctionRegistry;
  private readonly providerFactory: (config: ProviderConfig) => LLMProvider;
  private readonly maxToolIterations: number;
  private readonly historyLimit: number;

  constructor(private readonly options: MessagePipelineOptions) {
    this.tenantCache = options.tenantCache ?? new TenantConfigCache();
    this.conversationManager = options.conversationManager ?? new ConversationManager();
    this.ragRetriever = options.ragRetriever ?? new RagRetriever();
    this.eventManager = options.eventManager ?? getEventManager();
    this.functionRegistry = options.functionRegistry ?? new FunctionRegistry();
    this.providerFactory = options.providerFactory ?? createLLMProvider;
    this.maxToolIterations = options.maxToolIterations ?? 5;
    this.historyLimit = options.historyLimit ?? 20;
  }

  async process(message: NormalizedMessage): Promise<void> {
    const correlationId = ensureCorrelationId();
    logger.info('Processing inbound message', {
      correlationId,
      messageId: message.id,
      conversationId: message.conversationId,
      tenantId: this.options.tenantId,
      channel: this.options.channel,
    });

    const config = await this.tenantCache.get(this.options.tenantId, this.options.channel);

    const conversation = await this.conversationManager.ensureConversation(
      this.options.tenantId,
      this.options.channel,
      message,
    );

    await this.conversationManager.recordInboundMessage(this.options.tenantId, conversation, message);

    if (this.shouldTriggerHumanHandoff(config, message)) {
      await this.handleHumanHandoff(conversation, message, config);
      return;
    }

    const history = await this.conversationManager.getRecentMessages(conversation.id, this.historyLimit);

    const ragResults =
      config.settings.enableRag && message.content?.text
        ? await this.ragRetriever.retrieve(this.options.tenantId, message.content.text, config)
        : [];

    const functions = config.settings.enableFunctionCalling
      ? this.functionRegistry.get(this.options.tenantId)
      : [];

    const completionOutcome = await this.runLLM(conversation.id, message, history, config, functions, ragResults);

    if (!completionOutcome.content?.trim()) {
      logger.warn('LLM response was empty, skipping outbound send', {
        tenantId: this.options.tenantId,
        channel: this.options.channel,
        conversationId: conversation.id,
      });
      return;
    }

    const outboundContent: MessageContent = {
      text: completionOutcome.content.trim(),
    };

    const outboundMessage: OutboundMessage = {
      to: conversation.userId,
      content: outboundContent,
      conversationExternalId: conversation.externalId,
    };

    const adapter = this.options.channelAdapters.get(this.options.channel);

    logger.info('Sending outbound message via channel adapter', {
      tenantId: this.options.tenantId,
      channel: this.options.channel,
      conversationId: conversation.id,
    });

    let sendResult;
    try {
      sendResult = await adapter.send(outboundMessage, {
        tenantId: this.options.tenantId,
        channel: this.options.channel,
        channelConfig: config.channelConfig,
      });
    } catch (error) {
      logger.error('Failed to send outbound message via channel adapter', {
        tenantId: this.options.tenantId,
        channel: this.options.channel,
        conversationId: conversation.id,
        error,
      });
      throw error;
    }

    await this.conversationManager.recordOutboundMessage(this.options.tenantId, conversation, {
      content: outboundContent as unknown as Prisma.JsonObject,
      metadata: {
        usage: completionOutcome.usage ?? null,
        adapter: sendResult.metadata ?? null,
      } as Prisma.JsonValue,
      externalId: sendResult.externalId,
      id: sendResult.messageId,
    });

    await this.emitEvent(EventType.MESSAGE_SENT, {
      conversationId: conversation.id,
      messageId: sendResult.messageId,
      externalId: sendResult.externalId,
      channel: this.options.channel,
    });

    logger.info('Completed message processing', {
      tenantId: this.options.tenantId,
      channel: this.options.channel,
      conversationId: conversation.id,
    });
  }

  private async runLLM(
    conversationId: string,
    message: NormalizedMessage,
    history: Awaited<ReturnType<ConversationManager['getRecentMessages']>>,
    config: TenantRuntimeConfig,
    functions: FunctionDefinition[],
    ragResults: Awaited<ReturnType<RagRetriever['retrieve']>>,
  ): Promise<CompletionOutcome> {
    if (!config.llm) {
      logger.warn('LLM configuration missing for tenant, skipping response generation', {
        tenantId: this.options.tenantId,
      });
      return { content: '' };
    }

    const provider = this.providerFactory(config.llm.config);
    const functionSchemas = functions.map(({ handler: _handler, ...schema }) => schema);

    const systemPrompt = this.buildSystemPrompt(config, ragResults);
    const messages: CompletionMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((record) => this.mapMessageRecord(record)),
    ];

    let iterations = 0;
    let usageTotals: CompletionOutcome['usage'];
    let latestContent = '';

    while (iterations < this.maxToolIterations) {
      iterations += 1;
      const params: CompletionParams = {
        messages,
        functions: functionSchemas,
        temperature: config.llm.options.temperature,
        topP: config.llm.options.topP,
        maxTokens: config.llm.options.maxTokens,
        metadata: {
          tenantId: this.options.tenantId,
          conversationId,
        },
      };

      const { content, usage, toolCalls } = await this.streamCompletion(provider, params);
      latestContent = content;
      usageTotals = this.mergeUsage(usageTotals, usage);

      if (!toolCalls.length || !functions.length) {
        break;
      }

      logger.info('LLM requested tool calls', {
        tenantId: this.options.tenantId,
        conversationId,
        toolCalls: toolCalls.map((call) => call.name),
      });

      for (const call of toolCalls) {
        const definition = functions.find((fn) => fn.name === call.name);
        if (!definition) {
          logger.warn('Received tool call for unregistered function', {
            tenantId: this.options.tenantId,
            conversationId,
            functionName: call.name,
          });
          continue;
        }

        const args = await this.parseFunctionArguments(call, definition);
        try {
          const context: FunctionContext = {
            tenantId: this.options.tenantId,
            conversationId,
            message,
          };
          const result = await definition.handler(args, context);
          messages.push({
            role: 'tool',
            name: definition.name,
            content: result,
          });
        } catch (error) {
          logger.error('Function execution failed', {
            tenantId: this.options.tenantId,
            conversationId,
            functionName: definition.name,
            error,
          });
          messages.push({
            role: 'tool',
            name: definition.name,
            content: 'Function execution failed',
          });
        }
      }
    }

    return { content: latestContent, usage: usageTotals };
  }

  private async streamCompletion(provider: LLMProvider, params: CompletionParams): Promise<{
    content: string;
    usage?: CompletionResponse['usage'];
    toolCalls: ToolCallResult[];
  }> {
    const stream = provider.streamComplete(params);
    const toolStates = new Map<string, ToolCallState>();
    let content = '';
    let usage: CompletionResponse['usage'];

    for await (const chunk of stream) {
      if (chunk.delta.content) {
        content += chunk.delta.content;
      }

      if (chunk.delta.usage) {
        usage = this.mergeUsage(usage, chunk.delta.usage);
      }

      this.mergeToolCalls(toolStates, chunk);
    }

    const toolCalls = Array.from(toolStates.values())
      .map((state) => this.toToolCallResult(state))
      .filter((call): call is ToolCallResult => Boolean(call));

    return { content, usage, toolCalls };
  }

  private mergeToolCalls(toolStates: Map<string, ToolCallState>, chunk: CompletionChunk): void {
    const raw = chunk.delta.raw as any;
    if (!raw) {
      return;
    }

    const calls = raw.tool_calls ?? raw.toolCalls ?? [];
    for (const call of calls) {
      const id = call.id ?? call.index ?? String(toolStates.size);
      const state: ToolCallState = toolStates.get(id) ?? { id, name: '', arguments: '' };
      state.name = call.function?.name ?? call.name ?? state.name;
      const argsDelta = call.function?.arguments ?? call.arguments ?? '';
      state.arguments += argsDelta;
      toolStates.set(id, state);
    }
  }

  private toToolCallResult(state: ToolCallState): ToolCallResult | null {
    if (!state.name) {
      return null;
    }

    try {
      const args = state.arguments ? JSON.parse(state.arguments) : {};
      return {
        id: state.id,
        name: state.name,
        arguments: args,
      };
    } catch (error) {
      logger.error('Failed to parse tool call arguments', {
        functionName: state.name,
        error,
      });
      return {
        id: state.id,
        name: state.name,
        arguments: state.arguments,
      };
    }
  }

  private mergeUsage(
    existing: CompletionResponse['usage'] | undefined,
    incoming: CompletionResponse['usage'] | undefined,
  ): CompletionResponse['usage'] | undefined {
    if (!incoming) {
      return existing;
    }

    if (!existing) {
      return { ...incoming };
    }

    return {
      promptTokens: (existing.promptTokens ?? 0) + (incoming.promptTokens ?? 0),
      completionTokens: (existing.completionTokens ?? 0) + (incoming.completionTokens ?? 0),
      totalTokens: (existing.totalTokens ?? 0) + (incoming.totalTokens ?? 0),
      costInUsd:
        existing.costInUsd !== undefined || incoming.costInUsd !== undefined
          ? (existing.costInUsd ?? 0) + (incoming.costInUsd ?? 0)
          : undefined,
    };
  }

  private buildSystemPrompt(config: TenantRuntimeConfig, ragResults: Awaited<ReturnType<RagRetriever['retrieve']>>): string {
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
      ragResults.forEach((result, index) => {
        const source = result.chunk.metadata?.source ?? result.chunk.documentId;
        const snippet = truncateText(result.chunk.content ?? '', 400);
        parts.push(`Context ${index + 1} (source: ${source}):\n${snippet}`);
      });
    }

    return parts.join('\n\n');
  }

  private mapMessageRecord(record: Awaited<ReturnType<ConversationManager['getRecentMessages']>>[number]): CompletionMessage {
    const content = this.extractText(record.content);
    const role = record.direction === 'inbound' ? 'user' : 'assistant';
    return { role, content };
  }

  private extractText(content: Prisma.JsonValue): string {
    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object' && content !== null) {
      const payload = content as Record<string, any>;
      if (payload.text) {
        return String(payload.text);
      }
      if (payload.caption) {
        return String(payload.caption);
      }
    }

    return JSON.stringify(content);
  }

  private shouldTriggerHumanHandoff(config: TenantRuntimeConfig, message: NormalizedMessage): boolean {
    if (!config.settings.enableHumanHandoff || !config.settings.humanHandoffKeywords?.length) {
      return false;
    }

    const text = message.content?.text?.toLowerCase();
    if (!text) {
      return false;
    }

    return config.settings.humanHandoffKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
  }

  private async handleHumanHandoff(
    conversation: Awaited<ReturnType<ConversationManager['ensureConversation']>>,
    message: NormalizedMessage,
    config: TenantRuntimeConfig,
  ): Promise<void> {
    logger.info('Human handoff triggered', {
      tenantId: this.options.tenantId,
      conversationId: conversation.id,
    });

    await this.conversationManager.updateConversationStatus(conversation.id, 'assigned_human');

    await this.emitEvent(EventType.HUMAN_HANDOFF_REQUESTED, {
      conversationId: conversation.id,
      messageId: message.id,
      channel: this.options.channel,
      keywords: config.settings.humanHandoffKeywords,
    });
  }

  private async emitEvent(type: EventType, data: Record<string, unknown>): Promise<void> {
    await this.eventManager.emit({
      type,
      tenantId: this.options.tenantId,
      timestamp: new Date(),
      data,
    });
  }

  private async parseFunctionArguments(call: ToolCallResult, definition: FunctionDefinition): Promise<any> {
    if (typeof call.arguments === 'object') {
      return call.arguments;
    }

    if (typeof call.arguments === 'string') {
      try {
        return JSON.parse(call.arguments);
      } catch (error) {
        logger.warn('Function call arguments were not valid JSON', {
          functionName: definition.name,
          raw: call.arguments,
          error,
        });
      }
    }

    return {};
  }
}

