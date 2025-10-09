import Anthropic from '@anthropic-ai/sdk';
import { APIError } from '@anthropic-ai/sdk/error';
import { BaseLLMProvider } from './base';
import {
  CompletionChunk,
  CompletionMessage,
  CompletionParams,
  CompletionResponse,
  ProviderConfig,
  ProviderInfo,
  ToolCall,
} from '../types';

export class AnthropicProvider extends BaseLLMProvider {
  private readonly client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: config.additionalHeaders,
      timeout: config.timeoutMs,
    });
  }

  protected async doComplete(params: CompletionParams): Promise<CompletionResponse> {
    try {
      const { system, messages } = this.partitionMessages(params.messages);

      const response = await this.client.messages.create({
        model: this.config.model,
        system: system.length ? system.join('\n') : undefined,
        messages,
        temperature: params.temperature,
        top_p: params.topP,
        max_tokens: params.maxTokens ?? 1024,
        tools: params.tools?.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters ?? { type: 'object' },
        })),
        metadata: params.metadata,
      });

      const content = this.extractTextContent(response.content);
      const toolCalls = this.extractToolCalls(response.content);

      const completion: CompletionResponse = {
        id: response.id,
        created: response.created_at ? Date.parse(response.created_at) : Date.now(),
        model: response.model ?? this.config.model,
        content,
        toolCalls: toolCalls.length ? toolCalls : undefined,
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
      const { system, messages } = this.partitionMessages(params.messages);

      const stream = await this.client.messages.stream({
        model: this.config.model,
        system: system.length ? system.join('\n') : undefined,
        messages,
        temperature: params.temperature,
        top_p: params.topP,
        max_tokens: params.maxTokens ?? 1024,
        tools: params.tools?.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters ?? { type: 'object' },
        })),
        metadata: params.metadata,
      });

      const iterator = this.buildStreamIterator(stream as AsyncIterable<any>);
      return iterator;
    } catch (error) {
      throw this.translateError(error);
    }
  }

  protected async doEmbed(): Promise<number[][]> {
    throw new Error('Embeddings are not supported for the Anthropic provider');
  }

  public getInfo(): ProviderInfo {
    return {
      name: 'anthropic',
      capabilities: {
        streaming: true,
        embeddings: false,
        functionCalling: true,
      },
      limits: {
        contextWindow: '200k tokens',
      },
    };
  }

  private partitionMessages(messages: CompletionMessage[]): {
    system: string[];
    messages: Array<{ role: 'user' | 'assistant'; content: unknown[] }>;
  } {
    const system: string[] = [];
    const formatted: Array<{ role: 'user' | 'assistant'; content: unknown[] }> = [];

    for (const message of messages) {
      if (message.role === 'system') {
        system.push(message.content);
        continue;
      }

      if (message.role === 'tool') {
        formatted.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: message.toolCallId ?? message.name ?? 'tool',
              content: message.content,
            },
          ],
        });
        continue;
      }

      const contentBlocks: unknown[] = [
        { type: 'text', text: message.content },
      ];

      const toolCalls: ToolCall[] = [...(message.toolCalls ?? [])];
      if (!toolCalls.length && message.functionCall) {
        toolCalls.push({
          id: undefined,
          type: 'function',
          function: message.functionCall,
        });
      }

      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          contentBlocks.push({
            type: 'tool_use',
            id: call.id ?? call.function.name,
            name: call.function.name,
            input: this.safeJson(call.function.arguments),
          });
        }
      }

      formatted.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: contentBlocks,
      });
    }

    return { system, messages: formatted };
  }

  private extractTextContent(content: any[]): string {
    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .filter((part) => part.type === 'text')
      .map((part) => String(part.text ?? ''))
      .join('');
  }

  private extractToolCalls(content: any[]): ToolCall[] {
    if (!Array.isArray(content)) {
      return [];
    }

    return content
      .filter((part) => part.type === 'tool_use')
      .map((part) => ({
        id: part.id,
        type: 'function',
        function: {
          name: part.name ?? '',
          arguments: typeof part.input === 'string' ? part.input : JSON.stringify(part.input ?? {}),
        },
      }));
  }

  private mapUsage(usage: any | undefined): CompletionResponse['usage'] {
    if (!usage) {
      return undefined;
    }

    const promptTokens = usage.input_tokens ?? 0;
    const completionTokens = usage.output_tokens ?? 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      costInUsd: usage.cost_in_usd ?? usage.costInUsd,
    };
  }

  private safeJson(input: string): unknown {
    try {
      return JSON.parse(input ?? '{}');
    } catch (error) {
      return input;
    }
  }

  private buildStreamIterator(stream: AsyncIterable<any>): AsyncIterable<CompletionChunk> {
    const self = this;
    let lastId: string | undefined;
    let lastCreated = Date.now();

    async function* iterator(): AsyncGenerator<CompletionChunk> {
      for await (const event of stream) {
        const chunk: CompletionChunk = {
          id: event.id ?? lastId ?? `anthropic-${Date.now()}`,
          created: event.created_at ? Date.parse(event.created_at) : lastCreated ?? Date.now(),
          delta: {},
        };

        lastId = chunk.id;
        lastCreated = chunk.created;

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          chunk.delta.content = String(event.delta.text ?? '');
        }

        if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          const toolCall = self.mapToolCall(event.content_block);
          if (toolCall) {
            chunk.delta.toolCalls = [toolCall];
          }
        }

        if (event.type === 'message_delta' && event.usage) {
          const usage = self.mapUsage(event.usage);
          if (usage) {
            chunk.delta.usage = usage;
          }
          chunk.done = true;
        }

        if (event.type === 'message_stop') {
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

  private mapToolCall(tool: any): ToolCall | null {
    if (!tool) {
      return null;
    }

    return {
      id: tool.id,
      type: 'function',
      function: {
        name: tool.name ?? '',
        arguments: typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input ?? {}),
      },
    };
  }

  private translateError(error: unknown): Error {
    if (error instanceof APIError) {
      return new Error(`Anthropic API error (${error.status}): ${error.message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown Anthropic provider error');
  }
}
