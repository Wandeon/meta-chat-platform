import OpenAI from 'openai';
import { APIError } from 'openai/error';
import { BaseLLMProvider } from './base';
import {
  CompletionChunk,
  CompletionMessage,
  CompletionParams,
  CompletionResponse,
  FunctionCall,
  ProviderConfig,
  ProviderInfo,
  ToolCall,
} from '../types';

export class OpenAIProvider extends BaseLLMProvider {
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organizationId,
      timeout: config.timeoutMs,
      defaultHeaders: config.additionalHeaders,
    });
  }

  protected async doComplete(params: CompletionParams): Promise<CompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: params.messages.map((message) => this.mapMessage(message)),
        temperature: params.temperature,
        top_p: params.topP,
        max_tokens: params.maxTokens,
        functions: params.functions,
        function_call: this.mapFunctionCall(params.functionCall),
        tools: params.tools,
        tool_choice: params.toolChoice,
        metadata: params.metadata,
      });

      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error('OpenAI returned no completion choices');
      }

      const message = choice.message ?? {};
      const toolCalls = this.mapToolCalls(message.tool_calls);
      const functionCall = this.mapFunctionCallMetadata(message.function_call);
      const content = this.normalizeContent(message.content);

      const completion: CompletionResponse = {
        id: response.id,
        created: response.created ?? Date.now(),
        model: response.model ?? this.config.model,
        content,
        functionCall: functionCall ?? undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: this.mapUsage(response.usage),
        raw: response,
      };

      return completion;
    } catch (error) {
      throw this.translateError(error);
    }
  }

  protected async doStreamComplete(params: CompletionParams): Promise<AsyncIterable<CompletionChunk>> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: params.messages.map((message) => this.mapMessage(message)),
        temperature: params.temperature,
        top_p: params.topP,
        max_tokens: params.maxTokens,
        functions: params.functions,
        function_call: this.mapFunctionCall(params.functionCall),
        tools: params.tools,
        tool_choice: params.toolChoice,
        metadata: params.metadata,
        stream: true,
      });

      const iterator = this.buildStreamIterator(stream as AsyncIterable<any>);
      return iterator;
    } catch (error) {
      throw this.translateError(error);
    }
  }

  protected async doEmbed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model,
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      throw this.translateError(error);
    }
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'openai',
      capabilities: {
        streaming: true,
        embeddings: true,
        functionCalling: true,
      },
      limits: {
        maxRequestsPerMinute: 5_000,
      },
    };
  }

  private mapMessage(message: CompletionMessage): Record<string, unknown> {
    const base: Record<string, unknown> = {
      role: message.role,
      content: message.content,
    };

    if (message.name) {
      base.name = message.name;
    }

    if (message.toolCallId) {
      base.tool_call_id = message.toolCallId;
    }

    if (message.functionCall) {
      base.function_call = {
        name: message.functionCall.name,
        arguments: message.functionCall.arguments,
      };
    }

    if (message.toolCalls) {
      base.tool_calls = message.toolCalls.map((call) => ({
        id: call.id,
        type: call.type,
        function: { ...call.function },
      }));
    }

    return base;
  }

  private mapUsage(usage: any | undefined): CompletionResponse['usage'] {
    if (!usage) {
      return undefined;
    }

    const promptTokens = usage.prompt_tokens ?? usage.promptTokens ?? 0;
    const completionTokens = usage.completion_tokens ?? usage.completionTokens ?? 0;
    const totalTokens = usage.total_tokens ?? usage.totalTokens ?? promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      costInUsd: usage.cost_in_usd ?? usage.costInUsd,
    };
  }

  private normalizeContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (!part) {
            return '';
          }
          if (typeof part === 'string') {
            return part;
          }
          if (typeof part === 'object' && 'text' in part) {
            return String(part.text ?? '');
          }
          return '';
        })
        .join('');
    }

    if (content && typeof content === 'object' && 'text' in content) {
      return String(content.text ?? '');
    }

    return '';
  }

  private mapToolCalls(calls: any[] | undefined): ToolCall[] {
    if (!Array.isArray(calls)) {
      return [];
    }

    return calls.map((call) => ({
      id: call.id,
      type: call.type ?? 'function',
      function: {
        name: call.function?.name ?? '',
        arguments: call.function?.arguments ?? '',
      },
    }));
  }

  private mapFunctionCallMetadata(call: any | undefined): FunctionCall | null {
    if (!call) {
      return null;
    }

    return {
      name: call.name ?? '',
      arguments: call.arguments ?? '',
    };
  }

  private mapFunctionCall(call: CompletionParams['functionCall']): 'auto' | 'none' | { name: string } | undefined {
    if (!call) {
      return undefined;
    }

    if (call === 'auto' || call === 'none') {
      return call;
    }

    return { name: call.name };
  }

  private buildStreamIterator(stream: AsyncIterable<any>): AsyncIterable<CompletionChunk> {
    const self = this;
    let lastId: string | undefined;
    let lastCreated = Date.now();

    async function* iterator(): AsyncGenerator<CompletionChunk> {
      for await (const part of stream) {
        const choice = Array.isArray(part.choices) ? part.choices[0] : undefined;
        const delta = choice?.delta ?? {};
        const chunk: CompletionChunk = {
          id: part.id ?? lastId ?? `openai-${Date.now()}`,
          created: part.created ?? lastCreated ?? Date.now(),
          delta: {},
        };

        lastId = chunk.id;
        lastCreated = chunk.created;

        if (delta.content) {
          chunk.delta.content = self.normalizeContent(delta.content);
        }

    if (delta.function_call) {
      const fnCall = self.mapFunctionCallMetadata(delta.function_call);
      if (fnCall) {
        chunk.delta.functionCall = fnCall;
      }
    }

    if (delta.tool_calls) {
      const toolCalls = self.mapToolCalls(delta.tool_calls).filter(Boolean);
      if (toolCalls.length > 0) {
        chunk.delta.toolCalls = toolCalls;
      }
    }

        if (part.model) {
          chunk.delta.model = part.model;
        }

        if (part.usage) {
          const usage = self.mapUsage(part.usage);
          if (usage) {
            chunk.delta.usage = usage;
          }
        }

        if (choice?.finish_reason) {
          chunk.delta.raw = {
            finishReason: choice.finish_reason,
          };
          chunk.done = true;
        }

        if (part.usage) {
          chunk.done = true;
        }

        if (!chunk.done && !Object.keys(chunk.delta).length) {
          continue;
        }

        yield chunk;
      }
    }

    return { [Symbol.asyncIterator]: iterator };
  }

  private translateError(error: unknown): Error {
    if (error instanceof APIError) {
      return new Error(`OpenAI API error (${error.status}): ${error.message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown OpenAI provider error');
  }
}
